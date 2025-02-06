import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from 'redis';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './utils/logger.js';
import { config, loadConfig } from './config/index.js';
import { setupStreamServer } from './server/api/stream.js';
import { Registry, collectDefaultMetrics } from 'prom-client';

// Load configuration first
const loadedConfig = await loadConfig();

// Initialize logger early
logger.initialize(loadedConfig);

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
    // Get default metrics
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

metricsApp.listen(loadedConfig.METRICS_PORT, () => {
  logger.info(`Metrics server listening on port ${loadedConfig.METRICS_PORT}`);
});

async function startServer() {
  try {
    // Create Redis client
    const redis = createClient({
      url: loadedConfig.REDIS_URL
    });

    await redis.connect();
    logger.info('Redis connection established', {
      host: loadedConfig.REDIS_URL,
      status: 'connected'
    });

    // Create Express app
    const app = express();

    // Add request logging middleware
    app.use((req: Request, res: Response, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query
      });
      next();
    });

    // Set up stream server routes first
    logger.info('Setting up stream server routes');
    await setupStreamServer(app);
    logger.info('Stream server routes configured');

    // Log all registered routes
    app._router.stack.forEach((r: any) => {
      if (r.route && r.route.path) {
        logger.info('Registered route:', {
          path: r.route.path,
          methods: Object.keys(r.route.methods)
        });
      }
    });

    // Start HTTP server
    const httpServer = app.listen(loadedConfig.PORT, '0.0.0.0', () => {
      logger.info('HTTP endpoint ready', {
        service: 'http',
        port: loadedConfig.PORT,
        address: '0.0.0.0',
        protocol: 'http'
      });
    });

    // Create WebSocket server
    const wsServer = new WebSocketServer({ server: httpServer });
    
    wsServer.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');
      
      ws.on('message', (message: string) => {
        logger.debug('Received WebSocket message', { message });
      });
      
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });

    // Log endpoints configuration
    logger.info('Service endpoints configured', {
      endpoints: {
        http: { port: loadedConfig.PORT, protocol: 'http' },
        metrics: { port: loadedConfig.METRICS_PORT, protocol: 'http' },
        ws: { port: loadedConfig.WS_PORT, protocol: 'ws' }
      },
      status: 'ready'
    });

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
    // Cleanup will happen through GC since we're not storing service references
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