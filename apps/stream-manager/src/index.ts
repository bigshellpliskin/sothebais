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
    logger.info({ config }, 'Configuration loaded');

    // Initialize services
    redisService.initialize(config);
    webSocketService.initialize(config);
    logger.info('Services initialized');

    // Create Express apps for main API and health check
    const app = express();
    const healthApp = express();

    // Basic health check endpoint on main API
    app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      logger.debug({ path: '/health' }, 'Health check requested');
    });

    // Dedicated health check endpoint
    healthApp.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      logger.debug({ path: '/health', port: config.HEALTH_PORT }, 'Health check requested');
    });

    // Start HTTP servers
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'Stream Manager HTTP server started');
    });

    healthApp.listen(config.HEALTH_PORT, () => {
      logger.info({ port: config.HEALTH_PORT }, 'Stream Manager Health Check server started');
    });

    // Initialize Redis
    await redisService.connect();
    logger.info('Redis connection established');

    // Test canvas creation
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1920, 1080);
    logger.info({ width: 1920, height: 1080 }, 'Canvas initialized');

    // Start collecting metrics
    setInterval(() => {
      metricsCollector.updateFPS();
      metricsCollector.updateResourceUsage();
      logger.logMetrics(metricsCollector.getMetrics());
    }, 1000);

    logger.info('Stream Manager initialized');
  } catch (error) {
    console.error('Failed to start Stream Manager:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await redisService.disconnect();
    webSocketService.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error(error as Error, 'Error during graceful shutdown');
    process.exit(1);
  }
});

// Start the server
startServer(); 