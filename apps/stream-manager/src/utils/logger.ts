/**
 * Logger for the Stream Manager Service
 * 
 * This module re-exports the shared logger with stream-manager specific configuration.
 */

import { createLogger } from '@sothebais/packages/utils/logger';
import type { Logger } from '@sothebais/packages/utils/logger';

// Type for log context metadata
export type LogContext = Record<string, unknown>;

// Create a logger instance specifically for the stream manager
export const logger: Logger = createLogger('stream-manager', {
  // Additional stream-manager specific configuration
  additionalMeta: {
    component: 'stream-manager'
  }
});

// Utility functions for stream-manager specific logging

/**
 * Log metrics with throttling to prevent excessive logging
 */
let lastMetricsLogTime = 0;
export function logMetrics(metrics: Record<string, any>): void {
  const now = Date.now();
  const metricsLogInterval = 10000; // Log metrics every 10 seconds
  
  if (now - lastMetricsLogTime >= metricsLogInterval) {
    logger.info('Performance metrics update', { type: 'metrics', ...metrics });
    lastMetricsLogTime = now;
  }
}

/**
 * Log layer-specific events
 */
export function logLayerEvent(event: string, layerId: string, data?: Record<string, any>): void {
  logger.debug('Layer event: ' + event, { 
    type: 'layer', 
    event, 
    layerId, 
    ...data 
  });
}

/**
 * Log stream-specific events
 */
export function logStreamEvent(event: string, data?: Record<string, any>): void {
  logger.info('Stream event: ' + event, { 
    type: 'stream', 
    event, 
    ...data 
  });
}

/**
 * Log WebSocket-specific events
 */
export function logWebSocketEvent(event: string, clientId?: string, data?: Record<string, any>): void {
  logger.debug('WebSocket event: ' + event, { 
    type: 'websocket', 
    event, 
    clientId, 
    ...data 
  });
}

// Re-export the Logger interface for type usage
export type { Logger }; 
