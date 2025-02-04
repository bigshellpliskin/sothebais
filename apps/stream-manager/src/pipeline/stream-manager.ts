import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { sharpRenderer } from './sharp-renderer.js';
import { frameBufferManager } from './frame-buffer.js';
import { StreamEncoder, type StreamConfig } from './stream-encoder.js';
import type { Layer } from '../types/layers.js';
import { EventEmitter } from 'events';
import type { FrameBuffer } from '../types/frame-buffer.js';
import { getConfig } from '../config/index.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const frameTimeGauge = new Gauge({
  name: 'stream_manager_frame_time_ms',
  help: 'Total time taken to process a frame in milliseconds',
  registers: [register]
});

const memoryUsageGauge = new Gauge({
  name: 'stream_manager_memory_usage_bytes',
  help: 'Total memory usage of the stream manager',
  registers: [register]
});

// Quality preset mapping
const qualityToPreset: Record<string, StreamConfig['preset']> = {
  'low': 'ultrafast',
  'medium': 'medium',
  'high': 'fast'
} as const;

export interface StreamManagerConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export class StreamManager extends EventEmitter {
  private static instance: StreamManager | null = null;
  private streamEncoder: StreamEncoder;
  private isStreaming: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private currentFPS: number = 0;
  private layers: Layer[] = [];

  private constructor() {
    super();
    this.startMetricsCollection();
    logger.info('Stream manager initialized');
  }

  public static initialize(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
      
      // Get configuration from central config
      const config = getConfig();
      const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
      
      const streamConfig: StreamConfig = {
        width,
        height,
        fps: config.TARGET_FPS,
        bitrate: config.STREAM_BITRATE,
        codec: config.STREAM_CODEC,
        preset: config.FFMPEG_PRESET,
        streamUrl: config.STREAM_URL
      };

      StreamEncoder.initialize(streamConfig);
      StreamManager.instance.streamEncoder = StreamEncoder.getInstance();
      StreamManager.instance.setupEventHandlers();
    }
    return StreamManager.instance;
  }

  public static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      throw new Error('StreamManager not initialized. Call initialize() first.');
    }
    return StreamManager.instance;
  }

  private setupEventHandlers(): void {
    this.streamEncoder.on('error', (error) => {
      logger.error('Stream encoder error', {
        error: error.message,
        code: error.code,
        status: 'error'
      } as LogContext);
      this.emit('error', error);
    });

    this.streamEncoder.on('fatal_error', (error) => {
      logger.error('Fatal stream encoder error', {
        error: error.message,
        code: error.code,
        status: 'fatal'
      } as LogContext);
      this.emit('fatal_error', error);
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      memoryUsageGauge.set(memUsage.heapUsed);
    }, 5000);
  }

  /**
   * Start streaming to all configured outputs
   */
  public start(): void {
    if (this.isStreaming) {
      return;
    }

    this.isStreaming = true;
    this.streamEncoder.start();
    
    logger.info('Stream started', {
      status: 'started',
      outputs: ['internal', 'twitter']
    } as LogContext);
  }

  /**
   * Stop streaming to all outputs and clean up resources
   */
  public stop(): void {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;
    this.streamEncoder.stop();

    logger.info('Stream stopped', {
      status: 'stopped',
      outputs: ['internal', 'twitter']
    } as LogContext);
  }

  public processFrame(frame: FrameBuffer): void {
    if (!this.isStreaming) {
      return;
    }

    // Update FPS calculation
    const now = Date.now();
    if (this.lastFrameTime) {
      const delta = now - this.lastFrameTime;
      this.currentFPS = 1000 / delta;
    }
    this.lastFrameTime = now;
    this.frameCount++;

    // Send frame to encoder
    this.streamEncoder.sendFrame(frame.buffer);
  }

  public updateConfig(config: StreamManagerConfig): void {
    this.streamEncoder.updateConfig(config);
  }

  public getMetrics(): {
    isStreaming: boolean;
    frameCount: number;
    currentFPS: number;
    encoderMetrics: ReturnType<typeof StreamEncoder.prototype.getMetrics>;
  } {
    return {
      isStreaming: this.isStreaming,
      frameCount: this.frameCount,
      currentFPS: this.currentFPS,
      encoderMetrics: this.streamEncoder.getMetrics()
    };
  }

  public updateLayers(layers: Layer[]): void {
    this.layers = layers;
  }
}

// Export the singleton instance
export const streamManager = StreamManager.initialize(); 