import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

// This should be the internal Docker network URL
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

interface ServiceConfig {
  name: string;
  metricsPort: number;
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

async function getServiceStatus(service: ServiceConfig): Promise<ServiceStatus> {
  try {
    // Check service status via Prometheus up metric
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