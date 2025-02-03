import { createCanvas } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import { layerManager } from './layer-manager.js';
import type { Layer, Transform, Point2D, HostLayer, AssistantLayer, VisualFeedLayer, OverlayLayer, ChatLayer, LayerType } from '../types/layers.js';
import { characterRenderer } from '../renderers/character-renderer.js';
import { visualFeedRenderer } from '../renderers/visual-feed-renderer.js';
import { overlayRenderer } from '../renderers/overlay-renderer.js';
import { chatRenderer } from '../renderers/chat-renderer.js';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';
import type { LogContext } from '../utils/logger.js';
import { Registry, Gauge } from 'prom-client';

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

interface RenderContext {
  canvas: ReturnType<typeof createCanvas>;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
}

function isValidLayerType(type: string): type is LayerType {
  return ['host', 'assistant', 'visualFeed', 'overlay', 'chat'].includes(type);
}

export class LayerRenderer {
  private static instance: LayerRenderer;
  private mainContext: RenderContext;
  private layerContexts: Map<string, RenderContext> = new Map();
  private renderInterval: NodeJS.Timeout | null = null;
  private lastFrameTime: number = 0;
  private targetFPS: number = 30;
  private frameInterval: number;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;
  private isHealthy: boolean = true;
  private lastError: Error | null = null;
  private renderTimes: number[] = [];

