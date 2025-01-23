import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

const SERVICES = {
  'event-handler': 'http://event-handler:4300/health',
  'traefik': 'http://traefik:3100/ping'
};

async function checkServiceHealth(url: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Add a reasonable timeout
      signal: AbortSignal.timeout(5000)
    });
    return response.ok ? 'running' : 'error';
  } catch (error) {
    console.error(`Error checking service health for ${url}:`, error);
    return 'error';
  }
}

export async function GET() {
  try {
    const statuses: Record<string, ServiceStatus> = {
      // Admin frontend is always 'running' if this endpoint is responding
      'admin-frontend': 'running'
    };
    
    // Check each service in parallel
    const checks = Object.entries(SERVICES).map(async ([service, url]) => {
      statuses[service] = await checkServiceHealth(url);
    });
    
    await Promise.all(checks);

    // Add Redis status based on environment variable
    statuses['redis'] = process.env.REDIS_URL ? 'running' : 'error';

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching service status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service status' },
      { status: 500 }
    );
  }
} 