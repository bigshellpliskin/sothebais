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
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  private isStreaming: boolean = false;
  private isPaused: boolean = false;
  private lastError: Error | null = null;
  private renderTimes: number[] = [];
  private lastLayerCount: number = 0;
  private layerCache: Map<string, {
    canvas: ReturnType<typeof createCanvas>;
    lastUpdated: number;
    hash: string;
  }> = new Map();
  private workers: Worker[] = [];
  private maxWorkers: number = 4;

  private constructor() {
    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    this.mainContext = {
      canvas,
      ctx,
      width: 1280,
      height: 720,
      scale: 1
    };
    this.frameInterval = 1000 / this.targetFPS;

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Layer renderer initialized', {
      width: this.mainContext.width,
      height: this.mainContext.height,
      targetFPS: this.targetFPS,
      resolution: '720p'
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
    isPaused: boolean;
  } {
    const averageRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;

    return {
      status: this.isStreaming && this.isHealthy ? 'healthy' : 'unhealthy',
      fps: this.currentFPS,
      targetFPS: this.targetFPS,
      averageRenderTime,
      lastError: this.lastError?.message || null,
      memoryUsage: process.memoryUsage(),
      layerCount: layerManager.getAllLayers().length,
      isPaused: this.isPaused
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

  private getLayerHash(layer: Layer): string {
    // Create a hash of the layer's content based on type
    const contentHash = (() => {
      switch (layer.type) {
        case 'host':
        case 'assistant':
          return JSON.stringify({
            modelUrl: layer.character.modelUrl,
            width: layer.character.width,
            height: layer.character.height
          });
        case 'visualFeed':
          return JSON.stringify({
            imageUrl: layer.content.imageUrl
          });
        case 'overlay':
          return JSON.stringify({
            content: layer.content.content,
            type: layer.content.type
          });
        case 'chat':
          // Only hash the last few messages to prevent constant cache invalidation
          const recentMessages = layer.content.messages.slice(-5);
          return JSON.stringify({
            messages: recentMessages,
            style: layer.content.style
          });
      }
    })();

    // Only include transform properties that affect rendering
    const transformHash = JSON.stringify({
      visible: layer.visible,
      opacity: layer.opacity,
      position: layer.transform.position,
      scale: layer.transform.scale,
      rotation: layer.transform.rotation
    });

    return `${layer.type}:${contentHash}:${transformHash}`;
  }

  public initialize(config: { width: number; height: number; targetFPS: number }): void {
    const { width, height, targetFPS } = config;
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;
    this.mainContext = this.createRenderContext(width, height);
    
    // Start cache cleanup
    this.startCacheCleanup();
    
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

    this.isStreaming = true;
    this.isHealthy = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;
    this.frameCount = 0;

    // Track consecutive slow frames
    let consecutiveSlowFrames = 0;
    const MAX_CONSECUTIVE_SLOW_FRAMES = 5;
    const FRAME_TIME_THRESHOLD = this.frameInterval * 1.5; // 50% longer than target

    this.renderInterval = setInterval(async () => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= this.frameInterval) {
        const renderStartTime = performance.now();
        
        // Skip frame if we're falling behind and have had multiple slow frames
        if (consecutiveSlowFrames >= MAX_CONSECUTIVE_SLOW_FRAMES && elapsed > this.frameInterval * 2) {
          // Only log every 5th skipped frame to reduce noise
          /*
          if (consecutiveSlowFrames % 5 === 0) {
            logger.warn('Multiple frames skipped due to performance issues', {
              elapsed,
              consecutiveSlowFrames,
              targetFrameTime: this.frameInterval
            } as LogContext);
          }
          */
          this.lastFrameTime = now;
          return;
        }

        await this.render();
        
        const renderTime = performance.now() - renderStartTime;
        
        // Track slow frames but don't log every one
        if (renderTime > FRAME_TIME_THRESHOLD) {
          consecutiveSlowFrames++;
          // Only log when we hit the threshold to reduce noise
          /*
          if (consecutiveSlowFrames === MAX_CONSECUTIVE_SLOW_FRAMES) {
            logger.warn('Performance degradation detected', {
              renderTime,
              consecutiveSlowFrames,
              targetFrameTime: this.frameInterval
            } as LogContext);
          }
          */
        } else {
          consecutiveSlowFrames = 0;
        }

        this.frameCount++;
        this.lastFrameTime = now - (elapsed % this.frameInterval);

        // Update FPS every second
        if (now - this.lastFPSUpdate >= 1000) {
          this.currentFPS = this.frameCount;
          frameRateGauge.set(this.currentFPS);
          
          // Log FPS calculation
          logger.info('FPS Update', {
            frameCount: this.frameCount,
            calculatedFPS: this.currentFPS,
            elapsedTime: now - this.lastFPSUpdate,
            timestamp: new Date().toISOString()
          } as LogContext);
          
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
      this.isStreaming = false;
      this.isPaused = false;
      this.currentFPS = 0;
      
      // Clear the canvas when stopping (not when pausing)
      const { ctx, width, height } = this.mainContext;
      ctx.clearRect(0, 0, width, height);
      // Fill with a dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      logger.info('Stopped render loop and cleared canvas');
    }
  }

  public pauseRenderLoop(): void {
    if (this.renderInterval !== null) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
      this.isStreaming = false;
      this.isPaused = true;
      this.currentFPS = 0;
      logger.info('Paused render loop');
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
      
      // Log layer state before rendering
      /*
      logger.debug('Starting frame render', {
        totalLayers: layers.length,
        layerStates: layers.map(l => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
          opacity: l.opacity,
          zIndex: l.zIndex
        }))
      } as LogContext);
      */

      // Only log significant changes in layer count or composition
      /*
      if (this.lastLayerCount !== layers.length) {
        logger.info('Layer composition changed', {
          totalLayers: layers.length,
          layerTypes: layers.map(l => l.type)
        } as LogContext);
        this.lastLayerCount = layers.length;
      }
      */

      // Render each visible layer
      for (const layer of layers) {
        // Update metrics without logging
        const labels = {
          layer_id: String(layer.id),
          layer_type: String(layer.type)
        };
        
        layerVisibilityGauge.set(labels, layer.visible && layer.opacity > 0 ? 1 : 0);

        if (!layer.visible || layer.opacity === 0) {
          /*
          logger.debug('Skipping invisible layer', {
            layerId: layer.id,
            type: layer.type,
            visible: layer.visible,
            opacity: layer.opacity
          } as LogContext);
          */
          continue;
        }

        /*
        logger.debug('Rendering layer', {
          layerId: layer.id,
          type: layer.type,
          visible: layer.visible,
          opacity: layer.opacity,
          zIndex: layer.zIndex
        } as LogContext);
        */

        const layerStartTime = performance.now();
        await this.renderLayer(layer);
        const layerRenderTime = performance.now() - layerStartTime;
        
        // Update metrics without logging
        layerRenderTimeGauge.set(labels, layerRenderTime);
      }

      // Track render time
      const renderTime = performance.now() - renderStartTime;
      this.renderTimes.push(renderTime);
      if (this.renderTimes.length > 60) {
        this.renderTimes.shift();
      }
      renderTimeGauge.set(renderTime);

      // Only log severe performance issues (more than 2x target frame time)
      // or when we have sustained performance problems
      const averageRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
      /*
      if (renderTime > (1000 / this.targetFPS) * 2 || 
          (averageRenderTime > (1000 / this.targetFPS) * 1.5 && this.renderTimes.length >= 30)) {
        logger.warn('Significant performance degradation detected', {
          renderTime,
          averageRenderTime,
          targetFrameTime: 1000 / this.targetFPS,
          fps: this.currentFPS,
          sustainedIssue: averageRenderTime > (1000 / this.targetFPS) * 1.5
        } as LogContext);
      }
      */

      this.isHealthy = true;
      this.lastError = null;
    } catch (error) {
      this.isHealthy = false;
      this.lastError = error instanceof Error ? error : new Error('Unknown render error');
      lastRenderErrorGauge.set(Date.now());
      logger.error('Error during render', {
        error: this.lastError.message,
        stack: this.lastError instanceof Error ? this.lastError.stack : undefined
      } as LogContext);
    }
  }

  private async renderLayer(layer: Layer): Promise<void> {
    const { ctx } = this.mainContext;
    
    if (!layer.visible || layer.opacity === 0) {
      return;
    }

    const currentHash = this.getLayerHash(layer);
    const cached = this.layerCache.get(layer.id);
    
    // Use cached version if available and content hasn't changed
    if (cached && cached.hash === currentHash) {
      // Apply opacity even when using cached version
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(cached.canvas, 0, 0);
      ctx.globalAlpha = 1;
      return;
    }

    // Create a new canvas for this layer
    const layerCanvas = createCanvas(this.mainContext.width, this.mainContext.height);
    const layerCtx = layerCanvas.getContext('2d');

    // Apply transforms to the layer context
    if (layer.transform) {
      this.applyTransform(layerCtx, layer.transform);
    }

    const renderStartTime = performance.now();

    try {
      // Render the layer content
      switch (layer.type) {
        case 'host':
        case 'assistant':
          await characterRenderer.renderCharacter(layerCtx, layer);
          break;
        case 'visualFeed': {
          const visualLayer = layer as VisualFeedLayer;
          await visualFeedRenderer.renderVisualFeed(layerCtx, visualLayer.content, this.mainContext.width, this.mainContext.height);
          break;
        }
        case 'overlay': {
          const overlayLayer = layer as OverlayLayer;
          await overlayRenderer.renderOverlay(layerCtx, overlayLayer.content, this.mainContext.width, this.mainContext.height);
          break;
        }
        case 'chat': {
          const chatLayer = layer as ChatLayer;
          await chatRenderer.renderChat(layerCtx, chatLayer, this.mainContext.width, this.mainContext.height);
          break;
        }
      }

      // Cache the rendered layer
      this.layerCache.set(layer.id, {
        canvas: layerCanvas,
        lastUpdated: Date.now(),
        hash: currentHash
      });

      // Draw the layer to the main canvas with proper opacity
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.globalAlpha = 1;

      // Update metrics
      const renderTime = performance.now() - renderStartTime;
      layerRenderTimeGauge.set({ layer_id: layer.id, layer_type: layer.type }, renderTime);
      layerVisibilityGauge.set({ layer_id: layer.id, layer_type: layer.type }, layer.visible ? 1 : 0);

    } catch (error) {
      logger.error('Failed to render layer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        layerId: layer.id,
        layerType: layer.type
      } as LogContext);
      
      // Remove failed layer from cache
      this.layerCache.delete(layer.id);
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

  private async initializeWorkers() {
    const workerPath = join(dirname(fileURLToPath(import.meta.url)), '../workers/render-worker.ts');
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(workerPath, {
        execArgv: ['--loader', 'tsx']
      });
      
      const workerState = {
        worker,
        isBusy: false
      };
      worker.on('message', (message: { type: string; data?: any }) => {
        if (message.type === 'render_complete') {
          // Handle render complete message
          const { layerId, renderedCanvas } = message.data;
          if (layerId && renderedCanvas) {
            this.layerCache.set(layerId, {
              canvas: renderedCanvas,
              lastUpdated: Date.now(),
              hash: '' // TODO: Add hash calculation if needed
            });
          }
          workerState.isBusy = false;
        } else if (message.type === 'ready') {
          workerState.isBusy = false;
        }
      });
      
      this.workers.push(worker);
    }
  }
}

export const layerRenderer = LayerRenderer.getInstance(); 