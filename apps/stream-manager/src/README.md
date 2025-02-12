# Stream Manager Implementation

This directory contains the core implementation of the Stream Manager service. This document focuses on technical implementation details, component interactions, and development guidelines.

## Directory Structure

```
src/
├── core/                  # Core domain logic
│   ├── viewport.ts        # Viewport/canvas management
│   ├── layout.ts          # Scene/layout management
│   ├── assets.ts          # Asset management
│   └── composition.ts     # Composition engine
│
├── rendering/             # Rendering pipeline
│   ├── renderer.ts        # Main renderer
│   ├── effects.ts         # Visual effects and transitions
│   ├── frame-buffer.ts    # Memory management
│   └── encoder.ts         # Stream encoding
│
├── workers/               # Worker thread implementations
│   ├── pool/              # Worker pool management
│   │   ├── manager.ts     # Pool orchestration
│   │   └── metrics.ts     # Pool performance tracking
│   ├── render/            # Render workers
│   │   ├── worker.ts      # Worker implementation
│   │   └── tasks.ts       # Task definitions
│   └── shared/            # Shared worker code
│       ├── messages.ts    # Worker message types
│       └── state.ts       # Shared state types
│
├── state/                 # State management
│   ├── store/             # State stores
│   │   ├── config.ts      # Dynamic config store
│   │   └── sync.ts        # Redis synchronization
│   ├── persistence.ts     # State persistence
│   └── events.ts          # Event system
│
├── streaming/             # Streaming functionality
│   ├── rtmp/              # RTMP handling
│   │   ├── server.ts      # RTMP server
│   │   └── events.ts      # RTMP event handlers
│   ├── output/            # Stream output
│   │   ├── encoder.ts     # FFmpeg encoding
│   │   └── muxer.ts       # Stream multiplexing
│   └── websocket.ts       # WebSocket communication
│
├── server/                # HTTP & WebSocket servers
│   ├── api/               # HTTP API endpoints
│   │   ├── stream.ts      # Stream control
│   │   ├── layers.ts      # Layer management
│   │   └── metrics.ts     # Prometheus metrics
│   ├── websocket/         # WebSocket handlers
│   │   ├── stream.ts      # Stream events
│   │   └── layers.ts      # Layer updates
│   └── monitoring/        # Monitoring interfaces
│       ├── dashboard.ts   # Web dashboard
│       └── preview.ts     # Stream preview
│
├── utils/                 # Utilities
│   ├── logger.ts          # Logging utilities
│   ├── metrics.ts         # Metrics collection
│   └── helpers.ts         # Shared helpers
│
└── types/                 # TypeScript types
    ├── viewport.ts        # Viewport types
    ├── layout.ts          # Layout types
    ├── worker.ts          # Worker types
    └── stream.ts          # Stream types

```

## Core Components

### Viewport Management
- Handles canvas dimensions and coordinate systems
- Manages safe areas and grid snapping
- Provides coordinate transformation utilities
- Maintains aspect ratio and scaling

### Layout System
- Scene-based composition
- Asset positioning and transformation
- Z-index ordering
- Transition management

### Asset Management
- Asset loading and caching
- Type-specific asset handling
- Metadata management
- Memory-efficient preloading

### Composition Engine
- High-performance image processing
- Layer compositing
- Effect application
- Cache management

## Rendering Pipeline

### Main Renderer
- Coordinates rendering process
- Manages frame timing
- Handles frame buffering
- Provides performance metrics

### Effects System
- Scene transitions
- Asset animations
- Easing functions
- Visual effects

### Frame Buffer
- Memory management
- Buffer pooling
- Frame synchronization
- Performance optimization

### Stream Encoder
- Video encoding
- Stream format handling
- Quality management
- Performance monitoring

## Worker System

### Worker Pool Management
- Dynamic worker scaling based on load
- Task distribution and load balancing
- Worker health monitoring
- Automatic worker recovery
- Performance metrics collection

### Render Workers
- Parallel frame processing
- Asset rendering isolation
- Memory-aware processing
- Error boundary implementation

### Worker Communication
- Typed message passing
- Shared state management
- Task queuing system
- Result aggregation

## State Management

### Redis Integration
- State persistence
- Real-time synchronization
- Cache invalidation
- Event propagation

### Event System
- Type-safe events
- Event filtering
- Subscription management
- Error handling

## API Implementation

The Stream Manager exposes a RESTful API for stream control and monitoring. All endpoints are prefixed with `/stream`.

