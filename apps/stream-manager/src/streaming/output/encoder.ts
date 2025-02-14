import { spawn, type ChildProcess } from 'child_process';
import { logger } from '../../utils/logger.js';
import type { LogContext } from '../../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { EventEmitter } from 'events';

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
  codec: 'h264' | 'h264rgb' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  streamUrl?: string;
  outputs: string[];
  hwaccel?: {
    enabled: boolean;
    device?: 'nvidia' | 'qsv' | 'amf' | 'videotoolbox';
    decode?: boolean;
    scaling?: boolean;
  };
  pipeline?: {
    maxLatency: number;
    dropThreshold: number;
    zeroCopy: boolean;
    threads?: number;
    cpuFlags?: string[];
    inputFormat?: 'rgba' | 'rgb' | 'yuv420p';
  };
}

export class StreamEncoder extends EventEmitter {
  private static instance: StreamEncoder | null = null;
  private ffmpeg: ChildProcess | null = null;
  private config: StreamConfig;
  private muxer: any; // Will be set by connectMuxer
  private isStreaming: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private currentFPS: number = 0;
  private restartAttempts: number = 0;
  private readonly MAX_RESTART_ATTEMPTS = 3;
  private frameLatency: number = 0;
  private droppedFrames: number = 0;
  private readonly cpuCores: number;
  private lastFPSUpdate: number = 0;

  private constructor(config: StreamConfig) {
    super();
    this.cpuCores = 2; // Number of cores available in our VPS
    this.config = {
      ...config,
      hwaccel: config.hwaccel || { enabled: false },
      pipeline: {
        maxLatency: 500,
        dropThreshold: 250,
        zeroCopy: true,
        threads: this.cpuCores,
        cpuFlags: ['sse4_2', 'avx', 'avx2'], // AMD EPYC supports these
        ...config.pipeline
      }
    };
    this.startMetricsCollection();
    this.detectHardwareAcceleration();
  }

  public static initialize(config: StreamConfig): StreamEncoder {
    if (!StreamEncoder.instance) {
      StreamEncoder.instance = new StreamEncoder(config);
    }
    return StreamEncoder.instance;
  }

