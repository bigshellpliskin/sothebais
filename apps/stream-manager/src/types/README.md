# Stream Manager Types

This directory contains types specific to the Stream Manager service. Most common types have been moved to the shared package to promote reuse across services.

## Type Organization

The types are organized as follows:

1. Common types are defined in `apps/shared/src/types/` 
2. The `index.ts` file in this directory re-exports types from the shared package with appropriate aliases for backward compatibility
3. Service-specific types and extensions are defined directly in the index.ts file

## How to Use Types

### For Stream Manager-Specific Components

When working in the Stream Manager service, import types from the local index:

```typescript
// This imports from the local types/index.ts which provides 
// all necessary types with the right aliases
import type { Config, Canvas, Transform, SceneEvent } from '../types/index.js';
```

### For Code That Might Be Shared Later

If you're writing code that might be shared with other services later, import directly from the shared package:

```typescript
// Import directly from the shared package
import type { StreamState, SceneState } from '@sothebais/shared/types/stream.js';
import type { Canvas, Transform } from '@sothebais/shared/types/scene.js';
```

## Type Import Pattern Changes

We've updated the type imports to match our new shared types structure:

1. **Scene Types**: Now imported directly from `scene.js` instead of using aliases
   ```typescript
   // Before
   import { SceneCanvas as Canvas } from '@sothebais/shared/types/index.js';
   
   // After
   import { Canvas } from '@sothebais/shared/types/scene.js';
   ```

2. **Config Types**: Continue to be imported from `config.js`
   ```typescript
   import { StreamConfig } from '@sothebais/shared/types/config.js';
   ```

3. **Service-Specific Types**: Now defined in the local index.ts
   ```typescript
   // These types are defined in the stream-manager/src/types/index.ts
   import { SceneEvent, StreamManagerEvent } from '../types/index.js';
   ```

## Global Type Declarations

The `global.d.ts` file remains in this directory for Stream Manager-specific global type augmentations.

## Troubleshooting Common Import Issues

If you encounter "Cannot find module" errors:

1. Make sure you're using the correct import path with `.js` extension
2. Check if the type is exported from the local index.ts or if you need to import from shared directly
3. Verify your `tsconfig.json` has the correct path aliases for `@sothebais/shared/*` 