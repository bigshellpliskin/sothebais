import { NextResponse } from "next/server";

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

export async function GET() {
  try {
    // Test Prometheus connection
    const healthCheck = await fetch(`${PROMETHEUS_URL}/-/healthy`, {
      next: { revalidate: 0 }
    });
    
    if (!healthCheck.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Prometheus health check failed: ${healthCheck.status}`,
        prometheus_url: PROMETHEUS_URL
      });
    }

    // Test a simple query
    const response = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent('up')}`,
      { next: { revalidate: 0 } }
    );
    
    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Prometheus query failed: ${response.status}`,
        prometheus_url: PROMETHEUS_URL
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      prometheus_url: PROMETHEUS_URL,
      health_check: 'ok',
      query_result: data
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      prometheus_url: PROMETHEUS_URL
    });
  }
} 