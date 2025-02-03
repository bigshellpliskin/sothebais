import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from 'redis';
import type { Server as WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { createCanvas } from '@napi-rs/canvas';
import { logger } from './utils/logger.js';
import { getConfig, loadConfig } from './config/index.js';
import { redisService } from './services/redis.js';
import { webSocketService } from './services/websocket.js';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { setupDemoServer } from './demo/demo-server.js';

// Create a Registry to register metrics
const register = new Registry();

// Enable default metrics collection with service label
collectDefaultMetrics({
  register,
  labels: { service: 'stream-manager' }
});

// Create metrics server
const metricsApp = express();
const metricsPort = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : 4290;

metricsApp.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

metricsApp.listen(metricsPort, () => {
  logger.info(`Metrics server listening on port ${metricsPort}`);
});

async function startServer() {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Initialize logger first
    logger.initialize(config);
    logger.info('Stream Manager initializing...');

    // Initialize Redis and connect first
    redisService.initialize(config);
    await redisService.connect();
    logger.info('Redis connection established', {
      host: config.REDIS_URL,
      status: 'connected'
    });

    // Create Express apps
    const app = express();
    const healthApp = express();

    // Basic health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Dedicated health check endpoint
    healthApp.get('/health', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.json({ status: redisService.isReady() ? 'ok' : 'error', timestamp: new Date().toISOString() });
    });

    // Start HTTP server
    const httpServer = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info('HTTP endpoint ready', {
        service: 'http',
        port: config.PORT,
        address: '0.0.0.0',
        protocol: 'http'
      });
    });

    // Start health check server
    const healthServer = healthApp.listen(config.HEALTH_PORT, '0.0.0.0', () => {
      logger.info('Health endpoint ready', {
        service: 'health',
        port: config.HEALTH_PORT,
        address: '0.0.0.0',
        protocol: 'http'
      });
    });

    // Initialize WebSocket service
    webSocketService.initialize(config);

    // Log endpoints configuration
    logger.info('Service endpoints configured', {
      endpoints: {
        http: { port: config.PORT, protocol: 'http' },
        health: { port: config.HEALTH_PORT, protocol: 'http' },
        metrics: { port: config.METRICS_PORT, protocol: 'http' },
        ws: { port: config.WS_PORT, protocol: 'ws' }
      },
      status: 'ready'
    });

    // Set up demo server
    await setupDemoServer(app);

    logger.info('Stream Manager ready', {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed
    });

  } catch (error) {
    logger.error('Stream Manager failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed',
      code: 1
    });
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...', {
    status: 'shutdown_initiated',
    uptime: process.uptime()
  });
  try {
    await redisService.disconnect();
    webSocketService.shutdown();
    logger.info('Shutdown complete', {
      status: 'shutdown_complete',
      code: 0
    });
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'shutdown_failed',
      code: 1
    });
    process.exit(1);
  }
}); 