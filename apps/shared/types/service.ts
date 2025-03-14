/**
 * Service Types
 * 
 * Contains types related to service management, status, and metrics
 */

export type ServiceStatus = 'running' | 'stopped' | 'error';

export interface ServiceMetrics {
  requestRate: number;      // Requests per second
  errorRate: number;        // Errors per second
  cpuUsage: number;        // CPU usage percentage
  memoryUsage: number;     // Memory usage in MB
  uptime: number;          // Uptime in seconds
  lastReload: number;      // Last config reload timestamp (for Traefik)
  connectionCount: number; // Active connections (for Redis/DBs)
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
  services: ServiceInfo[];
}

// Core services definition moved from admin to shared
export const CORE_SERVICES: ServiceGroup[] = [
  {
    name: 'Core Services',
    services: [
      {
        name: 'auction-manager',
        description: 'NFT Auction Core Service',
        port: 4100
      },
      {
        name: 'event-handler',
        description: 'Event Orchestration Service',
        port: 4300
      },
      {
        name: 'stream-manager',
        description: 'Stream Processing Service',
        port: 4200
      },
      {
        name: 'shape-l2',
        description: 'Shape L2 Integration Service',
        port: 4000
      },
      {
        name: 'eliza',
        description: 'ElizaOS VTuber Service',
        port: 4400
      }
    ]
  },
  {
    name: 'Infrastructure',
    services: [
      {
        name: 'traefik',
        description: 'Reverse Proxy & Load Balancer',
        port: 80
      },
      {
        name: 'redis',
        description: 'Cache & Message Queue',
        port: 6379
      },
      {
        name: 'prometheus',
        description: 'Metrics Collection',
        port: 9090
      },
      {
        name: 'grafana',
        description: 'Monitoring & Visualization',
        port: 3001
      },
      {
        name: 'node-exporter',
        description: 'Host Metrics Exporter',
        port: 9100
      }
    ]
  }
]; 