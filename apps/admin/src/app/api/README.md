# Admin API Documentation

This directory contains the API routes for the admin application, providing a comprehensive interface for managing and controlling the livestream.

## Stream Management (`/api/stream`)

### Frame Delivery (`/api/stream/frame`)

Stream frame delivery and configuration:
- `GET /` - Get the current frame as a PNG image
  - Returns raw PNG image data with `Content-Type: image/png`
  - No caching to ensure real-time frame delivery
- `POST /config` - Update frame delivery configuration
  - Configure frame size, FPS, and format
  - Requires valid configuration object

### Layer Management (`/api/stream/layers`)

Essential layer control operations:

#### Core Operations
- `GET /` - Get all layers and their current state
- `POST /[id]/visibility` - Toggle layer visibility
- `POST /update` - Batch update multiple layers
  - Accepts array of layer updates
  - Returns results for each layer and total layer count

### Stream Playback (`/api/stream/playback`)

Stream playback operations:
- `POST /` - Control stream playback
  - Accepts `action` parameter with values:
    - `start` - Start the stream
    - `stop` - Stop the stream
    - `pause` - Pause the stream

### Stream Status (`/api/stream/status`)

Monitoring and metrics:
- `GET /` - Get current stream status
  - Streaming state (live/stopped)
  - FPS and performance metrics
  - Layer statistics
  - Resource usage

### Events API (`/api/events`)

Event handling and management:
- Dynamic path routing via `[...path]`
- `GET /{path}` - Fetch event data
- `POST /{path}` - Send event data
- Proxies requests to event-handler service
- Handles both JSON requests and responses

### Services API (`/api/services`)

Service monitoring and metrics:
- `GET /status` - Get service health status
  - Public endpoint (no auth required)
  - Cached responses (30s TTL)
  - Supports multiple service types:
    - Core services (event-handler, stream-manager, admin-frontend)
    - Infrastructure services (prometheus, redis)
- `GET /metrics` - Get detailed service metrics
  - Public endpoint (no auth required)
  - Standard metrics (CPU, memory, request rate, error rate, uptime)
  - Service-specific metrics (e.g., Redis memory, connections, operations)

## Usage Examples

### Frame Management
```typescript
// Get current frame
const response = await fetch('/api/stream/frame');
const frameBlob = await response.blob();
const frameUrl = URL.createObjectURL(frameBlob);

// Update frame configuration
await fetch('/api/stream/frame/config', {
  method: 'POST',
  body: JSON.stringify({
    width: 1920,
    height: 1080,
    fps: 30,
    format: 'png'
  })
});
```

### Layer Management
```typescript
// Get all layers
const layers = await fetch('/api/stream/layers').then(r => r.json());

// Update layer visibility
await fetch(`/api/stream/layers/${layerId}/visibility`, {
  method: 'POST',
  body: JSON.stringify({ visible: true })
});

// Batch update multiple layers
await fetch('/api/stream/layers/update', {
  method: 'POST',
  body: JSON.stringify({
    updates: [
      { type: 'chat', visible: true },
      { type: 'overlay', visible: false }
    ]
  })
});
```

### Stream Playback
```typescript
// Start stream
await fetch('/api/stream/playback', {
  method: 'POST',
  body: JSON.stringify({ action: 'start' })
});

// Stop stream
await fetch('/api/stream/playback', {
  method: 'POST',
  body: JSON.stringify({ action: 'stop' })
});
```

## API Types

### Frame Configuration
```typescript
interface FrameConfig {
  width: number;    // Frame width in pixels
  height: number;   // Frame height in pixels
  fps: number;      // Frames per second
  format: string;   // Image format (e.g., 'png')
}
```

### Layer Types
```typescript
interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'video' | 'overlay' | 'chat';
  visible: boolean;
  zIndex: number;
  opacity: number;
  transform: Transform;
  content: LayerContent;
}

interface LayerUpdate {
  type: string;
  visible: boolean;
}

interface Transform {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

interface LayerContent {
  type: string;
  source?: string;
  data?: any;
}
```

### Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}

enum ErrorCode {
  LAYER_NOT_FOUND = 'LAYER_NOT_FOUND',
  INVALID_OPERATION = 'INVALID_OPERATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}
```

## Error Handling

All endpoints implement comprehensive error handling with detailed logging:

```typescript
try {
  // API operation
} catch (error) {
  console.error('[API Name] Error:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  return NextResponse.json(
    { 
      success: false,
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
```

Example error response:
```typescript
{
  success: false,
  error: 'Failed to update layer visibility',
  details: 'Layer not found: overlay-1'
}
```

## Security

The API implements several security measures:
- Authentication via session tokens (except public endpoints)
- Rate limiting for control operations
- Input validation and sanitization
- Audit logging for all operations
- Permission-based access control
- Internal Docker network isolation

## Development Guidelines

When implementing new endpoints:
1. Follow RESTful naming conventions
2. Implement proper validation and error handling
3. Add TypeScript types for request/response
4. Include appropriate logging and metrics
5. Update this documentation
6. Add tests for new functionality
7. Consider caching strategies where appropriate
8. Use internal Docker networking URLs

## Architecture

The API is built using Next.js API routes, which provide serverless functions that are automatically deployed as edge functions. Each endpoint communicates with the appropriate microservices using internal Docker networking:

- Stream Manager (`http://stream-manager:4200`) - Handles stream operations
- Event Handler (`http://event-handler:4300`) - Manages event processing
- Redis (`redis:6379`) - Caching and data storage
- Prometheus (`prometheus:9090`) - Metrics collection

### API Structure
```
/api
  /stream
    /frame
      /config
    /status
    /playback
    /layers
      /[id]/visibility
      /update
  /events
    /[...path]
  /services
    /status
    /metrics
```

## TODO: Remaining Implementation Items

### Stream Quality and Performance
- [ ] Add quality presets endpoint (`/api/stream/quality`)
  - Predefined quality settings (low, medium, high)
  - Custom quality configuration
  - Bitrate management
  - Resolution scaling

### Layer Enhancement
- [ ] Add layer transformation endpoint (`/api/stream/layers/[id]/transform`)
  - Position updates
  - Scale modifications
  - Rotation changes
  - Opacity adjustments
- [ ] Add layer content update endpoint (`/api/stream/layers/[id]/content`)
  - Text content updates
  - Image source changes
  - Video source modifications
- [ ] Add layer ordering endpoint (`/api/stream/layers/order`)
  - Z-index management
  - Layer reordering operations

### Stream Recording
- [ ] Add recording endpoints (`/api/stream/recording`)
  - Start/stop recording
  - Get recording status
  - List recordings
  - Download recordings
  - Recording configuration (format, quality)

### Chat Integration
- [ ] Add chat management endpoints (`/api/stream/chat`)
  - Chat state management
  - Message filtering
  - User management
  - Chat overlay configuration

### Stream Health
- [ ] Add detailed metrics endpoint (`/api/stream/metrics`)
  - Bandwidth usage
  - CPU/GPU utilization
  - Memory usage
  - Frame drop rate
  - Latency measurements
- [ ] Add alerts endpoint (`/api/stream/alerts`)
  - Performance warnings
  - Error notifications
  - Resource usage alerts

### Stream Sources
- [ ] Add source management endpoints (`/api/stream/sources`)
  - List available sources
  - Add/remove sources
  - Source configuration
  - Source switching

### Authentication and Access Control
- [ ] Add role-based access endpoints (`/api/auth/roles`)
  - Role management
  - Permission assignment
  - Access token management
- [ ] Add viewer authentication endpoints (`/api/auth/viewers`)
  - Viewer session management
  - Access restrictions
  - Viewer statistics

### Backup and Recovery
- [ ] Add state management endpoints (`/api/stream/state`)
  - Save/load stream configurations
  - Backup settings
  - Recovery points
  - Configuration presets

Note: This TODO list represents functionality that would make the streaming frontend API complete and production-ready. Implementation priority should be based on immediate project needs and user requirements. 