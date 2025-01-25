import { useEffect, useCallback } from 'react';
import { useServiceStore } from '@/store/services';
import { ServiceStatus } from '@/types/service';
import { useAuth } from '@clerk/nextjs';

export function useServiceStatus() {
  const { setLoading, setError, updateAllStatuses } = useServiceStore();
  const { getToken } = useAuth();

  const fetchServiceStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('/api/services/status', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
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
  }, [setLoading, setError, updateAllStatuses, getToken]);

  useEffect(() => {
    fetchServiceStatuses();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchServiceStatuses, 10000);
    return () => clearInterval(interval);
  }, [fetchServiceStatuses]);

  return { refetch: fetchServiceStatuses };
} 