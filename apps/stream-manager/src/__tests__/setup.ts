import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import type sharp from 'sharp';
import type { FileHandle } from 'fs/promises';
import type { PathLike } from 'fs';
import type { RedisClientType } from 'redis';
import type { FfmpegCommand } from 'fluent-ffmpeg';

// Extend timeout for all tests
// vi.setConfig({ testTimeout: 30000 });

// Mock Redis
vi.mock('../state/redis-service', () => ({
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
  WebSocket: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn()
  })),
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock RTMP Server
vi.mock('node-media-server', () => 
  vi.fn().mockImplementation(() => ({
    run: vi.fn(),
    on: vi.fn(),
    stop: vi.fn()
  }))
);

// Mock Sharp for image processing
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  toBuffer: vi.fn<[], Promise<Buffer>>().mockResolvedValue(Buffer.from('mock-image')),
  metadata: vi.fn<[], Promise<{ width: number; height: number; }>>().mockResolvedValue({ width: 1920, height: 1080 }),
  extract: vi.fn().mockReturnThis(),
  extend: vi.fn().mockReturnThis(),
  flatten: vi.fn().mockReturnThis(),
  raw: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis()
};
vi.mock('sharp', () => ({ default: vi.fn(() => mockSharpInstance) }));

// Define an explicit type for the ffmpeg mock instance
// Use Partial because we only mock a subset of FfmpegCommand methods
type MockFfmpegInstance = Partial<Pick<FfmpegCommand, 
    'input' | 'inputFormat' | 'outputFormat' | 'output' | 
    'screenshots' | 'outputOptions' | 'on' | 'run'
>>;

// Mock FFmpeg (using vi.mock)
const mockFfmpegInstance: MockFfmpegInstance = {
    input: vi.fn().mockReturnThis(),
    inputFormat: vi.fn().mockReturnThis(),
    outputFormat: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    screenshots: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    // Simplify mock signature for 'on' - cast to any or a simpler function type
    on: vi.fn((event: string, callback: (...args: any[]) => void) => { 
      if (event === 'end') {
        callback(); // Simulate 'end' event for tests if needed
      }
      return mockFfmpegInstance; // Return the mock instance
    }) as any, // Cast to any to bypass complex overload issues
    run: vi.fn()
  };
vi.mock('fluent-ffmpeg', () => ({ 
    // Ensure the factory returns the correctly typed mock
    default: vi.fn(() => mockFfmpegInstance as FfmpegCommand), // Cast to base type here
    __esModule: true
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
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

// Mock fs promises (using vi.mock)
vi.mock('fs/promises', () => ({
  // Use types imported from 'fs' and 'fs/promises'
  readFile: vi.fn<[PathLike | FileHandle, any?], Promise<Buffer>>().mockResolvedValue(Buffer.from('mock-file')),
  writeFile: vi.fn<[PathLike | FileHandle, any, any?], Promise<void>>().mockResolvedValue(undefined),
  unlink: vi.fn<[PathLike], Promise<void>>().mockResolvedValue(undefined)
}));

// Mock Redis
const mockRedisClient = {
  connect: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  disconnect: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  get: vi.fn<[string], Promise<string | null>>().mockResolvedValue('mock-value'),
  set: vi.fn<[string, any, any?], Promise<string | null>>().mockResolvedValue('OK'),
  del: vi.fn<[string | string[]], Promise<number>>().mockResolvedValue(1)
};
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue(mockRedisClient as any)
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

// Global test setup
beforeAll(() => {
  // Setup any global test environment
});

afterAll(() => {
  // Cleanup any global test environment
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({
  // Add custom matchers here
}); 