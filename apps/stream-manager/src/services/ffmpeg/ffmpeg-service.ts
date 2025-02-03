import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import type { LogContext } from '../../utils/logger.js';
import { Registry, Gauge } from 'prom-client';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const encodingTimeGauge = new Gauge({
  name: 'stream_manager_ffmpeg_encoding_time_ms',
  help: 'Time taken for FFmpeg frame encoding in milliseconds',
  registers: [register]
});

const bitrateGauge = new Gauge({
  name: 'stream_manager_ffmpeg_bitrate_kbps',
  help: 'Current FFmpeg stream bitrate in kbps',
  registers: [register]
});

const fpsGauge = new Gauge({
  name: 'stream_manager_ffmpeg_fps',
  help: 'Current FFmpeg stream FPS',
  registers: [register]
});

const cpuUsageGauge = new Gauge({
  name: 'stream_manager_ffmpeg_cpu_percent',
  help: 'FFmpeg process CPU usage percentage',
  registers: [register]
});

const memoryUsageGauge = new Gauge({
  name: 'stream_manager_ffmpeg_memory_bytes',
  help: 'FFmpeg process memory usage in bytes',
  registers: [register]
});

interface FFmpegConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  streamUrl: string;
  hwaccel?: 'nvenc' | 'qsv' | 'vaapi' | 'videotoolbox';
  audioEnabled?: boolean;
  audioCodec?: 'aac' | 'opus';
  audioBitrate?: number;
}

export class FFmpegService extends EventEmitter {
  private static instance: FFmpegService;
  private process: ChildProcess | null = null;
  private config: FFmpegConfig;
  private isStreaming = false;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 3;
  private readonly RESTART_DELAY = 5000; // 5 seconds
  private lastFrameTime = 0;
  private frameCount = 0;
  private bitrateAccumulator = 0;
  private readonly metricsInterval: ReturnType<typeof setInterval>;

  private constructor(config: FFmpegConfig) {
    super();
    this.config = config;

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);

