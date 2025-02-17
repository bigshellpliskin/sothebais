import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

// This should be the internal Docker network URL
const PROMETHEUS_URL = 'http://prometheus:9090';  // Always use Docker network name
// Skip authentication for status endpoint during testing
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const fetchCache = 'force-no-store';

// Cache for service status to prevent frequent re-queries
const statusCache = new Map<string, { status: ServiceStatus; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache to be longer than Prometheus scrape interval

// Define standard health check queries
const HEALTH_QUERIES = {
  // Basic service health - use instant vector for more stable results
  up: (service: ServiceConfig) => {
    // Use a 30s range to ensure we catch the latest scrape
    return `max_over_time(up{job="${service.job}",instance="${service.name}:${service.metricsPort}"}[30s])`;
  },
  
  // Redis specific metrics - also use range vectors
  redisUp: () => 'max_over_time(redis_up[30s])',
  redisExporterUp: () => 'max_over_time(up{job="redis"}[30s])'
};

// Service configurations with health check strategies
const SERVICES: ServiceConfig[] = [
  // Core Services - all using common job
  { name: 'event-handler', metricsPort: 4390, healthStrategy: 'standard', job: 'common' },
  { name: 'stream-manager', metricsPort: 4290, healthStrategy: 'standard', job: 'common' },
  { name: 'admin-frontend', metricsPort: 3090, healthStrategy: 'standard', job: 'common' },
  { name: 'traefik', metricsPort: 3100, healthStrategy: 'standard', job: 'common' },
  
  // Infrastructure Services
  { name: 'prometheus', metricsPort: 9090, healthStrategy: 'dedicated', job: 'prometheus' },
  { name: 'redis', metricsPort: 6379, healthStrategy: 'redis', job: 'redis' }
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
  const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

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
  // Check cache first - use longer TTL
  const cached = statusCache.get(service.name);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  let status: ServiceStatus;

  switch (service.healthStrategy) {
    case 'dedicated':
      // For Prometheus, use its dedicated health endpoint
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const url = `${PROMETHEUS_URL}/prometheus/-/healthy`;
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'admin-frontend',
            'Connection': 'keep-alive'
          },
          signal: controller.signal,
          next: { revalidate: 0 }
        });
        clearTimeout(timeout);
        status = response.ok ? 'running' : 'error';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // On timeout, check cache before failing
          if (cached) {
            console.log(`Using cached status for ${service.name} due to timeout`);
            return cached.status;
          }
          console.error(`Timeout checking Prometheus health`);
        } else {
          console.error(`Error checking Prometheus health:`, error instanceof Error ? error.message : 'Unknown error');
        }
        status = 'error';
      }
      break;

    case 'redis':
      // For Redis, we check both redis-exporter and Redis itself
      const [redisExporterUp, redisUp] = await Promise.all([
        queryPrometheus(HEALTH_QUERIES.redisExporterUp(), service.name),
        queryPrometheus(HEALTH_QUERIES.redisUp(), service.name)
      ]);
      
      // On query failure, try to use cache
      if ((redisExporterUp === null || redisUp === null) && cached) {
        console.log(`Using cached status for ${service.name} due to query failure`);
        return cached.status;
      }
      
      if (redisExporterUp === null || redisUp === null) status = 'error';
      else if (redisExporterUp < 1) status = 'error';
      else status = redisUp >= 1 ? 'running' : 'stopped';
      break;

    case 'standard':
    default:
      // For all standard services, check the up metric
      const up = await queryPrometheus(HEALTH_QUERIES.up(service), service.name);
      console.log(`[DEBUG] Up metric for ${service.name} (query: ${HEALTH_QUERIES.up(service)}):`, up);
      
      // On query failure, try to use cache
      if (up === null && cached) {
        console.log(`Using cached status for ${service.name} due to query failure`);
        return cached.status;
      }
      
      if (up === null) status = 'error';
      else status = up >= 1 ? 'running' : 'stopped';  // Any value >= 1 means running
      break;
  }

  // Update cache
  statusCache.set(service.name, { status, timestamp: Date.now() });
  return status;
}

export async function GET() {
  try {
    // Get status for all services in parallel with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second total timeout

    const servicePromises = SERVICES.map(async service => {
      try {
        const status = await getServiceHealth(service);
        return [service.name, String(status)] as [string, ServiceStatus];
      } catch (error) {
        // Try to use cached value on error
        const cached = statusCache.get(service.name);
        if (cached) {
          console.log(`Using cached status for ${service.name} due to error`);
          return [service.name, String(cached.status)] as [string, ServiceStatus];
        }
        console.error(`Error getting status for ${service.name}:`, error);
        return [service.name, 'error'] as [string, ServiceStatus];
      }
    });

    const results = await Promise.allSettled(servicePromises);
    clearTimeout(timeout);

    const statuses = Object.fromEntries(
      results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        // If a promise was rejected, try to use cached value
        const cached = statusCache.get(SERVICES[index].name);
        if (cached) {
          return [SERVICES[index].name, String(cached.status)];
        }
        return [SERVICES[index].name, 'error'] as [string, ServiceStatus];
      })
    );

    return NextResponse.json(statuses, {
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Status check timed out');
      return new NextResponse('Gateway Timeout', { status: 504 });
    }
    console.error('Error in status route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}