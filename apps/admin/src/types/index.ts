/**
 * Admin Types Index
 * 
 * This file re-exports all types from the shared package needed by the admin frontend.
 * This centralizes type definitions and helps maintain consistent imports.
 */

// Re-export all needed service types from the shared package
export type {
  ServiceStatus,
  ServiceMetrics,
  ServiceHealth,
  ServiceInfo,
  ServiceGroup,
  ServiceConfig
} from '@sothebais/shared/types/service';

// Re-export and extend the Service type to include port
import type { Service as SharedService } from '@sothebais/shared/types/service';
export interface Service extends SharedService {
  port?: number;
}

// Re-export stream types
export type {
  StreamState,
  StreamMetrics,
  SceneState
} from '@sothebais/shared/types/stream';

// Re-export auction types
export type {
  AuctionStatus,
  AuctionBid,
  AuctionState,
  MarathonConfig
} from '@sothebais/shared/types/auction';

// Re-export event types
export type {
  Event,
  EventType,
  EventListener,
  EventSource
} from '@sothebais/shared/types/events';

// Re-export SERVICES_CONFIG as CORE_SERVICES for backward compatibility
import { SERVICES_CONFIG } from '@sothebais/shared/types/service';
export { SERVICES_CONFIG as CORE_SERVICES };

// Admin-specific type extensions can be added here
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  permissions: string[];
}

export interface DashboardMetrics {
  cpu: {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  };
  memory: {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  };
  requestRate: {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  };
  redisMemory: {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service?: string;
  component?: string;
  data?: any;
} 