import { useQuery } from '@tanstack/react-query';
import { ServiceStatus, ServiceHealth, ServiceMetrics } from '@/types/service';
import { CORE_SERVICES } from '@/types/service';

interface ServiceStatuses {
  [key: string]: Omit<ServiceHealth, 'lastCheck'> & {
    lastCheck: string;
  };
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
        // Ensure query is a plain object before stringifying
        const plainQuery = { query: String(query) };
        const response = await fetch('/api/services/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainQuery)
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.value !== undefined) {
            // Ensure numeric values are properly formatted
            results[metric] = Number(parseFloat(data.value).toFixed(2));
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${metric} for ${serviceName}:`, error);
      }
    })
  );

  // Ensure we return a plain object with primitive values
  return Object.fromEntries(
    Object.entries(results).map(([key, value]) => [
      key,
      typeof value === 'number' ? Number(value) : 0
    ])
  );
}

async function fetchServiceStatuses(): Promise<ServiceStatuses> {
  const upResponse = await fetch('/api/services/status', {
    next: { revalidate: 0 }
  });
  
  if (!upResponse.ok) {
    throw new Error('Failed to fetch service statuses');
  }
  
  const basicStatuses = await upResponse.json();
  const detailedStatuses: { [key: string]: ServiceHealth } = {};
  
  await Promise.all(
    Object.entries(basicStatuses).map(async ([serviceName, status]) => {
      const serviceInfo = CORE_SERVICES
        .flatMap(group => group.services)
        .find(s => s.name === serviceName);

      if (!serviceInfo) return;

      const metrics = await fetchServiceMetrics(serviceName, serviceInfo.port || 0);
      
      // Create a new plain object with primitive values
      detailedStatuses[serviceName] = {
        status: String(status) as ServiceStatus,
        metrics: Object.fromEntries(
          Object.entries(metrics).map(([key, value]) => [
            key,
            typeof value === 'number' ? Number(value) : 0
          ])
        ),
        lastCheck: new Date().toISOString(),
        message: metrics.errorRate !== undefined
          ? `Error rate: ${(Number(metrics.errorRate) * 100).toFixed(2)}%` 
          : undefined
      };
    })
  );

  // Return a plain object with primitive values
  return JSON.parse(JSON.stringify(detailedStatuses));
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['serviceStatus'],
    queryFn: fetchServiceStatuses,
    refetchInterval: 10000,
    retry: 3,
    select: (data) => {
      // Ensure we return a new plain object with all properties
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          {
            status: value.status,
            metrics: { ...value.metrics },
            lastCheck: value.lastCheck,
            message: value.message
          }
        ])
      );
    },
  });
} 