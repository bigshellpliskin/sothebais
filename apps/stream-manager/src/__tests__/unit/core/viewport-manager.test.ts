import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ViewportManager } from '../../../core/viewport';
import type { ViewportDimensions } from '../../../types/viewport';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger');

describe('ViewportManager', () => {
  let viewportManager: ViewportManager;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (ViewportManager as any).instance = null;
    viewportManager = ViewportManager.getInstance();
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = ViewportManager.getInstance();
      const instance2 = ViewportManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default dimensions', async () => {
      const config = {
        VIEWPORT_WIDTH: 1920,
        VIEWPORT_HEIGHT: 1080,
        VIEWPORT_GRID_SIZE: 32,
        VIEWPORT_SAFE_AREA: { x: 0.1, y: 0.1 }
      };

      const manager = ViewportManager.getInstance();
      await (manager as any).initialize(config);

      const dimensions = manager.getDimensions();
      expect(dimensions).toEqual({
        width: 1920,
        height: 1080,
        aspectRatio: 16/9
      });
    });
  });

  describe('viewport operations', () => {
    beforeEach(async () => {
      const config = {
        VIEWPORT_WIDTH: 1920,
        VIEWPORT_HEIGHT: 1080,
        VIEWPORT_GRID_SIZE: 32,
        VIEWPORT_SAFE_AREA: { x: 0.1, y: 0.1 }
      };

      const manager = ViewportManager.getInstance();
      await (manager as any).initialize(config);
    });

    it('should update dimensions', () => {
      const newDimensions: ViewportDimensions = {
        width: 1280,
        height: 720,
        aspectRatio: 16/9
      };

      (viewportManager as any).updateDimensions(newDimensions);
      const dimensions = viewportManager.getDimensions();
      expect(dimensions).toEqual(newDimensions);
    });

    it('should validate coordinates within bounds', () => {
      const pos = { x: 960, y: 540 };
      expect((viewportManager as any).isWithinBounds(pos)).toBe(true);
      expect((viewportManager as any).isWithinBounds({ x: -1, y: 540 })).toBe(false);
      expect((viewportManager as any).isWithinBounds({ x: 960, y: 1081 })).toBe(false);
    });

    it('should snap coordinates to grid', () => {
      const pos = { x: 45, y: 67 };
      const snapped = (viewportManager as any).snapToGrid(pos);
      expect(snapped.x % 32).toBe(0);
      expect(snapped.y % 32).toBe(0);
    });

    it('should calculate safe area bounds', () => {
      const safeBounds = (viewportManager as any).getSafeAreaBounds();
      expect(safeBounds).toEqual({
        x: 192,  // 10% of 1920
        y: 108,  // 10% of 1080
        width: 1536,  // 80% of 1920
        height: 864   // 80% of 1080
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when updating dimensions with invalid values', () => {
      expect(() => {
        (viewportManager as any).updateDimensions({
          width: -1,
          height: 720,
          aspectRatio: 16/9
        });
      }).toThrow();
    });

    it('should throw error when initializing with invalid config', async () => {
      const invalidConfig = {
        VIEWPORT_WIDTH: -1,
        VIEWPORT_HEIGHT: 1080,
        VIEWPORT_GRID_SIZE: 32,
        VIEWPORT_SAFE_AREA: { x: 0.1, y: 0.1 }
      };

      await expect((viewportManager as any).initialize(invalidConfig)).rejects.toThrow();
    });
  });
}); 