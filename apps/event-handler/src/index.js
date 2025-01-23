const express = require('express');
const Redis = require('redis');

// Initialize Express app
const app = express();

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Connect to Redis
redisClient.connect().catch(console.error);

// Store connected SSE clients
const clients = new Set();

// CORS headers for development
const setCorsHeaders = (req, res, next) => {
  // Allow local development
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

// Middleware
app.use(express.json());
app.use(setCorsHeaders);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Event ingestion endpoint
app.post('/events', async (req, res) => {
  try {
    const event = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...req.body
    };

    // Store event in Redis
    await redisClient.lPush('events', JSON.stringify(event));
    // Keep only last 1000 events
    await redisClient.lTrim('events', 0, 999);

    // Broadcast to all connected clients
    const eventString = `data: ${JSON.stringify(event)}\n\n`;
    clients.forEach(client => {
      client.res.write(eventString);
    });

    console.log('Event processed:', event.type);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Failed to process event' });
  }
});

// Get recent events endpoint
app.get('/events/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const events = await redisClient.lRange('events', 0, limit - 1);
    res.json(events.map(e => JSON.parse(e)));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// SSE endpoint for real-time events
app.get('/events', (req, res) => {
  // SSE Setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // Create client object
  const client = {
    id: Date.now(),
    res
  };

  // Add client to Set
  clients.add(client);
  console.log(`Client connected: ${client.id}`);

  // Send initial heartbeat
  res.write('event: connected\ndata: {"status": "connected"}\n\n');

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(client);
    console.log(`Client disconnected: ${client.id}`);
  });
});

// Start server
const port = process.env.PORT || 4300;

app.listen(port, () => {
  console.log(`Event Handler service listening on port ${port}`);
}); 