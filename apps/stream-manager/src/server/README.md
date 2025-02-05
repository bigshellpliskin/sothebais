# Stream Manager Server

This directory contains the HTTP server components that provide the REST API, WebSocket communication, monitoring capabilities, and default configuration for the streaming platform.

## Architecture Overview

The server components provide:
- REST API endpoints for stream control
- Real-time WebSocket communication
- Monitoring and metrics collection
- Layer management endpoints
- Default layer configurations
- Asset management
- Error handling and validation

```mermaid
graph TB
    subgraph HTTP Server
        API[REST API]
        WS[WebSocket Server]
        MON[Monitoring]
        DL[Default Layers]
        AM[Asset Manager]
        VM[Validation Middleware]
    end

    subgraph External
        Client[HTTP Clients]
        WSClient[WebSocket Clients]
        Assets[(Asset Storage)]
    end

    subgraph Core
        LM[Layer Manager]
        SM[Stream Manager]
        SR[Sharp Renderer]
    end

    Client --> API
    WSClient --> WS
    WS --> LM
    WS --> SM
    API --> VM
    VM --> LM
    VM --> SM
    DL --> LM
    DL --> Assets
    AM --> Assets
    MON --> SM
    MON --> LM
```

## Components

### API (`/api`)
Contains all REST API endpoints organized by domain:
- Stream control endpoints
- Layer management
- Asset handling
- Configuration management

### WebSocket Server (`websocket.ts`)
Provides real-time communication for:
- Layer state updates
- Stream events
- Client notifications
- Error reporting

```typescript
// Example: WebSocket message structure
interface WebSocketMessage {
  type: 'layerUpdate' | 'streamEvent' | 'error';
  payload: LayerState | StreamEvent | { message: string };
}
```

### Monitoring (`/monitoring`)
Handles system monitoring and metrics:
- Performance metrics
- Resource usage
- Stream health
- Client connections
- Error tracking

### Stream Server (`stream-server.ts`)

The main HTTP server component that:
- Provides RESTful API endpoints for stream control
- Handles layer management requests
- Manages stream state
- Implements error handling and validation
- Provides metrics endpoints

```typescript
// Example: Stream control endpoint
app.post('/stream/control', async (req, res) => {
  const { action } = req.body;
  
  switch (action) {
    case 'start':
      await streamManager.start();
      break;
    case 'stop':
      await streamManager.stop();
      break;
  }
});
```

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

## Usage Example

```typescript
import express from 'express';
import { setupStreamServer } from './stream-server.js';
import { createDefaultLayers } from './default-layers.js';

async function main() {
  const app = express();
  
  // Setup server middleware
  app.use(express.json());
  app.use(express.static('assets'));
  
  // Initialize stream server
  await setupStreamServer(app);
  
  // Create default layers
  await createDefaultLayers();
  
  // Start server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Stream server listening on port ${port}`);
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