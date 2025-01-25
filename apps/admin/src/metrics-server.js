const express = require('express');
const { register, collectDefaultMetrics } = require('prom-client');
const cors = require('cors');

// Initialize metrics collection with appropriate settings for Docker
collectDefaultMetrics({
  prefix: 'admin_frontend_',
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  labels: {
    service: 'admin-frontend'
  }
});

const app = express();
const port = process.env.METRICS_PORT || 3090;

// Enable CORS for all routes within Docker network
app.use(cors({
  origin: '*',
  methods: ['GET'],
  credentials: true
}));

// Add service labels
register.setDefaultLabels({
  app: 'admin-frontend',
  service: 'admin-frontend',
  environment: process.env.NODE_ENV || 'development'
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Metrics server listening at http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 