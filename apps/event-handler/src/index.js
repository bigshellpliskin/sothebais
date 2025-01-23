const express = require('express');
const Redis = require('redis');
const Docker = require('dockerode');

// Initialize Express app
const app = express();

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

// Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

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

// Get container logs endpoint
app.get('/logs', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    const logs = {};
    
    // Get logs for each container
    for (const container of containers) {
      const containerName = container.Names[0].replace('/', '');
      const containerInstance = docker.getContainer(container.Id);
      
      try {
        // Get last 100 log lines
        const logStream = await containerInstance.logs({
          stdout: true,
          stderr: true,
          tail: 100,
          timestamps: true,
          follow: false
        });

        // Parse the logs into individual lines
        const logLines = logStream.toString('utf8')
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              // Extract the stream type (stdout/stderr) from the first byte
              const streamType = line.charCodeAt(0) === 1 ? 'stdout' : 'stderr';
              
              // Remove the header (first 8 bytes)
              const cleanLine = line.slice(8);
              
              // Split timestamp and content
              const spaceIndex = cleanLine.indexOf(' ');
              const timestamp = cleanLine.slice(0, spaceIndex);
              const content = cleanLine.slice(spaceIndex + 1);
              
              return {
                id: Date.now() + Math.random().toString(36).substring(7),
                timestamp: new Date(timestamp).toISOString(),
                content,
                source: containerName,
                type: streamType
              };
            } catch (err) {
              console.error('Error parsing log line:', err);
              return null;
            }
          })
          .filter(line => line !== null);

        logs[containerName] = logLines;
        console.log(`Retrieved ${logLines.length} logs for ${containerName}`);
      } catch (err) {
        console.error(`Error getting logs for ${containerName}:`, err);
        logs[containerName] = [];
      }
    }

    res.json(logs);
  } catch (error) {
    console.error('Error getting container logs:', error);
    res.status(500).json({ error: 'Failed to get container logs', details: error.message });
  }
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