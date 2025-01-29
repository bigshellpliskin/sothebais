import express from 'express';
import { createClient } from 'redis';
import { Server as WebSocketServer } from 'ws';
import { createCanvas } from '@napi-rs/canvas';
import { logger } from './utils/logger';
import { getConfig, loadConfig } from './config';
import { redisService } from './services/redis';
import { webSocketService } from './services/websocket';
import { metricsCollector } from './utils/metrics';

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

    // Start HTTP servers
    app.listen(config.PORT, () => {
      logger.info(`HTTP server listening on port ${config.PORT}`);
    });

    healthApp.listen(config.HEALTH_PORT, () => {
      logger.info(`Health check server listening on port ${config.HEALTH_PORT}`);
    });

    // Initialize Redis
    await redisService.connect();
    logger.info('Redis connection established');

    // Initialize canvas
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1920, 1080);

    // Start collecting metrics
    // setInterval(() => {
    //   metricsCollector.updateFPS();
    //   metricsCollector.updateResourceUsage();
    //   logger.logMetrics(metricsCollector.getMetrics());
    // }, 1000);

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