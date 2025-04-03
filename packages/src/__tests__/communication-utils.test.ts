/**
 * Communication Utilities Tests
 * 
 * These tests demonstrate how to use the inter-service communication utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  EventClient, 
  validateEvent, 
  createEvent, 
  WebSocketClient, 
  WebSocketState, 
  HttpClient 
} from '../index.js';
import { EVENT_SOURCES, EVENT_TYPES } from '../types/events.js';

// Mock Redis client
vi.mock('redis', () => {
  const createClient = vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn().mockReturnThis(),
    on: vi.fn(),
    publish: vi.fn().mockResolvedValue(1),
    lPush: vi.fn().mockResolvedValue(1),
    lTrim: vi.fn().mockResolvedValue('OK'),
    lRange: vi.fn().mockResolvedValue(['{"id":"test-id","type":"test-type","data":{}}']),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    lRem: vi.fn().mockResolvedValue(1)
  });
  return { createClient };
});

// Mock fetch for HttpClient testing
global.fetch = vi.fn();
global.AbortController = vi.fn().mockImplementation(() => ({
  abort: vi.fn(),
  signal: {}
}));

// Mock WebSocket for WebSocketClient testing
class MockWebSocket implements WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  
  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  readyState = MockWebSocket.OPEN;
  url = '';
  
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;

  send = vi.fn();
  close = vi.fn();
  
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe('EventClient', () => {
  let eventClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    eventClient = new EventClient({
      redisUrl: 'redis://localhost:6379',
      serviceName: 'AUCTION_ENGINE'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to Redis', async () => {
    await eventClient.connect();
    expect(eventClient.connected).toBe(true);
  });

  it('should publish events', async () => {
    await eventClient.connect();
    
    const eventId = await eventClient.publish('BID_PLACED', {
      bidId: 'bid123',
      lotId: 'lot456',
      sessionId: 'session789',
      userId: 'user123',
      amount: '1000.00',
      currency: 'USD',
      timestamp: new Date().toISOString()
    });
    
    expect(eventId).toBeDefined();
    expect(eventClient.pubClient.publish).toHaveBeenCalledTimes(2);
    expect(eventClient.redis.lPush).toHaveBeenCalledTimes(2);
  });

  it('should subscribe to events', async () => {
    await eventClient.connect();
    
    const handler = vi.fn();
    await eventClient.subscribe(EVENT_TYPES.BID_PLACED, handler);
    
    expect(eventClient.subClient.subscribe).toHaveBeenCalledTimes(1);
    expect(eventClient.subscribers.has(EVENT_TYPES.BID_PLACED)).toBe(true);
  });

  it('should provide a disconnect method', async () => {
    // First connect
    await eventClient.connect();
    expect(eventClient.connected).toBe(true);
    
    // Then disconnect
    await eventClient.disconnect();
    
    // Check status is updated
    expect(eventClient.connected).toBe(false);
  });
});

describe('Validation', () => {
  it('should validate events correctly', () => {
    const validEvent = createEvent(
      'BID_PLACED',
      EVENT_SOURCES.AUCTION_ENGINE,
      {
        bidId: 'bid123',
        lotId: 'lot456',
        sessionId: 'session789',
        userId: 'user123',
        amount: '1000.00',
        currency: 'USD',
        timestamp: new Date().toISOString()
      }
    );
    
    const validationResult = validateEvent(validEvent);
    expect(validationResult).toBe(true);
  });

  it('should reject invalid events', () => {
    const invalidEvent = {
      type: 'UNKNOWN_TYPE',
      source: 'UNKNOWN_SOURCE',
      data: {}
    };
    
    const validationResult = validateEvent(invalidEvent);
    expect(Array.isArray(validationResult)).toBe(true);
    expect(validationResult).toHaveLength(5); // id, timestamp, version, type, source invalid
  });
});

describe('WebSocketClient', () => {
  let wsClient: any;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockWs = new MockWebSocket();
    mockWs.readyState = MockWebSocket.OPEN;
    vi.spyOn(global, 'WebSocket').mockImplementation(() => mockWs);
    
    wsClient = new WebSocketClient({
      url: 'ws://localhost:8080'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to WebSocket server', () => {
    wsClient.connect();
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080', undefined);
  });

  it('should handle connection state changes', () => {
    const stateChangeHandler = vi.fn();
    wsClient.on('state:connected', stateChangeHandler);
    
    wsClient.connect();
    
    // Simulate connection opened with a proper Event object
    const mockEvent = new Event('open');
    if (mockWs.onopen) {
      mockWs.onopen.call(mockWs, mockEvent);
    }
    
    expect(wsClient.state).toBe(WebSocketState.CONNECTED);
    expect(stateChangeHandler).toHaveBeenCalled();
  });

  it('should send messages to an open WebSocket connection', () => {
    // Spy on the send method to inspect what it does without relying on the WebSocket implementation
    const sendSpy = vi.spyOn(wsClient, 'send');
    
    // Mock the private WebSocket instance to be open for testing
    (wsClient as any).ws = { readyState: WebSocket.OPEN, send: vi.fn() };
    (wsClient as any)._state = WebSocketState.CONNECTED;
    
    // Call send and check spy was called
    const result = wsClient.send({ type: 'test', data: 'hello' });
    
    // Verify the method was called with correct data
    expect(sendSpy).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
    expect(result).toBe(true); // Send should return true when successful
    
    // Now verify the WebSocket send was called with correctly formatted message
    expect((wsClient as any).ws.send).toHaveBeenCalledWith('{"type":"test","data":"hello"}');
  });

  it('should update state when closing the connection', () => {
    // Setup WebSocket connection
    wsClient.connect();
    
    // Force connected state
    (wsClient as any)._state = WebSocketState.CONNECTED;
    
    // Close the connection
    wsClient.close();
    
    // Verify state was updated
    expect(wsClient.state).toBe(WebSocketState.DISCONNECTED);
  });
});

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockResponse: any;
  let originalAbortController: typeof AbortController;

  beforeEach(() => {
    // Store original AbortController
    originalAbortController = global.AbortController;
    
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: vi.fn().mockResolvedValue({ success: true }),
      text: vi.fn().mockResolvedValue('text response'),
      blob: vi.fn().mockResolvedValue(new Blob()),
      forEach: vi.fn()
    };
    mockResponse.headers.forEach = vi.fn((callback) => {
      callback('application/json', 'content-type');
    });
    mockResponse.headers.get = vi.fn((name) => {
      if (name === 'content-type') return 'application/json';
      return null;
    });
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    // Initialize HTTP client with base URL
    httpClient = new HttpClient('http://localhost:8080');
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original AbortController
    global.AbortController = originalAbortController;
  });

  it('should make GET requests', async () => {
    const response = await httpClient.get('/api/test');
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/test',
      expect.objectContaining({
        signal: expect.anything()
      })
    );
    expect(response.data).toEqual({ success: true });
    expect(response.status).toBe(200);
  });

  it('should make POST requests with JSON body', async () => {
    const data = { name: 'test', value: 123 };
    await httpClient.post('/api/test', data);
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/test',
      expect.objectContaining({
        body: JSON.stringify(data)
      })
    );
  });

  it('should handle errors', async () => {
    mockResponse.ok = false;
    mockResponse.status = 404;
    mockResponse.statusText = 'Not Found';
    mockResponse.json.mockResolvedValue({ error: 'Resource not found' });
    
    await expect(httpClient.get('/api/not-found')).rejects.toThrow();
  });

  it('should handle fetch errors', async () => {
    // Mock a network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    // Expect request to fail with error
    await expect(httpClient.get('/api/network-error')).rejects.toThrow();
  });

  it('should correctly handle timeouts', async () => {
    // Configure a client with short timeout and no retries
    const timeoutClient = new HttpClient('http://localhost:8080', {
      timeout: 50,
      retries: 0 // No retries to speed up the test
    });
    
    // Mock a timeout error
    (global.fetch as any).mockImplementationOnce(() => {
      const error = new DOMException('The operation was aborted', 'AbortError');
      return Promise.reject(error);
    });
    
    // Expect request to fail with timeout
    await expect(timeoutClient.get('/api/timeout')).rejects.toThrow();
  });
}); 