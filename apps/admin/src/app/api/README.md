# Admin API Documentation

This directory contains the API routes for the admin application. The API is organized into three main sections:

## Stream Management (`/api/stream`)

Endpoints for managing the livestream functionality:

- `/status` - Get the current status of the stream
- `/control` - Stream control operations
- `/chat` - Chat-related functionality
- `/toggle/[type]` - Toggle various stream features
- `/frame` - Frame-related operations

## Events (`/api/events`)

Dynamic event handling endpoints:

- `/[...path]` - Catch-all route for handling various event-related operations

## Services (`/api/services`)

System service monitoring and metrics:

- `/status` - Service health and status checks
- `/metrics` - Service metrics and monitoring data

## Architecture

The API is built using Next.js API routes, which provide serverless functions that are automatically deployed as edge functions. Each endpoint communicates with the appropriate microservices (such as the stream-manager service) using internal Docker networking.

## Common Response Format

Most API endpoints follow a standard response format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

## Error Handling

All endpoints implement proper error handling and logging. Errors are logged with relevant context and returned to the client with appropriate HTTP status codes.

## Security

The API endpoints are protected and should only be accessed by authenticated admin users. All requests are logged for security and debugging purposes.

## Development

When adding new endpoints:
1. Create a new directory under the appropriate section
2. Implement the route handler using Next.js API routes
3. Follow the established patterns for error handling and logging
4. Update this documentation with the new endpoint details 