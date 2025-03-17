/**
 * Logger for the Auction Engine
 * 
 * This module re-exports the shared logger with auction-engine specific configuration.
 */

import { createLogger } from '@sothebais/packages/utils/logger.js';
import type { Logger } from '@sothebais/packages/utils/logger.js';

// Create a logger instance specifically for the auction engine
export const logger: Logger = createLogger('auction-engine', {
  // Additional auction-engine specific configuration can go here
  additionalMeta: {
    component: 'auction-engine'
  }
});

// Re-export the Logger interface for type usage
export type { Logger }; 