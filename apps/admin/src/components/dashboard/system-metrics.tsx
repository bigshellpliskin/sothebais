"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface MetricData {
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

interface SystemMetrics {
  cpu: MetricData;
  memory: MetricData;
  requestRate: MetricData;
  redisMemory: MetricData;
}

export function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/services/metrics");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setMetrics(data);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Metrics</CardTitle>
        <CardDescription>Real-time system performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !metrics && (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 py-4">
            {error}
          </div>
        )}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="CPU Usage"
              value={metrics.cpu.value}
              unit={metrics.cpu.unit}
              trend={metrics.cpu.trend}
            />
            <MetricCard
              title="Memory Usage"
              value={metrics.memory.value}
              unit={metrics.memory.unit}
              trend={metrics.memory.trend}
            />
            <MetricCard
              title="Request Rate"
              value={metrics.requestRate.value}
              unit={metrics.requestRate.unit}
              trend={metrics.requestRate.trend}
            />
            <MetricCard
              title="Redis Memory"
              value={metrics.redisMemory.value}
              unit={metrics.redisMemory.unit}
              trend={metrics.redisMemory.trend}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, unit, trend }: { 
  title: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
}) {
  return (
    <div className="p-4 bg-card rounded-lg border shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-bold">
          {value.toFixed(1)} {unit}
        </p>
        <TrendIcon trend={trend} />
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  const iconClass = "w-4 h-4";
  
  if (trend === "up") {
    return (
      <svg
        className={`${iconClass} text-red-500`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (trend === "down") {
    return (
      <svg
        className={`${iconClass} text-green-500`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12 13a1 1 0 110 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${iconClass} text-gray-500`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
} 