### Stream Management
```typescript
// Get current stream status
GET /status
  response: {
    success: boolean;
    data: {
      isLive: boolean;
      isPaused: boolean;
      fps: number;
      frameCount: number;
      droppedFrames: number;
      averageRenderTime: number;
      startTime: number | null;
    }
  }

// Start the stream
POST /start
  response: {
    success: boolean;
    data: StreamState;
  }

// Stop the stream
POST /stop
  response: {
    success: boolean;
    data: StreamState;
  }

// Get stream metrics
GET /metrics
  response: {
    success: boolean;
    data: {
      fps: number;
      bitrate: number;
      droppedFrames: number;
      viewerCount: number;
      cpuUsage: number;
      memoryUsage: number;
    }
  }
```

### Configuration
```typescript
// Get stream configuration
GET /config
  response: {
    success: boolean;
    data: {
      STREAM_RESOLUTION: string;
      TARGET_FPS: number;
      RENDER_QUALITY: number;
      MAX_LAYERS: number;
      STREAM_BITRATE: string;
      ENABLE_HARDWARE_ACCELERATION: boolean;
    }
  }

// Update stream configuration
PATCH /config
  body: Partial<StreamConfig>
  response: {
    success: boolean;
    data: StreamConfig;
  }
```

### Stream Keys
```typescript
// Get all stream keys
GET /keys
  response: {
    success: boolean;
    data: {
      keys: Array<{
        id: string;
        key: string;
        createdAt: number;
        lastUsed: number | null;
      }>
    }
  }

// Create new stream key
POST /keys
  response: {
    success: boolean;
    data: {
      id: string;
      key: string;
      createdAt: number;
    }
  }

// Delete stream key
DELETE /keys/:id
  response: {
    success: boolean;
  }
```

### Layer Management
```typescript
// Get all layers
GET /layers
  response: {
    success: boolean;
    data: {
      layers: Layer[];
      count: number;
    }
  }

// Get specific layer
GET /layers/:id
  response: {
    success: boolean;
    data: Layer;
  }

// Update layer visibility
PATCH /layers/:id
  body: {
    visible?: boolean;
    position?: Position;
    size?: Size;
    opacity?: number;
    zIndex?: number;
  }
  response: {
    success: boolean;
    data: Layer;
  }
```

### WebSocket Events
```typescript
interface StreamEvents {
  // Stream Status
  'stream:status': {
    isLive: boolean;
    viewers: number;
    health: StreamHealth;
  }
  
  // Performance Metrics
  'metrics:update': {
    fps: number;
    bitrate: number;
    dropped: number;
    cpu: number;
    memory: number;
  }
  
  // Layer Updates
  'layer:update': {
    id: string;
    changes: Partial<Layer>;
  }
}

// WebSocket Connection
ws://host:port/stream/events
```

The API provides:
- Core stream control operations (start/stop)
- Real-time stream metrics and health monitoring
- Configuration management
- Stream key management for RTMP ingestion
- Layer visibility and property control
- Real-time updates via WebSocket

## Performance Optimization

### Memory Management
- Buffer pooling and reuse
- Automatic garbage collection
- Memory pressure monitoring
- Resource cleanup

### Caching Strategy
- Layer composition caching
- Asset caching
- Frame caching
- Cache invalidation

### Error Handling
- Worker crash recovery
- Stream error recovery
- Error isolation
- Detailed error reporting

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow functional programming principles
- Implement proper error handling
- Add comprehensive logging

### Testing Strategy
- Unit tests for core logic
- Integration tests for pipelines
- Performance tests
- Memory leak tests

### Performance Testing & Debugging

#### Performance Monitoring Tools

```typescript
// Environment variables for performance monitoring
NODE_OPTIONS='--inspect --heap-prof --prof' // CPU and memory profiling
DEBUG='stream:*'                           // Debug logging
WORKER_DEBUG=true                          // Worker process debugging
STREAM_PERF_METRICS=true                   // Enable performance metrics collection
```

#### Performance Testing Scripts

```bash
# Full performance test suite
npm run test:perf

# Individual performance tests
npm run test:perf:stream    # Test stream processing performance
npm run test:perf:workers   # Test worker pool performance
npm run test:perf:memory    # Test memory usage patterns
npm run test:perf:network   # Test network throughput

# Load testing
npm run test:load -- --concurrent=10 --duration=300  # 10 concurrent streams for 5 minutes

# Stress testing
npm run test:stress         # Push system to limits
```

#### Memory Profiling

```bash
# Memory leak detection
npm run test:memory:leaks

# Heap snapshots
npm run test:memory:heap

# Garbage collection analysis
npm run test:memory:gc

# Memory usage timeline
npm run test:memory:timeline
```

#### Frame Pipeline Analysis

```bash
# Frame timing analysis
npm run test:frames:timing

# Frame drop analysis
npm run test:frames:drops

# Frame buffer usage
npm run test:frames:buffer

# Visual quality metrics
npm run test:frames:quality
```

#### Debug Configurations

