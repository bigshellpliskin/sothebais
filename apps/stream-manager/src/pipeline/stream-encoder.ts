import { spawn, type ChildProcess } from 'child_process';
import { logger } from '../../utils/logger.js';
import type { LogContext } from '../../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { EventEmitter } from 'events';
import { getConfig } from '../../config/index.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const encodingTimeGauge = new Gauge({
  name: 'stream_manager_encoding_time_ms',
  help: 'Time taken for frame encoding in milliseconds',
  registers: [register]
});

const streamBitrateGauge = new Gauge({
  name: 'stream_manager_bitrate_kbps',
  help: 'Current stream bitrate in kbps',
  registers: [register]
});

const streamFPSGauge = new Gauge({
  name: 'stream_manager_fps',
  help: 'Current stream FPS',
  registers: [register]
});

export interface StreamConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  streamUrl: string;
}

export class StreamEncoder extends EventEmitter {
  private static instance: StreamEncoder;
  private ffmpeg: ChildProcess | null = null;
  private config: StreamConfig;
  private isStreaming: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private currentFPS: number = 0;
  private restartAttempts: number = 0;
  private readonly MAX_RESTART_ATTEMPTS = 3;

  private constructor(config: StreamConfig) {
    super();
    this.config = config;

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Stream encoder initialized', {
      ...config
    } as LogContext);
  }

  public static getInstance(config?: StreamConfig): StreamEncoder {
    if (!StreamEncoder.instance && config) {
      StreamEncoder.instance = new StreamEncoder(config);
    }
    return StreamEncoder.instance;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      streamBitrateGauge.set(this.config.bitrate);
      streamFPSGauge.set(this.currentFPS);
    }, 1000);
  }

  private buildFFmpegArgs(): string[] {
    const args = [
      // Input options
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${this.config.width}x${this.config.height}`,
      '-r', this.config.fps.toString(),
      '-i', 'pipe:0',

      // Output options
      '-c:v', this.getCodec(),
      '-preset', this.config.preset,
      '-b:v', `${this.config.bitrate}k`,
      '-maxrate', `${this.config.bitrate * 1.5}k`,
      '-bufsize', `${this.config.bitrate * 2}k`,
      '-g', (this.config.fps * 2).toString(), // GOP size
      '-keyint_min', this.config.fps.toString(),
      '-sc_threshold', '0', // Disable scene change detection
      '-tune', 'zerolatency',
      '-f', 'flv'
    ];

    // Add codec-specific options
    switch (this.config.codec) {
      case 'h264':
        args.push(
          '-profile:v', 'high',
          '-level', '4.1',
          '-x264-params', 'nal-hrd=cbr:force-cfr=1'
        );
        break;
      case 'vp8':
        args.push(
          '-quality', 'realtime',
          '-cpu-used', '4',
          '-deadline', 'realtime'
        );
        break;
      case 'vp9':
        args.push(
          '-quality', 'realtime',
          '-cpu-used', '4',
          '-deadline', 'realtime',
          '-tile-columns', '4'
        );
        break;
    }

    // Add output URL
    args.push(this.config.streamUrl);

    return args;
  }

  private getCodec(): string {
    switch (this.config.codec) {
      case 'h264':
        return 'libx264';
      case 'vp8':
        return 'libvpx';
      case 'vp9':
        return 'libvpx-vp9';
      default:
        return 'libx264';
    }
  }

  public start(): void {
    if (this.isStreaming) {
      logger.warn('Stream encoder is already running');
      return;
    }

    try {
      const args = this.buildFFmpegArgs();
      this.ffmpeg = spawn('ffmpeg', args);

      this.ffmpeg.stderr?.on('data', (data) => {
        logger.debug(`FFmpeg: ${data}`);
      });

      this.ffmpeg.on('error', (error) => {
        logger.error('FFmpeg process error', {
          error: error.message,
          command: 'ffmpeg ' + args.join(' ')
        } as LogContext);
        this.handleError(error);
      });

      this.ffmpeg.on('exit', (code, signal) => {
        logger.info('FFmpeg process exited', {
          code,
          signal
        } as LogContext);
        this.handleExit(code, signal);
      });

      this.isStreaming = true;
      this.restartAttempts = 0;
      logger.info('Stream encoder started');

    } catch (error) {
      logger.error('Failed to start FFmpeg process', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.handleError(error as Error);
    }
  }

  public stop(): void {
    if (!this.isStreaming || !this.ffmpeg) {
      return;
    }

    try {
      // Send SIGTERM to FFmpeg process
      this.ffmpeg.stdin?.end();
      this.ffmpeg.kill('SIGTERM');
      this.isStreaming = false;
      this.frameCount = 0;
      logger.info('Stream encoder stopped');
    } catch (error) {
      logger.error('Failed to stop FFmpeg process', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
    }
  }

  public sendFrame(buffer: Buffer): void {
    if (!this.isStreaming || !this.ffmpeg || !this.ffmpeg.stdin?.writable) {
      return;
    }

    const startTime = Date.now();

    try {
      this.ffmpeg.stdin.write(buffer);
      
      // Update FPS calculation
      const now = Date.now();
      if (now - this.lastFrameTime >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }
      this.frameCount++;

      encodingTimeGauge.set(Date.now() - startTime);
    } catch (error) {
      logger.error('Failed to send frame to FFmpeg', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.handleError(error as Error);
    }
  }

  public updateConfig(newConfig: Partial<StreamConfig>): void {
    const needsRestart = 
      newConfig.width !== this.config.width ||
      newConfig.height !== this.config.height ||
      newConfig.codec !== this.config.codec;

    this.config = { ...this.config, ...newConfig };

    if (needsRestart && this.isStreaming) {
      logger.info('Restarting encoder due to configuration change');
      this.stop();
      this.start();
    }
  }

  private handleError(error: Error): void {
    this.emit('error', error);
    
    if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
      logger.info('Attempting to restart encoder', {
        attempt: this.restartAttempts + 1,
        maxAttempts: this.MAX_RESTART_ATTEMPTS
      } as LogContext);
      
      this.stop();
      setTimeout(() => {
        this.restartAttempts++;
        this.start();
      }, 1000);
    } else {
      logger.error('Max restart attempts reached', {
        attempts: this.restartAttempts
      } as LogContext);
      this.emit('fatal_error', error);
    }
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.isStreaming = false;
    this.emit('exit', { code, signal });

    if (code !== 0 && this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
      this.handleError(new Error(`FFmpeg exited with code ${code}`));
    }
  }

  public getMetrics(): {
    isStreaming: boolean;
    currentFPS: number;
    bitrate: number;
    restartAttempts: number;
  } {
    return {
      isStreaming: this.isStreaming,
      currentFPS: this.currentFPS,
      bitrate: this.config.bitrate,
      restartAttempts: this.restartAttempts
    };
  }
}

export const streamEncoder = StreamEncoder.getInstance({
  ...(() => {
    const config = getConfig();
    const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
    return {
      width,
      height,
      fps: config.TARGET_FPS,
      preset: config.RENDER_QUALITY === 'high' ? 'medium' : 
              config.RENDER_QUALITY === 'medium' ? 'veryfast' : 'ultrafast',
      bitrate: config.STREAM_BITRATE,
      codec: 'h264',
      streamUrl: config.STREAM_URL
    };
  })()
}); 