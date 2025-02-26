# SothebAI's Development Guide

## Build & Test Commands
- **Build**: `npm run build` (inside service directory)
- **Start in dev mode**: `npm run dev` (most services) or `npm run dev:watch` (for stream-manager)
- **Lint**: `npm run lint` 
- **Type check**: `npm run type-check` (auction-engine) or `tsc --noEmit` (other services)
- **Run all tests**: `npm test`
- **Run specific test**: `npm test -- -t "test name pattern"`
- **Run test categories**: `npm run test:unit`, `npm run test:integration`, or `npm run test:e2e`
- **Test with coverage**: `npm run test:coverage`

## Code Style Guidelines
- **TypeScript**: Strict mode enabled with explicit return types
- **Formatting**: 2-space indentation, 100 character line limit, single quotes
- **Imports**: Group by external/internal, alphabetical order
- **Naming**: 
  - camelCase for variables, methods
  - PascalCase for classes, interfaces, types
  - UPPER_CASE for constants
- **Error Handling**: Always use typed error handling with proper logging
- **Typing**: Avoid `any`, prefer explicit typing and interfaces
- **File Organization**: One class/component per file, follow domain-driven design
- **Async Code**: Always use async/await pattern over raw promises

## Testing Strategy
- **Unit**: Test individual functions and components in isolation
- **Integration**: Test service interactions with dependencies mocked
- **E2E**: Test complete user flows through the system