  private constructor() {
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    this.mainContext = {
      canvas,
      ctx,
      width: 1920,
      height: 1080,
      scale: 1
    };
    this.frameInterval = 1000 / this.targetFPS;

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Layer renderer initialized', {
      width: this.mainContext.width,
      height: this.mainContext.height,
      targetFPS: this.targetFPS
    } as LogContext);
  }

  private startMetricsCollection(): void {
    // Update memory usage every 5 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      memoryUsageGauge.set(memUsage.heapUsed);
      
      // Update layer count
      const layers = layerManager.getAllLayers();
      layerCountGauge.set(layers.length);
    }, 5000);
  }

  public static getInstance(): LayerRenderer {
    if (!LayerRenderer.instance) {
      LayerRenderer.instance = new LayerRenderer();
    }
    return LayerRenderer.instance;
  }

  public getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getHealth(): {
    status: 'healthy' | 'unhealthy';
    fps: number;
    targetFPS: number;
    averageRenderTime: number;
    lastError: string | null;
    memoryUsage: NodeJS.MemoryUsage;
    layerCount: number;
  } {
    const averageRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;

    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      fps: this.currentFPS,
      targetFPS: this.targetFPS,
      averageRenderTime,
      lastError: this.lastError?.message || null,
      memoryUsage: process.memoryUsage(),
      layerCount: layerManager.getAllLayers().length
    };
  }

  private createRenderContext(width: number, height: number, scale: number = 1): RenderContext {
    const canvas = createCanvas(width * scale, height * scale);
    const ctx = canvas.getContext('2d');
    
    // Enable high-quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    return {
      canvas,
      ctx,
      width,
      height,
      scale
    };
  }

  public initialize(config: { width: number; height: number; targetFPS: number }): void {
    const { width, height, targetFPS } = config;
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;
    this.mainContext = this.createRenderContext(width, height);
    
    logger.info('Initialized LayerRenderer', { 
      width, 
      height, 
      targetFPS 
    } as LogContext);
  }

  public startRenderLoop(): void {
    if (this.renderInterval !== null) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;
    this.frameCount = 0;

    this.renderInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= this.frameInterval) {
        this.render();
        this.frameCount++;
        this.lastFrameTime = now - (elapsed % this.frameInterval);

        // Update FPS every second
        if (now - this.lastFPSUpdate >= 1000) {
          this.currentFPS = this.frameCount;
          frameRateGauge.set(this.currentFPS);
          this.frameCount = 0;
          this.lastFPSUpdate = now;
        }
      }
    }, this.frameInterval);

    logger.info('Started render loop');
  }

  public stopRenderLoop(): void {
    if (this.renderInterval !== null) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
      logger.info('Stopped render loop');
    }
  }

  private async render(): Promise<void> {
    const { ctx, width, height } = this.mainContext;
    const renderStartTime = performance.now();

    // Clear the main canvas
    ctx.clearRect(0, 0, width, height);

    try {
      // Get all layers sorted by z-index
      const layers = layerManager.getAllLayers();
      
      logger.info('Starting frame render', {
        totalLayers: layers.length,
        layerInfo: layers.map(l => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
          opacity: l.opacity,
          zIndex: l.zIndex,
          transform: l.transform
        }))
      });

      // Render each visible layer
      for (const layer of layers) {
        // Update visibility metric with string labels
        const labels = {
          layer_id: String(layer.id),
          layer_type: String(layer.type)
        };
        
        layerVisibilityGauge.set(labels, layer.visible && layer.opacity > 0 ? 1 : 0);

        if (!layer.visible || layer.opacity === 0) {
          logger.debug('Skipping invisible layer', {
            layerId: layer.id,
            type: layer.type,
            visible: layer.visible,
            opacity: layer.opacity
          });
          continue;
        }

        const layerStartTime = performance.now();
        await this.renderLayer(layer);
        const layerRenderTime = performance.now() - layerStartTime;
        
        // Update layer render time metric with same string labels
        layerRenderTimeGauge.set(labels, layerRenderTime);

        logger.debug('Layer rendered', {
          layerId: layer.id,
          type: layer.type,
          renderTime: layerRenderTime,
          transform: layer.transform
        });
      }

      // Track render time
      const renderTime = performance.now() - renderStartTime;
      this.renderTimes.push(renderTime);
      if (this.renderTimes.length > 60) { // Keep last 60 samples
        this.renderTimes.shift();
      }
      renderTimeGauge.set(renderTime);

      logger.debug('Frame render complete', {
        totalTime: renderTime,
        fps: this.currentFPS,
        layerCount: layers.length
      });

      this.isHealthy = true;
      this.lastError = null;
    } catch (error) {
      this.isHealthy = false;
      this.lastError = error instanceof Error ? error : new Error('Unknown render error');
      lastRenderErrorGauge.set(Date.now());
      logger.error('Error during render', {
        error: this.lastError.message,
        stack: this.lastError instanceof Error ? this.lastError.stack : undefined
      });
    }
  }

  private async renderLayer(layer: Layer): Promise<void> {
    const { ctx } = this.mainContext;

    // Save main context state
    ctx.save();

    try {
      logger.debug('Rendering layer', {
        layerId: layer.id,
        type: layer.type,
        transform: layer.transform,
        opacity: layer.opacity
      });

      // Apply layer transform
      this.applyTransform(ctx, layer.transform);

      // Set layer opacity
      ctx.globalAlpha = layer.opacity;

      // Render layer content based on type
      switch (layer.type) {
        case 'host':
          await characterRenderer.renderCharacter(ctx, layer);
          break;
        case 'assistant':
          await characterRenderer.renderCharacter(ctx, layer);
          break;
        case 'visualFeed':
          await visualFeedRenderer.renderVisualFeed(ctx, layer.content, this.mainContext.width, this.mainContext.height);
          break;
        case 'overlay':
          await overlayRenderer.renderOverlay(ctx, layer.content, this.mainContext.width, this.mainContext.height);
          break;
        case 'chat':
          await chatRenderer.renderChat(ctx, layer, this.mainContext.width, this.mainContext.height);
          break;
        default: {
          // This case is unreachable because we've handled all possible layer types
          throw new Error('Unsupported layer type');
        }
      }
    } catch (error) {
      logger.error('Failed to render layer', {
        layerId: layer.id,
        type: layer.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      // Restore main context state
      ctx.restore();
    }
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: Transform): void {
    const { position, scale, rotation, anchor } = transform;
    
    ctx.translate(position.x, position.y);
    ctx.rotate(rotation);
    ctx.scale(scale.x, scale.y);
    ctx.translate(-anchor.x, -anchor.y);
  }

  public getCanvas(): ReturnType<typeof createCanvas> {
    return this.mainContext.canvas;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.mainContext.ctx;
  }

  public setResolution(width: number, height: number): void {
    this.mainContext = this.createRenderContext(width, height);
    this.layerContexts.clear(); // Clear all layer contexts to force recreation
    logger.info('Updated renderer resolution', { width, height } as LogContext);
  }

  public cleanup(): void {
    this.stopRenderLoop();
    this.layerContexts.clear();
    logger.info('Cleaned up LayerRenderer');
  }

  public resize(width: number, height: number): void {
    this.mainContext.width = width;
    this.mainContext.height = height;
    logger.info('Canvas resized', { width, height } as LogContext);
  }
}

export const layerRenderer = LayerRenderer.getInstance(); 