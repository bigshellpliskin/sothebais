/**
 * Schema Index
 * 
 * This file exports all schema components for easy importing throughout the application.
 * These schemas define the actual data storage structures, not just TypeScript types.
 */

// Redis Schema
export * from './redis/keys';
export * from './redis/models';

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