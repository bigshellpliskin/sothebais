import { createCanvas, loadImage } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import type { NFTContent } from '../types/layers.js';
import path from 'path';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';

interface ImageResource {
  image: Awaited<ReturnType<typeof loadImage>>;
  lastUpdated: number;
  isLoading: boolean;
}

export class VisualFeedRenderer {
  private static instance: VisualFeedRenderer;
  private imageResources: Map<string, ImageResource> = new Map();
  private resourceTimeout: number = 5 * 60 * 1000; // 5 minutes
  private context: ReturnType<ReturnType<typeof createCanvas>['getContext']> | null = null;

  private constructor() {}

  public static getInstance(): VisualFeedRenderer {
    if (!VisualFeedRenderer.instance) {
      VisualFeedRenderer.instance = new VisualFeedRenderer();
    }
    return VisualFeedRenderer.instance;
  }

  private urlToFilePath(urlPath: string): string {
    // If the path already starts with /app, use it as is
    if (urlPath.startsWith('/app/')) {
      return urlPath;
    }
    // Remove leading slash if present
    const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    // Convert to absolute path in the container
    return path.join('/app', cleanPath);
  }

  public async renderVisualFeed(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    content: NFTContent,
    width: number,
    height: number
  ): Promise<void> {
    try {
      this.context = ctx;
      await this.renderNFT(ctx, content, width, height);
    } catch (error) {
      logger.error('Failed to render visual feed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      this.renderErrorState(ctx, width, height);
    }
  }

  public async renderNFT(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    content: NFTContent,
    width: number,
    height: number
  ): Promise<void> {
    const resources = await this.getNFTResources(content);
    if (!resources || resources.isLoading) {
      this.renderLoadingState(ctx, width, height);
      return;
    }

    // Calculate aspect ratio preserving dimensions
    const aspectRatio = resources.image.width / resources.image.height;
    let drawWidth = width;
    let drawHeight = height;

    if (width / height > aspectRatio) {
      drawWidth = height * aspectRatio;
    } else {
      drawHeight = width / aspectRatio;
    }

    // Center the image
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    // Draw the NFT image
    ctx.drawImage(resources.image, x, y, drawWidth, drawHeight);

    // Draw metadata overlay if available
    if (Object.keys(content.metadata).length > 0) {
      this.renderMetadataOverlay(ctx, content.metadata, width, height);
    }
  }

  private async getNFTResources(content: NFTContent): Promise<ImageResource | undefined> {
    const resourceKey = content.imageUrl;
    let resources = this.imageResources.get(resourceKey);

    // Check if resources need to be reloaded
    if (resources && Date.now() - resources.lastUpdated > this.resourceTimeout) {
      this.imageResources.delete(resourceKey);
      resources = undefined;
    }

    if (!resources) {
      // Start loading resources
      const newResources: ImageResource = {
        image: null as unknown as Awaited<ReturnType<typeof loadImage>>,
        lastUpdated: Date.now(),
        isLoading: true
      };
      this.imageResources.set(resourceKey, newResources);

      try {
        // Convert URL path to filesystem path
        const imagePath = this.urlToFilePath(content.imageUrl);

        // Load NFT image
        const image = await loadImage(imagePath);
        newResources.image = image;
        newResources.isLoading = false;
        newResources.lastUpdated = Date.now();

        logger.info('NFT resources loaded', {
          imagePath,
          metadata: content.metadata
        } as LogContext);

        return newResources;
      } catch (error) {
        logger.error('Failed to load NFT resources', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        this.imageResources.delete(resourceKey);
        return undefined;
      }
    }

    return resources;
  }

  private renderMetadataOverlay(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    metadata: Record<string, unknown>,
    width: number,
    height: number
  ): void {
    // Create semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, height - 100, width, 100);

    // Render metadata
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padding = 10;
    let y = height - 90;

    // Render key metadata fields
    const importantFields = ['name', 'collection', 'creator', 'price'];
    importantFields.forEach(field => {
      if (metadata[field]) {
        ctx.fillText(`${field}: ${metadata[field]}`, padding, y);
        y += 20;
      }
    });
  }

  private renderLoadingState(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading NFT content...', width / 2, height / 2);
  }

  private renderErrorState(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, width: number, height: number): void {
    // Draw error state
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Error loading NFT content', width / 2, height / 2);
  }

  public clearCache(): void {
    this.imageResources.clear();
    logger.info('Cleared NFT resources cache');
  }
}

export const visualFeedRenderer = VisualFeedRenderer.getInstance(); 