/**
 * Logger for the Event Handler Service
 * 
 * This module re-exports the shared logger with event-handler-specific configuration.
 */

import { createLogger } from '@sothebais/shared/utils/logger.js';
import type { Logger } from '@sothebais/shared/utils/logger.js';

// Create a logger instance specifically for the event handler service
export const logger: Logger = createLogger('event-handler', {
  // Additional event-handler-specific configuration can go here
  additionalMeta: {
    component: 'event-handler'
  }
});

// Re-export the Logger interface for type usage
export type { Logger }; 