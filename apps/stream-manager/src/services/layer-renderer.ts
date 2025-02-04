import { logger } from '../utils/logger.js';
import { layerManager } from './layer-manager.js';
import type { Layer, Transform, Point2D, HostLayer, AssistantLayer, VisualFeedLayer, OverlayLayer, ChatLayer, LayerType } from '../types/layers.js';
import { SharpRenderer } from '../pipeline/sharp-renderer.js';
import { StreamManager } from '../pipeline/stream-manager.js';
import { FrameBufferManager } from '../pipeline/frame-buffer.js';
import type { LogContext } from '../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const frameRateGauge = new Gauge({
  name: 'stream_manager_frame_rate',
  help: 'Current frame rate of the stream',
  registers: [register]
});

const renderTimeGauge = new Gauge({
  name: 'stream_manager_render_time_ms',
  help: 'Time taken to render a frame in milliseconds',
  registers: [register]
});

const memoryUsageGauge = new Gauge({
  name: 'stream_manager_memory_usage_bytes',
  help: 'Memory usage of the stream manager',
  registers: [register]
});

const layerCountGauge = new Gauge({
  name: 'stream_manager_layer_count',
  help: 'Number of active layers',
  registers: [register]
});

const lastRenderErrorGauge = new Gauge({
  name: 'stream_manager_last_render_error_timestamp',
  help: 'Timestamp of the last render error',
  registers: [register]
});

interface MetricLabels {
  layer_id: string;
  layer_type: string;
}

// Add new metrics for layer visibility
const layerVisibilityGauge = new Gauge<keyof MetricLabels>({
  name: 'stream_manager_layer_visibility',
  help: 'Visibility status of each layer',
  labelNames: ['layer_id', 'layer_type'],
  registers: [register]
});

const layerRenderTimeGauge = new Gauge<keyof MetricLabels>({
  name: 'stream_manager_layer_render_time_ms',
  help: 'Time taken to render each layer in milliseconds',
  labelNames: ['layer_id', 'layer_type'],
  registers: [register]
});

function isValidLayerType(type: string): type is LayerType {
  return ['host', 'assistant', 'visualFeed', 'overlay', 'chat'].includes(type);
}

export class LayerRenderer {
  private static instance: LayerRenderer;
  private width: number;
  private height: number;
  private sharpRenderer: SharpRenderer;
  private frameBufferManager: FrameBufferManager;
  private streamManager: StreamManager;
  private renderLoop: NodeJS.Timeout | null = null;
  private layerCache: Map<string, { buffer: Buffer; lastUpdated: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

  private constructor() {
    this.width = 1920;
    this.height = 1080;
    this.sharpRenderer = SharpRenderer.getInstance();
    this.frameBufferManager = FrameBufferManager.getInstance();
    this.streamManager = StreamManager.getInstance();
  }

  public static getInstance(): LayerRenderer {
    if (!LayerRenderer.instance) {
      LayerRenderer.instance = new LayerRenderer();
    }
    return LayerRenderer.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize Sharp with base canvas
      await this.sharpRenderer.composite([]);  // Initialize with empty composite
      logger.info('LayerRenderer initialized');
    } catch (error) {
      logger.error('Failed to initialize LayerRenderer', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      throw error;
    }
  }

  public async startRenderLoop(fps: number = 30): Promise<void> {
    if (this.renderLoop) {
      return;
    }

    const frameInterval = 1000 / fps;
    this.renderLoop = setInterval(async () => {
      const startTime = Date.now();

      try {
        // Get all active layers
        const layers = layerManager.getAllLayers();
        
        // Render frame using Sharp
        const frame = await this.sharpRenderer.composite(layers);
        
        // Process the frame
        await this.streamManager.emit('frame', frame);

        // Update metrics
        const renderTime = Date.now() - startTime;
        renderTimeGauge.set(renderTime);
        frameRateGauge.set(1000 / renderTime);
        memoryUsageGauge.set(process.memoryUsage().heapUsed);
      } catch (error) {
        logger.error('Error in render loop', {
          error: error instanceof Error ? error.message : 'Unknown error'
        } as LogContext);
      }
    }, frameInterval);

    logger.info('Started render loop', { fps } as LogContext);
  }

  public stopRenderLoop(): void {
    if (this.renderLoop) {
      clearInterval(this.renderLoop);
      this.renderLoop = null;
      logger.info('Stopped render loop');
    }
  }

  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public cleanup(): void {
    this.stopRenderLoop();
    this.layerCache.clear();
    logger.info('Cleaned up LayerRenderer');
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // No need to call resize on sharpRenderer as it handles dimensions per operation
    logger.info('Renderer resized', { width, height } as LogContext);
  }

  // Add cache cleanup method
  private cleanupLayerCache(): void {
    const now = Date.now();
    const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, cache] of this.layerCache.entries()) {
      if (now - cache.lastUpdated > MAX_CACHE_AGE) {
        this.layerCache.delete(id);
      }
    }
  }

  // Call cleanup periodically
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupLayerCache();
    }, 60 * 1000); // Clean up every minute
  }

  public getHealth(): {
    status: 'healthy' | 'unhealthy';
    fps: number;
    memoryUsage: NodeJS.MemoryUsage;
    layerCount: number;
  } {
    const currentRenderTime = Number(renderTimeGauge.get() ?? 0);
    const fps = currentRenderTime > 0 ? 1000 / currentRenderTime : 0;
    return {
      status: this.renderLoop ? 'healthy' : 'unhealthy',
      fps,
      memoryUsage: process.memoryUsage(),
      layerCount: layerManager.getAllLayers().length
    };
  }
}

// Export the singleton instance
export const layerRenderer = LayerRenderer.getInstance(); 