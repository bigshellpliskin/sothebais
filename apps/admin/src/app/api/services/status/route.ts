import { NextResponse } from 'next/server';
import { ServiceStatus } from '@/types/service';

const SERVICES = {
  'event-handler': 'http://event-handler:4300/health',
  'redis': 'http://redis:6379',  // Redis doesn't have a health endpoint, we'll check connection
  'traefik': 'http://traefik:8080/ping',
  'admin-frontend': 'http://admin-frontend:3000/api/health'
};

async function checkServiceHealth(url: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok ? 'running' : 'error';
  } catch (error) {
    console.error(`Error checking service health for ${url}:`, error);
    return 'error';
  }
}

export async function GET() {
  try {
    const statuses: Record<string, ServiceStatus> = {};
    
    // Check each service in parallel
    const checks = Object.entries(SERVICES).map(async ([service, url]) => {
      statuses[service] = await checkServiceHealth(url);
    });
    
    await Promise.all(checks);

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching service status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service status' },
      { status: 500 }
    );
  }
} 