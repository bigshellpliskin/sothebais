# Event Handler TypeScript Conversion

This service has been converted from JavaScript to TypeScript to provide better type safety and integration with the other TypeScript services in the monorepo.

## Changes Made

1. Added TypeScript configuration (`tsconfig.json`) that extends from the root `tsconfig.base.json`
2. Updated dependencies in `package.json` to include TypeScript and type definitions
3. Configured the package to use ECMAScript Modules (ESM) by adding `"type": "module"` to package.json
4. Converted JavaScript files to TypeScript with ESM imports:
   - `src/index.js` → `src/index.ts`
   - `src/utils/logger.js` → `src/utils/logger.ts`
   - `src/middleware/metrics.js` → `src/middleware/metrics.ts`
   - `src/events/router.js` → `src/events/router.ts`
5. Updated the Dockerfile to build TypeScript code
6. Added ESLint configuration for TypeScript linting

## TypeScript Configuration

The service uses the shared base TypeScript configuration with minimal service-specific overrides:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

## Dependencies Management

This service carefully manages its dependencies to ensure compatibility and maintainability.

### TypeScript Type Definitions

When adding new dependencies, follow these guidelines:

1. **Check if the library provides its own types first**:
   - Some libraries like `pino` provide their own type definitions
   - Installing `@types/*` packages for these libraries is unnecessary and can lead to conflicts

2. **Current examples**:
   - ✅ **Use library types**: pino, ESLint plugins
   - ✅ **Use @types**: express, cors, dockerode, node

### ESLint Configuration

We use ESLint 8.x due to compatibility issues with ESLint 9.x and TypeScript-ESLint packages:

1. **Configuration file**: We use the classic `.eslintrc.json` format
   ```json
   {
     "extends": [
       "eslint:recommended",
       "plugin:@typescript-eslint/recommended"
     ],
     // additional configuration...
   }
   ```

2. **Troubleshooting ESLint issues**:
   - If you encounter dependency conflicts, use `npm run reinstall` to clean and reinstall dependencies
   - Ensure ESLint version matches what's specified in package.json (currently 8.56.0)

### Utility Libraries

Avoid deprecated packages:
   - **rimraf**: Use v4 or later, or use Node.js's built-in `fs.rm` with the recursive option
   - **glob**: Use v9 or later, or alternatives like `fast-glob` or `globby`
   - **inflight**: Avoid due to memory leaks - consider `lru-cache` or other alternatives

### Maintenance Practices

Regular dependency maintenance:

1. **Quarterly audits**:
   ```bash
   npm audit
   npm outdated
   ```

2. **Review warnings during installation**:
   ```bash
   npm install --no-fund --loglevel=warn
   ```

3. **Update strategy**:
   - Minor versions: Update regularly (monthly)
   - Major versions: Test thoroughly before upgrading

4. **Monorepo considerations**:
   - Consider if dependencies could be moved to shared packages
   - Maintain consistent versions across services
   - Keep development dependencies at the service level

## Module System

This service uses ECMAScript Modules (ESM) which is the modern JavaScript module system:

1. Package.json includes `"type": "module"`
2. Import statements use ESM syntax: `import express from 'express'`
3. File extensions are included in imports: `import { something } from './file.js'`
4. TypeScript is configured to use `NodeNext` module system (from base config)

## Building and Running

### Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reloading
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Run the compiled JavaScript
npm start
```

### Docker

The Dockerfile has been updated to include a build stage that compiles TypeScript to JavaScript before creating the production image.

```bash
# Build Docker image
docker build -t event-handler .

