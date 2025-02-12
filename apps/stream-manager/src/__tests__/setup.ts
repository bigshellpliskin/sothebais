import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import type sharp from 'sharp';

// Extend timeout for all tests
jest.setTimeout(30000);

// Mock Redis
jest.mock('../state/redis-service', () => ({
  redisService: {
    initialize: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }
}));

// Mock WebSocket
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn()
  })),
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock RTMP Server
jest.mock('node-media-server', () => 
  jest.fn().mockImplementation(() => ({
    run: jest.fn(),
    on: jest.fn(),
    stop: jest.fn()
  }))
);

// Mock Sharp for image processing
const mockToBuffer = jest.fn<() => Promise<Buffer>>();
mockToBuffer.mockResolvedValue(Buffer.from('mock-image'));

const mockMetadata = jest.fn<() => Promise<sharp.Metadata>>();
mockMetadata.mockResolvedValue({ width: 1920, height: 1080 } as sharp.Metadata);

const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  composite: jest.fn().mockReturnThis(),
  toBuffer: mockToBuffer,
  metadata: mockMetadata,
  extract: jest.fn().mockReturnThis(),
  extend: jest.fn().mockReturnThis(),
  flatten: jest.fn().mockReturnThis(),
  raw: jest.fn().mockReturnThis()
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

// Mock FFmpeg
jest.mock('fluent-ffmpeg', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    input: jest.fn().mockReturnThis(),
    inputFormat: jest.fn().mockReturnThis(),
    outputFormat: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    run: jest.fn()
  })
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock performance hooks
jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(() => Date.now())
  }
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
  jest.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({
  // Add custom matchers here
}); 