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
  bitrate: string; // Keep as string for FFmpeg
  bitrateNumeric: number; // Add numeric value for metrics
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
  private lastReportedFPS: number = 0;
  private isConnected: boolean = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT = 10000;

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
      // Use numeric bitrate for metrics
      streamBitrateGauge.set(this.config.bitrateNumeric / 1000); // Convert to kbps
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
    // Global options - simplified
    const globalArgs: string[] = [
      '-hide_banner',
      '-nostats',
      '-loglevel', 'warning',
    ];

    // Input options - keeping RGBA format
    const inputArgs: string[] = [
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${this.config.width}x${this.config.height}`,
      '-r', this.config.fps.toString(),
      '-i', 'pipe:0'
    ];

    // Basic video processing - simplified
    const videoArgs: string[] = [
      '-vf', 'format=yuv420p',  // Just convert to yuv420p for h264
      '-g', '30',  // Keyframe every 30 frames
      '-c:v', 'libx264',
      '-preset', this.config.preset,
      '-tune', 'zerolatency',
      '-b:v', this.config.bitrate,  // Use raw string with 'k' suffix
      '-x264-params', 'nal-hrd=cbr:force-cfr=1'  // Basic CBR settings
    ];

    // Output options - simplified
    const outputArgs: string[] = [
      '-f', 'flv',
      this.config.outputs[0] || ''  // Ensure a string value is always returned
    ];

    const args: string[] = [
      ...globalArgs,
      ...inputArgs,
      ...videoArgs,
      ...outputArgs
    ].filter(Boolean) as string[]; // Filter out any falsy values

    logger.info('FFmpeg command configuration', {
      command: 'ffmpeg ' + args.join(' '),
      inputFormat: this.config.pipeline?.inputFormat || 'rgba',
      resolution: `${this.config.width}x${this.config.height}`,
      fps: this.config.fps,
      preset: this.config.preset,
      bitrate: this.config.bitrate
    });

    return args;
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

  /**
   * Start the FFmpeg process and begin streaming
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ffmpeg) {
        logger.info('Encoder process already exists');
        resolve();
        return;
      }

      try {
        const args = this.buildFFmpegArgs();
        logger.info('Attempting to spawn FFmpeg process', {
          command: args.join(' '),
          config: {
            inputFormat: this.config.pipeline?.inputFormat || 'rgba',
            resolution: `${this.config.width}x${this.config.height}`,
            fps: this.config.fps
          }
        });

        this.ffmpeg = spawn('ffmpeg', args);
        
        if (!this.ffmpeg.pid) {
          throw new Error('Failed to spawn FFmpeg process');
        }

        this.setupEventHandlers();
        
        logger.info('FFmpeg process spawned successfully', {
          pid: this.ffmpeg.pid,
          spawnArgs: this.ffmpeg.spawnargs
        });

        // Wait for pipeline readiness
        this.once('pipeline_ready', () => {
          this.isStreaming = true;
          logger.info('Encoder initialized and streaming', {
            streamUrl: this.config.outputs[0],
            pid: this.ffmpeg?.pid
          });
          resolve();
        });

      } catch (error) {
        logger.error('Failed to start encoder', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.ffmpeg) {
      logger.warn('Attempted to setup handlers but FFmpeg process does not exist');
      return;
    }

    // Clear any existing handlers
    this.removeAllListeners();
    
    // Check if we have stderr stream
    if (!this.ffmpeg.stderr) {
      logger.error('FFmpeg process has no stderr stream');
      return;
    }

    this.ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      const timestamp = new Date().toISOString();
      
      // Only log important messages
      if (output.includes('Error') || output.includes('error')) {
        logger.error('FFmpeg error', { 
          timestamp, 
          output,
          state: {
            isStreaming: this.isStreaming,
            hasFFmpeg: !!this.ffmpeg,
            pid: this.ffmpeg?.pid
          }
        });
      }

      // Keep connection success logging
      if (output.includes('Output #0, flv')) {
        logger.info('FFmpeg connected to RTMP server', { timestamp });
        this.isConnected = true;
      }
    });

    // Add process state logging
    this.ffmpeg.on('spawn', () => {
      logger.info('FFmpeg process spawned', {
        timestamp: new Date().toISOString(),
        pid: this.ffmpeg?.pid
      });
    });

    // Handle first frame from pipeline
    this.ffmpeg.stdin?.once('pipe', () => {
      logger.info('Received first frame from pipeline', {
        timestamp: new Date().toISOString(),
        pid: this.ffmpeg?.pid
      });
      this.emit('pipeline_ready');
    });

    this.ffmpeg.on('error', (error: Error) => {
      logger.error('FFmpeg process error', {
        timestamp: new Date().toISOString(),
        error: error.message,
        pid: this.ffmpeg?.pid
      });
      this.handleError(error);
    });

    this.ffmpeg.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      logger.info('FFmpeg process exit', {
        timestamp: new Date().toISOString(),
        code,
        signal,
        pid: this.ffmpeg?.pid
      });
      this.handleExit(code, signal);
    });
  }

  /**
   * Stop the FFmpeg process and clean up resources
   */
  public stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.isStreaming || !this.ffmpeg) {
        resolve();
        return;
      }

      try {
        // Send SIGTERM to FFmpeg process
        this.ffmpeg.stdin?.end();
        this.ffmpeg.kill('SIGTERM');
        
        // Wait for process to exit
        this.ffmpeg.on('exit', () => {
          this.isStreaming = false;
          this.frameCount = 0;
          this.lastFrameTime = 0;
          this.currentFPS = 0;
          this.restartAttempts = 0;
          this.frameLatency = 0;
          this.droppedFrames = 0;
          this.ffmpeg = null;
          
          logger.info('Stream encoder stopped and cleaned up');
          resolve();
        });
      } catch (error) {
        logger.error('Failed to stop FFmpeg process', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Still resolve since we want to continue cleanup
        resolve();
      }
    });
  }

  public async sendFrame(buffer: Buffer): Promise<void> {
    if (!this.isStreaming || !this.isConnected || !this.ffmpeg) {
      throw new Error('Encoder not ready to receive frames');
    }

    try {
      const canWrite = this.ffmpeg.stdin?.write(buffer);
      if (!canWrite) {
        await new Promise((resolve) => this.ffmpeg?.stdin?.once('drain', resolve));
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
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
    logger.error('Encoder error', {
      error: error.message,
      isStreaming: this.isStreaming,
      isConnected: this.isConnected
    });

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

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
    const command = this.buildFFmpegArgs().join(' ');
    
    if (code === 0 || signal === 'SIGTERM') {
      logger.info('FFmpeg process exited normally', { code, signal, command });
      return;
    }

    let error: Error;
    if (code === 145) {
      error = new Error('FFmpeg connection refused - RTMP server may not be ready');
    } else {
      error = new Error(`FFmpeg process exited with code ${code}`);
    }

    logger.error('FFmpeg process exited unexpectedly', { code, signal, command });
    this.handleError(error);
  }

  public getMetrics(): {
    isStreaming: boolean;
    currentFPS: number;
    bitrate: number;  // Return numeric bitrate
    restartAttempts: number;
  } {
    return {
      isStreaming: this.isStreaming,
      currentFPS: this.currentFPS,
      bitrate: this.config.bitrateNumeric,  // Use numeric value
      restartAttempts: this.restartAttempts
    };
  }

  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  public getBitrate(): string {
    return this.config.bitrate;
  }

  public getRestartAttempts(): number {
    return this.restartAttempts;
  }

  public isActive(): boolean {
    return this.isStreaming && this.isConnected;
  }
} 