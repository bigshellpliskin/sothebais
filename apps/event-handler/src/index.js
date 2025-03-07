const express = require('express');
const Redis = require('redis');
const Docker = require('dockerode');
const cors = require('cors');
const { createLogger } = require('./utils/logger');
const { metricsMiddleware, metricsEndpoint, metrics } = require('./middleware/metrics');

// Store system logs in memory (last 1000 logs)
const systemLogs = [];
const MAX_LOGS = 1000;

// Create a custom transport to store logs in memory
const customTransport = {
  write: (log) => {
    try {
      const parsedLog = JSON.parse(log);
      systemLogs.push({
        id: Date.now().toString(),
        timestamp: parsedLog.time,
        level: parsedLog.level,
        component: parsedLog.name,
        service: parsedLog.service,
        state: parsedLog.state || 'unknown',
        message: parsedLog.msg,
        context: { ...parsedLog }
      });
      
      // Keep only last MAX_LOGS entries by removing from the start
      if (systemLogs.length > MAX_LOGS) {
        systemLogs.shift();
      }
    } catch (err) {
      console.error('Error processing log:', err);
    }
  }
};
// Redis connection state
let redisConnectionState = {
  isConnected: false,
  lastError: null,
  lastErrorTime: null,
  reconnectAttempts: 0
};

// Initialize logger with custom transport
const logger = createLogger('app', [{ stream: customTransport }]);
// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => {
      redisConnectionState.reconnectAttempts = retries;
      // Exponential backoff with max delay of 5 seconds
      return Math.min(retries * 50, 5000);
    }
  }
});
// Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000'] 
    : [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'If-Modified-Since'],
  credentials: true
}));
// Add metrics middleware
app.use(metricsMiddleware);
app.use(express.json());

// Redis event handlers
redisClient.on('error', (err) => {
  logger.error({ 
    error: err.message,
    component: 'redis',
    state: 'error'
  }, 'Redis client error');
  redisConnectionState.isConnected = false;
  redisConnectionState.lastError = err.message;
  redisConnectionState.lastErrorTime = new Date().toISOString();
  metrics.redisConnectionGauge.set(0);
});

redisClient.on('connect', () => {
  logger.info({
    component: 'redis',
    state: 'connected'
  }, 'Redis client connected');
  redisConnectionState.isConnected = true;
  redisConnectionState.lastError = null;
  redisConnectionState.lastErrorTime = null;
  redisConnectionState.reconnectAttempts = 0;
  metrics.redisConnectionGauge.set(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }, 'Server error');
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Endpoint to get system logs
app.get('/system-logs', (_req, res) => {
  try {
    res.json(systemLogs);
  } catch (error) {
    logger.error({
      error: error.message,
      component: 'api',
      path: '/system-logs'
    }, 'Error fetching system logs');
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Store connected SSE clients
const clients = new Set();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redis health check endpoint
app.get('/health/redis', async (req, res) => {
  try {
    if (!redisConnectionState.isConnected) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Redis disconnected',
        lastError: redisConnectionState.lastError,
        lastErrorTime: redisConnectionState.lastErrorTime,
        reconnectAttempts: redisConnectionState.reconnectAttempts
      });
    }

    // Try to PING Redis
    const result = await redisClient.ping();
    if (result === 'PONG') {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        connectionState: redisConnectionState
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: 'Redis not responding correctly',
        connectionState: redisConnectionState
      });
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      connectionState: redisConnectionState
    });
  }
});

const parseTimestamp = (timestamp) => {
  try {
    // Handle Docker timestamp format
    if (typeof timestamp === 'string') {
      // Remove nanoseconds if present (Docker can include them)
      const cleanTimestamp = timestamp.split('.')[0];
      const date = new Date(cleanTimestamp);
      if (isNaN(date.getTime())) {
        return new Date().toISOString(); // Fallback to current time if invalid
      }
      return date.toISOString();
    }
    return new Date().toISOString(); // Fallback to current time if not a string
  } catch (err) {
    logger.error({
      error: err.message,
      component: 'docker',
      timestamp
    }, 'Error parsing timestamp');
    return new Date().toISOString(); // Fallback to current time
  }
};

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
                timestamp: parseTimestamp(timestamp),
                content,
                source: containerName,
                type: streamType
              };
            } catch (err) {
              logger.error({
                error: err.message,
                component: 'docker',
                container: containerName,
                line
              }, 'Error parsing log line');
              return null;
            }
          })
          .filter(line => line !== null);

        logs[containerName] = logLines;
        logger.info({
          component: 'docker',
          container: containerName,
          logCount: logLines.length
        }, `Retrieved logs for container`);
      } catch (err) {
        logger.error({
          error: err.message,
          component: 'docker',
          container: containerName
        }, 'Error getting container logs');
        logs[containerName] = [];
      }
    }

    res.json(logs);
  } catch (error) {
    logger.error({
      error: error.message,
      component: 'api',
      path: '/logs'
    }, 'Error getting container logs');
    res.status(500).json({ error: 'Failed to get container logs' });
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

// Update active clients metric when clients connect/disconnect
function updateActiveClientsMetric() {
  metrics.activeClientsGauge.set(clients.size);
}

// Expose metrics endpoint
app.get('/metrics', metricsEndpoint);

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

  // Add client to Set and update metrics
  clients.add(client);
  updateActiveClientsMetric();
  console.log(`Client connected: ${client.id}`);

  // Send initial heartbeat
  res.write('event: connected\ndata: {"status": "connected"}\n\n');

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(client);
    updateActiveClientsMetric();
    console.log(`Client disconnected: ${client.id}`);
  });
});

// Start server
const metricsPort = process.env.METRICS_PORT || 4390;
const apiPort = process.env.PORT || 4300;
const healthPort = process.env.HEALTH_PORT || 4391;

// Create a separate server for metrics
const metricsApp = express();
metricsApp.get('/metrics', metricsEndpoint);
metricsApp.listen(metricsPort, () => {
  logger.info({
    component: 'metrics',
    port: metricsPort
  }, 'Metrics server started');
});

// Create a separate server for health checks
const healthApp = express();
healthApp.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
healthApp.listen(healthPort, () => {
  logger.info({
    component: 'health',
    port: healthPort
  }, 'Health check server started');
});

// Start main API server
app.listen(apiPort, () => {
  logger.info({
    component: 'server',
    port: apiPort,
    env: process.env.NODE_ENV
  }, 'Event Handler service started');
}); 