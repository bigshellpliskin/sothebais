import express from 'express';
import type { Request, Response, NextFunction, Application } from 'express';
import * as Redis from 'redis';
import Docker from 'dockerode';
import cors from 'cors';
import { logger as appLogger } from './utils/logger.js';
import { metricsMiddleware, metricsEndpoint, metrics } from './middleware/metrics.js';

// Define types
interface SystemLog {
  id: string;
  timestamp: string;
  level: string;
  component: string;
  service?: string;
  state: string;
  message: string;
  context: Record<string, any>;
}

interface CustomTransport {
  write: (log: string) => void;
}

interface RedisConnectionState {
  isConnected: boolean;
  lastError: string | null;
  lastErrorTime: string | null;
  reconnectAttempts: number;
}

interface LogLine {
  id: string;
  timestamp: string;
  content: string;
  source: string;
  type: string;
}

// Store system logs in memory (last 1000 logs)
const systemLogs: SystemLog[] = [];
const MAX_LOGS = 1000;

// Create a custom transport to store logs in memory
const customTransport: CustomTransport = {
  write: (log: string) => {
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
let redisConnectionState: RedisConnectionState = {
  isConnected: false,
  lastError: null,
  lastErrorTime: null,
  reconnectAttempts: 0
};

// Use the imported logger instead of creating a new one
const logger = appLogger;

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env['REDIS_URL'] || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries: number) => {
      redisConnectionState.reconnectAttempts = retries;
      // Exponential backoff with max delay of 5 seconds
      return Math.min(retries * 50, 5000);
    }
  }
});

// Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Initialize Express app
const app: Application = express();

// CORS configuration
app.use(cors({
  origin: process.env['NODE_ENV'] === 'development' 
    ? ['http://localhost:3000'] 
    : (process.env['FRONTEND_URL'] ? [process.env['FRONTEND_URL']] : '*'),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'If-Modified-Since'],
  credentials: true
}));

// Add metrics middleware
app.use(metricsMiddleware);
app.use(express.json());

// Redis event handlers
redisClient.on('error', (err: Error) => {
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }, 'Server error');
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : undefined
  });
});

// Endpoint to get system logs
app.get('/system-logs', (_req: Request, res: Response) => {
  try {
    res.json(systemLogs);
  } catch (error: any) {
    logger.error({
      error: error.message,
      component: 'api',
      path: '/system-logs'
    }, 'Error fetching system logs');
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Store connected SSE clients
const clients = new Set<Response>();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redis health check endpoint
app.get('/health/redis', async (_req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Redis health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      connectionState: redisConnectionState
    });
  }
});

const parseTimestamp = (timestamp: string | undefined): string => {
  try {
    // Handle Docker timestamp format
    if (typeof timestamp === 'string' && timestamp) {
      // Remove nanoseconds if present (Docker can include them)
      const cleanTimestamp = timestamp.split('.')[0];
      // Ensure cleanTimestamp is a valid string before passing to Date constructor
      if (cleanTimestamp) {
        const date = new Date(cleanTimestamp);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      // If we get here, either cleanTimestamp is invalid or date parsing failed
      return new Date().toISOString();
    }
    return new Date().toISOString(); // Fallback to current time if not a string
  } catch (err: any) {
    logger.error({
      error: err.message,
      component: 'docker',
      timestamp
    }, 'Error parsing timestamp');
    return new Date().toISOString(); // Fallback to current time
  }
};

// Get container logs endpoint
app.get('/logs', async (_req: Request, res: Response) => {
  try {
    const containers = await docker.listContainers();
    const logs: Record<string, LogLine[]> = {};
    
    // Get logs for each container
    for (const container of containers) {
      // Defensive checks for container properties
      if (!container || !container.Id) {
        logger.warn({ component: 'docker' }, 'Invalid container object, skipping logs');
        continue;
      }
      
      // Get container name safely
      const containerName = (container.Names && container.Names.length > 0)
        ? (container.Names[0] ? container.Names[0].replace('/', '') : `container_${container.Id.substring(0, 8)}`)
        : `container_${container.Id.substring(0, 8)}`;
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
          .filter((line: string) => line.trim())
          .map((line: string) => {
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
                error: (err as Error).message,
                component: 'docker',
                container: containerName,
                line
              }, 'Error parsing container log line');
              return null;
            }
          })
          .filter(Boolean) as LogLine[];
          
        logs[containerName] = logLines;
      } catch (err) {
        logger.error({
          error: (err as Error).message,
          component: 'docker',
          container: containerName
        }, 'Error getting container logs');
        logs[containerName] = [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          content: `Error fetching logs: ${(err as Error).message}`,
          source: containerName,
          type: 'error'
        }];
      }
    }
    
    res.json(logs);
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      component: 'docker'
    }, 'Error listing containers');
    res.status(500).json({ error: 'Failed to fetch container logs' });
  }
});

function updateActiveClientsMetric() {
  metrics.activeClientsGauge.set(clients.size);
}

// Event stream endpoint
app.get('/events', (req: Request, res: Response) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial keep-alive comment
  res.write(':keep-alive\n\n');
  
  // Add client to the set
  clients.add(res);
  updateActiveClientsMetric();
  
  logger.info({
    component: 'sse',
    clientsCount: clients.size
  }, 'Client connected to event stream');
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    updateActiveClientsMetric();
    logger.info({
      component: 'sse',
      clientsCount: clients.size
    }, 'Client disconnected from event stream');
  });
});

// Function to broadcast events to all connected clients
function broadcastEvent(event: string, data: any) {
  const eventString = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(eventString);
    } catch (err) {
      logger.error({
        error: (err as Error).message,
        component: 'sse'
      }, 'Error sending event to client');
    }
  });
}

// Connect to Redis and start servers
async function startApp() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Subscribe to Redis channels
    // ... subscribe to your Redis channels here ...
    
    // Start metrics endpoint
    const metricsServer = app.listen(4390, () => {
      logger.info({
        component: 'metrics',
        port: 4390
      }, 'Metrics server started');
    });
    
    // Start health check endpoint
    const healthServer = app.listen(4391, () => {
      logger.info({
        component: 'health',
        port: 4391
      }, 'Health check server started');
    });
    
    // Start event stream server
    const eventServer = app.listen(4301, () => {
      logger.info({
        component: 'sse',
        port: 4301
      }, 'Event stream server started');
    });
    
    // Start main API server
    const apiServer = app.listen(4300, () => {
      logger.info({
        component: 'api',
        port: 4300
      }, 'API server started');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info({}, 'SIGTERM received, shutting down gracefully');
      try {
        // Close Redis connection
        await redisClient.quit();
        // Close servers
        healthServer.close();
        metricsServer.close();
        eventServer.close();
        apiServer.close();
      } catch (err) {
        logger.error({
          error: (err as Error).message
        }, 'Error during graceful shutdown');
      }
      process.exit(0);
    });
    
  } catch (err) {
    logger.error({
      error: (err as Error).message
    }, 'Failed to start application');
    process.exit(1);
  }
}

// Start the application
startApp(); 