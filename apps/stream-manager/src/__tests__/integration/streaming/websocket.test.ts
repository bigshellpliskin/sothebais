import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { logger } from '../../../utils/logger.js';

describe('WebSocket Integration', () => {
  const TEST_DURATION_MS = 5000; // Shorter duration for tests
  const PING_INTERVAL_MS = 1000;
  const MAX_RECONNECT_ATTEMPTS = 3;

  let ws: WebSocket;
  let messageCount: number;
  let reconnectAttempts: number;

  beforeEach(() => {
    messageCount = 0;
    reconnectAttempts = 0;
  });

  afterEach(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for close
    }
  });

  const config = {
    url: process.env.WS_URL || 'ws://localhost:4201/stream',
    domain: process.env.WS_DOMAIN || 'localhost',
    secure: process.env.WS_SECURE === 'true'
  };

  it('should connect to WebSocket server', async () => {
    const headers = {
      'Host': config.domain,
      'Origin': `http${config.secure ? 's' : ''}://${config.domain}`,
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Extensions': 'permessage-deflate',
      'Sec-WebSocket-Protocol': 'stream-protocol'
    };

    await new Promise<void>((resolve, reject) => {
      ws = new WebSocket(config.url, { headers });

      ws.on('open', () => {
        logger.info('WebSocket connected successfully');
        resolve();
      });

      ws.on('error', (error) => {
        logger.error('WebSocket connection failed', { error });
        reject(error);
      });

      // Add timeout
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('should handle message exchange', async () => {
    await new Promise<void>((resolve, reject) => {
      ws = new WebSocket(config.url);

      ws.on('open', () => {
        // Send stream subscription message
        const subscribeMessage = {
          type: 'subscribe',
          payload: {
            streamId: 'test',
            quality: 'high'
          }
        };
        ws.send(JSON.stringify(subscribeMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          expect(message).toHaveProperty('type');
          expect(message).toHaveProperty('payload');
          messageCount++;
          if (messageCount >= 1) {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });

      ws.on('error', reject);

      // Add timeout
      setTimeout(() => reject(new Error('Message exchange timeout')), 5000);
    });

    expect(messageCount).toBeGreaterThan(0);
  });

  it('should handle reconnection', async () => {
    await new Promise<void>((resolve, reject) => {
      ws = new WebSocket(config.url);

      ws.on('open', () => {
        // Force close to trigger reconnect
        ws.close();
      });

      ws.on('close', () => {
        reconnectAttempts++;
        if (reconnectAttempts >= 1) {
          resolve();
        } else {
          // Attempt reconnect
          setTimeout(() => {
            ws = new WebSocket(config.url);
          }, 1000);
        }
      });

      ws.on('error', (error) => {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          // Attempt reconnect
          setTimeout(() => {
            ws = new WebSocket(config.url);
          }, 1000);
        } else {
          reject(error);
        }
      });

      // Add timeout
      setTimeout(() => reject(new Error('Reconnection timeout')), 10000);
    });

    expect(reconnectAttempts).toBeGreaterThan(0);
  });

  it('should handle ping/pong', async () => {
    let pongReceived = false;

    await new Promise<void>((resolve, reject) => {
      ws = new WebSocket(config.url);

      ws.on('open', () => {
        ws.ping();
      });

      ws.on('pong', () => {
        pongReceived = true;
        resolve();
      });

      ws.on('error', reject);

      // Add timeout
      setTimeout(() => reject(new Error('Ping/pong timeout')), 5000);
    });

    expect(pongReceived).toBe(true);
  });
}); 