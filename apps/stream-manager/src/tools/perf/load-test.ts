import WebSocket from 'ws';
import { metricsService } from '../../monitoring/metrics.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

interface TestScenario {
  clients: number;
  duration: string;
  frameRate: number;
  distribution?: {
    high: number;
    medium: number;
    low: number;
  };
}

interface TestClient {
  id: string;
  ws: WebSocket;
  quality: 'high' | 'medium' | 'low';
  connected: boolean;
  messageCount: number;
  startTime: number;
  lastMessageTime: number;
  connectionAttempts: number;
  frameStats: {
    received: number;
    batched: number;
    dropped: number;
    sizes: number[];
    lastBatchSize: number;
    lastFrameInterval: number;
  };
}

class LoadTester {
  private clients: Map<string, TestClient> = new Map();
  private startTime: number;
  private testDuration: number;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private readonly wsUrl: string;
  private readonly maxReconnectAttempts = 3;
  private readonly reconnectDelay = 1000;

  constructor(private scenario: TestScenario) {
    this.startTime = Date.now();
    this.testDuration = this.parseDuration(scenario.duration);
    this.wsUrl = `ws://localhost:${config.WS_PORT}/stream/preview`;

    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private async cleanup(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    logger.info('Cleaning up test clients...');
    await this.stop();
    process.exit(0);
  }

  private parseDuration(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: throw new Error(`Invalid duration unit: ${unit}`);
    }
  }

  private getQualityForClient(): 'high' | 'medium' | 'low' {
    if (!this.scenario.distribution) return 'medium';
    
    const rand = Math.random();
    if (rand < this.scenario.distribution.high) return 'high';
    if (rand < this.scenario.distribution.high + this.scenario.distribution.medium) return 'medium';
    return 'low';
  }

  private validateMessage(data: WebSocket.RawData): { isValid: boolean; type?: string; payload?: any } {
    try {
      // First try to parse as JSON for control messages
      const message = JSON.parse(data.toString());
      if (message && message.type) {
        return { isValid: true, type: message.type, payload: message.data };
      }
    } catch {
      // Not JSON, check if it's a binary frame
      if (Buffer.isBuffer(data) && data.length > 0) {
        return { isValid: true, type: 'frame' };
      }
    }
    return { isValid: false };
  }

