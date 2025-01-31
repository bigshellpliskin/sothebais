import { createCanvas, loadImage } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import type { VTuberCharacter } from '../types/layers.js';
import { metricsCollector } from '../utils/metrics.js';
import path from 'path';

interface CharacterResources {
  model: Awaited<ReturnType<typeof loadImage>>;
  texture: Awaited<ReturnType<typeof loadImage>> | null;
  lastUpdated: number;
  isLoading: boolean;
}

export class CharacterRenderer {
  private static instance: CharacterRenderer;
  private characterResources: Map<string, CharacterResources> = new Map();
  private resourceTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): CharacterRenderer {
    if (!CharacterRenderer.instance) {
      CharacterRenderer.instance = new CharacterRenderer();
    }
    return CharacterRenderer.instance;
  }

  private urlToFilePath(urlPath: string): string {
    // Remove leading slash if present
    const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    // Convert to absolute path in the container
    return path.join('/app', cleanPath);
  }

  public async renderCharacter(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    character: VTuberCharacter,
    width: number,
    height: number
  ): Promise<void> {
    try {
      const resources = await this.getCharacterResources(character);
      if (!resources || resources.isLoading) {
        this.renderLoadingState(ctx, width, height);
        return;
      }

      // Draw the base model
      ctx.drawImage(resources.model, 0, 0, width, height);

      // Apply texture if available
      if (resources.texture) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(resources.texture, 0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }

      // Update metrics
      metricsCollector.updateStreamMetrics({
        encoderLatency: Date.now() - resources.lastUpdated
      });

    } catch (error) {
      logger.error({ error }, 'Error rendering character');
      this.renderErrorState(ctx, width, height);
    }
  }

  private async getCharacterResources(character: VTuberCharacter): Promise<CharacterResources | undefined> {
    const resourceKey = `${character.modelUrl}:${character.textureUrl}`;
    let resources = this.characterResources.get(resourceKey);

    // Check if resources need to be reloaded
    if (resources && Date.now() - resources.lastUpdated > this.resourceTimeout) {
      this.characterResources.delete(resourceKey);
      resources = undefined;
    }

    if (!resources) {
      // Start loading resources
      const newResources: CharacterResources = {
        model: null as unknown as Awaited<ReturnType<typeof loadImage>>,
        texture: null,
        lastUpdated: Date.now(),
        isLoading: true
      };
      this.characterResources.set(resourceKey, newResources);

      try {
        // Convert URL paths to filesystem paths
        const modelPath = this.urlToFilePath(character.modelUrl);
        const texturePath = character.textureUrl ? this.urlToFilePath(character.textureUrl) : null;

        // Load model and texture in parallel
        const [model, texture] = await Promise.all([
          loadImage(modelPath),
          texturePath ? loadImage(texturePath) : Promise.resolve(null)
        ]);

        newResources.model = model;
        newResources.texture = texture;
        newResources.isLoading = false;
        newResources.lastUpdated = Date.now();

        logger.info({
          modelPath,
          texturePath
        }, 'Character resources loaded');

        return newResources;
      } catch (error) {
        logger.error({ error }, 'Failed to load character resources');
        this.characterResources.delete(resourceKey);
        return undefined;
      }
    }

    return resources;
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
    ctx.fillText('Loading character...', width / 2, height / 2);
  }

  private renderErrorState(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Error loading character', width / 2, height / 2);
  }

  public clearCache(): void {
    this.characterResources.clear();
    logger.info('Cleared character resources cache');
  }
}

export const characterRenderer = CharacterRenderer.getInstance(); 