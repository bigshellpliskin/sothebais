import promClient from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'event_handler_'
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const eventCounter = new promClient.Counter({
  name: 'events_processed_total',
  help: 'Total number of processed events',
  labelNames: ['type', 'status']
});

const redisConnectionGauge = new promClient.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 for connected, 0 for disconnected)'
});

const activeClientsGauge = new promClient.Gauge({
  name: 'active_sse_clients',
  help: 'Number of active SSE clients'
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(eventCounter);
register.registerMetric(redisConnectionGauge);
register.registerMetric(activeClientsGauge);

// Middleware to track HTTP request duration
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(durationInSeconds);
  });

  next();
};

// Metrics endpoint middleware
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end((err as Error).message);
  }
};

export const metrics = {
  eventCounter,
  redisConnectionGauge,
  activeClientsGauge
}; 