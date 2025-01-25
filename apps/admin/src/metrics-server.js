const express = require('express');
const { register, collectDefaultMetrics } = require('prom-client');

// Initialize metrics collection
collectDefaultMetrics({
  prefix: 'admin_frontend_'
});

const app = express();
const port = process.env.METRICS_PORT || 3090;

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Metrics server listening on port ${port}`);
}); 