import { NextResponse } from "next/server";

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

async function queryPrometheus(query: string): Promise<number> {
  try {
    const response = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
      { next: { revalidate: 0 } }
    );
    
    if (!response.ok) {
      console.warn(`Prometheus returned status: ${response.status} for query: ${query}`);
      return 0;
    }

    const data = await response.json();
    
    if (data.status !== "success") {
      console.warn(`Prometheus query failed: ${data.error || 'Unknown error'} for query: ${query}`);
      return 0;
    }
    
    if (!data.data?.result?.[0]?.value?.[1]) {
      return 0;
    }

    return parseFloat(data.data.result[0].value[1]);
  } catch (error) {
    console.error(`Error querying Prometheus (${query}):`, error);
    return 0;
  }
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (!previous) return "stable";
  if (current > previous * 1.1) return "up";
  if (current < previous * 0.9) return "down";
  return "stable";
}

export async function GET() {
  try {
    // Verify Prometheus connection first
    try {
      const healthCheck = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=up`, {
        next: { revalidate: 0 }
      });
      if (!healthCheck.ok) {
        throw new Error(`Prometheus health check failed: ${healthCheck.status}`);
      }
      const healthData = await healthCheck.json();
      if (healthData.status !== "success") {
        throw new Error(`Prometheus returned error: ${healthData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Prometheus connection error:", error);
      return NextResponse.json({
        error: "Prometheus connection failed",
        prometheus_url: PROMETHEUS_URL,
        message: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

    // CPU Usage (average across all services)
    const cpuQuery = 'avg(rate(process_cpu_user_seconds_total{job=~".+"}[1m]) * 100)';
    const cpu = await queryPrometheus(cpuQuery);

    // Memory Usage (sum across all services, converted to MB)
    const memoryQuery = 'sum(process_resident_memory_bytes{job=~".+"}) / 1024 / 1024';
    const memory = await queryPrometheus(memoryQuery);

    // Request Rate (per second)
    const requestRateQuery = 'sum(rate(http_request_duration_seconds_count{job=~".+"}[1m]))';
    const requestRate = await queryPrometheus(requestRateQuery);

    // Redis Memory Usage (in MB)
    const redisMemoryQuery = 'redis_memory_used_bytes{job="redis-exporter"} / 1024 / 1024';
    const redisMemory = await queryPrometheus(redisMemoryQuery);

    // Get previous values (5 minutes ago) for trend calculation
    const [prevCpu, prevMemory, prevRequestRate, prevRedisMemory] = await Promise.all([
      queryPrometheus(`${cpuQuery} offset 5m`),
      queryPrometheus(`${memoryQuery} offset 5m`),
      queryPrometheus(`${requestRateQuery} offset 5m`),
      queryPrometheus(`${redisMemoryQuery} offset 5m`)
    ]);

    return NextResponse.json({
      cpu: {
        value: Number(cpu.toFixed(1)),
        unit: "%",
        trend: calculateTrend(cpu, prevCpu),
      },
      memory: {
        value: Number(memory.toFixed(1)),
        unit: "MB",
        trend: calculateTrend(memory, prevMemory),
      },
      requestRate: {
        value: Number(requestRate.toFixed(2)),
        unit: "req/s",
        trend: calculateTrend(requestRate, prevRequestRate),
      },
      redisMemory: {
        value: Number(redisMemory.toFixed(1)),
        unit: "MB",
        trend: calculateTrend(redisMemory, prevRedisMemory),
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({
      error: "Failed to fetch metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 