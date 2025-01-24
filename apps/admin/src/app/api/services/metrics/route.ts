import { NextResponse } from "next/server";

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

async function queryPrometheus(query: string): Promise<number> {
  try {
    const response = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error(`Prometheus returned status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(`Prometheus query failed: ${data.error || 'Unknown error'}`);
    }
    
    if (!data.data?.result?.[0]?.value?.[1]) {
      return 0;
    }

    return parseFloat(data.data.result[0].value[1]);
  } catch (error) {
    console.error(`Error querying Prometheus (${query}):`, error);
    throw error;
  }
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (current > previous * 1.1) return "up";
  if (current < previous * 0.9) return "down";
  return "stable";
}

export async function GET() {
  try {
    // Verify Prometheus connection first
    try {
      await fetch(PROMETHEUS_URL);
    } catch (error) {
      return NextResponse.json(
        { error: "Cannot connect to Prometheus. Please check if the service is running." },
        { status: 503 }
      );
    }

    // CPU Usage (average across services)
    const cpuQuery = 'avg(rate(process_cpu_seconds_total{job=~"admin-frontend|event-handler"}[1m]) * 100)';
    const cpu = await queryPrometheus(cpuQuery);

    // Memory Usage (sum across services, converted to MB)
    const memoryQuery = 'sum(process_resident_memory_bytes{job=~"admin-frontend|event-handler"}) / 1024 / 1024';
    const memory = await queryPrometheus(memoryQuery);

    // Request Rate (per second)
    const requestRateQuery = 'sum(rate(traefik_entrypoint_requests_total{entrypoint="websecure"}[1m]))';
    const requestRate = await queryPrometheus(requestRateQuery);

    // Redis Memory Usage (in MB)
    const redisMemoryQuery = 'redis_memory_used_bytes / 1024 / 1024';
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
        value: cpu,
        unit: "%",
        trend: calculateTrend(cpu, prevCpu),
      },
      memory: {
        value: memory,
        unit: "MB",
        trend: calculateTrend(memory, prevMemory),
      },
      requestRate: {
        value: requestRate,
        unit: "req/s",
        trend: calculateTrend(requestRate, prevRequestRate),
      },
      redisMemory: {
        value: redisMemory,
        unit: "MB",
        trend: calculateTrend(redisMemory, prevRedisMemory),
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch metrics",
      },
      { status: 500 }
    );
  }
} 