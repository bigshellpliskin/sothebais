import { create } from 'zustand';
import { ServiceGroup, ServiceInfo, ServiceStatus, CORE_SERVICES } from '@/types';

interface ServiceState {
  serviceGroups: ServiceGroup[];
  isLoading: boolean;
  error: string | null;
  updateServiceStatus: (serviceName: string, status: ServiceStatus) => void;
  updateAllStatuses: (statuses: Record<string, ServiceStatus>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  serviceGroups: CORE_SERVICES,
  isLoading: false,
  error: null,

  updateServiceStatus: (serviceName: string, status: ServiceStatus) =>
    set((state) => ({
      serviceGroups: state.serviceGroups.map((group) => ({
        ...group,
        services: group.services.map((service) =>
          service.name === serviceName ? { ...service, status } : service
        ),
      })),
    })),

  updateAllStatuses: (statuses: Record<string, ServiceStatus>) =>
    set((state) => ({
      serviceGroups: state.serviceGroups.map((group) => ({
        ...group,
        services: group.services.map((service) => ({
          ...service,
          status: statuses[service.name] || 'STOPPED',
        })),
      })),
    })),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
})); 