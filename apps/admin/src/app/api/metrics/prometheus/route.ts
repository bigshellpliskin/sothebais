import { NextResponse } from "next/server";

function parsePrometheusMetrics(metricsText: string) {
  const metrics = {
    cpu_usage_percent: 0,
    memory_usage_mb: 0,
    request_rate: 0,
    redis_memory_mb: 0,
    cpu_trend: 'stable' as const,
    memory_trend: 'stable' as const,
    request_trend: 'stable' as const,
    redis_trend: 'stable' as const
  };

  const lines = metricsText.split('\n');
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    
    // CPU Usage
    if (line.includes('process_cpu_user_seconds_total')) {
      const match = line.match(/\{.*?\}\s+(\d+(\.\d+)?)/);
      if (match) {
        metrics.cpu_usage_percent = parseFloat(match[1]) * 100;
      }
    }
    
    // Memory Usage
    if (line.includes('process_resident_memory_bytes')) {
      const match = line.match(/\{.*?\}\s+(\d+(\.\d+)?)/);
      if (match) {
        metrics.memory_usage_mb = parseFloat(match[1]) / (1024 * 1024);
      }
    }
    
    // Request Rate (from http_request_duration_seconds_count)
    if (line.includes('http_request_duration_seconds_count')) {
      const match = line.match(/\{.*?\}\s+(\d+(\.\d+)?)/);
      if (match) {
        metrics.request_rate = parseFloat(match[1]);
      }
    }
    
    // Redis Memory
    if (line.includes('redis_memory_used_bytes')) {
      const match = line.match(/\{.*?\}\s+(\d+(\.\d+)?)/);
      if (match) {
        metrics.redis_memory_mb = parseFloat(match[1]) / (1024 * 1024);
      }
    }
  }

  return metrics;
}

export async function GET() {
  try {
    // Use the Docker service name 'admin-frontend' instead of localhost
    const metricsResponse = await fetch('http://admin-frontend:3090/metrics', {
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!metricsResponse.ok) {
      console.error(`Failed to fetch metrics: ${metricsResponse.status}`, await metricsResponse.text());
      throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`);
    }

    const metricsText = await metricsResponse.text();
    
    if (!metricsText) {
      console.error('Empty metrics response');
      throw new Error('Empty metrics response');
    }

    const parsedMetrics = parsePrometheusMetrics(metricsText);

    return NextResponse.json(parsedMetrics, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 