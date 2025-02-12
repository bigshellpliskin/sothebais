import { EventEmitter } from 'events';
import { Registry, Gauge, Counter } from 'prom-client';
import { logger } from '../../utils/logger.js';
import { RTMPServer } from '../rtmp/server.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const activeOutputsGauge = new Gauge({
  name: 'muxer_active_outputs',
  help: 'Number of active output streams',
  registers: [register]
});

const queueSizeGauge = new Gauge({
  name: 'muxer_queue_size',
  help: 'Size of the muxer queue',
  registers: [register]
});

const errorsCounter = new Counter({
  name: 'muxer_errors',
  help: 'Number of muxing errors',
  registers: [register]
});

const outputFramesGauge = new Gauge({
  name: 'muxer_output_frames',
  help: 'Number of frames processed by each output',
  registers: [register],
  labelNames: ['outputId']
});

const outputBytesGauge = new Gauge({
  name: 'muxer_output_bytes',
  help: 'Number of bytes processed by each output',
  registers: [register],
  labelNames: ['outputId']
});

export interface MuxerConfig {
  outputs: string[];
  maxQueueSize: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface OutputStats {
  id: string;
  url: string;
  active: boolean;
  errors: number;
  lastError?: string;
  reconnectAttempts: number;
  framesProcessed: number;
  lastFrameTime: number;
  bytesProcessed: number;
}

export class StreamMuxer extends EventEmitter {
  private static instance: StreamMuxer | null = null;
  private config: MuxerConfig;
  private frameQueue: Buffer[] = [];
  private outputs: Map<string, OutputStats> = new Map();
  private isProcessing: boolean = false;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private rtmpServer: RTMPServer;

  private constructor(config: MuxerConfig) {
    super();
    this.config = config;
    this.rtmpServer = RTMPServer.getInstance();
    this.initializeOutputs();

    logger.info('Stream muxer initialized', {
      config: this.config
    });
  }

  public static initialize(config: MuxerConfig): StreamMuxer {
    if (!StreamMuxer.instance) {
      StreamMuxer.instance = new StreamMuxer(config);
    }
    return StreamMuxer.instance;
  }

  public static getInstance(): StreamMuxer {
    if (!StreamMuxer.instance) {
      throw new Error('Stream muxer not initialized');
    }
    return StreamMuxer.instance;
  }

  private initializeOutputs(): void {
    this.config.outputs.forEach((url, index) => {
      this.outputs.set(`output-${index}`, {
        id: `output-${index}`,
        url,
        active: false,
        errors: 0,
        reconnectAttempts: 0,
        framesProcessed: 0,
        lastFrameTime: 0,
        bytesProcessed: 0
      });
    });

    activeOutputsGauge.set(this.outputs.size);
  }

  public async processFrame(frame: Buffer): Promise<void> {
    try {
      if (this.frameQueue.length >= this.config.maxQueueSize) {
        logger.warn('Muxer queue full, dropping frame');
        return;
      }

      // Add to queue
      this.frameQueue.push(frame);
      queueSizeGauge.set(this.frameQueue.length);

      // Process if not already processing
      if (!this.isProcessing) {
        await this.processQueue();
      }
    } catch (error) {
      logger.error('Frame muxing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      errorsCounter.inc();
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.frameQueue.length > 0) {
        const frame = this.frameQueue.shift();
        if (frame) {
          await this.distributeFrame(frame);
        }
      }
    } finally {
      this.isProcessing = false;
      queueSizeGauge.set(this.frameQueue.length);
    }
  }

  private async distributeFrame(frame: Buffer): Promise<void> {
    const promises = Array.from(this.outputs.values())
      .filter(output => output.active)
      .map(output => this.sendFrameToOutput(output, frame));

    await Promise.all(promises);
  }

  private async sendFrameToOutput(output: OutputStats, frame: Buffer): Promise<void> {
    try {
      if (!output.active) {
        throw new Error(`Output ${output.id} is not active`);
      }

      // Update output statistics
      output.framesProcessed++;
      output.lastFrameTime = Date.now();
      output.bytesProcessed += frame.length;
      
      // Emit metrics
      this.emit('frame:sent', {
        outputId: output.id,
        timestamp: Date.now(),
        frameSize: frame.length
      });
      
      // Update Prometheus metrics
      outputFramesGauge.labels(output.id).set(output.framesProcessed);
      outputBytesGauge.labels(output.id).set(output.bytesProcessed);

      // Check if output is still active after processing
      if (!this.outputs.has(output.id)) {
        throw new Error(`Output ${output.id} was removed during processing`);
      }

    } catch (error) {
      output.errors++;
      output.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Output error', {
        outputId: output.id,
        url: output.url,
        error: output.lastError,
        retryAttempts: output.reconnectAttempts,
        maxRetries: this.config.retryAttempts
      });

      errorsCounter.inc();

      // Handle reconnection
      if (output.reconnectAttempts < this.config.retryAttempts) {
        await this.handleReconnection(output);
      } else {
        this.deactivateOutput(output.id);
        this.emit('output:failed', {
          outputId: output.id,
          url: output.url,
          error: output.lastError
        });
      }
    }
  }

  private async handleReconnection(output: OutputStats): Promise<void> {
    output.reconnectAttempts++;
    
    logger.info('Attempting output reconnection', {
      outputId: output.id,
      attempt: output.reconnectAttempts,
      maxAttempts: this.config.retryAttempts
    });

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    // Attempt reconnection
    try {
      // TODO: Implement actual reconnection logic
      output.active = true;
      output.errors = 0;
      output.lastError = undefined;
      
      logger.info('Output reconnected', {
        outputId: output.id
      });
    } catch (error) {
      logger.error('Reconnection failed', {
        outputId: output.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public activateOutput(outputId: string): void {
    const output = this.outputs.get(outputId);
    if (output) {
      output.active = true;
      output.errors = 0;
      output.reconnectAttempts = 0;
      output.lastError = undefined;
      
      activeOutputsGauge.set(Array.from(this.outputs.values()).filter(o => o.active).length);
      
      logger.info('Output activated', { outputId });
    }
  }

  public deactivateOutput(outputId: string): void {
    const output = this.outputs.get(outputId);
    if (output) {
      output.active = false;
      
      activeOutputsGauge.set(Array.from(this.outputs.values()).filter(o => o.active).length);
      
      logger.info('Output deactivated', { outputId });
    }
  }

  public getOutputStats(): Map<string, OutputStats> {
    return new Map(this.outputs);
  }

  public updateMetrics(): void {
    activeOutputsGauge.set(Array.from(this.outputs.values()).filter(o => o.active).length);
    queueSizeGauge.set(this.frameQueue.length);
  }

  public async cleanup(): Promise<void> {
    this.frameQueue = [];
    this.outputs.clear();
    this.isProcessing = false;
    
    logger.info('Stream muxer cleaned up');
  }
}
