export type ServiceStatus = 'running' | 'stopped' | 'error';

export interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  description: string;
  port?: number;
}

export interface ServiceGroup {
  name: string;
  services: ServiceInfo[];
}

export const CORE_SERVICES: ServiceGroup[] = [
  {
    name: 'Core Services',
    services: [
      {
        name: 'auction-manager',
        description: 'NFT Auction Core Service',
        port: 4100,
        status: 'stopped'
      },
      {
        name: 'event-handler',
        description: 'Event Orchestration Service',
        port: 4300,
        status: 'stopped'
      },
      {
        name: 'stream-manager',
        description: 'Stream Processing Service',
        port: 4200,
        status: 'stopped'
      },
      {
        name: 'shape-l2',
        description: 'Shape L2 Integration Service',
        port: 4000,
        status: 'stopped'
      },
      {
        name: 'eliza',
        description: 'ElizaOS VTuber Service',
        port: 4400,
        status: 'stopped'
      }
    ]
  },
  {
    name: 'Infrastructure',
    services: [
      {
        name: 'traefik',
        description: 'Reverse Proxy & Load Balancer',
        port: 80,
        status: 'stopped'
      },
      {
        name: 'redis',
        description: 'Cache & Message Queue',
        port: 6379,
        status: 'stopped'
      },
      {
        name: 'prometheus',
        description: 'Metrics Collection',
        port: 9090,
        status: 'stopped'
      },
      {
        name: 'grafana',
        description: 'Monitoring & Visualization',
        port: 3001,
        status: 'stopped'
      },
      {
        name: 'node-exporter',
        description: 'Host Metrics Exporter',
        port: 9100,
        status: 'stopped'
      }
    ]
  }
]; 