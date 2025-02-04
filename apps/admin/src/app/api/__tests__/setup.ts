/// <reference types="jest" />

// Mock stream status
export const mockStreamStatus = {
  isLive: true,
  fps: 60,
  layerCount: 3,
  metrics: {
    cpu: 45,
    memory: 1024,
    uptime: 3600
  }
};

// Mock chat message
export const mockChatMessage = {
  id: '123',
  user: 'testUser',
  message: 'Hello world',
  timestamp: '2024-02-04T12:00:00Z',
  highlight: {
    type: 'bid',
    timestamp: '2024-02-04T12:00:01Z'
  }
};

// Mock frame buffer
export const mockFrameBuffer = {
  width: 1920,
  height: 1080,
  format: 'rgba',
  data: new Uint8Array([255, 255, 255, 255])
};

// Common test data
export const mockLayers = [
  { id: 1, type: 'background', visible: true },
  { id: 2, type: 'overlay', visible: true },
  { id: 3, type: 'chat', visible: true }
];

// Helper to create test requests
export const createTestRequest = (options: {
  method?: string;
  url: string;
  body?: any;
}) => {
  return new Request(options.url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
};

// Setup global fetch mock
beforeEach(() => {
  global.fetch = jest.fn();
}); 