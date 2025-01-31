import { SKRSContext2D, Image, loadImage } from '@napi-rs/canvas';
import { logger } from '../utils/logger';
import { NFTContent } from '../types/layers';
import path from 'path';

interface NFTResources {
  image: Image;
  lastUpdated: number;
  isLoading: boolean;
  metadata: Record<string, unknown>;
}

export class VisualFeedRenderer {
  private static instance: VisualFeedRenderer;
  private nftResources: Map<string, NFTResources> = new Map();
  private resourceTimeout: number = 5 * 60 * 1000; // 5 minutes

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
    ctx: SKRSContext2D,
    content: NFTContent,
    width: number,
    height: number
  ): Promise<void> {
    try {
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
      if (Object.keys(resources.metadata).length > 0) {
        this.renderMetadataOverlay(ctx, resources.metadata, width, height);
      }

    } catch (error) {
      logger.error({ error }, 'Error rendering visual feed');
      this.renderErrorState(ctx, width, height);
    }
  }

  private async getNFTResources(content: NFTContent): Promise<NFTResources | undefined> {
    const resourceKey = content.imageUrl;
    let resources = this.nftResources.get(resourceKey);

    // Check if resources need to be reloaded
    if (resources && Date.now() - resources.lastUpdated > this.resourceTimeout) {
      this.nftResources.delete(resourceKey);
      resources = undefined;
    }

    if (!resources) {
      // Start loading resources
      const newResources: NFTResources = {
        image: null as unknown as Image,
        lastUpdated: Date.now(),
        isLoading: true,
        metadata: content.metadata || {}
      };
      this.nftResources.set(resourceKey, newResources);

      try {
        // Convert URL path to filesystem path
        const imagePath = this.urlToFilePath(content.imageUrl);

        // Load NFT image
        const image = await loadImage(imagePath);
        newResources.image = image;
        newResources.isLoading = false;
        newResources.lastUpdated = Date.now();

        logger.info({
          imagePath,
          metadata: content.metadata
        }, 'NFT resources loaded');

        return newResources;
      } catch (error) {
        logger.error({ error }, 'Failed to load NFT resources');
        this.nftResources.delete(resourceKey);
        return undefined;
      }
    }

    return resources;
  }

  private renderMetadataOverlay(
    ctx: SKRSContext2D,
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

  private renderLoadingState(ctx: SKRSContext2D, width: number, height: number): void {
    // Draw loading indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading NFT content...', width / 2, height / 2);
  }

  private renderErrorState(ctx: SKRSContext2D, width: number, height: number): void {
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
    this.nftResources.clear();
    logger.info('Cleared NFT resources cache');
  }
}

export const visualFeedRenderer = VisualFeedRenderer.getInstance(); 