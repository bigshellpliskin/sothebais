/**
 * Service Types
 * 
 * Contains types related to service management, status, and metrics
 */

export type ServiceStatus = 'RUNNING' | 'STOPPED' | 'ERROR' | 'UNKNOWN';

export interface ServiceMetrics {
  uptime: number;
  memory: number;
  cpu: number;
  [key: string]: number;
}

export interface ServiceConfig {
  enabled: boolean;
  [key: string]: any;
}

export interface ServiceHealth {
  status: ServiceStatus;
  metrics: Partial<ServiceMetrics>;  // Make metrics partial since not all services have all metrics
  lastCheck: string;        // ISO timestamp string
  message: string;         // Status message, empty string if none
}

export interface ServiceInfo {
  name: string;
  description: string;
  port?: number;
}

export interface ServiceGroup {
  name: string;
  services: Service[];
}

export interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
  metrics?: ServiceMetrics;
  config?: ServiceConfig;
}

// Core services configuration
const CORE_SERVICES: ServiceGroup[] = [
  {
    name: 'Auction Services',
    services: [
      {
        name: 'auction-engine',
        description: 'Manages auction state and processes bids',
        status: 'UNKNOWN'
      },
      {
        name: 'event-handler',
        description: 'Handles event processing and routing',
        status: 'UNKNOWN'
      }
    ]
  },
  {
    name: 'Stream Services',
    services: [
      {
        name: 'stream-manager',
        description: 'Manages RTMP streams and encoding',
        status: 'UNKNOWN'
      },
      {
        name: 'rtmp-server',
        description: 'Handles RTMP connections and streaming',
        status: 'UNKNOWN'
      }
    ]
  },
  {
    name: 'Frontend Services',
    services: [
      {
        name: 'admin',
        description: 'Admin dashboard and control panel',
        status: 'UNKNOWN'
      }
    ]
  }
];

// Export CORE_SERVICES but in ESM-compatible way
export { CORE_SERVICES as SERVICES_CONFIG }; 