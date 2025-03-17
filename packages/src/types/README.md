# Shared Types

This directory contains TypeScript type definitions used throughout the application.

## Type Organization

The types have been organized into logical domains in separate files:

- **core.ts**: Core primitive types
  - Basic utility types (Dictionary, ErrorResponse, SuccessResponse)
  - Common ID types (UUID, Timestamp)
  - Status types
  - Pagination types
  - Tree structure types

- **scene.ts**: Scene composition and animation types
  - Canvas and positioning
  - Animation and timeline
  - Scene structure and transitions
  - Core rendering service interfaces

- **stream.ts**: Stream state and management
  - Stream state
  - Preview clients
  - State management
  - Stream events

- **events.ts**: Event system
  - Event types and payloads
  - Event emitter interfaces

- **models.ts**: Data models
  - Database-oriented data structures
  - DTOs (Data Transfer Objects)

- **redis-models.ts**: Redis-specific models
  - Redis data structures
  - Cache representations

- **service.ts**: Service interfaces
  - Common service definitions
  - Service groups

- **twitter.ts**: Twitter integration
  - Twitter API types
  - Tweet structures

- **auction.ts**: Auction functionality
  - Auction-specific types
  - Bid structures

- **config.ts**: Configuration interfaces and schemas
  - System configuration components
  - Zod schemas for validation

## Resolving Type Conflicts

We've addressed the challenge of type conflicts between modules (particularly between stream.ts and config.ts) using these strategies:

1. **Single Source of Truth**: Each type is defined in exactly one file based on its domain
2. **Explicit Imports**: Files that need types from other domains import them explicitly
3. **Controlled Exports**: The index.ts file manages which exports come from which files
4. **Named Exports**: For domains with overlapping type names, we use named exports in index.ts

This approach ensures that developers can:
- Always know where a type is defined
- Avoid getting conflicts when importing from the index
- Import directly from specific files when more clarity is needed

## Type Naming and Export Methodology

### 1. Domain Separation

Types should be placed in the file that most closely matches their domain. This helps with discovering related types and avoiding duplication.

### 2. Export Strategy

We use the following export strategy in the `index.ts` file:

- Direct exports for files without naming conflicts: 
  ```typescript
  export * from './core.js';
  ```

- Named exports for files with potential conflicts:
  ```typescript
  // Stream types without the conflicting config types
  export type {
    StreamState,
    SceneState,
    PreviewClient,
    // ...other non-conflicting types
  } from './stream.js';

  // Configuration types that might conflict with stream.ts
  export type {
    StreamConfig,
    AudioConfig,
    RenderConfig,
    // ...other config types
  } from './config.js';
  ```

This approach allows us to avoid naming conflicts while maintaining a clear source of truth for each type. When used correctly:

1. Each type is defined in exactly one file
2. Files import types they need from other files
3. The index.ts file handles proper exports to avoid conflicts
4. Users can import from either index.ts or directly from specific files

### 3. Type Creation Guidelines

When creating new types:

- **Avoid Duplication**: Don't recreate types that already exist - reference them instead
- **Use Proper File**: Add new types to the most relevant file based on purpose
- **Document Types**: Add JSDoc comments for complex types
- **Follow Naming Conventions**: Use PascalCase for interfaces/types, and camelCase for properties
- **Consider Extensibility**: Design types to be extensible when appropriate

## Using Types Across Services

### Import Patterns

Always use the package-style import pattern:

```typescript
// Recommended: Import from the index
import type { UUID, Timestamp, PaginatedResponse } from '@sothebais/packages/types/index.js';

// Alternative: Import directly from specific file for better clarity
import type { Scene, SceneTransition } from '@sothebais/packages/types/scene.js';
```

### Important Rules

1. **Always Include .js Extension**: Even for TypeScript files, use `.js` extension in imports
   ```typescript
   // Correct
   import type { UUID } from '@sothebais/packages/types/core.js';
   
   // Incorrect
   import type { UUID } from '@sothebais/packages/types/core';
   ```

2. **Use `type` Import When Possible**: For types-only imports, use the `type` keyword
   ```typescript
   // Preferred for type-only imports
   import type { Scene } from '@sothebais/packages/types/scene.js';
   ```

3. **Avoid Relative Paths**: Use package-style imports rather than relative paths
   ```typescript
   // Good
   import type { StreamState } from '@sothebais/packages/types/stream.js';
   
   // Avoid
   import type { StreamState } from '../../../shared/types/stream.js';
   ```

## Type Extension Pattern

When a service needs to extend a shared type with service-specific properties:

```typescript
// In service-specific types file
import type { StreamState } from '@sothebais/packages/types/stream.js';

// Extend with service-specific properties
export interface ServiceStreamState extends StreamState {
  serviceSpecificProperty: string;
}
```

## Troubleshooting Type Issues

If you encounter "Cannot find module" or type resolution issues:

1. Make sure the shared package is built
2. Check that you're using the correct import path with `.js` extension
3. Verify your `tsconfig.json` has the correct path aliases configured
4. Use explicit type imports with the `type` keyword 