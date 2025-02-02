import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

// This should be the internal Docker network URL
const PROMETHEUS_URL = 'http://prometheus:9090';  // Always use Docker network name
// Skip authentication for status endpoint during testing
export const dynamic = 'force-dynamic';
// Make this a public API route
export const config = {
  api: {
    auth: false
  }
};

// Define standard health check queries
const HEALTH_QUERIES = {
  // Basic service health
  up: (service: ServiceConfig) => `up{instance="${service.name}",job="${service.job}"}`,
  
  // Process metrics
  cpu: (service: ServiceConfig) => `rate(process_cpu_seconds_total{instance="${service.name}",job="${service.job}"}[1m]) * 100`,
  memory: (service: ServiceConfig) => `process_resident_memory_bytes{instance="${service.name}",job="${service.job}"} / 1024 / 1024`,
  
  // HTTP metrics
  requestRate: (service: ServiceConfig) => `rate(http_request_duration_seconds_count{instance="${service.name}",job="${service.job}"}[1m])`,
  errorRate: (service: ServiceConfig) => `rate(http_request_duration_seconds_count{instance="${service.name}",job="${service.job}",code=~"5.."}[1m])`,
  
  // Redis specific metrics - these come from redis-exporter
  redisUp: () => 'redis_up',  // This indicates if Redis itself is up
  redisExporterUp: () => 'up{job="redis"}',  // This indicates if redis-exporter is up
  redisMemory: () => 'redis_memory_used_bytes / 1024 / 1024',
  redisConnections: () => 'redis_connected_clients'
};

// Service configurations with health check strategies
const SERVICES: ServiceConfig[] = [
  // Core Services
  // { name: 'auction-manager', metricsPort: 4190 },
  // { name: 'event-handler', metricsPort: 4390 },
  // { name: 'stream-manager', metricsPort: 4290 },
  // { name: 'shape-l2', metricsPort: 4090 },
  // { name: 'eliza', metricsPort: 4490 },
  { name: 'admin-frontend', metricsPort: 3090, healthStrategy: 'standard', job: 'common' },
  // Infrastructure Services
  { name: 'traefik', metricsPort: 3100, healthStrategy: 'standard', job: 'common' },
  { name: 'prometheus', metricsPort: 9090, healthStrategy: 'dedicated', job: 'prometheus' },
  // { name: 'grafana', metricsPort: 3001 },
  // { name: 'node-exporter', metricsPort: 9100 },
  // Redis is monitored through redis-exporter
  { name: 'redis', metricsPort: 6379, healthStrategy: 'redis', job: 'redis' }  // Special case for Redis
];

interface ServiceConfig {
  name: string;
  metricsPort: number;
  healthStrategy: 'standard' | 'dedicated' | 'exported' | 'redis';
  job: string;
}

interface PrometheusResponse {
  status: 'success' | 'error';
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
  error?: string;
  errorType?: string;
}

class PrometheusError extends Error {
  constructor(message: string, public readonly serviceName: string) {
    super(message);
    this.name = 'PrometheusError';
  }
}

function getPrometheusUrl(path: string): string {
  const baseUrl = PROMETHEUS_URL.endsWith('/') ? PROMETHEUS_URL.slice(0, -1) : PROMETHEUS_URL;
  const prefix = '/prometheus';  // Prometheus is configured with this prefix
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${prefix}${apiPath}`;
}

async function queryPrometheus(query: string, serviceName: string): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = getPrometheusUrl(`/api/v1/query?query=${encodeURIComponent(query)}`);
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend',
        'Connection': 'keep-alive'
      },
      signal: controller.signal,
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new PrometheusError(
        `Prometheus returned status ${response.status}`,
        serviceName
      );
    }

    const data = await response.json() as PrometheusResponse;
    
    if (data.status === 'error' || data.error) {
      console.error(`Prometheus query error for ${serviceName}:`, data.error);
      return null;
    }

    if (!data.data?.result || !Array.isArray(data.data.result)) {
      console.error(`Invalid response structure for ${serviceName}`);
      return null;
    }

    if (data.data.result.length === 0) {
      return null;
    }

    const [, value] = data.data.result[0].value;
    const numValue = parseFloat(value);
    return isNaN(numValue) ? null : numValue;

  } catch (error) {
    if (error instanceof PrometheusError) {
      console.error(`Prometheus error for ${serviceName}:`, error.message);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Timeout while checking ${serviceName}`);
    } else {
      console.error(`Unexpected error checking ${serviceName}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getServiceHealth(service: ServiceConfig): Promise<ServiceStatus> {
  switch (service.healthStrategy) {
    case 'dedicated':
      // For Prometheus, use its dedicated health endpoint
      try {
        const url = `${PROMETHEUS_URL}/prometheus/-/healthy`;
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'admin-frontend',
            'Connection': 'keep-alive'
          },
          next: { revalidate: 0 }
        });
        return response.ok ? 'running' : 'error';
      } catch (error) {
        console.error(`Error checking Prometheus health:`, error instanceof Error ? error.message : 'Unknown error');
        return 'error';
      }

    case 'redis':
      // For Redis, we check both redis-exporter and Redis itself
      const [redisExporterUp, redisUp] = await Promise.all([
        queryPrometheus(HEALTH_QUERIES.redisExporterUp(), service.name),
        queryPrometheus(HEALTH_QUERIES.redisUp(), service.name)
      ]);
      
      // Both redis-exporter and Redis itself must be up
      if (redisExporterUp === null || redisUp === null) return 'error';
      if (redisExporterUp !== 1) return 'error';  // redis-exporter must be running
      return redisUp === 1 ? 'running' : 'stopped';  // Redis status determines final state

    case 'standard':
    default:
      // For standard services, check up metric and basic health indicators
      const [up, cpu, errorRate] = await Promise.all([
        queryPrometheus(HEALTH_QUERIES.up(service), service.name),
        queryPrometheus(HEALTH_QUERIES.cpu(service), service.name),
        queryPrometheus(HEALTH_QUERIES.errorRate(service), service.name)
      ]);

      if (up === null) return 'stopped';
      if (up !== 1) return 'error';
      
      // Consider a service in error if CPU is too high or error rate is significant
      if (cpu !== null && cpu > 90) return 'error';
      if (errorRate !== null && errorRate > 0.5) return 'error';
      
      return 'running';
  }
}

export async function GET() {
  try {
    // Get status for all services in parallel
    const servicePromises = SERVICES.map(async service => {
      const status = await getServiceHealth(service);
      return [service.name, String(status)] as [string, ServiceStatus];
    });

    const results = await Promise.all(servicePromises);
    const statuses = Object.fromEntries(results);

    return NextResponse.json(statuses, {
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in status route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}