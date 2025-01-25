import { useQuery } from '@tanstack/react-query';
import { ServiceStatus, ServiceHealth, ServiceMetrics } from '@/types/service';

interface ServiceStatuses {
  [key: string]: ServiceHealth;
}

async function fetchServiceMetrics(serviceName: string, port: number): Promise<ServiceMetrics> {
  const queries = {
    requestRate: `rate(http_request_duration_seconds_count{instance="${serviceName}:${port}"}[1m])`,
    errorRate: `rate(http_request_duration_seconds_count{instance="${serviceName}:${port}",code=~"5.."}[1m])`,
    cpuUsage: `rate(process_cpu_seconds_total{instance="${serviceName}:${port}"}[1m]) * 100`,
    memoryUsage: `process_resident_memory_bytes{instance="${serviceName}:${port}"} / 1024 / 1024`,
    uptime: `process_start_time_seconds{instance="${serviceName}:${port}"}`,
  };

  // Add service-specific metrics
  if (serviceName === 'traefik') {
    queries['lastReload'] = 'traefik_config_last_reload_success';
  } else if (serviceName === 'redis') {
    queries['connectionCount'] = 'redis_connected_clients';
  }

  const results: ServiceMetrics = {};
  
  await Promise.all(
    Object.entries(queries).map(async ([metric, query]) => {
      try {
        const response = await fetch('/api/services/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.value !== undefined) {
            results[metric] = data.value;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${metric} for ${serviceName}:`, error);
      }
    })
  );

  return results;
}

async function fetchServiceStatuses(): Promise<ServiceStatuses> {
  // First get basic up/down status
  const upResponse = await fetch('/api/services/status', {
    next: { revalidate: 0 }
  });
  
  if (!upResponse.ok) {
    throw new Error('Failed to fetch service statuses');
  }
  
  const basicStatuses = await upResponse.json();
  const detailedStatuses: ServiceStatuses = {};
  
  // Fetch detailed metrics for each service
  await Promise.all(
    Object.entries(basicStatuses).map(async ([serviceName, status]) => {
      const serviceInfo = CORE_SERVICES
        .flatMap(group => group.services)
        .find(s => s.name === serviceName);

      if (!serviceInfo) return;

      const metrics = await fetchServiceMetrics(serviceName, serviceInfo.port || 0);
      
      detailedStatuses[serviceName] = {
        status: status as ServiceStatus,
        metrics,
        lastCheck: Date.now(),
        message: metrics.errorRate ? `Error rate: ${(metrics.errorRate * 100).toFixed(2)}%` : undefined
      };
    })
  );

  return detailedStatuses;
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['serviceStatus'],
    queryFn: fetchServiceStatuses,
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3,
  });
} 