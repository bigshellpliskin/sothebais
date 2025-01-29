import { NextResponse } from "next/server";

// Type definitions for metrics responses
interface MetricValue {
  value: number;
  unit: "%" | "MB" | "req/s";
  trend: "up" | "down" | "stable";
  timestamp?: number;  // Optional timestamp for tracking when the metric was collected
}

interface MetricsResponse {
  cpu: MetricValue;
  memory: MetricValue;
  requestRate: MetricValue;
  redisMemory: MetricValue;
  collected_at?: number;  // Timestamp when all metrics were collected
}

interface PrometheusQueryResponse {
  status: "success" | "error";  // Make status more specific
  data?: {
    resultType?: "vector" | "matrix" | "scalar" | "string";  // Prometheus result types
    result?: Array<{
      metric?: Record<string, string>;  // Metric labels
      value?: [number, string];  // Timestamp and value
    }>;
  };
  error?: string;
  errorType?: string;  // Additional error information from Prometheus
  warnings?: string[];  // Prometheus warnings
}

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

async function queryPrometheus(query: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
      { 
        next: { revalidate: 0 },
        signal: controller.signal 
      }
    );
    
    if (!response.ok) {
      console.warn(`Prometheus returned status: ${response.status} for query: ${query}`);
      return 0;
    }

    const data = await response.json() as PrometheusQueryResponse;
    
    if (data.status !== "success" || data.error) {
      console.warn(`Prometheus query failed: ${data.error || 'Unknown error'} for query: ${query}`);
      return 0;
    }
    
    const value = data.data?.result?.[0]?.value?.[1];
    if (typeof value !== 'string') {
      return 0;
    }

    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? 0 : parsedValue;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error querying Prometheus (${query}):`, error.message);
    } else {
      console.error(`Unknown error querying Prometheus (${query})`);
    }
    return 0;
  } finally {
    clearTimeout(timeout);
  }
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (!previous) return "stable";
  if (current > previous * 1.1) return "up";
  if (current < previous * 0.9) return "down";
  return "stable";
}

// Handle POST requests for custom queries
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "Query must be a non-empty string" },
        { status: 400 }
      );
    }

    // Basic security validation - only allow specific Prometheus operators and metrics
    const allowedPattern = /^[a-zA-Z0-9_]+{[a-zA-Z0-9_,="]+}(\[[0-9]+[smh]\])?$/;
    if (!allowedPattern.test(query)) {
      return NextResponse.json(
        { error: "Invalid query format" },
        { status: 400 }
      );
    }

    const value = await queryPrometheus(query);
    
    return NextResponse.json({
      value: Number(value.toFixed(3)),
      timestamp: Date.now()
    }, {
      headers: {
        'content-type': 'application/json',
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in metrics POST route:", errorMessage);
    
    return NextResponse.json(
      { error: "Failed to execute query", message: errorMessage },
      { 
        status: 500,
        headers: {
          'content-type': 'application/json',
        }
      }
    );
  }
}

// Handle GET requests for predefined metrics
export async function GET() {
  try {
    // Verify Prometheus connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const healthCheck = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=up`, {
        next: { revalidate: 0 },
        signal: controller.signal
      });

      if (!healthCheck.ok) {
        throw new Error(`Prometheus health check failed: ${healthCheck.status}`);
      }

      const healthData = await healthCheck.json() as PrometheusQueryResponse;
      if (healthData.status !== "success") {
        throw new Error(`Prometheus returned error: ${healthData.error || 'Unknown error'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Prometheus connection error:", message);
      return NextResponse.json({
        error: "Prometheus connection failed",
        message
      }, { 
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    // Fetch all metrics in parallel
    const [cpu, memory, requestRate, redisMemory] = await Promise.all([
      queryPrometheus('avg(rate(process_cpu_user_seconds_total{job=~".+"}[1m]) * 100)'),
      queryPrometheus('sum(process_resident_memory_bytes{job=~".+"}) / 1024 / 1024'),
      queryPrometheus('sum(rate(http_request_duration_seconds_count{job=~".+"}[1m]))'),
      queryPrometheus('redis_memory_used_bytes{job="redis"} / 1024 / 1024')
    ]);

    const timestamp = Date.now();
    const response: MetricsResponse = {
      cpu: {
        value: Number(cpu.toFixed(1)),
        unit: "%",
        trend: "stable",
        timestamp
      },
      memory: {
        value: Number(memory.toFixed(1)),
        unit: "MB",
        trend: "stable",
        timestamp
      },
      requestRate: {
        value: Number(requestRate.toFixed(2)),
        unit: "req/s",
        trend: "stable",
        timestamp
      },
      redisMemory: {
        value: Number(redisMemory.toFixed(1)),
        unit: "MB",
        trend: "stable",
        timestamp
      },
      collected_at: timestamp
    };

    return NextResponse.json(response, {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store, must-revalidate'
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching metrics:", message);
    
    return NextResponse.json({
      error: "Failed to fetch metrics",
      message
    }, { 
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
} 