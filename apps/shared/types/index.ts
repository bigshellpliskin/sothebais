/**
 * Types Index
 * 
 * This file exports all TypeScript types used throughout the application.
 * These are type definitions for development and don't represent actual database schemas.
 */

// Stream Types
export * from './stream';

// Event Types
export * from './events';

// Model Types
export * from './models';

/**
 * Type Documentation
 * 
 * This project uses TypeScript types for:
 * 
 * 1. Runtime Type Safety
 *    - Ensuring correct data structures during development
 *    - Providing autocompletion and documentation
 *    - Catching type errors at compile time
 * 
 * 2. API Contracts
 *    - Defining the shape of API requests and responses
 *    - Ensuring consistent data exchange between services
 * 
 * 3. Event Definitions
 *    - Standardizing event structures
 *    - Providing type safety for event handlers
 * 
 * 4. Model Interfaces
 *    - Providing type-safe access to database models
 *    - Defining DTOs for API responses
 * 
 * These types are separate from the actual database schemas defined in:
 * - Prisma schema (PostgreSQL)
 * - Redis models
 * 
 * While there is often overlap between types and schemas, they serve different purposes:
 * - Types: Development-time type checking and documentation
 * - Schemas: Runtime data validation and storage structure
 */ 