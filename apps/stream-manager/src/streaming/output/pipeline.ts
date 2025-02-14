import sharp from 'sharp';
import { EventEmitter } from 'events';
import { Registry, Gauge } from 'prom-client';
import { logger } from '../../utils/logger.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const processingTimeGauge = new Gauge({
  name: 'frame_processing_time_ms',
  help: 'Time taken for frame processing in milliseconds',
  registers: [register]
});

const queueSizeGauge = new Gauge({
  name: 'frame_queue_size',
  help: 'Number of frames in processing queue',
  registers: [register]
});

const memoryUsageGauge = new Gauge({
  name: 'frame_pipeline_memory_bytes',
  help: 'Memory usage of frame pipeline',
  registers: [register]
});

export interface PipelineConfig {
  maxQueueSize: number;
  poolSize: number;
  quality: number;
  format: 'raw' | 'jpeg';
  width: number;
  height: number;
}

export class FramePipeline extends EventEmitter {
  private static instance: FramePipeline | null = null;
  private config: PipelineConfig;
  private frameQueue: Buffer[] = [];
  private bufferPool: Buffer[] = [];
  private isProcessing: boolean = false;
  private lastProcessingTime: number = 0;

  private constructor(config: PipelineConfig) {
    super();
    this.config = config;
    this.initializeBufferPool();

    logger.info('Frame pipeline initialized', {
      config: this.config,
      sharpVersion: sharp.versions
    });
  }

  public static initialize(config: PipelineConfig): FramePipeline {
    if (!FramePipeline.instance) {
      FramePipeline.instance = new FramePipeline(config);
    }
    return FramePipeline.instance;
  }

  public static getInstance(): FramePipeline {
    if (!FramePipeline.instance) {
      throw new Error('Frame pipeline not initialized');
    }
    return FramePipeline.instance;
  }

  private initializeBufferPool(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      // Allocate buffers based on expected frame size
      // This is an example size, adjust based on your needs
      this.bufferPool.push(Buffer.alloc(1920 * 1080 * 4)); // 4 bytes per pixel for RGBA
    }
  }

  public async processFrame(frame: Buffer): Promise<Buffer> {
    const startTime = performance.now();

    try {
      if (this.frameQueue.length >= this.config.maxQueueSize) {
        logger.warn('Frame queue full, dropping frame');
        return frame;
      }

      // Add to queue
      this.frameQueue.push(frame);
      queueSizeGauge.set(this.frameQueue.length);

      // Process if not already processing
      if (!this.isProcessing) {
        await this.processQueue();
      }

      const processedFrame = await this.processSharpFrame(frame);
      
      this.lastProcessingTime = performance.now() - startTime;
      processingTimeGauge.set(this.lastProcessingTime);

      return processedFrame;
    } catch (error) {
      logger.error('Frame processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      });
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.frameQueue.length > 0) {
        const frame = this.frameQueue.shift();
        if (frame) {
          const processedFrame = await this.processSharpFrame(frame);
          this.emit('frame', processedFrame);
        }
      }
    } finally {
      this.isProcessing = false;
      queueSizeGauge.set(this.frameQueue.length);
    }
  }

  private async processSharpFrame(frame: Buffer): Promise<Buffer> {
    try {
      // Log frame processing start
      logger.info('Processing frame', {
        inputSize: frame.length,
        timestamp: Date.now()
      });

      // Create a Sharp instance with the input buffer
      const image = sharp(frame);

      // Process the image
      const processedFrame = await image
        .resize(this.config.width, this.config.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .jpeg({
          quality: this.config.quality,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();

      // Log successful frame processing
      logger.info('Frame processed', {
        inputSize: frame.length,
        outputSize: processedFrame.length,
        timestamp: Date.now()
      });

      return processedFrame;
    } catch (error) {
      logger.error('Error processing frame with Sharp', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'frame-pipeline'
      });
      throw error;
    }
  }

  public updateMetrics(): void {
    memoryUsageGauge.set(process.memoryUsage().heapUsed);
    queueSizeGauge.set(this.frameQueue.length);
    processingTimeGauge.set(this.lastProcessingTime);
  }

  public async cleanup(): Promise<void> {
    this.frameQueue = [];
    this.bufferPool = [];
    this.isProcessing = false;
    
    logger.info('Frame pipeline cleaned up');
  }

  public getMetrics(): {
    queueSize: number;
    processingTime: number;
    memoryUsage: number;
  } {
    return {
      queueSize: this.frameQueue.length,
      processingTime: this.lastProcessingTime,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
} 