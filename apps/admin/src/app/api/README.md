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
- `POST /start` - Start the stream
- `POST /stop` - Stop the stream

### Stream Status (`/api/stream/status`)

Monitoring and metrics:
- `GET /` - Get current stream status
  - Streaming state (live/stopped)
  - FPS and performance metrics
  - Layer statistics
  - Resource usage

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
await fetch('/api/stream/playback/start', {
  method: 'POST'
});

// Stop stream
await fetch('/api/stream/playback/stop', {
  method: 'POST'
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

All endpoints implement comprehensive error handling:
- Input validation
- Resource existence checks
- Permission verification
- Rate limiting
- Error logging and monitoring

Example error response:
```typescript
{
  success: false,
  error: {
    code: ErrorCode.LAYER_NOT_FOUND,
    message: 'Layer not found',
    details: { layerId: '123' }
  }
}
```

## Security

The API implements several security measures:
- Authentication via session tokens
- Rate limiting for control operations
- Input validation and sanitization
- Audit logging for all operations
- Permission-based access control

## Development Guidelines

When implementing new endpoints:
1. Follow RESTful naming conventions
2. Implement proper validation and error handling
3. Add TypeScript types for request/response
4. Include appropriate logging and metrics
5. Update this documentation
6. Add tests for new functionality

## Architecture

The API is built using Next.js API routes, which provide serverless functions that are automatically deployed as edge functions. Each endpoint communicates with the appropriate microservices (such as the stream-manager service) using internal Docker networking.

### API Structure
```
/api
  /stream
    /frame
      /config
    /status
    /playback
      /start
      /stop
    /layers
      /[id]/visibility
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