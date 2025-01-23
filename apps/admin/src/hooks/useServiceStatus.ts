import { useEffect, useCallback } from 'react';
import { useServiceStore } from '@/store/services';
import { ServiceStatus } from '@/types/service';

export function useServiceStatus() {
  const { setLoading, setError, updateAllStatuses } = useServiceStore();

  const fetchServiceStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/status');
      if (!response.ok) {
        throw new Error('Failed to fetch service statuses');
      }
      const data = await response.json();
      updateAllStatuses(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch service statuses');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, updateAllStatuses]);

  useEffect(() => {
    fetchServiceStatuses();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchServiceStatuses, 10000);
    return () => clearInterval(interval);
  }, [fetchServiceStatuses]);

  return { refetch: fetchServiceStatuses };
} 