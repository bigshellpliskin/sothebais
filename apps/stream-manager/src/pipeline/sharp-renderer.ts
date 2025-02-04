import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import type { Layer, Transform, VisualFeedLayer, NFTContent, LayerType } from '../types/layers.js';
import type { LogContext } from '../utils/logger.js';
import { Registry, Gauge } from 'prom-client';
import { join, dirname, basename } from 'path';
import { glob } from 'glob';
import { promisify } from 'util';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { existsSync } from 'fs';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const compositionTimeGauge = new Gauge({
  name: 'stream_manager_sharp_composition_time_ms',
  help: 'Time taken to composite layers in milliseconds',
  registers: [register]
});

const memoryUsageGauge = new Gauge({
  name: 'stream_manager_sharp_memory_bytes',
  help: 'Memory usage of Sharp operations',
  registers: [register]
});

interface SharpCompositeLayer {
  input: Buffer;
  top: number;
  left: number;
  blend: sharp.Blend;
  opacity?: number;
}

interface FontStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: number;
  maxLines?: number;
  ellipsis?: boolean;
}

interface FontCache {
  [key: string]: {
    path: string;
    timestamp: number;
  };
}

interface AnimationCache {
  frames: Buffer[];
  frameCount: number;
  frameDelay: number;
  timestamp: number;
}

interface AnimationEffect {
  type: 'fade' | 'slide' | 'scale' | 'rotate';
  duration: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  params?: {
    direction?: 'left' | 'right' | 'up' | 'down';
    startScale?: number;
    endScale?: number;
    startOpacity?: number;
    endOpacity?: number;
    startRotation?: number;
    endRotation?: number;
  };
}

interface AnimationConfig {
  type: 'gif' | 'sprite' | 'frames';
  frameDelay?: number;
  loop?: boolean;
  spriteConfig?: {
    columns: number;
    rows: number;
    frameCount: number;
  };
  effects?: AnimationEffect[];
  onStart?: () => void;
  onFrame?: (frameIndex: number) => void;
  onComplete?: () => void;
}

export class SharpRenderer {
  private static instance: SharpRenderer;
  private width: number;
  private height: number;
  private compositeCache: Map<string, { buffer: Buffer; timestamp: number }>;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL
  private readonly FONT_CACHE_TTL = 3600000; // 1 hour
  private readonly fontCache: FontCache = {};
  private readonly defaultFontPaths = {
    'sans-regular': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'sans-bold': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    'sans-italic': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    'mono-regular': '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    'mono-bold': '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
    'serif-regular': '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    'serif-bold': '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
  };
  private readonly ANIMATION_CACHE_TTL = 60000; // 1 minute
  private readonly animationCache: Map<string, AnimationCache> = new Map();
  private readonly activeAnimations: Map<string, {
    currentFrame: number;
    lastFrameTime: number;
  }> = new Map();
  private readonly animationEvents: Map<string, {
    onStart?: () => void;
    onFrame?: (frameIndex: number) => void;
    onComplete?: () => void;
  }> = new Map();
  private readonly animationMetrics = {
    framesProcessed: new Gauge({
      name: 'stream_manager_animation_frames_processed_total',
      help: 'Total number of animation frames processed',
      registers: [register]
    }),
    processingTime: new Gauge({
      name: 'stream_manager_animation_processing_time_ms',
      help: 'Time taken to process animation frames in milliseconds',
      registers: [register]
    }),
    memoryUsage: new Gauge({
      name: 'stream_manager_animation_memory_bytes',
      help: 'Memory usage of animation processing',
      registers: [register]
    }),
    activeAnimations: new Gauge({
      name: 'stream_manager_active_animations_total',
      help: 'Total number of currently active animations',
      registers: [register]
    })
  };
  private readonly globAsync = promisify(glob);

