import { NextResponse } from "next/server";

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
// Skip authentication for metrics endpoint during testing
export const dynamic = 'force-dynamic';
// Make this a public API route
export const config = {
  api: {
    auth: false
  }
};

// Standard metrics queries for all services
const STANDARD_METRICS = {
  // Basic service metrics
  up: (instance: string) => `up{instance="${instance}"}`,
  cpu: (instance: string) => `rate(process_cpu_seconds_total{instance="${instance}"}[1m]) * 100`,
  memory: (instance: string) => `process_resident_memory_bytes{instance="${instance}"} / 1024 / 1024`,
  
  // HTTP metrics
  requestRate: (instance: string) => `rate(http_request_duration_seconds_count{instance="${instance}"}[1m])`,
  errorRate: (instance: string) => `rate(http_request_duration_seconds_count{instance="${instance}",code=~"5.."}[1m])`,
  latency: (instance: string) => `rate(http_request_duration_seconds_sum{instance="${instance}"}[1m]) / rate(http_request_duration_seconds_count{instance="${instance}"}[1m])`,
  
  // Process metrics
  uptime: (instance: string) => `time() - process_start_time_seconds{instance="${instance}"}`,
  openFds: (instance: string) => `process_open_fds{instance="${instance}"}`,
  
  // Redis specific metrics
  redisMemory: () => 'redis_memory_used_bytes / 1024 / 1024',
  redisConnections: () => 'redis_connected_clients',
  redisOps: () => 'rate(redis_commands_processed_total[1m])',
  
  // Traefik specific metrics
  traefikRequests: () => 'sum(rate(http_request_duration_seconds_count[1m]))',
  traefikErrors: () => 'sum(rate(http_request_duration_seconds_count{code=~"5.."}[1m]))',
  
  // Node exporter metrics
  nodeCpu: () => 'sum(rate(node_cpu_seconds_total{mode!="idle"}[1m])) * 100',
  nodeMemory: () => '(sum(node_memory_MemTotal_bytes) - sum(node_memory_MemAvailable_bytes)) / sum(node_memory_MemTotal_bytes) * 100',
  nodeDisk: () => '(sum(node_filesystem_size_bytes{mountpoint="/"}) - sum(node_filesystem_free_bytes{mountpoint="/"})) / sum(node_filesystem_size_bytes{mountpoint="/"}) * 100'
};

// Type definitions for metrics responses
interface MetricValue {
  value: number;
  unit: "%" | "MB" | "req/s" | "s" | "ops/s";
  trend: "up" | "down" | "stable";
  timestamp?: number;  // Optional timestamp for tracking when the metric was collected
}