```typescript
// Debug configuration object
interface DebugConfig {
  // Logging levels
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  
  // Component debugging
  DEBUG_COMPONENTS: {
    workers: boolean;      // Debug worker pool
    renderer: boolean;     // Debug rendering pipeline
    rtmp: boolean;        // Debug RTMP server
    websocket: boolean;   // Debug WebSocket connections
  };
  
  // Performance monitoring
  PERF_MONITORING: {
    enabled: boolean;
    sampleRate: number;     // How often to collect metrics
    retentionPeriod: number; // How long to keep metrics
  };
  
  // Memory monitoring
  MEMORY_MONITORING: {
    enabled: boolean;
    heapDumpOnLeak: boolean;
    gcTracking: boolean;
  };
}
```

#### Debugging Commands

```bash
# Start with debugging enabled
npm run dev:debug

# Debug specific components
DEBUG_COMPONENTS=workers,renderer npm run dev

# Enable all debugging
DEBUG=stream:*,worker:*,rtmp:*,ws:* npm run dev

# Profile CPU usage
npm run dev:profile

# Memory debugging
npm run dev:memory

# Network debugging
npm run dev:network
```

#### Performance Metrics Collection

```typescript
interface PerformanceMetrics {
  // Stream metrics
  stream: {
    fps: number;
    bitrate: number;
    keyframeInterval: number;
    encoderLatency: number;
    bufferHealth: number;
  };
  
  // Worker metrics
  workers: {
    active: number;
    queueLength: number;
    avgProcessingTime: number;
    taskDistribution: Record<string, number>;
  };
  
  // Memory metrics
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    gcFrequency: number;
  };
  
  // Frame pipeline metrics
  frames: {
    processed: number;
    dropped: number;
    avgProcessingTime: number;
    bufferUtilization: number;
    compositionTime: number;
  };
}
```

#### Debug Logging

```typescript
// Structured logging format
interface DebugLog {
  timestamp: string;
  level: string;
  component: string;
  event: string;
  data: Record<string, unknown>;
  error?: Error;
  metrics?: Partial<PerformanceMetrics>;
}

// Example usage
logger.debug('frame_processed', {
  frameId: 'frame_123',
  processingTime: 16.7,
  workerCount: 4,
  bufferSize: 1024,
  metrics: {
    frames: {
      processed: 1000,
      dropped: 0,
      avgProcessingTime: 16.5
    }
  }
});
```

#### Performance Optimization Tips

1. **Worker Pool Optimization**
   - Monitor worker utilization
   - Adjust pool size based on CPU cores
   - Implement work stealing
   - Track task processing times

2. **Memory Management**
   - Use buffer pools for frames
   - Implement proper cleanup
   - Monitor heap usage
   - Track GC pauses

3. **Frame Pipeline**
   - Optimize frame buffer size
   - Monitor frame drops
   - Track composition time
   - Analyze bottlenecks

4. **Network Performance**
   - Monitor RTMP connection health
   - Track WebSocket latency
   - Analyze bandwidth usage
   - Monitor connection drops

#### Common Issues & Debugging

1. **High Memory Usage**
   ```bash
   # Generate heap snapshot
   npm run debug:heap
   
   # Analyze memory leaks
   npm run debug:leaks
   ```

2. **Frame Drops**
   ```bash
   # Monitor frame pipeline
   npm run debug:frames
   
   # Analyze frame timing
   npm run debug:timing
   ```

3. **Worker Issues**
   ```bash
   # Debug worker pool
   npm run debug:workers
   
   # Monitor task distribution
   npm run debug:tasks
   ```

4. **Network Issues**
   ```bash
   # Debug RTMP connections
   npm run debug:rtmp
   
   # Monitor WebSocket health
   npm run debug:ws
   ```

## Error Handling

### Worker Errors
```typescript
try {
  await worker.processFrame(frame);
} catch (error) {
  if (error instanceof WorkerCrashError) {
    await workerPool.replaceWorker(worker.id);
  }
  throw new StreamError('Frame processing failed', { cause: error });
}
```

### Stream Errors
```typescript
class StreamError extends Error {
  constructor(
    message: string,
    public readonly details: {
      code: StreamErrorCode;
      recoverable: boolean;
      retryCount: number;
    }
  ) {
    super(message);
  }
}
```

## Configuration Types

```typescript
interface StreamConfig {
  // Stream Settings
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  
  // Worker Settings
  workers: {
    count: number;
    maxMemory: number;
    taskTimeout: number;
  };
  
  // Performance Settings
  performance: {
    maxLayers: number;
    bufferSize: number;
    cacheSize: number;
  };
}
```

## Metrics

### Performance Metrics
- Frame processing time
- Worker utilization
- Memory usage
- Cache hit rates
- Error rates

### Stream Health
- FPS
- Bitrate
- Frame drops
- Encoding quality
- Client connections