import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AssetManager } from '../../../core/assets';
import type { Asset, AssetType } from '../../../types/layout';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger');

describe('AssetManager', () => {
  let assetManager: AssetManager;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (AssetManager as any).instance = null;
    assetManager = AssetManager.getInstance();
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = AssetManager.getInstance();
      const instance2 = AssetManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with logger', () => {
      expect(logger.info).toHaveBeenCalledWith('Asset manager initialized');
    });
  });

  describe('asset operations', () => {
    const testSource = 'test-image.png';
    const testType: AssetType = 'image';

    it('should load and cache an asset', async () => {
      const buffer = await assetManager.loadAsset(testSource, testType);
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should return cached asset on subsequent loads', async () => {
      const firstLoad = await assetManager.loadAsset(testSource, testType);
      const secondLoad = await assetManager.loadAsset(testSource, testType);
      expect(firstLoad).toBe(secondLoad);
    });

    it('should preload multiple assets', async () => {
      const assets: Asset[] = [
        {
          id: 'test-1',
          type: 'image',
          source: 'test1.png',
          position: { x: 0, y: 0 },
          transform: {
            scale: 1,
            rotation: 0,
            anchor: { x: 0.5, y: 0.5 },
            opacity: 1
          },
          zIndex: 0,
          visible: true
        },
        {
          id: 'test-2',
          type: 'image',
          source: 'test2.png',
          position: { x: 0, y: 0 },
          transform: {
            scale: 1,
            rotation: 0,
            anchor: { x: 0.5, y: 0.5 },
            opacity: 1
          },
          zIndex: 1,
          visible: true
        }
      ];

      await assetManager.preloadAssets(assets);
      expect(logger.info).toHaveBeenCalledWith('Asset preload complete');
    });

    it('should create an asset with correct defaults', () => {
      const position = { x: 100, y: 100 };
      const transform = {
        scale: 1,
        rotation: 0,
        opacity: 1,
        anchor: { x: 0, y: 0 }
      };

      const asset = assetManager.createAsset('image', testSource, position, transform);
      expect(asset).toMatchObject({
        type: 'image',
        source: testSource,
        position,
        transform: {
          ...transform,
          anchor: { x: 0.5, y: 0.5 } // Default center anchor
        },
        zIndex: 0,
        visible: true
      });
      expect(asset.id).toMatch(/^asset_\d+$/);
    });
  });

  describe('error handling', () => {
    it('should handle loading non-existent asset', async () => {
      await expect(assetManager.loadAsset('non-existent.png', 'image'))
        .rejects.toThrow();
    });

    it('should handle unsupported asset types', async () => {
      await expect(assetManager.loadAsset('test.xyz', 'text'))
        .rejects.toThrow('Text rendering not implemented');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      assetManager.clearCache();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Asset manager initialized')
      );
    });

    it('should get asset metadata', async () => {
      const metadata = await assetManager.getAssetMetadata('test-image.png', 'image');
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('width');
      expect(metadata).toHaveProperty('height');
    });
  });
}); 