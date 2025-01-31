import express from 'express';
import { createClient } from 'redis';
import { Server as WebSocketServer } from 'ws';
import { createCanvas } from '@napi-rs/canvas';
import { logger } from './utils/logger';
import { getConfig, loadConfig } from './config';
import { redisService } from './services/redis';
import { webSocketService } from './services/websocket';
import { metricsCollector } from './utils/metrics';
import { setupDemoServer } from './demo/demo-server';

async function startServer() {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Initialize logger first
    logger.initialize(config);
    logger.info('Stream Manager starting up...');

    // Initialize Redis and connect first
    redisService.initialize(config);
    await redisService.connect();
    logger.info('Redis connection established');

    // Initialize WebSocket service
    webSocketService.initialize(config);

    // Create Express apps for main API and health check
    const app = express();
    const healthApp = express();
    const metricsApp = express();

    // Basic health check endpoint on main API
    app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      logger.debug('Health check requested');
    });

    // Dedicated health check endpoint
    healthApp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        ports: {
          http: config.PORT,
          health: config.HEALTH_PORT,
          metrics: config.METRICS_PORT,
          ws: config.WS_PORT
        },
        redis: redisService.isReady(),
        timestamp: new Date().toISOString()
      });
    });

    // Metrics endpoint for Prometheus
    metricsApp.get('/metrics', async (req: express.Request, res: express.Response) => {
      try {
        res.set('Content-Type', metricsCollector.getMetricsContentType());
        res.end(await metricsCollector.getPrometheusMetrics());
      } catch (err) {
        res.status(500).end(err);
      }
    });

    // Start HTTP servers with proper error handling
    const startServer = (app: express.Application, port: number, name: string) => {
      return new Promise((resolve, reject) => {
        const server = app.listen(port, '0.0.0.0', () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            logger.info(`${name} server listening on port ${addr.port}`);
          }
          resolve(server);
        });

        server.on('error', (error) => {
          logger.error(`Failed to start ${name} server:`, undefined, error as Error);
          reject(error);
        });
      });
    };

    try {
      await Promise.all([
        startServer(app, config.PORT, 'HTTP'),
        startServer(healthApp, config.HEALTH_PORT, 'Health check'),
        startServer(metricsApp, config.METRICS_PORT, 'Metrics')
      ]);
    } catch (error) {
      throw new Error(`Failed to start servers: ${error}`);
    }

    logger.info({
      type: 'startup',
      ports: {
        http: config.PORT,
        health: config.HEALTH_PORT,
        metrics: config.METRICS_PORT,
        ws: config.WS_PORT
      }
    }, 'Server ports configured');

    // Set up demo server
    await setupDemoServer(app);
    logger.info(`Demo available at http://localhost:${config.PORT}/demo`);

    // Initialize canvas
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1920, 1080);

    // Start collecting metrics
    setInterval(() => {
      metricsCollector.updateFPS();
      metricsCollector.updateResourceUsage();
    }, 1000);

    logger.info('Stream Manager ready');
  } catch (error) {
    logger.error('Failed to start Stream Manager:', undefined, error as Error);
    process.exit(1);
  }
}

// Start the server using IIFE pattern
(async () => {
  try {
    await startServer();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  try {
    await redisService.disconnect();
    webSocketService.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', undefined, error as Error);
    process.exit(1);
  }
}); 