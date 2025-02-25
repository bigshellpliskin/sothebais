import express from 'express';
import { metricsRegistry } from '../index';

export const metricsRouter = express.Router();

metricsRouter.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
}); 