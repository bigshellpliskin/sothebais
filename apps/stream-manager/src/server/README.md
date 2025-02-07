# Stream Manager Server

This directory contains the HTTP server components that provide the REST API, WebSocket communication, monitoring capabilities, and default configuration for the streaming platform.

## Current Implementation Status

### ✅ Completed (MVP)
- Basic HTTP server setup
- REST endpoints for stream control
- Initial WebSocket server implementation
- Basic layer management
- Stream state monitoring

### 🚧 In Progress
- WebSocket event standardization
- Layer state synchronization
- Preview frame optimization

### 📋 MVP Roadmap
1. **WebSocket Event Standardization**
   ```typescript
   // Standardize event types
   type StreamEvent = 
     | { type: 'stateUpdate'; payload: StreamState }
     | { type: 'layerUpdate'; payload: LayerState }
     | { type: 'preview'; payload: PreviewFrame };
   ```

2. **Layer State Events**
   ```typescript
   // Layer state update format
   interface LayerStateEvent {
     type: 'layerUpdate';
     payload: {
       id: string;
       visible: boolean;
       content?: LayerContent;
     };
   }
   ```

3. **Preview Frame Delivery**
   ```typescript
   // Optimize frame delivery
   interface PreviewEvent {
     type: 'preview';
     payload: {
       data: string;  // Base64 encoded frame
       timestamp: number;
       quality: 'low' | 'medium' | 'high';
     };
   }
   ```

## Components

### API (`/api`)
Contains all REST API endpoints organized by domain:
- Stream control endpoints
- Layer management
- Asset handling
- Configuration management

### WebSocket Server (`websocket.ts`)
Currently implements:
- Basic connection handling
- Event forwarding
- Error reporting

Next steps:
1. Standardize event types
2. Add layer state events
3. Optimize preview frames

### Monitoring (`/monitoring`)
MVP focus:
- Stream health (FPS, latency)
- Basic error tracking
- Connection status

### Stream Server (`stream-server.ts`)
Currently implements:
- Stream control endpoints
- Basic layer management
- State monitoring

Next steps:
1. Add layer state sync
2. Improve error handling
3. Add basic metrics

#### API Endpoints

1. **Stream Control**
   - `POST /stream/control` - Start/stop stream
   - `GET /stream/status` - Get stream status
   - `POST /stream/reset` - Reset stream state

2. **Layer Management**
   - `POST /stream/layers` - Create new layer
   - `PUT /stream/layers/:id` - Update layer
   - `DELETE /stream/layers/:id` - Delete layer
   - `PATCH /stream/layers/:id/visibility` - Toggle layer visibility

3. **Asset Management**
   - `POST /stream/assets/upload` - Upload new asset
   - `GET /stream/assets/:id` - Get asset info
   - `DELETE /stream/assets/:id` - Delete asset

4. **Metrics**
   - `GET /metrics` - Prometheus metrics
   - `GET /health` - Health check endpoint

### Default Layers (`default-layers.ts`)

Configuration and initialization of default stream layers:
- Defines standard layer templates
- Provides asset configurations
- Sets up initial stream state
- Manages default styling and positioning

```typescript
// Example: Default layer configuration
const defaultLayers = {
  host: {
    character: {
      modelUrl: 'assets/characters/auctioneer.png',
      animations: {
        idle: 'idle-animation',
        talking: 'talking-animation'
      }
    }
  },
  overlay: {
    content: {
      type: 'text',
      content: 'Current Bid: 1.5 ETH',
      style: {
        font: 'Arial',
        fontSize: 24,
        color: '#ffffff'
      }
    }
  }
};
```

## Server Features

1. **Real-time Communication**
   - WebSocket-based updates
   - Bi-directional messaging
   - Connection management
   - Client state tracking

2. **Request Validation**
   - Input sanitization
   - Schema validation
   - Type checking
   - Error formatting

3. **Error Handling**
   - Structured error responses
   - Error logging
   - Recovery mechanisms
   - Client-friendly messages

4. **Asset Management**
   - File upload handling
   - Asset validation
   - Storage management
   - URL generation

5. **Security**
   - Request rate limiting
   - Input validation
   - Error sanitization
   - CORS configuration

## Metrics

The server exposes monitoring and metrics through multiple channels:

- **WebSocket Metrics**:
  - Connected clients
  - Message throughput
  - Connection status
  - Event broadcasting

- **HTTP Metrics**:
  - Request counts
  - Response times
  - Error rates
  - Status codes

- **Resource Metrics**:
  - Asset count
  - Storage usage
  - Memory usage
  - CPU usage

## Configuration

Server configuration via environment variables:

```typescript
interface ServerConfig {
  PORT: number;
  WS_PORT: number;
  HOST: string;
  ASSET_STORAGE_PATH: string;
  MAX_UPLOAD_SIZE: number;
  RATE_LIMIT: {
    windowMs: number;
    max: number;
  };
  CORS: {
    origin: string[];
    methods: string[];
  };
}
```

## Immediate Tasks

1. **Event Standardization**
   - Define core event types
   - Implement validation
   - Add type checking

2. **Layer State**
   - Add real-time updates
   - Handle visibility changes
   - Basic content updates

3. **Preview Optimization**
   - Implement quality levels
   - Add frame dropping
   - Basic compression

4. **Error Handling**
   - Standardize error formats
   - Add reconnection logic
   - Basic logging

## Usage Example (Current MVP)

```typescript
import express from 'express';
import { setupStreamServer } from './stream-server';
import { setupWebSocketServer } from './websocket';

async function main() {
  const app = express();
  
  // Basic setup
  app.use(express.json());
  
  // Initialize servers
  const httpServer = await setupStreamServer(app);
  await setupWebSocketServer(httpServer);
  
  // Start server
  const port = process.env.PORT || 4200;
  httpServer.listen(port, () => {
    console.log(`Stream manager running on port ${port}`);
  });
}

main().catch(console.error);
```

## Error Handling Example

```typescript
// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Server error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
``` 