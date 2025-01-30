import { SKRSContext2D, Image, loadImage } from '@napi-rs/canvas';
import { logger } from '../utils/logger';
import { OverlayContent } from '../types/layers';

interface ImageResource {
  image: Image;
  lastUpdated: number;
  isLoading: boolean;
}

interface TextStyle {
  font?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

interface ShapeStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  gradient?: {
    type: 'linear' | 'radial';
    colors: Array<{ offset: number; color: string }>;
  };
}

export class OverlayRenderer {
  private static instance: OverlayRenderer;
  private imageResources: Map<string, ImageResource> = new Map();
  private resourceTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): OverlayRenderer {
    if (!OverlayRenderer.instance) {
      OverlayRenderer.instance = new OverlayRenderer();
    }
    return OverlayRenderer.instance;
  }

  public async renderOverlay(
    ctx: SKRSContext2D,
    content: OverlayContent,
    width: number,
    height: number
  ): Promise<void> {
    try {
      switch (content.type) {
        case 'text':
          await this.renderText(ctx, content.content as string, content.style as TextStyle, width, height);
          break;
        case 'image':
          await this.renderImage(ctx, content.content as string, content.style as ShapeStyle, width, height);
          break;
        case 'shape':
          await this.renderShape(ctx, content.content as Record<string, unknown>, content.style as ShapeStyle, width, height);
          break;
        default:
          logger.warn({ type: content.type }, 'Unknown overlay content type');
      }
    } catch (error) {
      logger.error({ error }, 'Error rendering overlay');
      this.renderErrorState(ctx, width, height);
    }
  }

  private async renderText(
    ctx: SKRSContext2D,
    text: string,
    style: TextStyle,
    width: number,
    height: number
  ): Promise<void> {
    // Save context state
    ctx.save();

    try {
      // Apply text styles
      ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.font || 'Arial'}`;
      ctx.textAlign = style.align || 'center';
      ctx.textBaseline = style.baseline || 'middle';

      // Apply shadow if specified
      if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetX = style.shadow.offsetX;
        ctx.shadowOffsetY = style.shadow.offsetY;
      }

      // Draw stroke if specified
      if (style.strokeColor && style.strokeWidth) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeText(text, width / 2, height / 2);
      }

      // Draw fill
      ctx.fillStyle = style.color || 'white';
      ctx.fillText(text, width / 2, height / 2);

    } finally {
      // Restore context state
      ctx.restore();
    }
  }

  private async renderImage(
    ctx: SKRSContext2D,
    imageUrl: string,
    style: ShapeStyle,
    width: number,
    height: number
  ): Promise<void> {
    const resource = await this.getImageResource(imageUrl);
    if (!resource || resource.isLoading) {
      this.renderLoadingState(ctx, width, height);
      return;
    }

    // Save context state
    ctx.save();

    try {
      // Calculate aspect ratio preserving dimensions
      const aspectRatio = resource.image.width / resource.image.height;
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

      // Apply shape styles if specified
      if (style.strokeColor && style.strokeWidth) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeRect(x, y, drawWidth, drawHeight);
      }

      // Draw the image
      ctx.drawImage(resource.image, x, y, drawWidth, drawHeight);

    } finally {
      // Restore context state
      ctx.restore();
    }
  }

  private async renderShape(
    ctx: SKRSContext2D,
    shape: Record<string, unknown>,
    style: ShapeStyle,
    width: number,
    height: number
  ): Promise<void> {
    // Save context state
    ctx.save();

    try {
      // Begin shape path
      ctx.beginPath();

      // Draw shape based on type
      switch (shape.type) {
        case 'rectangle':
          this.drawRectangle(ctx, shape, style, width, height);
          break;
        case 'circle':
          this.drawCircle(ctx, shape, style, width, height);
          break;
        case 'polygon':
          this.drawPolygon(ctx, shape, style, width, height);
          break;
      }

      // Apply gradient if specified
      if (style.gradient) {
        const gradient = this.createGradient(ctx, style.gradient, width, height);
        if (style.fillColor) {
          ctx.fillStyle = gradient;
        }
        if (style.strokeColor) {
          ctx.strokeStyle = gradient;
        }
      } else {
        // Apply solid colors
        if (style.fillColor) {
          ctx.fillStyle = style.fillColor;
        }
        if (style.strokeColor) {
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = style.strokeWidth || 1;
        }
      }

      // Fill and stroke the shape
      if (style.fillColor || style.gradient) {
        ctx.fill();
      }
      if (style.strokeColor) {
        ctx.stroke();
      }

    } finally {
      // Restore context state
      ctx.restore();
    }
  }

  private drawRectangle(
    ctx: SKRSContext2D,
    shape: Record<string, unknown>,
    style: ShapeStyle,
    width: number,
    height: number
  ): void {
    const x = (shape.x as number) || 0;
    const y = (shape.y as number) || 0;
    const w = (shape.width as number) || width;
    const h = (shape.height as number) || height;

    if (style.cornerRadius) {
      const radius = Math.min(style.cornerRadius, w / 2, h / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  private drawCircle(
    ctx: SKRSContext2D,
    shape: Record<string, unknown>,
    style: ShapeStyle,
    width: number,
    height: number
  ): void {
    const centerX = (shape.x as number) || width / 2;
    const centerY = (shape.y as number) || height / 2;
    const radius = (shape.radius as number) || Math.min(width, height) / 4;

    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }

  private drawPolygon(
    ctx: SKRSContext2D,
    shape: Record<string, unknown>,
    style: ShapeStyle,
    width: number,
    height: number
  ): void {
    const points = shape.points as Array<{ x: number; y: number }>;
    if (!points || points.length < 3) return;

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
  }

  private createGradient(
    ctx: SKRSContext2D,
    gradient: { type: 'linear' | 'radial'; colors: Array<{ offset: number; color: string }> },
    width: number,
    height: number
  ): CanvasGradient {
    let canvasGradient: CanvasGradient;

    if (gradient.type === 'linear') {
      canvasGradient = ctx.createLinearGradient(0, 0, width, height);
    } else {
      canvasGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 2
      );
    }

    gradient.colors.forEach(({ offset, color }) => {
      canvasGradient.addColorStop(offset, color);
    });

    return canvasGradient;
  }

  private async getImageResource(imageUrl: string): Promise<ImageResource | undefined> {
    let resource = this.imageResources.get(imageUrl);

    // Check if resource needs to be reloaded
    if (resource && Date.now() - resource.lastUpdated > this.resourceTimeout) {
      this.imageResources.delete(imageUrl);
      resource = undefined;
    }

    if (!resource) {
      // Start loading resource
      const newResource: ImageResource = {
        image: null as unknown as Image,
        lastUpdated: Date.now(),
        isLoading: true
      };
      this.imageResources.set(imageUrl, newResource);

      try {
        const image = await loadImage(imageUrl);
        newResource.image = image;
        newResource.isLoading = false;
        newResource.lastUpdated = Date.now();

        logger.info({ imageUrl }, 'Overlay image resource loaded');

        return newResource;
      } catch (error) {
        logger.error({ error }, 'Failed to load overlay image resource');
        this.imageResources.delete(imageUrl);
        return undefined;
      }
    }

    return resource;
  }

  private renderLoadingState(ctx: SKRSContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading overlay content...', width / 2, height / 2);
  }

  private renderErrorState(ctx: SKRSContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Error loading overlay content', width / 2, height / 2);
  }

  public clearCache(): void {
    this.imageResources.clear();
    logger.info('Cleared overlay image resources cache');
  }
}

export const overlayRenderer = OverlayRenderer.getInstance(); 