/**
 * Logger for the Admin Service
 * 
 * This module re-exports the shared logger with admin-specific configuration.
 */

import { createLogger } from '@sothebais/shared/utils/logger';
import type { Logger } from '@sothebais/shared/utils/logger';

// Create a logger instance specifically for the admin service
export const logger: Logger = createLogger('admin', {
  // Additional admin-specific configuration can go here
  additionalMeta: {
    component: 'admin'
  }
});

// Re-export the Logger interface for type usage
export type { Logger }; 