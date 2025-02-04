import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getConfig } from '../../config/index.js';

// Mock config first
jest.mock('../../config/index.js');

const mockConfig = {
  STREAM_RESOLUTION: '1920x1080',
  TARGET_FPS: 30,
  STREAM_BITRATE: '2500k',
  STREAM_CODEC: 'h264',
  FFMPEG_PRESET: 'ultrafast',
  STREAM_URL: 'rtmp://localhost/live'
};

(getConfig as jest.Mock).mockReturnValue(mockConfig);

// Mock prom-client
jest.mock('prom-client', () => {
  const mockMetrics = jest.fn().mockImplementation(async () => 'mock metrics');
  const mockRegistry = {
    metrics: mockMetrics,
    register: jest.fn(),
    clear: jest.fn()
  };

  const mockGauge = {
    set: jest.fn(),
    get: jest.fn().mockReturnValue(30),
    labels: jest.fn().mockReturnThis()
  };

  return {
    Registry: jest.fn().mockImplementation(() => mockRegistry),
    Gauge: jest.fn().mockImplementation(() => mockGauge)
  };
});

// Mock implementations
const mockComposite = jest.fn();
mockComposite.mockImplementation(async () => new Uint8Array(100));

// Mock SharpRenderer before importing
jest.mock('../../pipeline/sharp-renderer.js', () => {
  const mockSharpRenderer = {
    composite: mockComposite,
    initialize: jest.fn().mockImplementation(async () => {})
  };

  return {
    SharpRenderer: {
      getInstance: jest.fn().mockReturnValue(mockSharpRenderer)
    }
  };
});

// Mock StreamManager before importing
jest.mock('../../pipeline/stream-manager.js', () => {
  const mockStreamManager = {
    emit: jest.fn().mockImplementation(async () => {}),
    start: jest.fn(),
    stop: jest.fn(),
    processFrame: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      isStreaming: true,
      frameCount: 0,
      currentFPS: 30,
      encoderMetrics: {}
    })
  };

  return {
    StreamManager: {
      initialize: jest.fn().mockReturnValue(mockStreamManager),
      getInstance: jest.fn().mockReturnValue(mockStreamManager)
    }
  };
});

// Mock FrameBufferManager before importing
jest.mock('../../pipeline/frame-buffer.js', () => {
  const mockFrameBufferManager = {
    addFrame: jest.fn().mockImplementation(async () => {}),
    getBuffer: jest.fn().mockImplementation(() => new Uint8Array(100)),
    clear: jest.fn()
  };

  return {
    FrameBufferManager: {
      getInstance: jest.fn().mockReturnValue(mockFrameBufferManager)
    }
  };
});

// Mock LayerManager before importing
jest.mock('../layer-manager.js', () => {
  const mockLayerManager = {
    getAllLayers: jest.fn().mockReturnValue([]),
    clearAllLayers: jest.fn().mockImplementation(async () => {})
  };

  return {
    layerManager: mockLayerManager
  };
});

// Now import the rest
import { layerRenderer } from '../layer-renderer.js';
import { layerManager } from '../layer-manager.js';
import type { Layer, HostLayer } from '../../types/layers.js';
import { redisService } from '../redis.js';

// Mock Redis
jest.mock('../redis.js');

const mockRedis = {
  connect: jest.fn().mockImplementation(async () => {}),
  disconnect: jest.fn().mockImplementation(async () => {}),
  getLayerState: jest.fn().mockImplementation(async () => null),
  setLayerState: jest.fn().mockImplementation(async () => {})
};

(redisService as unknown as typeof mockRedis).connect = mockRedis.connect;
(redisService as unknown as typeof mockRedis).disconnect = mockRedis.disconnect;
(redisService as unknown as typeof mockRedis).getLayerState = mockRedis.getLayerState;
(redisService as unknown as typeof mockRedis).setLayerState = mockRedis.setLayerState;

describe('LayerRenderer', () => {
  const mockLayer: HostLayer = {
    id: 'test-layer',
    type: 'host',
    zIndex: 0,
    visible: true,
    opacity: 1,
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      anchor: { x: 0.5, y: 0.5 }
    },
    character: {
      modelUrl: 'test-model.vrm',
      textureUrl: null,
      animations: {},
      width: 512,
      height: 512
    }
  };

  beforeEach(async () => {
    // Reset mocks and state
    jest.clearAllMocks();
    await layerManager.clearAllLayers();
    await layerRenderer.initialize();
  });

  afterEach(() => {
    // Clean up
    layerRenderer.cleanup();
    jest.useRealTimers();
  });

  test('initializes successfully', async () => {
    expect(layerRenderer).toBeDefined();
    const health = layerRenderer.getHealth();
    expect(health.status).toBe('unhealthy'); // Initially unhealthy as render loop is not started
  });

  test('starts and stops render loop', async () => {
    await layerRenderer.startRenderLoop(30);
    let health = layerRenderer.getHealth();
    expect(health.status).toBe('healthy');

    layerRenderer.stopRenderLoop();
    health = layerRenderer.getHealth();
    expect(health.status).toBe('unhealthy');
  });

  test('handles layer rendering', async () => {
    // Mock layer manager to return our test layer
    (layerManager.getAllLayers as jest.Mock).mockReturnValue([mockLayer]);
    
    // Mock timing
    jest.useFakeTimers();
    let currentTime = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      currentTime += 33; // Simulate ~30fps
      return currentTime;
    });
    
    await layerRenderer.startRenderLoop(30);
    
    // Wait for a few frames to be rendered
    jest.advanceTimersByTime(100);
    
    const health = layerRenderer.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.layerCount).toBe(1);
    expect(health.fps).toBeGreaterThan(0);
    
    // Verify that composite was called with our layer
    expect(mockComposite).toHaveBeenCalledWith([mockLayer]);
  });

  test('resizes renderer', () => {
    const newWidth = 1280;
    const newHeight = 720;
    layerRenderer.resize(newWidth, newHeight);
    
    // Since width and height are private, we can verify the resize worked
    // by checking if rendering still works
    expect(() => layerRenderer.startRenderLoop(30)).not.toThrow();
  });

  test('provides metrics', async () => {
    const metrics = await layerRenderer.getMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics).toBe('string');
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('handles errors gracefully', async () => {
    // Mock composite to throw an error
    mockComposite.mockImplementationOnce(async () => {
      throw new Error('Render error');
    });
    
    // Mock layer manager to return our test layer
    (layerManager.getAllLayers as jest.Mock).mockReturnValue([mockLayer]);
    
    // Mock timing
    jest.useFakeTimers();
    let currentTime = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      currentTime += 33; // Simulate ~30fps
      return currentTime;
    });
    
    await layerRenderer.startRenderLoop(30);
    
    // Wait for potential errors
    jest.advanceTimersByTime(100);
    
    const health = layerRenderer.getHealth();
    // Even with errors, the service should stay running
    expect(health.status).toBe('healthy');
  });
}); 