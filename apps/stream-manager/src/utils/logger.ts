/**
 * Logger for the Stream Manager Service
 * 
 * This module extends the shared logger with stream-manager-specific functionality.
 */

import { createLogger } from '@sothebais/shared/utils/logger.js';
import type { Logger as BaseLogger } from '@sothebais/shared/utils/logger.js';

// Extend the Logger interface with stream-manager specific methods
export interface Logger extends BaseLogger {
  logMetrics(metrics: Record<string, any>): void;
  logLayerEvent(event: string, layerId: string, data?: Record<string, any>): void;
  logStreamEvent(event: string, data?: Record<string, any>): void;
  logWebSocketEvent(event: string, clientId?: string, data?: Record<string, any>): void;
  _lastMetricsLog: number; // Track the last time metrics were logged
}

// Create a base logger instance for the stream manager
const baseLogger = createLogger('stream-manager', {
  additionalMeta: {
    component: 'stream-manager'
  }
});

// Create an extended logger with specialized methods
export const logger: Logger = {
  ...baseLogger,
  
  // Metrics logging (throttled to avoid excessive logs)
  logMetrics(metrics: Record<string, any>): void {
    const now = Date.now();
    const metricsLogInterval = 10000; // Log metrics every 10 seconds
    
    if (now - this._lastMetricsLog >= metricsLogInterval) {
      this.info('Performance metrics update', { type: 'metrics', ...metrics });
      this._lastMetricsLog = now;
    }
  },

  // Layer event logging
  logLayerEvent(event: string, layerId: string, data?: Record<string, any>): void {
    this.debug('Layer event: ' + event, { 
      type: 'layer', 
      event, 
      layerId, 
      ...data 
    });
  },

  // Stream event logging
  logStreamEvent(event: string, data?: Record<string, any>): void {
    this.info('Stream event: ' + event, { 
      type: 'stream', 
      event, 
      ...data 
    });
  },

  // WebSocket event logging
  logWebSocketEvent(event: string, clientId?: string, data?: Record<string, any>): void {
    this.debug('WebSocket event: ' + event, { 
      type: 'websocket', 
      event, 
      clientId, 
      ...data 
    });
  },
  
  // Initialize the metrics tracking time
  _lastMetricsLog: 0
}; 
