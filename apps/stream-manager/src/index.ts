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

    // Initialize services
    redisService.initialize(config);
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
    healthApp.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      logger.debug('Health check requested');
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

    // Start HTTP servers
    app.listen(config.PORT, () => {
      logger.info(`HTTP server listening on port ${config.PORT}`);
      logger.info(`Demo available at http://localhost:${config.PORT}/demo`);
    });

    healthApp.listen(config.HEALTH_PORT, () => {
      logger.info(`Health check server listening on port ${config.HEALTH_PORT}`);
    });

    metricsApp.listen(config.METRICS_PORT, () => {
      logger.info(`Metrics server listening on port ${config.METRICS_PORT}`);
    });

    // Initialize Redis and connect before setting up demo server
    redisService.initialize(config);
    await redisService.connect();
    logger.info('Redis connection established');

    // Set up demo server after Redis is connected
    await setupDemoServer(app);

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
    console.error('Failed to start Stream Manager:', error);
    process.exit(1);
  }
}

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

// Start the server
startServer(); 