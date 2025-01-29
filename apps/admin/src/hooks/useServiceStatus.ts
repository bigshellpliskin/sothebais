import { useQuery } from '@tanstack/react-query';
import { ServiceStatus, ServiceHealth, ServiceMetrics } from '@/types/service';
import { CORE_SERVICES } from '@/types/service';

interface ServiceStatuses {
  [key: string]: Omit<ServiceHealth, 'lastCheck'> & {
    lastCheck: string;
  };
}

async function fetchServiceMetrics(serviceName: string, port: number): Promise<Partial<ServiceMetrics>> {
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

  const results: Partial<ServiceMetrics> = {};
  
  await Promise.all(
    Object.entries(queries).map(async ([metric, query]) => {
      try {
        const response = await fetch('/api/services/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: String(query) })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (typeof data.value === 'number' || typeof data.value === 'string') {
            const numValue = Number(data.value);
            if (!isNaN(numValue)) {
              results[metric as keyof ServiceMetrics] = Number(numValue.toFixed(2));
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${metric} for ${serviceName}:`, error);
      }
    })
  );

  // Ensure we return a plain object with only numbers
  return Object.fromEntries(
    Object.entries(results).map(([key, value]) => [
      key,
      typeof value === 'number' ? Number(value.toFixed(2)) : 0
    ])
  ) as Partial<ServiceMetrics>;
}

async function fetchServiceStatuses(): Promise<ServiceStatuses> {
  try {
    const upResponse = await fetch('/api/services/status', {
      next: { revalidate: 0 }
    });
    
    if (!upResponse.ok) {
      throw new Error('Failed to fetch service statuses');
    }
    
    const basicStatuses = await upResponse.json();
    const detailedStatuses: Record<string, ServiceHealth> = {};
    
    await Promise.all(
      Object.entries(basicStatuses).map(async ([serviceName, status]) => {
        const serviceInfo = CORE_SERVICES
          .flatMap(group => group.services)
          .find(s => s.name === serviceName);

        if (!serviceInfo) return;

        const metrics = await fetchServiceMetrics(serviceName, serviceInfo.port || 0);
        
        // Ensure we create a plain object with only serializable data
        detailedStatuses[serviceName] = {
          status: String(status) as ServiceStatus,
          metrics: Object.fromEntries(
            Object.entries(metrics).map(([key, value]) => [
              key,
              typeof value === 'number' ? Number(value.toFixed(2)) : 0
            ])
          ),
          lastCheck: new Date().toISOString(),
          message: metrics.errorRate !== undefined
            ? `Error rate: ${(Number(metrics.errorRate) * 100).toFixed(2)}%` 
            : ''
        };
      })
    );

    // Convert to a plain object and back to ensure no class instances
    return JSON.parse(JSON.stringify(detailedStatuses));
  } catch (error) {
    console.error('Error fetching service statuses:', error);
    throw error;
  }
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['serviceStatus'],
    queryFn: fetchServiceStatuses,
    refetchInterval: 10000,
    retry: 3,
    select: (data) => {
      // Ensure we return a new plain object with all properties
      const plainData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          {
            status: String(value.status),
            metrics: { ...value.metrics },
            lastCheck: String(value.lastCheck),
            message: String(value.message || '')
          }
        ])
      );
      return plainData;
    },
  });
} 