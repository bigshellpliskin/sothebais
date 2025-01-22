const express = require('express');
const { createClient } = require('redis');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const AUCTION_MANAGER_URL = process.env.AUCTION_MANAGER_URL || 'http://localhost:4001';

// Create Redis client
const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Stream Manager service listening on port ${PORT}`);
}); 