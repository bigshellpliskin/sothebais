import { jest } from '@jest/globals';
import sharp from 'sharp';

// Extend timeout for all tests
jest.setTimeout(30000);

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock WebSocket
jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    terminate: jest.fn(),
  }));
});

// Mock FFmpeg
jest.mock('fluent-ffmpeg', () => {
  return jest.fn().mockImplementation(() => ({
    input: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    run: jest.fn(),
  }));
});

// Mock Sharp
type SharpMock = jest.Mocked<typeof sharp>;
jest.mock('sharp', () => {
  const sharpFn = jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockImplementation(() => Promise.resolve(Buffer.alloc(4))),
    metadata: jest.fn().mockImplementation(() => Promise.resolve({ width: 1920, height: 1080 })),
    extract: jest.fn().mockReturnThis(),
    extend: jest.fn().mockReturnThis(),
    flatten: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
  }));

  Object.assign(sharpFn, {
    strategy: jest.fn(),
    cache: jest.fn(),
    concurrency: jest.fn(),
    counters: jest.fn(),
    simd: jest.fn(),
    format: jest.fn(),
  });

  return sharpFn;
}) as unknown as SharpMock;

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