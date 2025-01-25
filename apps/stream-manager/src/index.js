const express = require('express');
const { createClient } = require('redis');
const { createLogger } = require('./utils/logger');

const logger = createLogger('app');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const AUCTION_MANAGER_URL = process.env.AUCTION_MANAGER_URL || 'http://localhost:4001';

// Create Redis client
const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => {
  logger.error({ 
    error: err.message,
    component: 'redis',
    state: 'error'
  }, 'Redis client error');
});

redisClient.on('connect', () => {
  logger.info({
    component: 'redis',
    state: 'connected'
  }, 'Redis client connected');
});

redisClient.on('reconnecting', () => {
  logger.warn({
    component: 'redis',
    state: 'reconnecting'
  }, 'Redis client reconnecting');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error({
      error: err.message,
      component: 'redis',
      state: 'connection_failed'
    }, 'Failed to connect to Redis');
    process.exit(1);
  }
})();

// Basic health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
  
  logger.info({
    component: 'health',
    ...health
  }, 'Health check performed');
  
  res.json(health);
});

app.listen(PORT, () => {
  logger.info({
    component: 'server',
    port: PORT,
    state: 'started'
  }, 'Stream Manager service started');
}); 