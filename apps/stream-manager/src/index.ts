import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from 'redis';
import type { Server as WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { logger } from './utils/logger.js';
import { getConfig, loadConfig } from './config/index.js';
import { redisService } from './services/redis.js';
import { webSocketService } from './services/websocket.js';
import { layerRenderer } from './services/layer-renderer.js';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { setupStreamServer } from './server/stream-server.js';
import { StreamEncoder } from './pipeline/stream-encoder.js';

// Load configuration first
const config = loadConfig();

// Initialize logger early
logger.initialize(config);

// Create a Registry to register metrics
const register = new Registry();

// Enable default metrics collection with service label
collectDefaultMetrics({
  register,
  labels: { service: 'stream-manager' }
});

// Create metrics server
const metricsApp = express();

metricsApp.get('/metrics', async (_req: Request, res: Response) => {
  try {
    // Combine default metrics with stream manager metrics
    const defaultMetrics = await register.metrics();
    const streamMetrics = await layerRenderer.getMetrics();
    res.set('Content-Type', register.contentType);
    res.end(defaultMetrics + '\n' + streamMetrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

metricsApp.listen(config.METRICS_PORT, () => {
  logger.info(`Metrics server listening on port ${config.METRICS_PORT}`);
});

async function startServer() {
  try {
    // Initialize services
    redisService.initialize(config);
    await redisService.connect();
    logger.info('Redis connection established', {
      host: config.REDIS_URL,
      status: 'connected'
    });

    // Initialize stream encoder
    const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
    StreamEncoder.initialize({
      width,
      height,
      fps: config.TARGET_FPS,
      preset: config.RENDER_QUALITY === 'high' ? 'medium' : 
              config.RENDER_QUALITY === 'medium' ? 'veryfast' : 'ultrafast',
      bitrate: config.STREAM_BITRATE,
      codec: 'h264',
      streamUrl: config.STREAM_URL
    });
    logger.info('Stream encoder initialized', {
      resolution: config.STREAM_RESOLUTION,
      fps: config.TARGET_FPS,
      quality: config.RENDER_QUALITY
    });

    // Create Express app
    const app = express();

    // Start HTTP server
    const httpServer = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info('HTTP endpoint ready', {
        service: 'http',
        port: config.PORT,
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
        metrics: { port: config.METRICS_PORT, protocol: 'http' },
        ws: { port: config.WS_PORT, protocol: 'ws' }
      },
      status: 'ready'
    });

    // Set up demo server
    await setupStreamServer(app);

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