# Run Docker container
docker run -p 4300:4300 -p 4301:4301 -p 4390:4390 -p 4391:4391 event-handler
```

## Integration with CI/CD

The CI/CD workflows already use Dockerfiles for building, so they will automatically use the updated TypeScript build process without any changes needed to the workflows themselves.

## Type Safety Benefits

Converting to TypeScript provides several benefits:

1. Type checking for function parameters and return values
2. Better IDE support with autocompletion
3. Early detection of potential errors
4. Documentation through type definitions

The service can now also more easily integrate with the shared types from the `@sothebais/packages` package if needed.

## Linting

For details on current linting issues and best practices, see [LINTING.md](./LINTING.md).

## TypeScript Conversion for Event Handler Service

This document outlines the steps and considerations for converting the Event Handler service from JavaScript to TypeScript.

## Changes Made

- Added TypeScript configuration file (`tsconfig.json`)
- Updated dependencies to include TypeScript and related ESLint plugins
- Added type declarations for key interfaces and functions
- Converted JavaScript files to TypeScript (.js → .ts)
- Updated ESLint configuration for TypeScript support
- Added documentation for TypeScript-specific features and patterns

## TypeScript Configuration

The TypeScript configuration is defined in `tsconfig.json` at the root of the project. Key settings include:

- Target: ES2020
- Module: CommonJS
- Strict type checking enabled
- Source maps for debugging
- Types imported from `@types` packages where available

## Dependencies Management

We've updated the project dependencies to include:

- TypeScript as a development dependency
- `@types/*` packages for third-party libraries
- TypeScript-compatible ESLint plugins

> ⚠️ **Note**: See the "Dependency Conflicts" section below if you encounter package installation issues.

## ESLint Configuration

The project uses ESLint 8.x with TypeScript integration. We chose this version due to compatibility issues with ESLint 9.x.

### Configuration Setup

The ESLint configuration is defined in `.eslintrc.json` and includes:

- Parser: `@typescript-eslint/parser`
- Plugins: `@typescript-eslint`
- Rules tailored for TypeScript, with strict type checking

### Troubleshooting Dependency Conflicts

If you encounter issues with ESLint dependencies:

1. Ensure you're using ESLint 8.x (not 9.x)
2. Check compatibility between TypeScript-ESLint packages
3. If needed, clean and reinstall dependencies:
   ```
   npm run clean:install
   ```

## Common TypeScript Patterns Used

### Package Import Workarounds

Some packages may require special import patterns with TypeScript:

#### Pino Logger

The pino logger package requires using CommonJS require pattern for correct typing:

```typescript
// Use CommonJS require pattern which is more compatible with how pino is built
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pino = require('pino');

// Then use pino as normal
const logger = pino({
  // options
});
```

### Type Definitions

We've created type definitions for:
- Event payloads
- Configuration objects
- Request/response structures

Located primarily in dedicated `.d.ts` files or at the top of relevant modules.

## Utility Libraries

For consistent typing across the codebase, we recommend:

- Using utility types from TypeScript (e.g., `Partial<T>`, `Pick<T>`)
- Creating shared interfaces for common structures
- Using dependency injection patterns to make testing easier
- Standardizing error handling with typed error classes

## Maintenance

### Regular Dependency Audits

Perform regular checks of dependencies for compatibility:

```
npm audit
npm outdated
```

### TypeScript Version

Current TypeScript version: 5.8.2

## Module System

The project uses CommonJS modules (require/module.exports) for Node.js compatibility.

## Building and Running

### Development

```bash
npm run build:dev
npm run start:dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t event-handler:latest .
docker run -p 3000:3000 event-handler:latest
```

## Integration with CI/CD

TypeScript compilation is part of the CI/CD pipeline:

1. Linting (ESLint with TypeScript rules)
2. Type checking (tsc)
3. Testing (with type coverage)
4. Building (transpiling to JavaScript)

## Type Safety Benefits

TypeScript provides several benefits:
- Catch errors during development instead of runtime
- Better IDE support with autocomplete and inline documentation
- Self-documenting code with explicit types
- Safer refactoring with compiler checking changes

## Linting

For details on linting practices and common issues, see [LINTING.md](./LINTING.md). 