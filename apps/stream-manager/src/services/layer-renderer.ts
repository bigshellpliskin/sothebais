import { createCanvas } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import { layerManager } from './layer-manager.js';
import type { Layer, Transform, Point2D, HostLayer, AssistantLayer, VisualFeedLayer, OverlayLayer } from '../types/layers.js';
import { characterRenderer } from '../renderers/character-renderer.js';
import { visualFeedRenderer } from '../renderers/visual-feed-renderer.js';
import { overlayRenderer } from '../renderers/overlay-renderer.js';
import { chatRenderer } from '../renderers/chat-renderer.js';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';
import type { LogContext } from '../utils/logger.js';

interface RenderContext {
  canvas: ReturnType<typeof createCanvas>;
  ctx: CanvasRenderingContext2D;
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

    logger.info('Layer renderer initialized', {
      width: this.mainContext.width,
      height: this.mainContext.height,
      targetFPS: this.targetFPS
    } as LogContext);
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
    this.renderInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= this.frameInterval) {
        this.render();
        this.lastFrameTime = now - (elapsed % this.frameInterval);
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
    } catch (error) {
      logger.error('Error during render', { error } as LogContext);
    }
  }

  private async renderLayer(layer: Layer): Promise<void> {
    const { ctx } = this.mainContext;

    // Save main context state
    ctx.save();

    try {
      logger.debug('Rendering layer', { layerId: layer.id } as LogContext);
      // Apply layer transform
      this.applyTransform(ctx, layer.transform);

      // Set layer opacity
      ctx.globalAlpha = layer.opacity;

      // Render layer content based on type
      switch (layer.type) {
        case 'host':
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
          const unknownLayer = layer as Layer;
          logger.warn('Unknown layer type', { layerId: unknownLayer.id } as LogContext);
        }
      }
    } catch (error) {
      logger.error('Failed to render layer', { error, layerId: layer.id } as LogContext);
    } finally {
      // Restore main context state
      ctx.restore();
    }
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: Transform): void {
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