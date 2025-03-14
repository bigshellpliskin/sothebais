# Linting Guidelines for Event Handler

## ESLint Configuration

This project uses ESLint 8.x with TypeScript-ESLint integration to enforce code quality standards. The configuration is in `.eslintrc.json` and is set up with the following key features:

- TypeScript-specific rules with `@typescript-eslint/recommended`
- Modern ECMAScript support (ES2022)
- Node.js environment configuration
- Warnings for any usage of the `any` type

## Current Linting Issues

The linter currently flags the following issues that should be addressed:

### Errors:

1. **Unused variables and imports**:
   - `metricsEndpoint` is imported but never used
   - `next` parameter is defined but never used in error handler
   - `broadcastEvent` function is defined but never used

2. **Prefer `const` over `let` when variable isn't reassigned**:
   - `redisConnectionState` should use `const` instead of `let`

### Warnings:

1. **Use of `any` type**:
   - Several instances of `any` type should be replaced with more specific types
   - In `CustomTransport` interface in logger.ts
   - In various parameters throughout index.ts and router.ts

## How to Fix

You can address these issues by:

1. **Running automatic fixes**:
   ```bash
   npm run lint -- --fix
   ```

2. **Manually addressing remaining issues**:
   - Remove unused imports and variables or add `// eslint-disable-next-line` comments if they're needed for future use
   - Replace `any` types with more specific types where possible
   - Change `let` to `const` where variables aren't reassigned

## ESLint Version Management

If you encounter issues with ESLint dependencies or configuration:

1. **Verify your ESLint version**:
   ```bash
   npm list eslint
   ```
   
2. **If you see version conflicts**, reinstall dependencies:
   ```bash
   npm run reinstall
   ```
   
3. **If needed, force a specific ESLint version**:
   ```bash
   npm install eslint@8.56.0 --save-exact
   ```

## Good Practices for Maintaining Clean Code

1. **Run the linter before committing**:
   ```bash
   npm run lint
   ```

2. **Consider adding a pre-commit hook**:
   - Use husky and lint-staged to automatically lint files before commit

3. **Gradually improve code quality**:
   - Address linting issues in each file you modify
   - Set periodic code quality improvement sessions

4. **Update linting rules as needed**:
   - Revisit `.eslintrc.json` periodically to ensure rules match team standards
   - Consider adding more type safety rules as the codebase matures

## Common TypeScript Issues and Solutions

### Pino Logger Import Issue

The project encountered an issue with the pino logger TypeScript integration. The error was:
```
This expression is not callable. Type 'typeof import("/home/sal/pliskin/sothebais/node_modules/pino/pino")' has no call signatures.
```

This was resolved by using CommonJS require pattern instead of ESM imports:

```typescript
// Use CommonJS require pattern which is more compatible with how pino is built
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pino = require('pino');

// Then use pino as normal
const logger = pino({
  // options
});
```

## ESLint Version Management

The project currently uses ESLint 8.x due to compatibility issues with ESLint 9.x. If you need to verify or reinstall:

1. Check the current ESLint version:
   ```bash
   npx eslint --version
   ```

2. If needed, reinstall dependencies with the correct version:
   ```bash
   npm run clean:install
   ```

3. If forced to use a specific ESLint version:
   ```bash
   npm install eslint@8.56.0 --save-dev
   ```

## Good Practices for Maintaining Clean Code

- Run the linter before committing: `npm run lint`
- Consider adding a pre-commit hook to run the linter automatically
- Gradually improve code quality by fixing linting issues in batches
- Update linting rules as the project evolves to maintain code quality 