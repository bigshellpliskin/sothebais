import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import { Registry, Gauge } from 'prom-client';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const bufferOperationTimeGauge = new Gauge({
  name: 'stream_manager_frame_buffer_operation_time_ms',
  help: 'Time taken for frame buffer operations in milliseconds',
  registers: [register]
});

const bufferMemoryGauge = new Gauge({
  name: 'stream_manager_frame_buffer_memory_bytes',
  help: 'Memory usage of frame buffers',
  registers: [register]
});

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Style {
  fill?: RGBA;
  stroke?: RGBA;
  strokeWidth?: number;
}

export interface TextStyle extends Style {
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export class FrameBufferManager {
  private static instance: FrameBufferManager;
  private buffer: Uint8ClampedArray;
  private width: number;
  private height: number;
  private bufferPool: Buffer[] = [];
  private readonly maxPoolSize = 3;

  private constructor(width: number = 1920, height: number = 1080) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4);

    // Initialize buffer pool
    this.initializeBufferPool();

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Frame buffer manager initialized', {
      width,
      height,
      bufferSize: this.buffer.length,
      poolSize: this.maxPoolSize
    } as LogContext);
  }

  public static getInstance(width?: number, height?: number): FrameBufferManager {
    if (!FrameBufferManager.instance) {
      FrameBufferManager.instance = new FrameBufferManager(width, height);
    }
    return FrameBufferManager.instance;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const totalMemory = this.buffer.length + 
        this.bufferPool.reduce((acc, buf) => acc + buf.length, 0);
      bufferMemoryGauge.set(totalMemory);
    }, 5000);
  }

  private initializeBufferPool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.bufferPool.push(Buffer.alloc(this.width * this.height * 4));
    }
  }

  public setPixel(x: number, y: number, rgba: RGBA): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const idx = (y * this.width + x) * 4;
    this.buffer[idx] = rgba.r;
    this.buffer[idx + 1] = rgba.g;
    this.buffer[idx + 2] = rgba.b;
    this.buffer[idx + 3] = rgba.a;
  }

  public drawRect(x: number, y: number, w: number, h: number, style: Style): void {
    const startTime = Date.now();

    try {
      // Fill
      if (style.fill) {
        for (let py = y; py < y + h; py++) {
          for (let px = x; px < x + w; px++) {
            this.setPixel(px, py, style.fill);
          }
        }
      }

      // Stroke
      if (style.stroke && style.strokeWidth) {
        const sw = style.strokeWidth;
        // Top and bottom borders
        for (let py = y; py < y + sw; py++) {
          for (let px = x; px < x + w; px++) {
            this.setPixel(px, py, style.stroke);
            this.setPixel(px, y + h - py - 1, style.stroke);
          }
        }
        // Left and right borders
        for (let px = x; px < x + sw; px++) {
          for (let py = y; py < y + h; py++) {
            this.setPixel(px, py, style.stroke);
            this.setPixel(x + w - px - 1, py, style.stroke);
          }
        }
      }

      bufferOperationTimeGauge.set(Date.now() - startTime);
    } catch (error) {
      logger.error('Failed to draw rectangle', {
        error: error instanceof Error ? error.message : 'Unknown error',
        x, y, w, h
      } as LogContext);
    }
  }

  public drawText(text: string, x: number, y: number, style: TextStyle): void {
    const startTime = Date.now();

    try {
      // Basic text rendering using a simple pixel font
      // This is a placeholder - in practice, we'd want to use a proper font rendering system
      const scale = style.fontSize || 16;
      const chars = text.split('');
      let currentX = x;

      for (const char of chars) {
        // Get basic pixel representation of character
        const pixels = this.getCharacterPixels(char, scale);
        
        // Draw character pixels
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            if (pixels[py * scale + px]) {
              this.setPixel(
                currentX + px,
                y + py,
                style.fill || { r: 255, g: 255, b: 255, a: 255 }
              );
            }
          }
        }

        currentX += scale;
      }

      bufferOperationTimeGauge.set(Date.now() - startTime);
    } catch (error) {
      logger.error('Failed to draw text', {
        error: error instanceof Error ? error.message : 'Unknown error',
        text, x, y
      } as LogContext);
    }
  }

  private getCharacterPixels(char: string, scale: number): boolean[] {
    // This is a very basic implementation
    // In practice, we'd want to use a proper font system
    const pixels = new Array(scale * scale).fill(false);
    
    // Simple representation of character 'A'
    if (char.toUpperCase() === 'A') {
      // Draw an 'A' shape
      for (let i = 0; i < scale; i++) {
        pixels[i * scale + scale/2] = true; // Vertical line
        pixels[i * scale + (scale/2 - i)] = true; // Left diagonal
        pixels[i * scale + (scale/2 + i)] = true; // Right diagonal
        if (i === scale/2) {
          for (let j = 0; j < scale; j++) {
            pixels[i * scale + j] = true; // Horizontal line
          }
        }
      }
    }
    
    return pixels;
  }

  public writeBuffer(sourceBuffer: Buffer): void {
    const startTime = Date.now();

    try {
      // Copy source buffer to our buffer
      for (let i = 0; i < sourceBuffer.length && i < this.buffer.length; i++) {
        this.buffer[i] = sourceBuffer[i];
      }

      bufferOperationTimeGauge.set(Date.now() - startTime);
    } catch (error) {
      logger.error('Failed to write buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceSize: sourceBuffer.length,
        targetSize: this.buffer.length
      } as LogContext);
    }
  }

  public getBuffer(): Buffer {
    // Get a buffer from the pool
    const buffer = this.bufferPool.pop();
    if (!buffer) {
      // If pool is empty, create a new buffer
      return Buffer.from(this.buffer);
    }

    // Copy current frame to pool buffer
    buffer.set(this.buffer);
    
    // Return buffer to pool after a delay
    setTimeout(() => {
      if (this.bufferPool.length < this.maxPoolSize) {
        this.bufferPool.push(buffer);
      }
    }, 1000 / 30); // Assuming 30fps

    return buffer;
  }

  public clear(): void {
    this.buffer.fill(0);
  }

  public applyEffects(): void {
    // Placeholder for effects implementation
    // This would be where we apply any real-time effects to the buffer
  }
}

export const frameBufferManager = FrameBufferManager.getInstance(); 