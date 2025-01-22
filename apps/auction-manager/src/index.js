const express = require('express');
const { createClient } = require('redis');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

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
  console.log(`Auction Manager service listening on port ${PORT}`);
}); 