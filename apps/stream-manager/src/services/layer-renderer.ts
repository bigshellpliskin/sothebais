import { createCanvas } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import { layerManager } from './layer-manager.js';
import type { Layer, Transform, Point2D, HostLayer, AssistantLayer, VisualFeedLayer, OverlayLayer } from '../types/layers.js';
import { metricsCollector } from '../utils/metrics.js';
import { characterRenderer } from '../renderers/character-renderer.js';
import { visualFeedRenderer } from '../renderers/visual-feed-renderer.js';
import { overlayRenderer } from '../renderers/overlay-renderer.js';
import { chatRenderer } from '../renderers/chat-renderer.js';

interface RenderContext {
  canvas: ReturnType<typeof createCanvas>;
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>;
  width: number;
  height: number;
  scale: number;
}

export class LayerRenderer {
  private static instance: LayerRenderer;
  private mainContext: RenderContext;
  private layerContexts: Map<string, RenderContext> = new Map();
  private renderInterval: NodeJS.Timeout | null = null;
  private lastFrameTime: number = 0;
  private targetFPS: number = 30;
  private frameInterval: number;

  private constructor() {
    this.frameInterval = 1000 / this.targetFPS;
    this.mainContext = this.createRenderContext(1920, 1080);
  }

  public static getInstance(): LayerRenderer {
    if (!LayerRenderer.instance) {
      LayerRenderer.instance = new LayerRenderer();
    }
    return LayerRenderer.instance;
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
    
    logger.info({ 
      width, 
      height, 
      targetFPS 
    }, 'Initialized LayerRenderer');
  }

  public startRenderLoop(): void {
    if (this.renderInterval !== null) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.renderInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= this.frameInterval) {
        this.render();
        this.lastFrameTime = now - (elapsed % this.frameInterval);
        metricsCollector.updateFPS();
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

    // Clear the main canvas
    ctx.clearRect(0, 0, width, height);

    try {
      // Get all layers sorted by z-index
      const layers = layerManager.getAllLayers();

      // Render each visible layer
      for (const layer of layers) {
        if (!layer.visible || layer.opacity === 0) {
          continue;
        }

        await this.renderLayer(layer);
      }

      // Update metrics
      metricsCollector.updateStreamMetrics({
        fps: this.getCurrentFPS(),
        bufferHealth: 100, // TODO: Implement buffer health monitoring
        encoderLatency: 0  // TODO: Implement encoder latency monitoring
      });
    } catch (error) {
      logger.error({ error }, 'Error during render');
    }
  }

  private async renderLayer(layer: Layer): Promise<void> {
    const { ctx, width, height } = this.mainContext;

    // Get or create layer context
    let layerCtx = this.layerContexts.get(layer.id);
    if (!layerCtx) {
      layerCtx = this.createRenderContext(this.mainContext.width, this.mainContext.height);
      this.layerContexts.clear(); // Clear all layer contexts to force recreation
    }

    // Clear layer context
    layerCtx.ctx.clearRect(0, 0, layerCtx.width, layerCtx.height);

    // Save main context state
    ctx.save();

    try {
      // Apply layer transform
      this.applyTransform(ctx, layer.transform);

      // Set layer opacity
      ctx.globalAlpha = layer.opacity;

      // Render layer content based on type
      switch (layer.type) {
        case 'host':
        case 'assistant':
          await characterRenderer.renderCharacter(ctx, layer.character, width, height);
          break;
        case 'visualFeed':
          await visualFeedRenderer.renderVisualFeed(ctx, layer.content, width, height);
          break;
        case 'overlay':
          await overlayRenderer.renderOverlay(ctx, layer.content, width, height);
          break;
        case 'chat':
          await chatRenderer.renderChat(ctx, layer, width, height);
          break;
        default:
          logger.warn({ layer }, 'Unknown layer type');
      }
    } catch (error) {
      logger.error({ error, layerId: layer.id }, 'Error rendering layer');
    } finally {
      // Restore main context state
      ctx.restore();
    }
  }

  private applyTransform(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, transform: Transform): void {
    const { position, scale, rotation, anchor } = transform;
    
    // Move to position
    ctx.translate(position.x, position.y);
    
    // Apply rotation around anchor point
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-anchor.x, -anchor.y);
    
    // Apply scale
    ctx.scale(scale.x, scale.y);
  }

  private getCurrentFPS(): number {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    return elapsed > 0 ? Math.round(1000 / elapsed) : this.targetFPS;
  }

  public getCanvas(): ReturnType<typeof createCanvas> {
    return this.mainContext.canvas;
  }

  public getContext(): ReturnType<ReturnType<typeof createCanvas>['getContext']> {
    return this.mainContext.ctx;
  }

  public setResolution(width: number, height: number): void {
    this.mainContext = this.createRenderContext(width, height);
    this.layerContexts.clear(); // Clear all layer contexts to force recreation
    logger.info({ width, height }, 'Updated renderer resolution');
  }

  public cleanup(): void {
    this.stopRenderLoop();
    this.layerContexts.clear();
    logger.info('Cleaned up LayerRenderer');
  }
}

export const layerRenderer = LayerRenderer.getInstance(); 