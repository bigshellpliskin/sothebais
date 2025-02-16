import sharp from 'sharp';
import { EventEmitter } from 'events';
import type { 
  Scene,
  Asset,
  Quadrant,
  QuadrantId,
  Position
} from './scene-manager.js';
import { logger } from '../utils/logger.js';

interface CompositeOperation {
  input: Buffer;
  top: number;
  left: number;
  blend: sharp.Blend;
  opacity?: number;
}

interface RenderCache {
  buffer: Buffer;
  timestamp: number;
  hash: string;  // Hash of state for quick comparison
}

export class CompositionEngine extends EventEmitter {
  private static instance: CompositionEngine | null = null;
  private canvas: { width: number; height: number; aspectRatio: number };
  private renderCache: Map<string, RenderCache>;
  private readonly CACHE_TTL = 5000; // 5 seconds

  private constructor(width: number = 1920, height: number = 1080) {
    super();
    this.canvas = {
      width,
      height,
      aspectRatio: width / height
    };
    this.renderCache = new Map();

    logger.info('Composition engine initialized', {
      canvas: this.canvas,
      version: sharp.versions
    });
  }

  public static getInstance(): CompositionEngine {
    if (!CompositionEngine.instance) {
      CompositionEngine.instance = new CompositionEngine();
    }
    return CompositionEngine.instance;
  }

  public async renderScene(scene: Scene): Promise<Buffer> {
    const startTime = performance.now();

    try {
      // Create base canvas
      const baseImage = sharp({
        create: {
          width: this.canvas.width,
          height: this.canvas.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      });

      const compositeOps: CompositeOperation[] = [];

      // 1. Render background assets
      const backgroundOps = await this.renderBackgroundAssets(scene.background);
      compositeOps.push(...backgroundOps);

      // 2. Render quadrant assets
      const quadrantOps = await this.renderQuadrants(scene.quadrants);
      compositeOps.push(...quadrantOps);

      // 3. Render overlay assets
      const overlayOps = await this.renderOverlayAssets(scene.overlay);
      compositeOps.push(...overlayOps);

      // Composite all operations
      const composited = await baseImage
        .composite(compositeOps)
        .toBuffer();

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.emit('render:complete', {
        sceneId: scene.id,
        duration
      });

      return composited;
    } catch (error) {
      logger.error('Error rendering scene', {
        sceneId: scene.id,
        error
      });
      throw error;
    }
  }

  private async renderBackgroundAssets(assets: Asset[]): Promise<CompositeOperation[]> {
    const ops: CompositeOperation[] = [];
    
    // Sort by z-index
    const sortedAssets = [...assets].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const asset of sortedAssets) {
      if (!asset.visible) continue;

      const assetBuffer = await this.renderAsset(asset);
      if (!assetBuffer) continue;

      ops.push({
        input: assetBuffer,
        top: Math.round(asset.position.y),
        left: Math.round(asset.position.x),
        blend: 'over',
        opacity: asset.transform.opacity
      });
    }

    return ops;
  }

  private async renderQuadrants(quadrants: Map<QuadrantId, Quadrant>): Promise<CompositeOperation[]> {
    const ops: CompositeOperation[] = [];
    
    for (const [_, quadrant] of quadrants) {
      if (quadrant.id === 0) continue; // Skip absolute positioning quadrant

      // Sort assets by z-index within quadrant
      const sortedAssets = [...quadrant.assets].sort((a, b) => a.zIndex - b.zIndex);
      
      for (const asset of sortedAssets) {
        if (!asset.visible) continue;

        const assetBuffer = await this.renderAsset(asset);
        if (!assetBuffer) continue;

        // Position is relative to quadrant bounds
        ops.push({
          input: assetBuffer,
          top: Math.round(asset.position.y),
          left: Math.round(asset.position.x),
          blend: 'over',
          opacity: asset.transform.opacity
        });
      }
    }

    return ops;
  }

  private async renderOverlayAssets(assets: Asset[]): Promise<CompositeOperation[]> {
    const ops: CompositeOperation[] = [];
    
    // Sort by z-index
    const sortedAssets = [...assets].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const asset of sortedAssets) {
      if (!asset.visible) continue;

      const assetBuffer = await this.renderAsset(asset);
      if (!assetBuffer) continue;

      ops.push({
        input: assetBuffer,
        top: Math.round(asset.position.y),
        left: Math.round(asset.position.x),
        blend: 'over',
        opacity: asset.transform.opacity
      });
    }

    return ops;
  }

  private async renderAsset(asset: Asset): Promise<Buffer | null> {
    try {
      let assetImage: sharp.Sharp;

      switch (asset.type) {
        case 'image':
          assetImage = sharp(asset.source);
          break;

        case 'text':
          // TODO: Implement text rendering
          return null;

        case 'video':
          // TODO: Implement video frame extraction
          return null;

        case 'vtuber':
          // TODO: Implement VTuber model rendering
          return null;

        case 'overlay':
          // TODO: Implement overlay composition
          return null;

        default:
          logger.warn('Unsupported asset type', {
            type: asset.type,
            assetId: asset.id
          });
          return null;
      }

      // Apply transformations
      return await assetImage
        .rotate(asset.transform.rotation)
        .resize(
          Math.round(this.canvas.width * asset.transform.scale),
          Math.round(this.canvas.height * asset.transform.scale),
          {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        )
        .toBuffer();
    } catch (error) {
      logger.error('Error rendering asset', {
        assetId: asset.id,
        type: asset.type,
        error
      });
      return null;
    }
  }

  public updateDimensions(width: number, height: number): void {
    this.canvas = {
      width,
      height,
      aspectRatio: width / height
    };
    this.renderCache.clear();
    this.emit('dimensions:updated', this.canvas);
  }

  public clearCache(): void {
    this.renderCache.clear();
    this.emit('cache:cleared');
  }
} 