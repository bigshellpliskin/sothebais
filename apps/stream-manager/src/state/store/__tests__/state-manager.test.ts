import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { StateManagerImpl } from '../state-manager.js';
import { redisService } from '../../persistence.js';
import type { PreviewClientState, StateEventListener } from '../state-manager.types.js';
import type { StreamState } from '../../../types/stream.js';
import type { LayerState, Layer, Transform, OverlayContent } from '../../../types/layers.js';

// Create properly typed mock functions
const mockGetLayerState = jest.fn<() => Promise<LayerState | null>>();
const mockSaveLayerState = jest.fn<(state: LayerState) => Promise<void>>();

// Mock Redis service
jest.mock('../../persistence.js', () => ({
  redisService: {
    getLayerState: () => mockGetLayerState(),
    saveLayerState: (state: LayerState) => mockSaveLayerState(state)
  }
}));

describe('StateManager', () => {
  let stateManager: StateManagerImpl;

  const defaultTransform: Transform = {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 }
  };

  const mockOverlayContent: OverlayContent = {
    type: 'image',
    content: 'test.png',
    style: {
      width: 100,
      height: 100
    }
  };

  const mockLayer: Layer = {
    id: 'test-layer',
    type: 'overlay',
    zIndex: 1,
    visible: true,
    opacity: 1,
    transform: defaultTransform,
    content: mockOverlayContent
  };

  beforeEach(() => {
    // Reset the singleton instance before each test
    (StateManagerImpl as any).instance = null;
    stateManager = StateManagerImpl.getInstance();
    
    // Clear all mocks
    mockGetLayerState.mockClear();
    mockSaveLayerState.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = StateManagerImpl.getInstance();
      const instance2 = StateManagerImpl.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default state', () => {
      expect(stateManager.getStreamState()).toEqual({
        isLive: false,
        isPaused: false,
        fps: 0,
        targetFPS: 30,
        frameCount: 0,
        droppedFrames: 0,
        averageRenderTime: 0
      });

      expect(stateManager.getLayerState()).toEqual({
        layers: [],
        activeLayerId: null
      });

      expect(stateManager.getPreviewClients()).toEqual({});
    });
  });

  describe('Stream State Management', () => {
    it('should update stream state', async () => {
      const update: Partial<StreamState> = {
        isLive: true,
        fps: 60
      };

      await stateManager.updateStreamState(update);
      const state = stateManager.getStreamState();

      expect(state.isLive).toBe(true);
      expect(state.fps).toBe(60);
      // Other fields should remain default
      expect(state.isPaused).toBe(false);
    });

    it('should notify listeners of stream state changes', async () => {
      const listener = jest.fn();
      stateManager.addEventListener(listener);

      await stateManager.updateStreamState({ isLive: true });

      expect(listener).toHaveBeenCalledWith({
        type: 'stream',
        payload: expect.objectContaining({ isLive: true })
      });
    });
  });

  describe('Layer State Management', () => {
    it('should update layer state', async () => {
      const update: Partial<LayerState> = {
        layers: [mockLayer],
        activeLayerId: 'test-layer'
      };

      await stateManager.updateLayerState(update);
      const state = stateManager.getLayerState();

      expect(state.layers).toHaveLength(1);
      expect(state.layers[0]).toEqual(mockLayer);
      expect(state.activeLayerId).toBe('test-layer');
    });

    it('should persist layer state to Redis', async () => {
      const update: Partial<LayerState> = {
        layers: [mockLayer],
        activeLayerId: 'test-layer'
      };

      await stateManager.updateLayerState(update);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(mockSaveLayerState).toHaveBeenCalledWith(
        expect.objectContaining(update)
      );
    });
  });

  describe('Preview Client Management', () => {
    const mockClient: PreviewClientState = {
      id: 'client1',
      quality: 'medium',
      lastPing: Date.now(),
      connected: true
    };

    it('should add new preview clients', async () => {
      await stateManager.updatePreviewClient(mockClient.id, mockClient);
      const clients = stateManager.getPreviewClients();

      expect(clients[mockClient.id]).toEqual(mockClient);
    });

    it('should update existing preview clients', async () => {
      await stateManager.updatePreviewClient(mockClient.id, mockClient);
      await stateManager.updatePreviewClient(mockClient.id, {
        quality: 'high'
      });

      const clients = stateManager.getPreviewClients();
      expect(clients[mockClient.id].quality).toBe('high');
      expect(clients[mockClient.id].connected).toBe(true);
    });

    it('should notify listeners of client updates', async () => {
      const listener = jest.fn();
      stateManager.addEventListener(listener);

      await stateManager.updatePreviewClient(mockClient.id, mockClient);

      expect(listener).toHaveBeenCalledWith({
        type: 'previewClient',
        payload: mockClient
      });
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', async () => {
      const listener = jest.fn();
      stateManager.addEventListener(listener);

      await stateManager.updateStreamState({ isLive: true });
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      stateManager.removeEventListener(listener);

      await stateManager.updateStreamState({ isLive: false });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener: StateEventListener = () => {
        throw new Error('Test error');
      };
      const goodListener = jest.fn();

      stateManager.addEventListener(errorListener);
      stateManager.addEventListener(goodListener);

      // Should not throw
      await expect(stateManager.updateStreamState({ isLive: true }))
        .resolves.not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    it('should load state from Redis', async () => {
      const mockLayerState: LayerState = {
        layers: [mockLayer],
        activeLayerId: 'test-layer'
      };

      mockGetLayerState.mockResolvedValueOnce(mockLayerState);

      await stateManager.loadState();
      const state = stateManager.getLayerState();

      expect(state).toEqual(mockLayerState);
    });

    it('should handle Redis errors when loading', async () => {
      mockGetLayerState.mockRejectedValueOnce(new Error('Redis error'));

      await expect(stateManager.loadState()).rejects.toThrow('Redis error');
    });

    it('should debounce save operations', async () => {
      await stateManager.updateLayerState({ layers: [] });
      await stateManager.updateLayerState({ layers: [] });
      await stateManager.updateLayerState({ layers: [] });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should only save once
      expect(mockSaveLayerState).toHaveBeenCalledTimes(1);
    });
  });
}); 