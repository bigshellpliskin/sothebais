import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

// This should be the internal Docker network URL
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

interface ServiceConfig {
  name: string;
  healthPort: number;
  metricsPort: number;
}

const SERVICES: ServiceConfig[] = [
  { name: 'auction-manager', healthPort: 4191, metricsPort: 4190 },
  { name: 'event-handler', healthPort: 4391, metricsPort: 4390 },
  { name: 'stream-manager', healthPort: 4291, metricsPort: 4290 },
  { name: 'shape-l2', healthPort: 4091, metricsPort: 4090 },
  { name: 'eliza', healthPort: 4491, metricsPort: 4490 },
  { name: 'admin-frontend', healthPort: 3091, metricsPort: 3090 }
];

async function checkHealthEndpoint(service: ServiceConfig): Promise<boolean> {
  try {
    const response = await fetch(`http://${service.name}:${service.healthPort}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getServiceStatus(service: ServiceConfig): Promise<ServiceStatus> {
  try {
    // First try the health endpoint
    const isHealthy = await checkHealthEndpoint(service);
    if (isHealthy) {
      return 'running';
    }

    // If health check fails, check Prometheus metrics
    const query = `up{instance="${service.name}:${service.metricsPort}"}`;
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      return 'error';
    }

    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const value = data.data.result[0].value[1];
      return value === "1" ? 'running' : 'error';
    }

    return 'stopped';
  } catch (error) {
    console.error(`Error checking status for ${service.name}:`, error);
    return 'error';
  }
}

async function getRedisStatus(): Promise<ServiceStatus> {
  try {
    // Check redis-exporter metrics
    const query = 'redis_up';
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      return 'error';
    }

    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const value = data.data.result[0].value[1];
      return value === "1" ? 'running' : 'error';
    }

    return 'stopped';
  } catch {
    return 'error';
  }
}

export async function GET() {
  try {
    // Get status for all services in parallel
    const servicePromises = SERVICES.map(async service => {
      const status = await getServiceStatus(service);
      return [service.name, status] as [string, ServiceStatus];
    });

    // Get Redis status separately since it uses redis-exporter
    const redisPromise = (async () => {
      const status = await getRedisStatus();
      return ['redis', status] as [string, ServiceStatus];
    })();

    // Wait for all status checks
    const results = await Promise.all([...servicePromises, redisPromise]);
    const statuses = Object.fromEntries(results);

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error in status route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}