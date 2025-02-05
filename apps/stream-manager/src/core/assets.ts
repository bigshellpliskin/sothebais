import { EventEmitter } from 'events';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import type { Asset, AssetType } from '../types/layout.js';
import type { ViewportPosition, ViewportTransform } from '../types/viewport.js';

interface AssetCache {
  buffer: Buffer;
  timestamp: number;
  metadata?: sharp.Metadata;
}

interface AssetLoadOptions {
  preload?: boolean;
  cacheLifetime?: number;
}

export class AssetManager extends EventEmitter {
  private static instance: AssetManager | null = null;
  private assetCache: Map<string, AssetCache>;
  private readonly DEFAULT_CACHE_TTL = 300000; // 5 minutes
  private readonly PRELOAD_BATCH_SIZE = 5;

  private constructor() {
    super();
    this.assetCache = new Map();
    logger.info('Asset manager initialized');
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public async loadAsset(
    source: string,
    type: AssetType,
    options: AssetLoadOptions = {}
  ): Promise<Buffer> {
    const cacheKey = this.getCacheKey(source, type);
    const cached = this.assetCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < (options.cacheLifetime || this.DEFAULT_CACHE_TTL)) {
      return cached.buffer;
    }

    try {
      let buffer: Buffer;
      let metadata: sharp.Metadata | undefined;

      switch (type) {
        case 'image':
          const image = sharp(source);
          metadata = await image.metadata();
          buffer = await image.toBuffer();
          break;

        case 'text':
          // TODO: Implement text rendering
          throw new Error('Text rendering not implemented');

        case 'video':
          // TODO: Implement video frame extraction
          throw new Error('Video frame extraction not implemented');

        case 'vtuber':
          // TODO: Implement VTuber model loading
          throw new Error('VTuber model loading not implemented');

        case 'overlay':
          // TODO: Implement overlay loading
          throw new Error('Overlay loading not implemented');

        default:
          throw new Error(`Unsupported asset type: ${type}`);
      }

      this.assetCache.set(cacheKey, {
        buffer,
        timestamp: Date.now(),
        metadata
      });

      this.emit('asset:loaded', { source, type, metadata });
      return buffer;
    } catch (error) {
      logger.error('Error loading asset', {
        source,
        type,
        error
      });
      throw error;
    }
  }

  public async preloadAssets(assets: Asset[]): Promise<void> {
    logger.info('Preloading assets', { count: assets.length });

    // Process assets in batches to avoid memory issues
    for (let i = 0; i < assets.length; i += this.PRELOAD_BATCH_SIZE) {
      const batch = assets.slice(i, i + this.PRELOAD_BATCH_SIZE);
      await Promise.all(
        batch.map(asset =>
          this.loadAsset(asset.source, asset.type, { preload: true })
            .catch(error => {
              logger.warn('Failed to preload asset', {
                source: asset.source,
                type: asset.type,
                error
              });
            })
        )
      );
    }

    logger.info('Asset preload complete');
  }

  public createAsset(
    type: AssetType,
    source: string,
    position: ViewportPosition,
    transform: ViewportTransform & { opacity: number },
    metadata?: Record<string, unknown>
  ): Asset {
    return {
      id: `asset_${Date.now()}`,
      type,
      source,
      position,
      transform: {
        ...transform,
        anchor: { x: 0.5, y: 0.5 } // Default center anchor
      },
      zIndex: 0,
      visible: true,
      metadata
    };
  }

  private getCacheKey(source: string, type: AssetType): string {
    return `${type}_${source}`;
  }

  public clearCache(): void {
    this.assetCache.clear();
    this.emit('cache:cleared');
  }

  public async getAssetMetadata(source: string, type: AssetType): Promise<sharp.Metadata | undefined> {
    const cacheKey = this.getCacheKey(source, type);
    const cached = this.assetCache.get(cacheKey);
    
    if (cached?.metadata) {
      return cached.metadata;
    }

    try {
      if (type === 'image') {
        return await sharp(source).metadata();
      }
      return undefined;
    } catch (error) {
      logger.error('Error getting asset metadata', {
        source,
        type,
        error
      });
      return undefined;
    }
  }
} 