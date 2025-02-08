import WebSocket from 'ws';
import { logger } from '../utils/logger.js';

const TEST_DURATION_MS = 30000; // 30 seconds
const PING_INTERVAL_MS = 5000;  // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

interface TestConfig {
  url: string;
  domain: string;
  secure: boolean;
}

class WebSocketTester {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private startTime: number = 0;
  private messageCount = 0;
  private isTestFinished = false;

  constructor(private config: TestConfig) {
    this.startTime = Date.now();
    logger.info('WebSocket test initialized', {
      config,
      timestamp: new Date().toISOString()
    });
  }

  async start(): Promise<void> {
    try {
      await this.connect();
      this.setupPingInterval();
      
      // Run test for specified duration
      await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
      
      await this.cleanup();
      this.logTestSummary();
    } catch (error) {
      logger.error('Test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Headers to match Traefik's expectations
      const headers = {
        'Host': this.config.domain,
        'Origin': `http${this.config.secure ? 's' : ''}://${this.config.domain}`,
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Extensions': 'permessage-deflate',
        'Sec-WebSocket-Protocol': 'stream-protocol'
      };

      logger.info('Attempting WebSocket connection', {
        url: this.config.url,
        headers,
        attempt: this.reconnectAttempts + 1,
        timestamp: new Date().toISOString()
      });

      this.ws = new WebSocket(this.config.url, {
        headers,
        followRedirects: true,
        handshakeTimeout: 5000,
        perMessageDeflate: true
      });

      // Improved event handlers
      this.ws.on('open', () => {
        logger.info('WebSocket connected successfully', {
          url: this.config.url,
          timestamp: new Date().toISOString()
        });
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.sendTestMessage();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.messageCount++;
        try {
          const parsed = JSON.parse(data.toString());
          logger.info('Received message', {
            data: parsed,
            messageCount: this.messageCount,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.warn('Failed to parse message', {
            raw: data.toString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      this.ws.on('error', (error) => {
        logger.error('WebSocket error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt: this.reconnectAttempts + 1,
          timestamp: new Date().toISOString()
        });
        
        if (!this.isTestFinished && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          this.reconnect();
        } else {
          reject(error);
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.warn('WebSocket closed', {
          code,
          reason: reason.toString(),
          isTestFinished: this.isTestFinished,
          reconnectAttempts: this.reconnectAttempts,
          timestamp: new Date().toISOString()
        });

        if (!this.isTestFinished && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          this.reconnect();
        }
      });

      // Log ping/pong events
      this.ws.on('ping', () => {
        logger.debug('Received ping from server');
      });

      this.ws.on('pong', () => {
        logger.debug('Received pong from server');
      });
    });
  }

  private async reconnect(): Promise<void> {
    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
    
    logger.info('Attempting to reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      backoffDelay,
      timestamp: new Date().toISOString()
    });
    
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
    
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    await this.connect();
  }

  private async cleanup(): Promise<void> {
    this.isTestFinished = true; // Set flag before cleanup
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      // Send a graceful close frame
      try {
        logger.info('Sending close frame', {
          timestamp: new Date().toISOString()
        });
        this.ws.close(1000, 'Test completed');
      } catch (error) {
        logger.warn('Error during graceful close', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.ws.terminate();
      }
      this.ws = null;
    }

    logger.info('Cleanup completed', {
      messageCount: this.messageCount,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    });
  }

  private sendTestMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send test message - WebSocket not connected');
      return;
    }

    const testMessage = {
      type: 'test',
      payload: {
        timestamp: Date.now(),
        message: 'Test message from WebSocket tester',
        clientInfo: {
          domain: this.config.domain,
          secure: this.config.secure,
          reconnectAttempts: this.reconnectAttempts
        }
      }
    };

    try {
      this.ws.send(JSON.stringify(testMessage));
      logger.info('Sent test message', {
        message: testMessage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to send test message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private setupPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendTestMessage();
      }
    }, PING_INTERVAL_MS);
  }

  private logTestSummary(): void {
    const duration = Date.now() - this.startTime;
    logger.info('WebSocket test completed', {
      duration: `${duration / 1000} seconds`,
      messageCount: this.messageCount,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    });
  }
}

// Main execution
async function main() {
  // Always use Traefik proxy for WebSocket connections
  const domain = process.env.WS_DOMAIN || 'localhost';
  const secure = process.env.WS_SECURE === 'true';
  const protocol = secure ? 'wss' : 'ws';
  const url = `${protocol}://${domain}/ws`;  // Updated path to use correct WebSocket endpoint

  const config: TestConfig = {
    url,
    domain,  // Remove port from domain
    secure
  };

  logger.info('Starting WebSocket test', {
    config,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      WS_DOMAIN: process.env.WS_DOMAIN,
      WS_SECURE: process.env.WS_SECURE
    }
  });

  const tester = new WebSocketTester(config);
  await tester.start();
}

// Run the test
main().catch(error => {
  logger.error('Test script failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
}); 