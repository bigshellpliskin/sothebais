import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface ViewportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ViewportPosition {
  x: number;
  y: number;
}

export interface ViewportTransform {
  scale: number;
  rotation: number;
}

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class ViewportManager extends EventEmitter {
  private static instance: ViewportManager | null = null;
  private dimensions: ViewportDimensions;
  private safeArea: ViewportBounds;
  private gridSize: number = 8; // For snapping

  private constructor(width: number = 1920, height: number = 1080) {
    super();
    this.dimensions = {
      width,
      height,
      aspectRatio: width / height
    };
    
    // Define safe area (90% of viewport by default)
    const margin = {
      x: width * 0.05,
      y: height * 0.05
    };
    
    this.safeArea = {
      left: margin.x,
      right: width - margin.x,
      top: margin.y,
      bottom: height - margin.y
    };

    logger.info('Viewport manager initialized', {
      dimensions: this.dimensions,
      safeArea: this.safeArea
    });
  }

  public static getInstance(): ViewportManager {
    if (!ViewportManager.instance) {
      ViewportManager.instance = new ViewportManager();
    }
    return ViewportManager.instance;
  }

  // Convert relative (0-1) coordinates to absolute viewport coordinates
  public toAbsolute(relative: { x: number; y: number }): ViewportPosition {
    return {
      x: relative.x * this.dimensions.width,
      y: relative.y * this.dimensions.height
    };
  }

  // Convert absolute coordinates to relative (0-1) coordinates
  public toRelative(absolute: ViewportPosition): { x: number; y: number } {
    return {
      x: absolute.x / this.dimensions.width,
      y: absolute.y / this.dimensions.height
    };
  }

  // Snap position to grid
  public snapToGrid(position: ViewportPosition): ViewportPosition {
    return {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize
    };
  }

  // Check if position is within safe area
  public isInSafeArea(position: ViewportPosition): boolean {
    return (
      position.x >= this.safeArea.left &&
      position.x <= this.safeArea.right &&
      position.y >= this.safeArea.top &&
      position.y <= this.safeArea.bottom
    );
  }

  // Constrain position to safe area
  public constrainToSafeArea(position: ViewportPosition): ViewportPosition {
    return {
      x: Math.max(this.safeArea.left, Math.min(this.safeArea.right, position.x)),
      y: Math.max(this.safeArea.top, Math.min(this.safeArea.bottom, position.y))
    };
  }

  // Get dimensions
  public getDimensions(): ViewportDimensions {
    return { ...this.dimensions };
  }

  // Get safe area
  public getSafeArea(): ViewportBounds {
    return { ...this.safeArea };
  }

  // Update dimensions
  public updateDimensions(width: number, height: number): void {
    this.dimensions = {
      width,
      height,
      aspectRatio: width / height
    };

    // Update safe area
    const margin = {
      x: width * 0.05,
      y: height * 0.05
    };
    
    this.safeArea = {
      left: margin.x,
      right: width - margin.x,
      top: margin.y,
      bottom: height - margin.y
    };

    this.emit('dimensions:updated', this.dimensions);
  }

  // Update grid size
  public setGridSize(size: number): void {
    this.gridSize = size;
    this.emit('grid:updated', size);
  }
} 