import { logger } from '../../utils/logger.js';
import type { LogContext } from '../../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { sharpRenderer } from './sharp-renderer.js';
import { frameBufferManager } from './frame-buffer.js';
import { streamEncoder } from './stream-encoder.js';
import type { Layer } from '../../types/layers.js';
import { EventEmitter } from 'events';

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

export interface StreamManagerConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export class OptimizedStreamManager extends EventEmitter {
  private static instance: OptimizedStreamManager;
  private config: StreamManagerConfig;
  private isStreaming: boolean = false;
  private renderInterval: NodeJS.Timeout | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private currentFPS: number = 0;
  private layers: Layer[] = [];

  private constructor(config: StreamManagerConfig) {
    super();
    this.config = config;

    // Start metrics collection
    this.startMetricsCollection();

    // Listen for encoder events
    this.setupEncoderEvents();

    logger.info('Optimized stream manager initialized', {
      ...config
    } as LogContext);
  }

  public static getInstance(config?: StreamManagerConfig): OptimizedStreamManager {
    if (!OptimizedStreamManager.instance && config) {
      OptimizedStreamManager.instance = new OptimizedStreamManager(config);
    }
    return OptimizedStreamManager.instance;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      memoryUsageGauge.set(memUsage.heapUsed);
    }, 5000);
  }

  private setupEncoderEvents(): void {
    streamEncoder.on('error', (error) => {
      logger.error('Encoder error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.emit('error', error);
    });

    streamEncoder.on('fatal_error', (error) => {
      logger.error('Fatal encoder error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.stop();
      this.emit('fatal_error', error);
    });
  }

  public async start(): Promise<void> {
    if (this.isStreaming) {
      logger.warn('Stream manager is already running');
      return;
    }

    try {
      // Start the encoder
      streamEncoder.start();

      // Start the render loop
      this.startRenderLoop();

      this.isStreaming = true;
      logger.info('Stream manager started');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start stream manager', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.emit('error', error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isStreaming) {
      return;
    }

    try {
      // Stop the render loop
      if (this.renderInterval) {
        clearInterval(this.renderInterval);
        this.renderInterval = null;
      }

      // Stop the encoder
      streamEncoder.stop();

      this.isStreaming = false;
      this.frameCount = 0;
      logger.info('Stream manager stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('Failed to stop stream manager', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      this.emit('error', error);
    }
  }

  private startRenderLoop(): void {
    const frameInterval = 1000 / this.config.fps;

    this.renderInterval = setInterval(async () => {
      const startTime = Date.now();

      try {
        // 1. Composite layers using Sharp
        const composited = await sharpRenderer.composite(this.layers);

        // 2. Apply effects using frame buffer
        frameBufferManager.writeBuffer(composited);
        frameBufferManager.applyEffects();

        // 3. Get final buffer and send to encoder
        const finalBuffer = frameBufferManager.getBuffer();
        streamEncoder.sendFrame(finalBuffer);

        // Update FPS calculation
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFrameTime >= 1000) {
          this.currentFPS = this.frameCount;
          this.frameCount = 0;
          this.lastFrameTime = now;
        }

        // Record metrics
        frameTimeGauge.set(Date.now() - startTime);

      } catch (error) {
        logger.error('Error in render loop', {
          error: error instanceof Error ? error.message : 'Unknown error'
        } as LogContext);
        this.emit('error', error);
      }
    }, frameInterval);
  }

  public updateLayers(layers: Layer[]): void {
    this.layers = layers;
  }

  public updateConfig(newConfig: Partial<StreamManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update encoder config
    streamEncoder.updateConfig({
      width: this.config.width,
      height: this.config.height,
      fps: this.config.fps,
      bitrate: this.config.bitrate
    });

    // Restart render loop if FPS changed
    if (newConfig.fps && this.isStreaming) {
      if (this.renderInterval) {
        clearInterval(this.renderInterval);
      }
      this.startRenderLoop();
    }
  }

  public getMetrics(): {
    isStreaming: boolean;
    currentFPS: number;
    targetFPS: number;
    encoderMetrics: ReturnType<typeof streamEncoder.getMetrics>;
    layerCount: number;
  } {
    return {
      isStreaming: this.isStreaming,
      currentFPS: this.currentFPS,
      targetFPS: this.config.fps,
      encoderMetrics: streamEncoder.getMetrics(),
      layerCount: this.layers.length
    };
  }
}

export const optimizedStreamManager = OptimizedStreamManager.getInstance({
  width: 1920,
  height: 1080,
  fps: 30,
  bitrate: 2500
}); 