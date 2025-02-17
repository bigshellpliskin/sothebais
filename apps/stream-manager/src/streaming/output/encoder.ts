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
  private lastReportedFPS: number = 0;
  private isConnected: boolean = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT = 5000;

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
      '-loglevel', 'info',
      '-thread_queue_size', '1024',  // Increased queue size
      '-vsync', 'cfr'  // Constant frame rate
    ];

    // Input options with explicit RGBA format
    const inputArgs: string[] = [
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',  // Always use RGBA
      '-s', `${this.config.width}x${this.config.height}`,
      '-r', this.config.fps.toString(),
      '-i', 'pipe:0' 
    ];

    // Add format conversion for h264 with explicit parameters
    const pixelFormatArgs = [
      '-vf', [
        'format=rgba',  // Ensure RGBA format
        `scale=${this.config.width}:${this.config.height}:force_original_aspect_ratio=decrease`,
        'format=yuv420p'  // Convert to yuv420p for h264 encoding
      ].join(','),
      '-g', '30',
      '-keyint_min', '30',
      '-sc_threshold', '0',
      '-sws_flags', 'bilinear',
      '-force_key_frames', 'expr:gte(t,n_forced*1)'  // Force keyframe every second
    ];

    // Audio input (silent)
    const audioArgs = [
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo',
      '-shortest'
    ];

    // Codec options with explicit settings
    const codecArgs = [
      '-c:v', 'libx264',
      '-preset', this.config.preset,
      '-tune', 'zerolatency',
      '-b:v', `${this.config.bitrate}k`,
      '-maxrate', `${this.config.bitrate * 1.5}k`,
      '-bufsize', `${this.config.bitrate * 2}k`,
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-x264-params', [
        'nal-hrd=cbr',
        'force-cfr=1',
        `threads=${this.config.pipeline?.threads || '2'}`,
        'rc-lookahead=10',
        'ref=1',
        'bframes=0',
        'intra-refresh=1',
        'slice-max-size=1500',
        'sync-lookahead=0',  // Reduce latency
        'subme=0',  // Speed up encoding
        'trellis=0',  // Speed up encoding
        'direct-pred=spatial'  // Better for streaming
      ].join(':')
    ];

    // Audio codec (minimal settings)
    const audioCodecArgs = [
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2'
    ];

    // Output options optimized for RTMP
    const outputArgs = [
      '-f', 'flv',
      '-flvflags', '+no_duration_filesize',
      '-movflags', '+faststart+frag_keyframe+empty_moov+default_base_moof',
      '-max_interleave_delta', '0',  // Minimize interleaving delay
      this.config.streamUrl || 'rtmp://localhost:1935/live/test'
    ];

    const args = [
      ...globalArgs,
      ...inputArgs,
      ...audioArgs,
      ...pixelFormatArgs,
      ...codecArgs,
      ...audioCodecArgs,
      ...outputArgs
    ];

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
      if (this.isStreaming) {
        logger.info('Encoder is already running');
        resolve();
        return;
      }

      try {
        const args = this.buildFFmpegArgs();
        logger.info('FFmpeg command configuration', {
          command: args.join(' '),
          inputFormat: this.config.pipeline?.inputFormat || 'rgba',
          resolution: `${this.config.width}x${this.config.height}`,
          fps: this.config.fps,
          preset: this.config.preset,
          bitrate: this.config.bitrate
        });

        this.ffmpeg = spawn('ffmpeg', args);
        this.isStreaming = true;

        // Set up connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            const error = new Error('Encoder failed to establish connection within timeout');
            this.handleError(error);
            reject(error);
          }
        }, this.CONNECTION_TIMEOUT);

        // Handle successful connection
        this.ffmpeg.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('Output #0, flv')) {
            this.isConnected = true;
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout);
              this.connectionTimeout = null;
            }
            logger.info('Encoder successfully connected to RTMP server');
            resolve();
          }
        });

        this.setupEventHandlers();
        logger.info('Stream encoder started', { streamUrl: this.config.outputs[0] });

      } catch (error) {
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.ffmpeg) return;

    this.ffmpeg.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Error') || output.includes('error')) {
        logger.error('FFmpeg error output', { output });
      }
    });

    this.ffmpeg.on('error', this.handleError.bind(this));
    this.ffmpeg.on('exit', this.handleExit.bind(this));
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

  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  public getBitrate(): number {
    return this.config.bitrate;
  }

  public getRestartAttempts(): number {
    return this.restartAttempts;
  }

  public isActive(): boolean {
    return this.isStreaming && this.isConnected;
  }
} 