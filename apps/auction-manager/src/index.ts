import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { createLogger } from './utils/logger';
import { healthRouter } from './routes/health';
import { metricsRouter } from './routes/metrics';
import { auctionRouter } from './routes/auction';
import { stateRouter } from './routes/state';

const logger = createLogger('app');
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
app.use('/api', stateRouter);

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
const PORT = process.env.PORT || 4100;
const METRICS_PORT = process.env.METRICS_PORT || 4190;
const HEALTH_PORT = process.env.HEALTH_PORT || 4191;

mainServer.listen(PORT, () => {
  logger.info(`Main API server listening on port ${PORT}`);
});

metricsServer.listen(METRICS_PORT, () => {
  logger.info(`Metrics server listening on port ${METRICS_PORT}`);
});

healthServer.listen(HEALTH_PORT, () => {
  logger.info(`Health check server listening on port ${HEALTH_PORT}`);
}); 