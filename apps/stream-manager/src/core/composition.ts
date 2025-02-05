import sharp from 'sharp';
import { EventEmitter } from 'events';
import type { Asset, Scene, Transition } from '../types/layout.js';
import type { ViewportDimensions } from '../types/viewport.js';
import { logger } from '../utils/logger.js';

interface CompositeOperation {
  input: Buffer;
  top: number;
  left: number;
  blend: sharp.Blend;
  opacity?: number;
}

export class CompositionEngine extends EventEmitter {
  private static instance: CompositionEngine | null = null;
  private dimensions: ViewportDimensions;
  private compositeCache: Map<string, { buffer: Buffer; timestamp: number }>;
  private readonly CACHE_TTL = 5000; // 5 seconds

  private constructor(width: number = 1920, height: number = 1080) {
    super();
    this.dimensions = {
      width,
      height,
      aspectRatio: width / height
    };
    this.compositeCache = new Map();

    logger.info('Composition engine initialized', {
      dimensions: this.dimensions,
      version: sharp.versions
    });
  }

  public static getInstance(): CompositionEngine {
    if (!CompositionEngine.instance) {
      CompositionEngine.instance = new CompositionEngine();
    }
    return CompositionEngine.instance;
  }

  public async renderScene(scene: Scene, transition?: Transition): Promise<Buffer> {
    const startTime = performance.now();

    try {
      // Create base canvas
      const baseImage = sharp({
        create: {
          width: this.dimensions.width,
          height: this.dimensions.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      });

      // Sort assets by z-index
      const sortedAssets = [...scene.assets]
        .filter(asset => asset.visible)
        .sort((a, b) => a.zIndex - b.zIndex);

      // Prepare composite operations
      const compositeOps: CompositeOperation[] = [];

      // Process each asset
      for (const asset of sortedAssets) {
        const assetBuffer = await this.renderAsset(asset);
        if (!assetBuffer) continue;

        compositeOps.push({
          input: assetBuffer,
          top: Math.round(asset.position.y),
          left: Math.round(asset.position.x),
          blend: 'over',
          opacity: asset.transform.opacity
        });
      }

      // Apply transition if provided
      if (transition) {
        // TODO: Implement transition effects
      }

      // Composite all layers
      const composited = await baseImage
        .composite(compositeOps)
        .toBuffer();

      const endTime = performance.now();
      logger.debug('Scene rendered', {
        sceneId: scene.id,
        duration: endTime - startTime,
        assetCount: sortedAssets.length
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

  private async renderAsset(asset: Asset): Promise<Buffer | null> {
    const cacheKey = this.getAssetCacheKey(asset);
    const cached = this.compositeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.buffer;
    }

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
      const transformed = await assetImage
        .rotate(asset.transform.rotation)
        .resize(
          Math.round(this.dimensions.width * asset.transform.scale),
          Math.round(this.dimensions.height * asset.transform.scale),
          {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        )
        .toBuffer();

      // Cache the result
      this.compositeCache.set(cacheKey, {
        buffer: transformed,
        timestamp: Date.now()
      });

      return transformed;
    } catch (error) {
      logger.error('Error rendering asset', {
        assetId: asset.id,
        type: asset.type,
        error
      });
      return null;
    }
  }

  private getAssetCacheKey(asset: Asset): string {
    return `${asset.id}_${asset.transform.rotation}_${asset.transform.scale}`;
  }

  public updateDimensions(width: number, height: number): void {
    this.dimensions = {
      width,
      height,
      aspectRatio: width / height
    };
    this.compositeCache.clear();
    this.emit('dimensions:updated', this.dimensions);
  }

  public clearCache(): void {
    this.compositeCache.clear();
    this.emit('cache:cleared');
  }
} 