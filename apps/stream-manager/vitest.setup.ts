import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Redis client
vi.mock('../src/state/redis-service', () => ({
  redisService: {
    initialize: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }
}));

// Mock WebSocket
vi.mock('ws', () => ({
  WebSocket: vi.fn(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn()
  })),
  Server: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock RTMP Server
vi.mock('node-media-server', () => 
  vi.fn(() => ({
    run: vi.fn(),
    on: vi.fn(),
    stop: vi.fn()
  }))
);

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  logStreamEvent: vi.fn()
}));

// Mock performance hooks
vi.mock('perf_hooks', () => ({
  performance: {
    now: vi.fn(() => Date.now())
  }
}));

// Mock sharp
vi.mock('sharp', () => {
  return {
    default: vi.fn(() => ({
      metadata: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
      png: vi.fn().mockReturnThis(),
      composite: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      extract: vi.fn().mockReturnThis(),
      extend: vi.fn().mockReturnThis(),
      flatten: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis()
    }))
  };
});

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  return {
    default: vi.fn(() => ({
      screenshots: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation(function(this: any, event: string, callback: () => void) {
        if (event === 'end') {
          callback();
        }
        return this;
      }),
      run: vi.fn()
    }))
  };
});

// Mock fs promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-file')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined)
}));

// Mock Redis
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue('mock-value'),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1)
  }))
}));

// Common test utilities
export const mockLayer = {
  id: 'test-layer',
  type: 'host',
  zIndex: 0,
  visible: true,
  opacity: 1,
  transform: {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 },
  },
  character: {
    modelUrl: 'test-model.vrm',
    textureUrl: null,
    animations: {},
    width: 512,
    height: 512,
  },
}; 