  private async createClient(clientId: string): Promise<TestClient> {
    const quality = this.getQualityForClient();
    const client: TestClient = {
      id: clientId,
      ws: new WebSocket(this.wsUrl),
      quality,
      connected: false,
      messageCount: 0,
      startTime: Date.now(),
      lastMessageTime: 0,
      connectionAttempts: 1,
      frameStats: {
        received: 0,
        batched: 0,
        dropped: 0,
        sizes: [],
        lastBatchSize: 0,
        lastFrameInterval: 0
      }
    };

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        if (!client.connected) {
          client.ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 5000);

      client.ws.on('open', () => {
        clearTimeout(connectTimeout);
        client.connected = true;
        metricsService.recordWsConnection(quality);
        
        logger.info('Client connected', {
          clientId,
          quality,
          attempt: client.connectionAttempts,
          timestamp: new Date().toISOString(),
          component: 'websocket'
        });

        // Send quality preference
        client.ws.send(JSON.stringify({
          type: 'quality',
          data: { quality }
        }));

        resolve(client);
      });

      client.ws.on('message', (data) => {
        const now = Date.now();
        const validation = this.validateMessage(data);
        
        if (!validation.isValid) {
          logger.warn('Invalid message received', {
            clientId,
            size: Buffer.isBuffer(data) ? data.length : 0,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (validation.type === 'frame' && Buffer.isBuffer(data)) {
          this.handleFrame(client, data, now);
        } else if (validation.type === 'ping') {
          client.ws.send(JSON.stringify({ type: 'pong' }));
        }
      });

      client.ws.on('close', async () => {
        client.connected = false;
        metricsService.recordWsDisconnection(quality);
        
        // Try to reconnect if not shutting down
        if (!this.isShuttingDown && client.connectionAttempts < this.maxReconnectAttempts) {
          logger.info('Attempting to reconnect', {
            clientId,
            attempt: client.connectionAttempts + 1,
            component: 'websocket'
          });

          await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
          client.connectionAttempts++;
          client.ws = new WebSocket(this.wsUrl);
          this.setupClientHandlers(client);
        } else {
          this.logClientDisconnect(client);
        }
      });

      client.ws.on('error', (error) => {
        client.frameStats.dropped++;
        logger.error('Client error', {
          clientId,
          error: error.message,
          connectionAttempts: client.connectionAttempts,
          component: 'websocket'
        });
      });
    });
  }

  private handleFrame(client: TestClient, data: Buffer, timestamp: number): void {
    client.messageCount++;
    
    // Calculate frame timing
    if (client.lastMessageTime > 0) {
      client.frameStats.lastFrameInterval = timestamp - client.lastMessageTime;
    }
    client.lastMessageTime = timestamp;

    const frameSize = data.length;
    client.frameStats.received++;
    client.frameStats.sizes.push(frameSize);
    
    // Keep only last 10 frame sizes for memory efficiency
    if (client.frameStats.sizes.length > 10) {
      client.frameStats.sizes.shift();
    }

    // Detect batch messages (header size + at least one frame)
    const isBatch = frameSize > 16 + 1024;
    if (isBatch) {
      client.frameStats.batched++;
      client.frameStats.lastBatchSize = frameSize;
    }

    metricsService.recordFrameSize(frameSize);
    metricsService.recordWsMessageReceived('frame');

    logger.debug('Frame received', {
      clientId: client.id,
      quality: client.quality,
      frameSize,
      isBatch,
      interval: client.frameStats.lastFrameInterval,
      timestamp: new Date().toISOString(),
      component: 'frame'
    });
  }

  private logClientDisconnect(client: TestClient): void {
    const avgFrameSize = client.frameStats.sizes.length > 0
      ? client.frameStats.sizes.reduce((a, b) => a + b, 0) / client.frameStats.sizes.length
      : 0;
    
    logger.info('Client disconnected', {
      clientId: client.id,
      quality: client.quality,
      messageCount: client.messageCount,
      duration: Date.now() - client.startTime,
      attempts: client.connectionAttempts,
      frameStats: {
        received: client.frameStats.received,
        batched: client.frameStats.batched,
        avgFrameSize,
        lastBatchSize: client.frameStats.lastBatchSize,
        avgInterval: client.frameStats.lastFrameInterval
      },
      timestamp: new Date().toISOString(),
      component: 'websocket'
    });
  }

  private recordMetrics(): void {
    const now = Date.now();
    const connectedClients = Array.from(this.clients.values()).filter(c => c.connected);
    
    const qualityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    const frameStats = {
      totalReceived: 0,
      totalBatched: 0,
      totalDropped: 0,
      avgFrameSize: 0,
      avgInterval: 0,
      batchEfficiency: 0
    };

    let totalFrameSizes = 0;
    let totalIntervals = 0;

    connectedClients.forEach(client => {
      qualityCounts[client.quality]++;
      
      // Aggregate frame statistics
      frameStats.totalReceived += client.frameStats.received;
      frameStats.totalBatched += client.frameStats.batched;
      frameStats.totalDropped += client.frameStats.dropped;
      
      const clientAvgFrameSize = client.frameStats.sizes.reduce((a, b) => a + b, 0) / client.frameStats.sizes.length;
      totalFrameSizes += clientAvgFrameSize;
      
      if (client.frameStats.lastFrameInterval > 0) {
        totalIntervals += client.frameStats.lastFrameInterval;
      }
    });

    if (connectedClients.length > 0) {
      frameStats.avgFrameSize = totalFrameSizes / connectedClients.length;
      frameStats.avgInterval = totalIntervals / connectedClients.length;
      frameStats.batchEfficiency = (frameStats.totalBatched / frameStats.totalReceived) * 100;
    }

    // Update metrics
    Object.entries(qualityCounts).forEach(([quality, count]) => {
      metricsService.updateActiveClients(quality, count);
    });

    // Log detailed component status
    logger.info('Test status', {
      elapsed: (now - this.startTime) / 1000,
      totalDuration: this.testDuration / 1000,
      components: {
        websocket: {
          activeClients: connectedClients.length,
          qualityDistribution: qualityCounts
        },
        frames: {
          received: frameStats.totalReceived,
          batched: frameStats.totalBatched,
          dropped: frameStats.totalDropped,
          avgSize: frameStats.avgFrameSize,
          avgInterval: frameStats.avgInterval
        },
        batching: {
          efficiency: frameStats.batchEfficiency,
          totalBatches: frameStats.totalBatched
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting load test', {
        scenario: this.scenario,
        wsUrl: this.wsUrl,
        timestamp: new Date().toISOString()
      });

      // Create clients gradually
      for (let i = 0; i < this.scenario.clients; i++) {
        const clientId = `test_${i}`;
        try {
          const client = await this.createClient(clientId);
          this.clients.set(clientId, client);
          // Stagger client creation
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error('Failed to create client', {
            clientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (this.clients.size === 0) {
        throw new Error('No clients could be created');
      }

      // Start metrics recording
      this.metricsInterval = setInterval(() => this.recordMetrics(), 1000);

      // Schedule test end
      setTimeout(() => this.stop(), this.testDuration);
    } catch (error) {
      logger.error('Failed to start test', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      await this.cleanup();
    }
  }

  public async stop(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all clients
    const closePromises = Array.from(this.clients.values()).map(client => {
      return new Promise<void>(resolve => {
        if (client.connected) {
          client.ws.once('close', () => resolve());
          client.ws.close();
        } else {
          resolve();
        }
      });
    });

    await Promise.all(closePromises);

    // Final metrics
    this.recordMetrics();

    logger.info('Load test completed', {
      duration: Date.now() - this.startTime,
      totalClients: this.clients.size,
      timestamp: new Date().toISOString()
    });
  }

  private setupClientHandlers(client: TestClient): void {
    client.ws.on('open', () => {
      client.connected = true;
      metricsService.recordWsConnection(client.quality);
      
      logger.info('Client reconnected', {
        clientId: client.id,
        quality: client.quality,
        attempt: client.connectionAttempts,
        timestamp: new Date().toISOString(),
        component: 'websocket'
      });

      // Send quality preference
      client.ws.send(JSON.stringify({
        type: 'quality',
        data: { quality: client.quality }
      }));
    });

    client.ws.on('message', (data) => {
      const now = Date.now();
      const validation = this.validateMessage(data);
      
      if (!validation.isValid) {
        logger.warn('Invalid message received', {
          clientId: client.id,
          size: Buffer.isBuffer(data) ? data.length : 0,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (validation.type === 'frame' && Buffer.isBuffer(data)) {
        this.handleFrame(client, data, now);
      } else if (validation.type === 'ping') {
        client.ws.send(JSON.stringify({ type: 'pong' }));
      }
    });

    client.ws.on('error', (error) => {
      client.frameStats.dropped++;
      logger.error('Client error', {
        clientId: client.id,
        error: error.message,
        connectionAttempts: client.connectionAttempts,
        component: 'websocket'
      });
    });

    client.ws.on('close', async () => {
      client.connected = false;
      metricsService.recordWsDisconnection(client.quality);
      
      // Try to reconnect if not shutting down
      if (!this.isShuttingDown && client.connectionAttempts < this.maxReconnectAttempts) {
        logger.info('Attempting to reconnect', {
          clientId: client.id,
          attempt: client.connectionAttempts + 1,
          component: 'websocket'
        });

        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        client.connectionAttempts++;
        client.ws = new WebSocket(this.wsUrl);
        this.setupClientHandlers(client);
      } else {
        this.logClientDisconnect(client);
      }
    });
  }
}

const scenarios: Record<string, TestScenario> = {
  // Basic connectivity test
  basic: {
    clients: 1,
    duration: '30s',
    frameRate: 30,
    distribution: {
      high: 1,    // Single high quality client
      medium: 0,
      low: 0
    }
  },
  // Test quality switching
  quality: {
    clients: 3,
    duration: '1m',
    frameRate: 30,
    distribution: {
      high: 0.34,   // One of each quality
      medium: 0.33,
      low: 0.33
    }
  },
  // Test batching logic
  batching: {
    clients: 5,
    duration: '1m',
    frameRate: 30,
    distribution: {
      high: 0.4,    // Mix of qualities to test batching
      medium: 0.4,
      low: 0.2
    }
  }
};

// Run test if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'basic';
  
  const scenario = scenarios[scenarioName];
  if (!scenario) {
    logger.error('Invalid scenario name', {
      scenario: scenarioName,
      availableScenarios: Object.keys(scenarios),
      usage: 'npm run test:load -- --scenario=[basic|quality|batching]'
    });
    process.exit(1);
  }

  logger.info('Starting component verification test', {
    name: scenarioName,
    config: scenario,
    purpose: {
      basic: 'Testing basic WebSocket connectivity and frame delivery',
      quality: 'Testing quality selection and switching',
      batching: 'Testing message batching with multiple clients'
    }[scenarioName]
  });

  const tester = new LoadTester(scenario);
  tester.start().catch(error => {
    logger.error('Test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  });
} 