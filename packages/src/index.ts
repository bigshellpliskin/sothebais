/**
 * Shared Package Index
 * 
 * Exports all shared components, utilities, and types for use across services.
 */

// Export all types through the types index
export * from './types/index.js';

// Export utilities
export * from './utils/logger.js';
export * from './utils/events.js';
export * from './utils/validation.js';
export * from './utils/websocket-client.js';
export * from './utils/http-client.js';

// Export schema models - ensure these don't conflict with type exports
export * as RedisModels from './schema/redis/models.js';

// Add other exports as needed as the project grows 