import express from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('health');
export const healthRouter = express.Router();

healthRouter.get('/health', (_req, res) => {
  try {
    // TODO: Add more health checks (Redis, etc.)
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
}); 