  public static getInstance(): StreamEncoder {
    if (!StreamEncoder.instance) {
      throw new Error('StreamEncoder not initialized. Call initialize() first.');
    }
    return StreamEncoder.instance;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      streamBitrateGauge.set(this.config.bitrate);
      streamFPSGauge.set(this.currentFPS);
    }, 1000);
  }

  private async detectHardwareAcceleration(): Promise<void> {
    if (!this.config.hwaccel?.enabled) return;

    try {
      // Check for NVIDIA GPU
      const hasNvidia = await this.checkFFmpegDevice('-hwaccel cuda -hwaccel_device 0');
      if (hasNvidia) {
        this.config.hwaccel.device = 'nvidia';
        logger.info('NVIDIA GPU detected for hardware acceleration');
        return;
      }

      // Check for Intel QuickSync
      const hasQSV = await this.checkFFmpegDevice('-hwaccel qsv -hwaccel_device /dev/dri/renderD128');
      if (hasQSV) {
        this.config.hwaccel.device = 'qsv';
        logger.info('Intel QuickSync detected for hardware acceleration');
        return;
      }

      // Check for AMD AMF
      const hasAMF = await this.checkFFmpegDevice('-hwaccel amf');
      if (hasAMF) {
        this.config.hwaccel.device = 'amf';
        logger.info('AMD AMF detected for hardware acceleration');
        return;
      }

      // Check for macOS VideoToolbox
      const hasVideoToolbox = await this.checkFFmpegDevice('-hwaccel videotoolbox');
      if (hasVideoToolbox) {
        this.config.hwaccel.device = 'videotoolbox';
        logger.info('VideoToolbox detected for hardware acceleration');
        return;
      }

      logger.warn('No hardware acceleration available, falling back to software encoding');
      this.config.hwaccel.enabled = false;
    } catch (error) {
      logger.error('Error detecting hardware acceleration', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.config.hwaccel.enabled = false;
    }
  }

  private async checkFFmpegDevice(args: string): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', [...args.split(' '), '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=1', '-f', 'null', '-']);
      let error = '';

      ffmpeg.stderr?.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        resolve(code === 0 && !error.includes('error') && !error.includes('Error'));
      });

      // Ensure process exits
      setTimeout(() => {
        ffmpeg.kill();
        resolve(false);
      }, 1000);
    });
  }

  private buildFFmpegArgs(): string[] {
    // Global options
    const globalArgs: string[] = [
      '-hide_banner',
      '-nostats',
      '-loglevel', 'debug',
      '-thread_queue_size', '512'
    ];

    // Input options
    const inputArgs: string[] = [
      '-f', 'rawvideo',
      '-pix_fmt', this.config.pipeline?.inputFormat || 'rgba',
      '-s', `${this.config.width}x${this.config.height}`,
      '-r', this.config.fps.toString(),
      '-i', 'pipe:0'
    ];

    // Add format conversion for h264
    const pixelFormatArgs = [
      '-vf', 'format=yuv420p',
      '-g', '30',  // GOP size
      '-keyint_min', '30'
    ];

    // Audio input
    const audioArgs = [
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo',
      '-shortest'
    ];

    // Codec options
    const codecArgs = [
      '-c:v', 'libx264',
      '-preset', this.config.preset,
      '-tune', 'zerolatency',
      '-b:v', `${this.config.bitrate}k`,
      '-maxrate', `${this.config.bitrate * 1.5}k`,
      '-bufsize', `${this.config.bitrate * 2}k`,
      '-profile:v', 'high',
      '-level', '4.1',
      '-x264-params', [
        'nal-hrd=cbr',
        'force-cfr=1',
        `threads=${this.config.pipeline?.threads || '2'}`,
        'rc-lookahead=10',
        'ref=1',
        'bframes=0',
        'intra-refresh=1'
      ].join(':')
    ];

    // Audio codec
    const audioCodecArgs = [
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2'
    ];

    // Output options
    const outputArgs = [
      '-f', 'flv',
      '-flvflags', '+no_duration_filesize',
      '-movflags', '+faststart',
      this.config.streamUrl || 'rtmp://localhost:1935/live/test'
    ];

    // Combine all args
    return [
      ...globalArgs,
      ...inputArgs,
      ...audioArgs,
      ...pixelFormatArgs,
      ...codecArgs,
      ...audioCodecArgs,
      ...outputArgs
    ];
  }

  private getHwAccelCodec(): string {
    if (!this.config.hwaccel?.enabled || !this.config.hwaccel.device) {
      return this.getCodec();
    }

    switch (this.config.codec) {
      case 'h264':
        switch (this.config.hwaccel.device) {
          case 'nvidia':
            return 'h264_nvenc';
          case 'qsv':
            return 'h264_qsv';
          case 'amf':
            return 'h264_amf';
          case 'videotoolbox':
            return 'h264_videotoolbox';
          default:
            return 'libx264';
        }
      case 'vp8':
      case 'vp9':
        return this.getCodec(); // No hardware acceleration for VP8/VP9
      default:
        return 'libx264';
    }
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

  public connectMuxer(muxer: any): void {
    // No longer needed, but keep for compatibility
    logger.info('Muxer connection no longer needed - encoder outputs directly to RTMP');
  }

  /**
   * Start the FFmpeg process and begin streaming
   */
  public start(): void {
    if (this.isStreaming) {
      logger.warn('Stream encoder is already running');
      return;
    }

    try {
      const args = this.buildFFmpegArgs();
      this.ffmpeg = spawn('ffmpeg', args);

      this.ffmpeg.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {  // Only log non-empty messages
          logger.debug(`FFmpeg: ${message}`, {
            ffmpegOutput: message
          });
        }
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
          signal,
          command: 'ffmpeg ' + args.join(' ')
        } as LogContext);
        this.handleExit(code, signal);
      });

      this.isStreaming = true;
      this.restartAttempts = 0;
      logger.info('Stream encoder started', {
        streamUrl: this.config.streamUrl || 'rtmp://localhost:1935/live/test'
      });

    } catch (error) {
      logger.error('Failed to start FFmpeg process', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.handleError(error as Error);
    }
  }

  /**
   * Stop the FFmpeg process and clean up resources
   */
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
    const currentLatency = this.lastFrameTime ? startTime - this.lastFrameTime : 0;

    // Drop frames if we're exceeding latency threshold
    if (this.config.pipeline?.dropThreshold && currentLatency > this.config.pipeline.dropThreshold) {
      this.droppedFrames++;
      logger.debug('Dropping frame due to high latency', {
        latency: currentLatency,
        threshold: this.config.pipeline.dropThreshold,
        droppedFrames: this.droppedFrames
      } as LogContext);
      return;
    }

    try {
      // Use zero-copy write if enabled by sharing the underlying ArrayBuffer
      if (this.config.pipeline?.zeroCopy) {
        const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.length);
        this.ffmpeg.stdin.write(view);
      } else {
        this.ffmpeg.stdin.write(buffer);
      }
      
      // Update metrics
      const now = Date.now();
      this.frameLatency = now - startTime;
      this.lastFrameTime = now;  // Update lastFrameTime for every frame
      this.frameCount++;

      // Calculate FPS every second
      if (now - this.lastFPSUpdate >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.lastFPSUpdate = now;
      }

      encodingTimeGauge.set(this.frameLatency);
    } catch (error) {
      logger.error('Failed to send frame to FFmpeg', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: currentLatency,
        droppedFrames: this.droppedFrames
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