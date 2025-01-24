import express from 'express';
import { createLogger } from '../utils/logger';
import { RedisService } from '../services/redis';

const logger = createLogger('health');
const redis = new RedisService();
export const healthRouter = express.Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    const redisHealth = await redis.checkHealth();
    
    const systemHealth = {
      status: redisHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        redis: redisHealth
      }
    };

    if (systemHealth.status === 'unhealthy') {
      logger.error('Health check failed:', systemHealth);
      res.status(503).json(systemHealth);
    } else {
      res.json(systemHealth);
    }
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed Redis health information
healthRouter.get('/health/redis', async (_req, res) => {
  try {
    const redisHealth = await redis.checkHealth();
    res.json(redisHealth);
  } catch (error) {
    logger.error('Redis health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 