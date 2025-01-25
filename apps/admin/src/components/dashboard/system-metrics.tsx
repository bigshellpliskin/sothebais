"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

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

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  const variants = {
    up: {
      icon: TrendingUp,
      label: "Trending up",
      className: "text-green-500"
    },
    down: {
      icon: TrendingDown,
      label: "Trending down",
      className: "text-red-500"
    },
    stable: {
      icon: Minus,
      label: "Stable",
      className: "text-gray-500"
    }
  };

  const { icon, label, className } = variants[trend];
  
  return <Icon icon={icon} aria-label={label} className={className} />;
}

function MetricCard({ title, value, unit, trend }: {
  title: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
}) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <TrendIcon trend={trend} />
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">
          {value.toLocaleString()} {unit}
        </div>
      </div>
    </div>
  );
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
        setMetrics(data);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
        setError("Failed to fetch metrics");
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const LoadingCard = ({ title }: { title: string }) => (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Icon icon={Loader2} className="animate-spin h-4 w-4" />
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Metrics</CardTitle>
        <CardDescription>Real-time system performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !metrics && (
          <div className="flex justify-center items-center min-h-[200px]">
            <Icon 
              icon={Loader2} 
              className="animate-spin text-muted-foreground h-8 w-8" 
              aria-label="Loading metrics..."
            />
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 py-4">
            {error}
          </div>
        )}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.cpu && metrics.cpu.value !== undefined ? (
              <MetricCard
                title="CPU Usage"
                value={metrics.cpu.value}
                unit={metrics.cpu.unit}
                trend={metrics.cpu.trend}
              />
            ) : (
              <LoadingCard title="CPU Usage" />
            )}
            {metrics.memory && metrics.memory.value !== undefined ? (
              <MetricCard
                title="Memory Usage"
                value={metrics.memory.value}
                unit={metrics.memory.unit}
                trend={metrics.memory.trend}
              />
            ) : (
              <LoadingCard title="Memory Usage" />
            )}
            {metrics.requestRate && metrics.requestRate.value !== undefined ? (
              <MetricCard
                title="Request Rate"
                value={metrics.requestRate.value}
                unit={metrics.requestRate.unit}
                trend={metrics.requestRate.trend}
              />
            ) : (
              <LoadingCard title="Request Rate" />
            )}
            {metrics.redisMemory && metrics.redisMemory.value !== undefined ? (
              <MetricCard
                title="Redis Memory"
                value={metrics.redisMemory.value}
                unit={metrics.redisMemory.unit}
                trend={metrics.redisMemory.trend}
              />
            ) : (
              <LoadingCard title="Redis Memory" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 