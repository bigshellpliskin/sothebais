import { createCanvas, loadImage } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';
import type { VTuberCharacter } from '../types/layers.js';
import path from 'path';
import type { HostLayer, AssistantLayer } from '../types/layers.js';
import type { LogContext } from '../utils/logger.js';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';

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

  private async loadCharacterImage(modelUrl: string): Promise<CharacterResources> {
    try {
      logger.debug('Loading character image', { modelUrl });
      
      const resource = this.characterResources.get(modelUrl);
      if (resource && !resource.isLoading) {
        logger.debug('Using cached character image', { modelUrl });
        return resource;
      }

      // Mark as loading
      this.characterResources.set(modelUrl, {
        model: null as unknown as Awaited<ReturnType<typeof loadImage>>,
        texture: null,
        lastUpdated: Date.now(),
        isLoading: true
      });

      // Convert URL paths to filesystem paths
      const modelPath = this.urlToFilePath(modelUrl);
      const texturePath = null; // Assuming texture is not provided in the URL

      // Load model and texture in parallel
      const [model, texture] = await Promise.all([
        loadImage(modelPath),
        texturePath ? loadImage(texturePath) : Promise.resolve(null)
      ]);

      const characterResource: CharacterResources = {
        model,
        texture,
        lastUpdated: Date.now(),
        isLoading: false
      };

      this.characterResources.set(modelUrl, characterResource);
      logger.info('Character image loaded successfully', { 
        modelUrl,
        width: model.width,
        height: model.height
      });

      return characterResource;
    } catch (error) {
      logger.error('Failed to load character image', {
        modelUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async renderCharacter(ctx: CanvasRenderingContext2D, layer: HostLayer | AssistantLayer): Promise<void> {
    try {
      logger.debug('Rendering character', {
        layerId: layer.id,
        modelUrl: layer.character.modelUrl,
        transform: layer.transform
      });

      const resource = await this.loadCharacterImage(layer.character.modelUrl);
      
      if (!resource || !resource.model) {
        throw new Error('Character resource not loaded');
      }

      // Calculate dimensions while maintaining aspect ratio
      const aspectRatio = resource.model.width / resource.model.height;
      const targetWidth = layer.character.width || resource.model.width;
      const targetHeight = layer.character.height || resource.model.height;

      logger.debug('Character render dimensions', {
        originalWidth: resource.model.width,
        originalHeight: resource.model.height,
        targetWidth,
        targetHeight,
        aspectRatio
      });

      // Draw the character
      ctx.drawImage(
        resource.model,
        0,
        0,
        resource.model.width,
        resource.model.height,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Apply texture if available
      if (resource.texture) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(resource.texture, 0, 0, targetWidth, targetHeight);
        ctx.globalCompositeOperation = 'source-over';
      }

      logger.debug('Character rendered successfully', {
        layerId: layer.id,
        modelUrl: layer.character.modelUrl
      });
    } catch (error) {
      logger.error('Failed to render character', {
        layerId: layer.id,
        modelUrl: layer.character.modelUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private renderLoadingState(
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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

  public async renderHost(ctx: CanvasRenderingContext2D, layer: HostLayer): Promise<void> {
    try {
      // Render host character
      // ... implementation ...
    } catch (error) {
      logger.error('Failed to render host character', { error, layerId: layer.id } as LogContext);
    }
  }

  public async renderAssistant(ctx: CanvasRenderingContext2D, layer: AssistantLayer): Promise<void> {
    try {
      // Render assistant character
      // ... implementation ...
    } catch (error) {
      logger.error('Failed to render assistant character', { error, layerId: layer.id } as LogContext);
    }
  }
}

export const characterRenderer = CharacterRenderer.getInstance(); 