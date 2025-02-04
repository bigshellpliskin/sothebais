# Admin API Documentation

This directory contains the API routes for the admin application. The API is organized into three main sections:

## Stream Management (`/api/stream`)

Endpoints for managing the livestream functionality:

### Status (`/api/stream/status`)
- `GET` - Get the current status of the stream including FPS, layer count, and metrics

### Control (`/api/stream/control`)
Stream control operations:
- `POST /playback` - Control stream playback (start/stop/pause)
- `POST /layers/toggle/[type]` - Toggle visibility of specific layer types
- `POST /layers/update` - Batch update multiple layer states
- `GET /layers` - Get current state of all layers

### Chat (`/api/stream/chat`)
Chat-related functionality:
- `POST` - Send chat messages
- `GET` - Get recent chat history
- `POST /highlight` - Send highlighted messages (e.g., bids)

### Frame (`/api/stream/frame`)
Frame-related operations:
- `GET` - Get the current frame buffer
- `POST /config` - Update frame rendering configuration

## Events (`/api/events`)

Dynamic event handling endpoints:

- `/[...path]` - Catch-all route for handling various event-related operations

## Services (`/api/services`)

System service monitoring and metrics:

- `/status` - Service health and status checks
- `/metrics` - Service metrics and monitoring data

## Architecture

The API is built using Next.js API routes, which provide serverless functions that are automatically deployed as edge functions. Each endpoint communicates with the appropriate microservices (such as the stream-manager service) using internal Docker networking.

### API Structure
```
/api
  /stream
    /status
    /control
      /playback
      /layers
        /toggle/[type]
        /update
    /chat
      /highlight
    /frame
      /config
  /events
  /services
    /status
    /metrics
```

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
1. Create a new directory under the appropriate section following the hierarchical structure
2. Implement the route handler using Next.js API routes
3. Follow the established patterns for error handling and logging
4. Update this documentation with the new endpoint details 