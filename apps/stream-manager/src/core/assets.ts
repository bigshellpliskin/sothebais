import { EventEmitter } from 'events';
import sharp from 'sharp';
import { logger, logStreamEvent } from '../utils/logger.js';
import type { Asset, Position, Transform } from '@sothebais/packages/types/scene';

type AssetType = Asset['type'];

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
          // Create text as SVG using sharp
          const svg = `
            <svg width="500" height="100">
              <text
                x="50%"
                y="50%"
                font-family="Arial"
                font-size="24"
                fill="white"
                text-anchor="middle"
                dominant-baseline="middle"
              >${source}</text>
            </svg>
          `;
          const textImage = sharp(Buffer.from(svg));
          metadata = await textImage.metadata();
          buffer = await textImage.png().toBuffer();
          break;

        case 'video':
          // Extract frame from video using ffmpeg
          const ffmpeg = (await import('fluent-ffmpeg')).default;
          const tempPath = `/tmp/frame_${Date.now()}.png`;
          
          await new Promise((resolve, reject) => {
            ffmpeg(source)
              .screenshots({
                timestamps: ['00:00:00'],
                filename: tempPath,
                size: '1280x720'
              })
              .on('end', resolve)
              .on('error', reject);
          });
          
          const videoFrame = sharp(tempPath);
          metadata = await videoFrame.metadata();
          buffer = await videoFrame.toBuffer();
          break;

        case 'stream':
          // Handle live stream source using ffmpeg
          const streamFfmpeg = (await import('fluent-ffmpeg')).default;
          const streamPath = `/tmp/stream_${Date.now()}.png`;
          
          await new Promise((resolve, reject) => {
            streamFfmpeg(source)
              .outputOptions(['-vframes 1'])
              .output(streamPath)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });
          
          const streamFrame = sharp(streamPath);
          metadata = await streamFrame.metadata();
          buffer = await streamFrame.toBuffer();
          break;

        case 'overlay':
          // Create overlay using sharp with compositing
          const overlayData = JSON.parse(source);
          const baseImage = sharp({
            create: {
              width: overlayData.width || 1280,
              height: overlayData.height || 720,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
          });
          
          if (overlayData.elements) {
            const compositeOperations = overlayData.elements.map((element: any) => ({
              input: Buffer.from(element.data),
              top: element.y,
              left: element.x,
              blend: element.blend || 'over'
            }));
            
            await baseImage.composite(compositeOperations);
          }
          
          metadata = await baseImage.metadata();
          buffer = await baseImage.png().toBuffer();
          break;

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
    position: Position,
    transform: Transform & { opacity: number },
    metadata?: Record<string, unknown>
  ): Asset {
    // Create base asset without optional properties
    const asset: Omit<Asset, 'metadata'> = {
      id: `asset_${Date.now()}`,
      type,
      source,
      position,
      transform: {
        ...transform,
        anchor: { x: 0.5, y: 0.5 } // Default center anchor
      },
      zIndex: 0,
      visible: true
    };

    // Add metadata only if it's provided
    if (metadata !== undefined) {
      return { ...asset, metadata };
    }

    return asset;
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

  public async storeAsset(source: string, data: Buffer): Promise<void> {
    // Store as a generic image type since we're just caching the buffer
    const cacheKey = this.getCacheKey(source, 'image');
    this.assetCache.set(cacheKey, {
      buffer: data,
      timestamp: Date.now()
    });
    this.emit('asset:stored', { source });
  }

  public async deleteAsset(source: string): Promise<void> {
    // Use image type since that's how we stored it
    const cacheKey = this.getCacheKey(source, 'image');
    this.assetCache.delete(cacheKey);
    this.emit('asset:deleted', { source });
  }

  public async cleanup(): Promise<void> {
    this.clearCache();
    this.emit('cleanup:complete');
  }
} 