interface MetricsResponse {
  [key: string]: MetricValue | number | undefined;
  collected_at: number;
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

// Ensure the URL has the correct prefix
function getPrometheusUrl(path: string): string {
  const baseUrl = PROMETHEUS_URL.endsWith('/') ? PROMETHEUS_URL.slice(0, -1) : PROMETHEUS_URL;
  const prefix = '/prometheus';  // Prometheus is configured with this prefix
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${prefix}${apiPath}`;
}

async function queryPrometheus(query: string): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = getPrometheusUrl(`/api/v1/query?query=${encodeURIComponent(query)}`);
    // console.log(`[DEBUG] Querying Promet***heus at: ${url}`);

    const response = await fetch(
      url,
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'admin-frontend',
          'Connection': 'keep-alive'
        },
        next: { revalidate: 0 },
        signal: controller.signal 
      }
    );
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[DEBUG] Prometheus response not OK:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: responseText
      });
      console.warn(`Prometheus returned status: ${response.status} for query: ${query}`);
      return null;
    }

    const responseText = await response.text();
    // console.log(`[DEBUG] Raw Prometheus response:`, responseText);
    
    const data = JSON.parse(responseText) as PrometheusQueryResponse;
    
    if (data.status !== "success" || data.error) {
      console.warn(`Prometheus query failed: ${data.error || 'Unknown error'} for query: ${query}`);
      return null;
    }
    
    const value = data.data?.result?.[0]?.value?.[1];
    if (typeof value !== 'string') {
      return null;
    }

    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? null : parsedValue;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error querying Prometheus (${query}):`, error.message);
    } else {
      console.error(`Unknown error querying Prometheus (${query})`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

    // Validate query format
    const allowedPattern = /^(?:sum\()?(?:rate\()?[a-zA-Z0-9_]+(?:{[^}]+})?(?:\[[0-9]+[smh]\])?(?:\))?(?:\))?(?:[ ]*[*/+-][ ]*[0-9]+(?:\.[0-9]+)?)*$/;
    
    if (!allowedPattern.test(query)) {
      console.warn('Invalid query format:', query);
      return NextResponse.json(
        { error: "Invalid query format", query },
        { status: 400 }
      );
    }

    const value = await queryPrometheus(query);
    
    return NextResponse.json({
      value: value !== null ? Number(value.toFixed(3)) : null,
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
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const instance = url.searchParams.get('instance');
    
    // If no instance is provided, return system-wide metrics
    if (!instance) {
      const timestamp = Date.now();
      const metrics: MetricsResponse = {
        collected_at: timestamp
      };

      // Fetch system-wide metrics
      const systemMetricPromises = [
        ['cpu', 'sum(rate(process_cpu_seconds_total[1m])) * 100', '%'],
        ['memory', 'sum(process_resident_memory_bytes) / 1024 / 1024', 'MB'],
        ['requestRate', 'sum(rate(http_request_duration_seconds_count[1m]))', 'req/s'],
        ['redisMemory', 'redis_memory_used_bytes / 1024 / 1024', 'MB']
      ] as const;

      console.log('[DEBUG] Fetching system metrics with queries:', systemMetricPromises.map(([name, query]) => ({ name, query })));

      await Promise.all(
        systemMetricPromises.map(async ([name, query, unit]) => {
          const value = await queryPrometheus(query);
          // console.log(`[DEBUG] Metric ${name} result:`, { name, value, query });
          if (value !== null) {
            metrics[name] = {
              value: Number(value.toFixed(2)),
              unit: unit as "%" | "MB" | "req/s" | "s" | "ops/s",
              trend: "stable", // Trend calculation would require historical data
              timestamp
            };
          } else {
            console.warn(`[DEBUG] No data for metric ${name} with query: ${query}`);
          }
        })
      );

      return NextResponse.json(metrics, {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-cache, no-store, must-revalidate'
        },
      });
    }

    if (!instance) {
      return NextResponse.json(
        { error: "Instance parameter is required" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const metrics: MetricsResponse = {
      collected_at: timestamp
    };

    // Fetch standard metrics
    const standardMetricPromises = [
      ['cpu', STANDARD_METRICS.cpu(instance), '%'],
      ['memory', STANDARD_METRICS.memory(instance), 'MB'],
      ['requestRate', STANDARD_METRICS.requestRate(instance), 'req/s'],
      ['errorRate', STANDARD_METRICS.errorRate(instance), 'req/s'],
      ['uptime', STANDARD_METRICS.uptime(instance), 's']
    ] as const;

    const results = await Promise.all(
      standardMetricPromises.map(async ([name, query, unit]) => {
        const value = await queryPrometheus(query);
        if (value !== null) {
          metrics[name] = {
            value: Number(value.toFixed(2)),
            unit: unit as "%" | "MB" | "req/s" | "s" | "ops/s",
            trend: "stable", // Trend calculation would require historical data
            timestamp
          };
        }
      })
    );

    // Add service-specific metrics
    if (instance === 'redis') {
      const redisMemory = await queryPrometheus(STANDARD_METRICS.redisMemory());
      const redisConnections = await queryPrometheus(STANDARD_METRICS.redisConnections());
      const redisOps = await queryPrometheus(STANDARD_METRICS.redisOps());

      if (redisMemory !== null) {
        metrics.redisMemory = {
          value: Number(redisMemory.toFixed(2)),
          unit: "MB",
          trend: "stable",
          timestamp
        };
      }

      if (redisConnections !== null) {
        metrics.connections = {
          value: redisConnections,
          unit: "req/s",
          trend: "stable",
          timestamp
        };
      }

      if (redisOps !== null) {
        metrics.operations = {
          value: Number(redisOps.toFixed(2)),
          unit: "ops/s",
          trend: "stable",
          timestamp
        };
      }
    }

    return NextResponse.json(metrics, {
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