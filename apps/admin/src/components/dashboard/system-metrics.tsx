"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, Minus, Server, Box, Activity, Cpu, HardDrive, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusCard } from "@/components/ui/status-card";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { CORE_SERVICES, ServiceGroup, Service } from "@/types";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

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
  const { data: services, isLoading: servicesLoading } = useServiceStatus();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSystemConnected, setIsSystemConnected] = useState<boolean>(false);

  useEffect(() => {
    // Internet connection status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // System connection status
    setIsSystemConnected(allServices.some(([_, health]) => health.status === 'running'));
  }, [services]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/services/metrics");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.collected_at) {
          throw new Error('Invalid metrics data');
        }
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
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate service statistics from React Query data
  const allServices = Object.entries(services || {});
  const runningServices = allServices.filter(([_, health]) => health.status === 'running');
  const errorServices = allServices.filter(([_, health]) => health.status === 'error');
  const systemLoad = Math.min(100, Math.round((runningServices.length / allServices.length) * 100));

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
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Real-time system performance and service status</CardDescription>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">Internet</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${isSystemConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">System</span>
              </div>
            </div>
          </div>
          <UserButton />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Service Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusCard
              title="Active Services"
              value={`${runningServices.length}/${allServices.length}`}
              icon={Server}
              loading={servicesLoading}
            />
            <StatusCard
              title="Services in Error"
              value={errorServices.length.toString()}
              icon={Box}
              loading={servicesLoading}
            />
            <StatusCard
              title="System Load"
              value={`${systemLoad}%`}
              icon={Activity}
              loading={servicesLoading}
            />
          </div>

          {/* System Metrics */}
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

          {/* Service Groups */}
          <div className="grid grid-cols-2 gap-6">
            {CORE_SERVICES.map((group: ServiceGroup) => (
              <div key={group.name} className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold whitespace-nowrap">{group.name}</h3>
                  <div className="h-px bg-gray-200 flex-grow" />
                </div>
                <div className="space-y-1">
                  {group.services.map((service: Service) => {
                    const health = services?.[service.name];
                    const status = health?.status || 'stopped';
                    const metrics = health?.metrics || {};

                    return (
                      <div
                        key={service.name}
                        className="bg-white/50 rounded px-2 py-1.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div 
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              status === 'running' ? 'bg-green-500' :
                              status === 'error' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{service.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{service.description}</p>
                            {status === 'running' && metrics && (
                              <div className="flex gap-2 mt-1">
                                {metrics['cpuUsage'] !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Cpu className="w-3 h-3" />
                                    <span className="text-[10px] text-gray-500">
                                      {metrics['cpuUsage'].toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                                {metrics['memoryUsage'] !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" />
                                    <span className="text-[10px] text-gray-500">
                                      {metrics['memoryUsage'].toFixed(1)}MB
                                    </span>
                                  </div>
                                )}
                                {metrics['requestRate'] !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Network className="w-3 h-3" />
                                    <span className="text-[10px] text-gray-500">
                                      {metrics['requestRate'].toFixed(1)}req/s
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {health?.message && (
                              <p className="text-[10px] text-red-500 mt-1">{health.message}</p>
                            )}
                          </div>
                        </div>
                        <div className={`ml-2 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${
                          status === 'running' ? 'bg-green-100 text-green-800' :
                          status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 