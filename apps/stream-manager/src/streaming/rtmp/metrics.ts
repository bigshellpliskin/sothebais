import { Registry, Gauge, Counter } from 'prom-client';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
export const rtmpConnectionsGauge = new Gauge({
  name: 'rtmp_connections_total',
  help: 'Total number of RTMP connections',
  registers: [register]
});

export const rtmpBandwidthGauge = new Gauge({
  name: 'rtmp_bandwidth_bytes',
  help: 'Bandwidth usage in bytes',
  registers: [register]
});

export const rtmpErrorsGauge = new Gauge({
  name: 'rtmp_errors_total',
  help: 'Total number of RTMP errors',
  registers: [register]
});

export const connectionCounter = new Counter({
  name: 'rtmp_connection_attempts_total',
  help: 'Total number of RTMP connection attempts',
  labelNames: ['status'],
  registers: [register]
});

export const publishCounter = new Counter({
  name: 'rtmp_publish_attempts_total',
  help: 'Total number of RTMP publish attempts',
  labelNames: ['status'],
  registers: [register]
});

// Export registry for external use
export { register }; 