    logger.info('FFmpeg service initialized', {
      config: this.config
    } as LogContext);
  }

  public static getInstance(config: FFmpegConfig): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService(config);
    }
    return FFmpegService.instance;
  }

  public async start(): Promise<void> {
    if (this.isStreaming) {
      logger.warn('FFmpeg stream already running');
      return;
    }

    try {
      const args = this.buildFFmpegArgs();
      this.process = spawn('ffmpeg', args);
      this.isStreaming = true;
      this.restartAttempts = 0;

      // Handle process events
      this.process.on('error', this.handleProcessError.bind(this));
      this.process.on('exit', this.handleProcessExit.bind(this));

      // Log process output
      this.process.stdout?.on('data', (data) => {
        logger.debug('FFmpeg stdout:', { data: data.toString() } as LogContext);
      });

      this.process.stderr?.on('data', (data) => {
        logger.debug('FFmpeg stderr:', { data: data.toString() } as LogContext);
        this.parseFFmpegOutput(data.toString());
      });

      logger.info('FFmpeg stream started', {
        pid: this.process.pid
      } as LogContext);

      this.emit('streamStart');
    } catch (error) {
      logger.error('Failed to start FFmpeg stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isStreaming || !this.process) {
      logger.warn('No FFmpeg stream to stop');
      return;
    }

    try {
      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');
      this.isStreaming = false;
      this.process = null;
      clearInterval(this.metricsInterval);

      logger.info('FFmpeg stream stopped');
      this.emit('streamStop');
    } catch (error) {
      logger.error('Failed to stop FFmpeg stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      throw error;
    }
  }

  public async sendFrame(frameBuffer: Buffer): Promise<void> {
    if (!this.isStreaming || !this.process) {
      throw new Error('FFmpeg stream not running');
    }

    const startTime = Date.now();

    try {
      // Write frame to FFmpeg's stdin
      if (!this.process.stdin?.write(frameBuffer)) {
        // Handle backpressure
        await new Promise((resolve) => this.process!.stdin!.once('drain', resolve));
      }

      // Update metrics
      this.frameCount++;
      this.lastFrameTime = Date.now();
      encodingTimeGauge.set(this.lastFrameTime - startTime);
      this.bitrateAccumulator += frameBuffer.length * 8 / 1000; // Convert to kbits

      this.emit('frameEncoded', {
        frameNumber: this.frameCount,
        encodingTime: this.lastFrameTime - startTime
      });
    } catch (error) {
      logger.error('Failed to send frame to FFmpeg', {
        error: error instanceof Error ? error.message : 'Unknown error',
        frameSize: frameBuffer.length
      } as LogContext);
      throw error;
    }
  }

  public updateConfig(newConfig: Partial<FFmpegConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // If streaming, restart with new config
    if (this.isStreaming) {
      this.restart();
    }
  }

  private async restart(): Promise<void> {
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, this.RESTART_DELAY));
      await this.start();
    } catch (error) {
      logger.error('Failed to restart FFmpeg stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      throw error;
    }
  }

  private buildFFmpegArgs(): string[] {
    const args = [
      // Input options
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${this.config.width}x${this.config.height}`,
      '-r', this.config.fps.toString(),
      '-i', 'pipe:0'
    ];

    // Add hardware acceleration if configured
    if (this.config.hwaccel) {
      args.push('-hwaccel', this.config.hwaccel);
    }

    // Video encoding options
    args.push(
      '-c:v', this.getVideoCodec(),
      '-b:v', `${this.config.bitrate}k`,
      '-maxrate', `${this.config.bitrate * 1.5}k`,
      '-bufsize', `${this.config.bitrate * 2}k`,
      '-preset', this.config.preset,
      '-g', (this.config.fps * 2).toString(), // GOP size = 2 seconds
      '-keyint_min', this.config.fps.toString()
    );

    // Add audio if enabled
    if (this.config.audioEnabled && this.config.audioCodec && this.config.audioBitrate) {
      args.push(
        '-f', 'lavfi',
        '-i', 'anullsrc',
        '-c:a', this.config.audioCodec,
        '-b:a', `${this.config.audioBitrate}k`
      );
    }

    // Output options
    args.push(
      '-f', 'flv', // Use FLV format for RTMP
      '-flvflags', 'no_duration_filesize',
      '-shortest',
      this.config.streamUrl
    );

    return args;
  }

  private getVideoCodec(): string {
    switch (this.config.codec) {
      case 'h264':
        return this.config.hwaccel === 'nvenc' ? 'h264_nvenc' :
               this.config.hwaccel === 'qsv' ? 'h264_qsv' :
               this.config.hwaccel === 'vaapi' ? 'h264_vaapi' :
               this.config.hwaccel === 'videotoolbox' ? 'h264_videotoolbox' :
               'libx264';
      case 'vp8':
        return 'libvpx';
      case 'vp9':
        return 'libvpx-vp9';
      default:
        return 'libx264';
    }
  }

  private handleProcessError(error: Error): void {
    logger.error('FFmpeg process error', {
      error: error.message
    } as LogContext);
    this.emit('error', error);
    this.attemptRestart();
  }

  private handleProcessExit(code: number | null, signal: NodeJS.Signals | null): void {
    logger.info('FFmpeg process exited', {
      code,
      signal
    } as LogContext);

    this.isStreaming = false;
    this.process = null;

    if (code !== 0 && signal !== 'SIGTERM') {
      this.attemptRestart();
    }

    this.emit('exit', { code, signal });
  }

  private attemptRestart(): void {
    if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
      this.restartAttempts++;
      logger.info('Attempting to restart FFmpeg stream', {
        attempt: this.restartAttempts,
        maxAttempts: this.MAX_RESTART_ATTEMPTS
      } as LogContext);

      setTimeout(() => {
        this.start().catch((error) => {
          logger.error('Failed to restart FFmpeg stream', {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt: this.restartAttempts
          } as LogContext);
        });
      }, this.RESTART_DELAY);
    } else {
      logger.error('Maximum FFmpeg restart attempts reached');
      this.emit('maxRestartsReached');
    }
  }

  private parseFFmpegOutput(output: string): void {
    // Parse FFmpeg output for fps, bitrate, etc.
    const fpsMatch = output.match(/fps=\s*(\d+)/);
    const bitrateMatch = output.match(/bitrate=\s*(\d+(\.\d+)?)/);

    if (fpsMatch) {
      fpsGauge.set(parseInt(fpsMatch[1]));
    }

    if (bitrateMatch) {
      bitrateGauge.set(parseFloat(bitrateMatch[1]));
    }
  }

  private updateMetrics(): void {
    if (!this.isStreaming || !this.process) return;

    // Update CPU and memory usage
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    cpuUsageGauge.set((usage.user + usage.system) / 1000000); // Convert to seconds
    memoryUsageGauge.set(memory.heapUsed);

    // Calculate and update FPS
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed > 0) {
      fpsGauge.set(this.frameCount / (elapsed / 1000));
    }

    // Calculate and update bitrate
    const bitrateKbps = this.bitrateAccumulator / (elapsed / 1000);
    bitrateGauge.set(bitrateKbps);

    // Reset accumulators
    this.frameCount = 0;
    this.bitrateAccumulator = 0;
    this.lastFrameTime = now;
  }
}

export const ffmpegService = FFmpegService.getInstance({
  width: 1920,
  height: 1080,
  fps: 30,
  bitrate: 4000,
  codec: 'h264',
  preset: 'veryfast',
  streamUrl: process.env.STREAM_URL || 'rtmp://localhost/live/stream',
  hwaccel: process.env.FFMPEG_HWACCEL as FFmpegConfig['hwaccel'],
  audioEnabled: true,
  audioCodec: 'aac',
  audioBitrate: 128
}); 