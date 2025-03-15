/**
 * Schema Index
 * 
 * This file exports all schema components for easy importing throughout the application.
 * These schemas define the actual data storage structures, not just TypeScript types.
 */

// Database initialization utilities
export * from './db-init.js';

// Redis Schema
export * from './redis/models.js';
// Uncomment once keys.js is properly migrated
// export * from './redis/keys.js';

// Prisma Schema
// Note: Prisma client is typically imported directly from @prisma/client
// This is just a re-export for convenience
// Uncomment this line after installing @prisma/client
// export { PrismaClient } from '@prisma/client';

/**
 * Schema Documentation
 * 
 * This project uses a hybrid data storage approach:
 * 
 * 1. PostgreSQL (via Prisma)
 *    - Persistent data storage
 *    - Complex relationships
 *    - Historical records
 *    - User data
 *    - Auction history
 * 
 * 2. Redis
 *    - Real-time state
 *    - Caching
 *    - Pub/Sub messaging
 *    - Temporary data
 * 
 * 3. File System
 *    - Asset storage (images, videos, etc.)
 *    - Logs
 *    - Temporary files
 * 
 * Data Flow:
 * - Real-time data flows through Redis
 * - Persistent data is stored in PostgreSQL
 * - Events are used for communication between services
 * - File assets are stored on disk and referenced by path
 * 
 * Note: TypeScript types for development are defined separately in the 'types' directory.
 * These schemas define the actual data storage structures and are used at runtime.
 */

/**
 * Schema Exports
 * 
 * Exports database schema related models, types, and utilities.
 */

// Add Prisma models or other data access exports as needed 