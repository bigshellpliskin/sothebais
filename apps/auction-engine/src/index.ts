import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { logger } from '@sothebais/shared/utils/logger.js';
import { healthRouter } from './routes/health.js';
import { metricsRouter } from './routes/metrics.js';
import { auctionRouter } from './routes/auction.js';
import stateRouter from './routes/state.js';

// const logger = createLogger('app');
const app = express();
const metricsApp = express();
const healthApp = express();

// Prometheus metrics setup
export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

// Main API setup
app.use(express.json());

// Routes
app.use('/api/auction', auctionRouter);
app.use('/api/state', stateRouter);

// Basic route for testing
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'Auction Manager API Running' });
});

// Create servers
const mainServer = createServer(app);
const metricsServer = createServer(metricsApp);
const healthServer = createServer(healthApp);

// Setup health and metrics routes
healthApp.use('/', healthRouter);
metricsApp.use('/', metricsRouter);

// Start servers
const PORT = process.env['PORT'] || 4400;
const METRICS_PORT = process.env['METRICS_PORT'] || 4490;
const HEALTH_PORT = process.env['HEALTH_PORT'] || 4491;

mainServer.listen(PORT, () => {
  logger.info(`Main API server listening on port ${PORT}`);
});

metricsServer.listen(METRICS_PORT, () => {
  logger.info(`Metrics server listening on port ${METRICS_PORT}`);
});

healthServer.listen(HEALTH_PORT, () => {
  logger.info(`Health check server listening on port ${HEALTH_PORT}`);
}); 