  private constructor(width: number = 1920, height: number = 1080) {
    this.width = width;
    this.height = height;
    this.compositeCache = new Map();

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Sharp renderer initialized', {
      width: this.width,
      height: this.height,
      version: sharp.versions
    } as LogContext);
  }

  public static getInstance(width?: number, height?: number): SharpRenderer {
    if (!SharpRenderer.instance) {
      SharpRenderer.instance = new SharpRenderer(width, height);
    }
    return SharpRenderer.instance;
  }

  private startMetricsCollection(): void {
    // Update memory usage every 5 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      memoryUsageGauge.set(memUsage.heapUsed);
    }, 5000);
  }

  private async layerToComposite(layer: Layer): Promise<SharpCompositeLayer | null> {
    try {
      // Skip invisible layers
      if (!layer.visible || layer.opacity === 0) {
        logger.info('Skipping invisible layer', {
          layerId: layer.id,
          layerType: layer.type,
          visible: layer.visible,
          opacity: layer.opacity
        } as LogContext);
        return null;
      }

      logger.info('Processing layer', {
        layerId: layer.id,
        layerType: layer.type,
        transform: layer.transform,
        opacity: layer.opacity
      } as LogContext);

      // Get layer content as buffer (implementation depends on layer type)
      const buffer = await this.getLayerBuffer(layer);
      if (!buffer) {
        logger.warn('Layer buffer is null', {
          layerId: layer.id,
          layerType: layer.type
        } as LogContext);
        return null;
      }

      logger.info('Layer buffer obtained', {
        layerId: layer.id,
        layerType: layer.type,
        bufferSize: buffer.length
      } as LogContext);

      // Apply transformations
      const transformed = await this.applyTransform(buffer, layer.transform);

      logger.info('Layer transformed', {
        layerId: layer.id,
        layerType: layer.type,
        transformedSize: transformed.length,
        transform: layer.transform
      } as LogContext);

      return {
        input: transformed,
        top: layer.transform.position.y,
        left: layer.transform.position.x,
        blend: this.getBlendMode(layer),
        opacity: layer.opacity
      };
    } catch (error) {
      logger.error('Failed to convert layer to composite', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id,
        layerType: layer.type,
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      return null;
    }
  }

  private async getLayerBuffer(layer: Layer): Promise<Buffer | null> {
    try {
      let buffer: Buffer | null = null;
      
      switch (layer.type) {
        case 'host':
        case 'assistant':
          buffer = await this.getCharacterBuffer(layer);
          break;
        case 'visualFeed':
          if (this.isVisualFeedLayer(layer)) {
            buffer = await this.getVisualFeedBuffer(layer);
          }
          break;
        case 'overlay':
          buffer = await this.getOverlayBuffer(layer);
          break;
        case 'chat':
          buffer = await this.getChatBuffer(layer);
          break;
        default:
          logger.warn('Unknown layer type', {
            layerId: (layer as Layer).id,
            layerType: (layer as Layer).type
          } as LogContext);
          return null;
      }

      if (!buffer) {
        logger.warn('Layer type handler returned null buffer', {
          layerId: layer.id,
          layerType: layer.type
        } as LogContext);
        return null;
      }

      logger.info('Layer buffer generated', {
        layerId: layer.id,
        layerType: layer.type,
        bufferSize: buffer.length
      } as LogContext);

      return buffer;
    } catch (error) {
      logger.error('Failed to get layer buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id,
        layerType: layer.type,
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      return null;
    }
  }

  private getLayerCacheKey(layer: Layer): string {
    // Create a cache key based on layer properties that affect rendering
    return `${layer.id}-${layer.type}-${JSON.stringify(layer.transform)}-${layer.opacity}`;
  }

  private async applyTransform(buffer: Buffer, transform: Transform): Promise<Buffer> {
    return await sharp(buffer)
      .rotate(transform.rotation)
      .resize({
        width: Math.round(this.width * transform.scale.x),
        height: Math.round(this.height * transform.scale.y),
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
  }

  private getBlendMode(layer: Layer): sharp.Blend {
    // Map layer types to appropriate blend modes
    switch (layer.type) {
      case 'overlay':
        return 'over';
      case 'visualFeed':
        return 'over';
      default:
        return 'over';
    }
  }

  public async composite(layers: Layer[]): Promise<Buffer> {
    const startTime = Date.now();

    try {
      // Create base canvas
      let composition = sharp({
        create: {
          width: this.width,
          height: this.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      // Sort layers by z-index
      const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

      // Convert layers to composites
      const composites = await Promise.all(
        sortedLayers.map(layer => this.layerToComposite(layer))
      );

      // Filter out null results and composite
      const validComposites = composites.filter((c): c is SharpCompositeLayer => c !== null);
      if (validComposites.length > 0) {
        composition = composition.composite(validComposites);
      }

      // Get final buffer
      const buffer = await composition.toBuffer();

      // Record metrics
      const endTime = Date.now();
      compositionTimeGauge.set(endTime - startTime);

      return buffer;
    } catch (error) {
      logger.error('Failed to composite layers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerCount: layers.length
      } as LogContext);
      throw error;
    }
  }

  public async processEffects(buffer: Buffer): Promise<Buffer> {
    // Apply any global effects here
    return buffer;
  }

  public clearCache(): void {
    this.compositeCache.clear();
    this.cleanupAnimations();
    logger.info('Cleared all renderer caches');
  }

  // Placeholder methods for layer-specific buffer generation
  private async getCharacterBuffer(layer: Layer): Promise<Buffer> {
    if (layer.type !== 'host' && layer.type !== 'assistant') {
      throw new Error('Invalid layer type for character buffer');
    }

    try {
      const { modelUrl, textureUrl, width, height } = layer.character;
      const cacheKey = `character-${modelUrl}-${textureUrl}-${width}-${height}`;
      
      // Check cache first
      const cached = this.compositeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.buffer;
      }

      // Convert URL to file path
      const modelPath = this.urlToFilePath(modelUrl);
      
      // Create base image with Sharp
      let characterImage = sharp(modelPath);

      // Resize if dimensions are specified
      if (width && height) {
        characterImage = characterImage.resize({
          width,
          height,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
      }

      // Apply texture if available
      if (textureUrl) {
        const texturePath = this.urlToFilePath(textureUrl);
        const textureBuffer = await sharp(texturePath)
          .resize(width, height)
          .raw()
          .toBuffer();

        // Composite texture using multiply blend mode
        characterImage = characterImage.composite([{
          input: textureBuffer,
          blend: 'multiply'
        }]);
      }

      // Get final buffer
      const buffer = await characterImage.toBuffer();

      // Cache the result
      this.compositeCache.set(cacheKey, {
        buffer,
        timestamp: Date.now()
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate character buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id,
        modelUrl: layer.character.modelUrl
      } as LogContext);

      // Return error state buffer
      return await this.generateErrorStateBuffer(
        'Error loading character',
        this.width,
        this.height
      );
    }
  }

  private urlToFilePath(urlPath: string): string {
    // Remove leading slash if present
    const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    // Convert to absolute path in the container
    return join('/app', cleanPath);
  }

  private async generateErrorStateBuffer(
    message: string,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      // Create error state image
      return await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 128 }
        }
      })
      .composite([{
        input: {
          text: {
            text: message,
            fontfile: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            width: width - 40, // Leave some padding
            height: 50,
            rgba: true
          }
        },
        gravity: 'center'
      }])
      .toBuffer();
    } catch (error) {
      logger.error('Failed to generate error state buffer', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogContext);
      // Return an empty buffer as last resort
      return Buffer.from([]);
    }
  }

  private isVisualFeedLayer(layer: Layer): layer is VisualFeedLayer {
    return layer.type === 'visualFeed' && 'content' in layer && 'imageUrl' in (layer as VisualFeedLayer).content;
  }

  private async getVisualFeedBuffer(layer: VisualFeedLayer): Promise<Buffer | null> {
    try {
      const { imageUrl } = layer.content;
      logger.info('Loading visual feed image', {
        layerId: layer.id,
        imageUrl
      } as LogContext);

      // Check if the image URL is absolute or relative
      const imagePath = imageUrl.startsWith('/') ? 
        imageUrl : 
        join(process.cwd(), imageUrl);

      logger.info('Resolved image path', {
        layerId: layer.id,
        originalUrl: imageUrl,
        resolvedPath: imagePath,
        exists: existsSync(imagePath)
      } as LogContext);

      try {
        // First try to load the image to verify it exists
        const metadata = await sharp(imagePath).metadata();
        logger.info('Image metadata loaded successfully', {
          layerId: layer.id,
          path: imagePath,
          format: metadata.format,
          width: metadata.width,
          height: metadata.height
        } as LogContext);
      } catch (error) {
        logger.error('Failed to load image metadata', {
          error: error instanceof Error ? error.message : 'Unknown error',
          layerId: layer.id,
          path: imagePath,
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        throw error;
      }

      // Now load and process the image
      const imageBuffer = await sharp(imagePath)
        .ensureAlpha()  // Ensure we have an alpha channel
        .resize(this.width, this.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()  // Convert to PNG format
        .toBuffer();

      logger.info('Image processed successfully', {
        layerId: layer.id,
        bufferSize: imageBuffer.length
      } as LogContext);

      return imageBuffer;
    } catch (error) {
      logger.error('Failed to process visual feed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id,
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      return null;
    }
  }

  private async createMetadataOverlay(
    metadata: Record<string, unknown>,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Create semi-transparent background
    const overlay = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 180 }
      }
    });

    // Format metadata text
    const metadataText = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');

    // Add text
    return await overlay
      .composite([{
        input: {
          text: {
            text: metadataText,
            fontfile: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            width: width - 40,
            height: height - 20,
            rgba: true
          }
        },
        gravity: 'center'
      }])
      .toBuffer();
  }

  private async getOverlayBuffer(layer: Layer): Promise<Buffer> {
    if (layer.type !== 'overlay') {
      throw new Error('Invalid layer type for overlay buffer');
    }

    try {
      const { type, content, style } = layer.content;
      const cacheKey = `overlay-${type}-${JSON.stringify(content)}-${JSON.stringify(style)}`;
      
      // Check cache first
      const cached = this.compositeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.buffer;
      }

      let overlayImage: sharp.Sharp;

      switch (type) {
        case 'text':
          overlayImage = await this.createTextOverlay(
            content as string,
            style,
            this.width,
            this.height
          );
          break;

        case 'image':
          overlayImage = await this.createImageOverlay(
            content as string,
            style,
            this.width,
            this.height
          );
          break;

        case 'shape':
          overlayImage = await this.createShapeOverlay(
            content as Record<string, unknown>,
            style,
            this.width,
            this.height
          );
          break;

        default:
          throw new Error(`Unsupported overlay type: ${type}`);
      }

      // Get final buffer
      const buffer = await overlayImage.toBuffer();

      // Cache the result
      this.compositeCache.set(cacheKey, {
        buffer,
        timestamp: Date.now()
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate overlay buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id,
        overlayType: layer.content.type
      } as LogContext);

      return await this.generateErrorStateBuffer(
        'Error loading overlay',
        this.width,
        this.height
      );
    }
  }

  private async createTextOverlay(
    text: string,
    style: Record<string, unknown>,
    width: number,
    height: number
  ): Promise<sharp.Sharp> {
    const fontStyle = this.parseFontStyle(style);
    const fontPath = await this.resolveFontPath(fontStyle.fontFamily, fontStyle.fontWeight, fontStyle.fontStyle);
    
    // Calculate text dimensions and layout
    const lines = this.calculateTextLayout(text, fontStyle, width);
    
    // Create SVG with proper text layout
    const svg = this.createTextSVG(lines, fontStyle, width, height);
    
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite([{
      input: Buffer.from(svg),
      blend: 'over'
    }]);
  }

  private parseFontStyle(style: Record<string, unknown>): FontStyle {
    return {
      fontFamily: (style.fontFamily as string) || 'sans',
      fontSize: (style.fontSize as number) || 16,
      fontWeight: (style.fontWeight as 'normal' | 'bold') || 'normal',
      fontStyle: (style.fontStyle as 'normal' | 'italic') || 'normal',
      color: (style.color as string) || '#FFFFFF',
      lineHeight: (style.lineHeight as number) || 1.2,
      letterSpacing: (style.letterSpacing as number) || 0,
      textAlign: (style.textAlign as 'left' | 'center' | 'right') || 'left',
      maxWidth: (style.maxWidth as number),
      maxLines: (style.maxLines as number),
      ellipsis: (style.ellipsis as boolean) || false
    };
  }

  private async resolveFontPath(
    family: string,
    weight: 'normal' | 'bold',
    style: 'normal' | 'italic'
  ): Promise<string> {
    const fontKey = `${family}-${weight}-${style}`;
    
    // Check cache first
    const cached = this.fontCache[fontKey];
    if (cached && Date.now() - cached.timestamp < this.FONT_CACHE_TTL) {
      return cached.path;
    }
    
    // Resolve font path
    const fontPath = this.defaultFontPaths[`${family}-${weight}`] ||
                    this.defaultFontPaths[`${family}-regular`] ||
                    this.defaultFontPaths['sans-regular'];
    
    // Cache the result
    this.fontCache[fontKey] = {
      path: fontPath,
      timestamp: Date.now()
    };
    
    return fontPath;
  }

  private calculateTextLayout(text: string, style: FontStyle, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Calculate approximate characters that fit in maxWidth
    const avgCharWidth = style.fontSize * 0.6; // Approximate average character width
    const charsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Rough estimate if line will fit
      if (testLine.length * avgCharWidth <= (style.maxWidth || maxWidth)) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
        
        // Check maxLines limit
        if (style.maxLines && lines.length >= style.maxLines - 1) {
          if (style.ellipsis) {
            currentLine = this.truncateWithEllipsis(
              `${currentLine} ${words.slice(words.indexOf(word) + 1).join(' ')}`,
              charsPerLine
            );
          }
          break;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private truncateWithEllipsis(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars - 3) + '...';
  }

  private createTextSVG(lines: string[], style: FontStyle, width: number, height: number): string {
    const lineHeight = style.fontSize * style.lineHeight;
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + style.fontSize; // Vertical center alignment
    
    // Convert color from hex to RGB
    const color = style.color || '#FFFFFF';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    let textAnchor: string;
    let x: number;
    
    switch (style.textAlign) {
      case 'center':
        textAnchor = 'middle';
        x = width / 2;
        break;
      case 'right':
        textAnchor = 'end';
        x = width - 20;
        break;
      default:
        textAnchor = 'start';
        x = 20;
    }
    
    const textLines = lines.map((line, index) => `
      <text
        x="${x}"
        y="${startY + index * lineHeight}"
        font-family="${style.fontFamily}"
        font-size="${style.fontSize}px"
        font-weight="${style.fontWeight}"
        font-style="${style.fontStyle}"
        letter-spacing="${style.letterSpacing}"
        text-anchor="${textAnchor}"
        fill="rgb(${r},${g},${b})"
      >${this.escapeXml(line)}</text>
    `).join('');
    
    return `
      <svg width="${width}" height="${height}">
        ${textLines}
      </svg>
    `;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async createImageOverlay(
    imageUrl: string,
    style: Record<string, unknown>,
    width: number,
    height: number
  ): Promise<sharp.Sharp> {
    // Check if this is an animated image
    const animation = style.animation as AnimationConfig | undefined;
    
    if (animation) {
      const buffer = await this.handleAnimation(imageUrl, animation, width, height);
      return sharp(buffer);
    }
    
    // Handle static images as before
    const imagePath = this.urlToFilePath(imageUrl);
    return sharp(imagePath)
      .resize({
        width,
        height,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
  }

  private async createShapeOverlay(
    shape: Record<string, unknown>,
    style: Record<string, unknown>,
    width: number,
    height: number
  ): Promise<sharp.Sharp> {
    // Create base canvas
    const overlay = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const shapeType = shape.type as string;
    const color = (style.color as string) || '#FFFFFF';
    const opacity = (style.opacity as number) || 1;
    
    // Convert color from hex to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const alpha = Math.round(opacity * 255);

    switch (shapeType) {
      case 'rectangle': {
        const x = shape.x as number || 0;
        const y = shape.y as number || 0;
        const rectWidth = shape.width as number || 100;
        const rectHeight = shape.height as number || 100;
        const borderRadius = shape.borderRadius as number || 0;

        // Create SVG for rectangle
        const svg = `<svg width="${width}" height="${height}">
          <rect
            x="${x}"
            y="${y}"
            width="${rectWidth}"
            height="${rectHeight}"
            rx="${borderRadius}"
            ry="${borderRadius}"
            fill="rgba(${r},${g},${b},${opacity})"
          />
        </svg>`;

        return overlay.composite([{
          input: Buffer.from(svg),
          blend: 'over'
        }]);
      }

      case 'circle': {
        const cx = shape.cx as number || width / 2;
        const cy = shape.cy as number || height / 2;
        const radius = shape.radius as number || 50;

        // Create SVG for circle
        const svg = `<svg width="${width}" height="${height}">
          <circle
            cx="${cx}"
            cy="${cy}"
            r="${radius}"
            fill="rgba(${r},${g},${b},${opacity})"
          />
        </svg>`;

        return overlay.composite([{
          input: Buffer.from(svg),
          blend: 'over'
        }]);
      }

      case 'polygon': {
        const points = shape.points as Array<[number, number]> || [];
        if (points.length < 3) {
          throw new Error('Polygon must have at least 3 points');
        }

        // Create SVG for polygon
        const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ');
        const svg = `<svg width="${width}" height="${height}">
          <polygon
            points="${pointsStr}"
            fill="rgba(${r},${g},${b},${opacity})"
          />
        </svg>`;

        return overlay.composite([{
          input: Buffer.from(svg),
          blend: 'over'
        }]);
      }

      case 'line': {
        const x1 = shape.x1 as number || 0;
        const y1 = shape.y1 as number || 0;
        const x2 = shape.x2 as number || width;
        const y2 = shape.y2 as number || height;
        const strokeWidth = style.strokeWidth as number || 1;

        // Create SVG for line
        const svg = `<svg width="${width}" height="${height}">
          <line
            x1="${x1}"
            y1="${y1}"
            x2="${x2}"
            y2="${y2}"
            stroke="rgba(${r},${g},${b},${opacity})"
            stroke-width="${strokeWidth}"
          />
        </svg>`;

        return overlay.composite([{
          input: Buffer.from(svg),
          blend: 'over'
        }]);
      }

      default:
        throw new Error(`Unsupported shape type: ${shapeType}`);
    }
  }

  private async getChatBuffer(layer: Layer): Promise<Buffer> {
    if (layer.type !== 'chat') {
      throw new Error('Invalid layer type for chat buffer');
    }

    try {
      const { messages, maxMessages, style } = layer.content;
      const cacheKey = `chat-${messages.map(m => m.id).join('-')}-${maxMessages}`;
      
      // Check cache first
      const cached = this.compositeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.buffer;
      }

      // Calculate chat window dimensions (25% of screen width)
      const chatWidth = Math.round(this.width * 0.25);
      const chatHeight = this.height;

      // Create chat background
      let chatImage = sharp({
        create: {
          width: chatWidth,
          height: chatHeight,
          channels: 4,
          background: { 
            r: parseInt(style.backgroundColor.slice(1, 3), 16),
            g: parseInt(style.backgroundColor.slice(3, 5), 16),
            b: parseInt(style.backgroundColor.slice(5, 7), 16),
            alpha: Math.round(255 * layer.opacity)
          }
        }
      });

      // Get visible messages (newest first)
      const visibleMessages = messages.slice(-maxMessages);
      
      // Create message overlays
      const messageOverlays = await Promise.all(
        visibleMessages.map(async (message, index) => {
          const messageHeight = style.fontSize + style.padding * 2;
          const y = chatHeight - ((index + 1) * (messageHeight + style.messageSpacing));
          
          if (y < 0) return null; // Skip if message would be off-screen

          // Calculate message age and opacity
          const messageAge = Date.now() - message.timestamp;
          const fadeOutStart = 30000; // Start fading after 30 seconds
          const fadeOutDuration = 5000; // Fade over 5 seconds
          let messageOpacity = 255;

          if (messageAge > fadeOutStart) {
            const fadeProgress = (messageAge - fadeOutStart) / fadeOutDuration;
            messageOpacity = Math.max(0, Math.round(255 * (1 - fadeProgress)));
          }

          // Create message text
          const messageText = `${message.author}: ${message.text}`;
          const messageBuffer = await this.createChatMessageOverlay(
            messageText,
            style,
            chatWidth - style.padding * 2,
            messageHeight,
            messageOpacity,
            message.highlighted
          );

          return {
            input: messageBuffer,
            top: y,
            left: style.padding,
            blend: 'over' as const
          };
        })
      );

      // Filter out null overlays and composite
      const validOverlays = messageOverlays.filter((o): o is NonNullable<typeof o> => o !== null);
      if (validOverlays.length > 0) {
        chatImage = chatImage.composite(validOverlays);
      }

      // Get final buffer
      const buffer = await chatImage.toBuffer();

      // Cache the result
      this.compositeCache.set(cacheKey, {
        buffer,
        timestamp: Date.now()
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate chat buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        layerId: layer.id
      } as LogContext);

      return await this.generateErrorStateBuffer(
        'Error loading chat',
        this.width,
        this.height
      );
    }
  }

  private async createChatMessageOverlay(
    text: string,
    style: any,
    width: number,
    height: number,
    opacity: number,
    highlighted: boolean
  ): Promise<Buffer> {
    // Create message background
    const messageImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: highlighted
          ? { r: 255, g: 255, b: 0, alpha: Math.round(0.2 * opacity) }
          : { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    // Use enhanced text rendering
    const textStyle = {
      fontFamily: 'sans',
      fontSize: style.fontSize,
      color: style.color || '#FFFFFF',
      maxWidth: width - 20,
      lineHeight: 1.2,
      textAlign: 'left' as const,
      maxLines: 2,
      ellipsis: true
    };

    const textOverlay = await this.createTextOverlay(
      text,
      textStyle,
      width,
      height
    );

    return messageImage
      .composite([{
        input: await textOverlay.toBuffer(),
        blend: 'over'
      }])
      .toBuffer();
  }

  private async handleAnimation(
    imageUrl: string,
    config: AnimationConfig,
    width: number,
    height: number
  ): Promise<Buffer> {
    const startTime = Date.now();
    const cacheKey = `animation-${imageUrl}-${JSON.stringify(config)}`;
    
    try {
      // Initialize animation state if not exists
      if (!this.activeAnimations.has(cacheKey)) {
        this.activeAnimations.set(cacheKey, {
          currentFrame: 0,
          lastFrameTime: Date.now()
        });
        
        // Store event handlers
        if (config.onStart || config.onFrame || config.onComplete) {
          this.animationEvents.set(cacheKey, {
            onStart: config.onStart,
            onFrame: config.onFrame,
            onComplete: config.onComplete
          });
        }
        
        // Call onStart handler
        const events = this.animationEvents.get(cacheKey);
        events?.onStart?.();
        
        // Update metrics
        this.animationMetrics.activeAnimations.inc();
      }
      
      // Get or create cached frames
      let cache = this.animationCache.get(cacheKey);
      if (!cache || Date.now() - cache.timestamp > this.ANIMATION_CACHE_TTL) {
        cache = await this.generateAnimationFrames(imageUrl, config, width, height);
        this.animationCache.set(cacheKey, cache);
      }
      
      // Get animation state
      const state = this.activeAnimations.get(cacheKey)!;
      const now = Date.now();
      
      // Check if it's time for next frame
      if (now - state.lastFrameTime >= (config.frameDelay || cache.frameDelay)) {
        const prevFrame = state.currentFrame;
        state.currentFrame = (state.currentFrame + 1) % cache.frameCount;
        state.lastFrameTime = now;
        
        // Call onFrame handler
        const events = this.animationEvents.get(cacheKey);
        events?.onFrame?.(state.currentFrame);
        
        // Check if animation completed a loop
        if (state.currentFrame < prevFrame && !config.loop) {
          // Call onComplete handler
          events?.onComplete?.();
          
          // Cleanup if not looping
          this.activeAnimations.delete(cacheKey);
          this.animationEvents.delete(cacheKey);
          this.animationMetrics.activeAnimations.dec();
        }
      }
      
      // Apply effects if any
      let frameBuffer = cache.frames[state.currentFrame];
      if (config.effects && config.effects.length > 0) {
        frameBuffer = await this.applyAnimationEffects(
          frameBuffer,
          config.effects,
          state.currentFrame,
          cache.frameCount
        );
      }
      
      // Update metrics
      this.animationMetrics.framesProcessed.inc();
      this.animationMetrics.processingTime.set(Date.now() - startTime);
      this.animationMetrics.memoryUsage.set(process.memoryUsage().heapUsed);
      
      return frameBuffer;
    } catch (error) {
      logger.error('Failed to handle animation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        imageUrl,
        cacheKey
      } as LogContext);
      throw error;
    }
  }

  private async generateAnimationFrames(
    imageUrl: string,
    config: AnimationConfig,
    width: number,
    height: number
  ): Promise<AnimationCache> {
    const imagePath = this.urlToFilePath(imageUrl);
    
    switch (config.type) {
      case 'gif': {
        // Extract frames from GIF
        const image = sharp(imagePath, { animated: true });
        const metadata = await image.metadata();
        const pages = metadata.pages || 1;
        const frames: Buffer[] = [];
        
        for (let i = 0; i < pages; i++) {
          const frame = await sharp(imagePath, { page: i })
            .resize(width, height, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();
          frames.push(frame);
        }
        
        return {
          frames,
          frameCount: pages,
          frameDelay: config.frameDelay || 100, // Default to 100ms if not specified
          timestamp: Date.now()
        };
      }
      
      case 'sprite': {
        if (!config.spriteConfig) {
          throw new Error('Sprite configuration required for sprite animation');
        }
        
        const { columns, rows, frameCount } = config.spriteConfig;
        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        const frameWidth = Math.floor(metadata.width! / columns);
        const frameHeight = Math.floor(metadata.height! / rows);
        const frames: Buffer[] = [];
        
        for (let i = 0; i < frameCount; i++) {
          const row = Math.floor(i / columns);
          const col = i % columns;
          
          const frame = await image
            .extract({
              left: col * frameWidth,
              top: row * frameHeight,
              width: frameWidth,
              height: frameHeight
            })
            .resize(width, height, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();
          
          frames.push(frame);
        }
        
        return {
          frames,
          frameCount,
          frameDelay: config.frameDelay || 100,
          timestamp: Date.now()
        };
      }
      
      case 'frames': {
        // Handle frame-by-frame animation from directory
        const framePattern = imageUrl.replace(/\.[^/.]+$/, '') + '_*.{png,jpg,jpeg,webp}';
        const frameFiles = await this.getFrameFiles(framePattern);
        const frames: Buffer[] = [];
        
        for (const frameFile of frameFiles) {
          const frame = await sharp(frameFile)
            .resize(width, height, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();
          frames.push(frame);
        }
        
        return {
          frames,
          frameCount: frames.length,
          frameDelay: config.frameDelay || 100,
          timestamp: Date.now()
        };
      }
      
      default:
        throw new Error(`Unsupported animation type: ${config.type}`);
    }
  }

  private async getFrameFiles(pattern: string): Promise<string[]> {
    try {
      // Get the directory and base pattern
      const dir = dirname(pattern);
      const basePattern = basename(pattern);
      
      // Find all matching files
      const files = (await this.globAsync(basePattern, {
        cwd: dir,
        absolute: true,
        nodir: true
      })) as string[];
      
      // Sort files numerically by frame number
      return files.sort((a, b) => {
        const frameA = parseInt(a.match(/_(\d+)\./)?.[1] || '0');
        const frameB = parseInt(b.match(/_(\d+)\./)?.[1] || '0');
        return frameA - frameB;
      });
    } catch (error) {
      logger.error('Failed to get frame files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pattern
      } as LogContext);
      return [];
    }
  }

  private cleanupAnimations(): void {
    this.animationCache.clear();
    this.activeAnimations.clear();
    logger.info('Cleared animation caches');
  }

  private async applyAnimationEffects(
    buffer: Buffer,
    effects: AnimationEffect[],
    currentFrame: number,
    totalFrames: number
  ): Promise<Buffer> {
    let result = sharp(buffer);
    let metadata = await result.metadata();
    
    for (const effect of effects) {
      const progress = currentFrame / (totalFrames - 1);
      const easedProgress = this.getEasedProgress(progress, effect.easing);
      
      switch (effect.type) {
        case 'fade': {
          const startOpacity = effect.params?.startOpacity ?? 0;
          const endOpacity = effect.params?.endOpacity ?? 1;
          const opacity = startOpacity + (endOpacity - startOpacity) * easedProgress;
          
          result = result.composite([{
            input: {
              create: {
                width: metadata.width!,
                height: metadata.height!,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: Math.round(opacity * 255) }
              }
            },
            blend: 'multiply'
          }]);
          break;
        }
        
        case 'scale': {
          const startScale = effect.params?.startScale ?? 0.5;
          const endScale = effect.params?.endScale ?? 1;
          const scale = startScale + (endScale - startScale) * easedProgress;
          
          result = result.resize({
            width: Math.round(metadata.width! * scale),
            height: Math.round(metadata.height! * scale),
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          });
          
          // Update metadata after resize
          metadata = await result.metadata();
          break;
        }
        
        case 'rotate': {
          const startRotation = effect.params?.startRotation ?? 0;
          const endRotation = effect.params?.endRotation ?? 360;
          const rotation = startRotation + (endRotation - startRotation) * easedProgress;
          
          result = result.rotate(rotation, {
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          });
          
          // Update metadata after rotation
          metadata = await result.metadata();
          break;
        }
        
        case 'slide': {
          const direction = effect.params?.direction ?? 'left';
          const offset = Math.round((1 - easedProgress) * metadata.width!);
          
          const translateX = direction === 'left' ? -offset :
                           direction === 'right' ? offset : 0;
          const translateY = direction === 'up' ? -offset :
                           direction === 'down' ? offset : 0;
          
          result = result.extend({
            top: Math.max(0, translateY),
            bottom: Math.max(0, -translateY),
            left: Math.max(0, translateX),
            right: Math.max(0, -translateX),
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          });
          
          // Update metadata after extend
          metadata = await result.metadata();
          break;
        }
      }
    }
    
    return result.toBuffer();
  }

  private getEasedProgress(progress: number, easing?: string): number {
    switch (easing) {
      case 'easeIn':
        return progress * progress;
      case 'easeOut':
        return 1 - (1 - progress) * (1 - progress);
      case 'easeInOut':
        return progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return progress; // linear
    }
  }
}

export const sharpRenderer = SharpRenderer.getInstance(); 