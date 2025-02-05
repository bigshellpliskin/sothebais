import sharp from 'sharp';
import type { Transition, TransitionType, EasingType } from '../types/layout.js';
import { logger } from '../utils/logger.js';

export interface EffectOptions {
  duration: number;
  easing: EasingType;
}

type EasingFunction = (t: number) => number;

const easingFunctions: Record<EasingType, EasingFunction> = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - Math.pow(1 - t, 2),
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};

interface ExtendedOverlayOptions extends sharp.OverlayOptions {
  opacity?: number;
}

export class EffectsEngine {
  private static instance: EffectsEngine | null = null;

  private constructor() {
    logger.info('Effects engine initialized');
  }

  public static getInstance(): EffectsEngine {
    if (!EffectsEngine.instance) {
      EffectsEngine.instance = new EffectsEngine();
    }
    return EffectsEngine.instance;
  }

  public async applyTransition(
    fromBuffer: Buffer,
    toBuffer: Buffer,
    transition: Transition,
    progress: number
  ): Promise<Buffer> {
    const easing = easingFunctions[transition.easing];
    const easedProgress = easing(progress);

    try {
      switch (transition.type) {
        case 'fade':
          return this.applyFadeTransition(fromBuffer, toBuffer, easedProgress);
        case 'slide':
          return this.applySlideTransition(fromBuffer, toBuffer, easedProgress);
        case 'zoom':
          return this.applyZoomTransition(fromBuffer, toBuffer, easedProgress);
        default:
          throw new Error(`Unsupported transition type: ${transition.type}`);
      }
    } catch (error) {
      logger.error('Error applying transition', {
        type: transition.type,
        progress,
        error
      });
      throw error;
    }
  }

  private async applyFadeTransition(
    fromBuffer: Buffer,
    toBuffer: Buffer,
    progress: number
  ): Promise<Buffer> {
    const fromImage = sharp(fromBuffer);
    const toImage = sharp(toBuffer);

    // Get image metadata
    const metadata = await fromImage.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Create composite operation
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: fromBuffer,
          blend: 'over',
          opacity: 1 - progress
        } as ExtendedOverlayOptions,
        {
          input: toBuffer,
          blend: 'over',
          opacity: progress
        } as ExtendedOverlayOptions
      ])
      .toBuffer();
  }

  private async applySlideTransition(
    fromBuffer: Buffer,
    toBuffer: Buffer,
    progress: number
  ): Promise<Buffer> {
    const fromImage = sharp(fromBuffer);
    const toImage = sharp(toBuffer);

    // Get image metadata
    const metadata = await fromImage.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate slide positions
    const slideOffset = Math.round(width * (1 - progress));

    // Create composite operation
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: fromBuffer,
          left: -slideOffset,
          top: 0
        },
        {
          input: toBuffer,
          left: width - slideOffset,
          top: 0
        }
      ])
      .toBuffer();
  }

  private async applyZoomTransition(
    fromBuffer: Buffer,
    toBuffer: Buffer,
    progress: number
  ): Promise<Buffer> {
    const fromImage = sharp(fromBuffer);
    const toImage = sharp(toBuffer);

    // Get image metadata
    const metadata = await fromImage.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate zoom scale
    const fromScale = 1 + progress;
    const toScale = 2 - progress;

    // Create zoomed images
    const zoomedFrom = await fromImage
      .resize(Math.round(width * fromScale), Math.round(height * fromScale), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    const zoomedTo = await toImage
      .resize(Math.round(width * toScale), Math.round(height * toScale), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Create composite operation
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: zoomedFrom,
          blend: 'over',
          opacity: 1 - progress
        } as ExtendedOverlayOptions,
        {
          input: zoomedTo,
          blend: 'over',
          opacity: progress
        } as ExtendedOverlayOptions
      ])
      .toBuffer();
  }

  public interpolateTransform(
    fromValue: number,
    toValue: number,
    progress: number,
    easing: EasingType = 'linear'
  ): number {
    const easingFn = easingFunctions[easing];
    const easedProgress = easingFn(progress);
    return fromValue + (toValue - fromValue) * easedProgress;
  }
} 