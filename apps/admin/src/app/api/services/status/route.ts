import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

// This should be the internal Docker network URL
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

interface ServiceConfig {
  name: string;
  metricsPort: number;
}

// Prometheus API response types
interface PrometheusResponse {
  status: 'success' | 'error';
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string]; // [timestamp, value]
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

const SERVICES: ServiceConfig[] = [
  // Core Services
  { name: 'auction-manager', metricsPort: 4190 },
  { name: 'event-handler', metricsPort: 4390 },
  { name: 'stream-manager', metricsPort: 4290 },
  { name: 'shape-l2', metricsPort: 4090 },
  { name: 'eliza', metricsPort: 4490 },
  { name: 'admin-frontend', metricsPort: 3090 },
  // Infrastructure Services
  { name: 'traefik', metricsPort: 3100 },
  { name: 'prometheus', metricsPort: 9090 },
  { name: 'grafana', metricsPort: 3001 },
  { name: 'node-exporter', metricsPort: 9100 }
];

/**
 * Queries Prometheus and returns the status based on the 'up' metric
 * @param query - The Prometheus query to execute
 * @param serviceName - Name of the service being checked (for error reporting)
 * @returns The service status
 */
async function queryPrometheusStatus(query: string, serviceName: string): Promise<ServiceStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new PrometheusError(
        `Prometheus returned status ${response.status}`,
        serviceName
      );
    }

    const data = await response.json() as PrometheusResponse;
    
    // Validate response structure
    if (data.status === 'error' || data.error) {
      console.error(`Prometheus query error for ${serviceName}:`, data.error);
      return 'error';
    }

    if (!data.data?.result || !Array.isArray(data.data.result)) {
      console.error(`Invalid response structure for ${serviceName}`);
      return 'error';
    }

    // No results means the service is not being monitored
    if (data.data.result.length === 0) {
      console.warn(`No metrics found for ${serviceName}`);
      return 'stopped';
    }

    const [, value] = data.data.result[0].value;
    return value === "1" ? 'running' : 'error';

  } catch (error) {
    if (error instanceof PrometheusError) {
      console.error(`Prometheus error for ${serviceName}:`, error.message);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Timeout while checking ${serviceName}`);
    } else {
      console.error(`Unexpected error checking ${serviceName}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    return 'error';
  } finally {
    clearTimeout(timeout);
  }
}

async function getServiceStatus(service: ServiceConfig): Promise<ServiceStatus> {
  const query = `up{instance="${service.name}:${service.metricsPort}"}`;
  return queryPrometheusStatus(query, service.name);
}

async function getRedisStatus(): Promise<ServiceStatus> {
  return queryPrometheusStatus('redis_up', 'redis');
}

export async function GET() {
  try {
    // Get status for all services in parallel
    const servicePromises = SERVICES.map(async service => {
      const status = await getServiceStatus(service);
      return [service.name, String(status)] as [string, ServiceStatus];
    });

    // Get Redis status separately since it uses redis-exporter
    const redisPromise = (async () => {
      const status = await getRedisStatus();
      return ['redis', String(status)] as [string, ServiceStatus];
    })();

    // Wait for all status checks
    const results = await Promise.all([...servicePromises, redisPromise]);
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