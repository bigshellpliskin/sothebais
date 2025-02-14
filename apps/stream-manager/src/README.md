# Stream Manager Implementation

This directory contains the core implementation of the Stream Manager service. This document focuses on technical implementation details, component interactions, and development guidelines.

## Directory Structure

```
src/
├── core/                                 # Core domain logic
│   ├── viewport.ts                       # Viewport/canvas management
│   ├── layout.ts                         # Scene/layout management
│   ├── assets.ts                         # Asset management
│   └── composition.ts                    # Composition engine
│               
├── rendering/                            # Rendering pipeline
│   ├── renderer.ts                       # Main renderer
│   ├── effects.ts                        # Visual effects and transitions
│   ├── frame-buffer.ts                   # Memory management
│   └── encoder.ts                        # Stream encoding
│               
├── workers/                              # Worker thread implementations
│   ├── pool/                             # Worker pool management
│   │   ├── manager.ts                    # Pool orchestration
│   │   └── metrics.ts                    # Pool performance tracking
│   ├── render/                           # Render workers
│   │   ├── worker.ts                     # Worker implementation
│   │   └── tasks.ts                      # Task definitions
│   └── shared/                           # Shared worker code
│       ├── messages.ts                   # Worker message types
│       └── state.ts                      # Shared state types
│             
├── state/                                # State management
│   ├── README.md                         # State system documentation
│   ├── state-manager.ts                  # Core state management
│   ├── event-emitter.ts                  # Event system implementation
│   └── redis-service.ts                  # Redis integration & persistence
│             
├── streaming/                            # Streaming functionality
│   ├── rtmp/                             # RTMP handling
│   │   ├── server.ts                     # RTMP server
│   │   └── events.ts                     # RTMP event handlers
│   ├── preview/                          # Preview streaming
│   │   ├── frame-handler.ts              # Frame processing
│   │   └── message-batcher.ts            # Message optimization
│   ├── output/                           # Stream output
│   │   ├── encoder.ts                    # FFmpeg encoding
│   │   └── pipeline.ts                   # Stream pipeline
│   └── websocket.ts                      # WebSocket communication
│             
├── tools/                                # Development and testing tools
│   ├── perf/                             # Performance testing tools
│   │   ├── load-test.ts                  # WebSocket load testing
│   │   ├── stream-performance.ts         # Stream performance testing
│   │   └── stream-test.ts                # Stream component testing
│   └── debug/                            # Debugging utilities
│       ├── generate-test-stream.ts       # Test stream generation
│       ├── frame-debug.ts                # Frame debugging utilities
│       ├── heap-analyzer.ts              # Memory analysis tools
│       ├── network-trace.ts              # Network debugging
│       └── worker-debug.ts               # Worker debugging tools
│
├── types/                                # TypeScript type definitions
│   ├── README.md                         # Types documentation
│   ├── state-manager.ts                  # State management types
│   ├── events.ts                         # Event system types
│   ├── config.ts                         # Configuration types
│   ├── core.ts                           # Core component types
│   ├── stream.ts                         # Stream types
│   ├── layout.ts                         # Layout types
│   ├── viewport.ts                       # Viewport types
│   ├── layers.ts                         # Layer types
│   ├── canvas.ts                         # Canvas types
│   ├── worker.ts                         # Worker types
│   ├── frame-buffer.ts                   # Frame buffer types
│   ├── animation.ts                      # Animation types
│   └── global.d.ts                       # Global type declarations
│
├── server/                               # HTTP & WebSocket servers
│   ├── api/                              # HTTP API endpoints
│   │   ├── stream.ts                     # Stream control
│   │   ├── layers.ts                     # Layer management
│   │   └── metrics.ts                    # Prometheus metrics
│   ├── websocket/                        # WebSocket handlers
│   │   ├── stream.ts                     # Stream events
│   │   └── layers.ts                     # Layer updates
│   └── monitoring/                       # Monitoring interfaces
│       ├── dashboard.ts                  # Web dashboard
│       └── preview.ts                    # Stream preview
│               
└── utils/                                # Utilities
    ├── logger.ts                         # Logging utilities
    ├── metrics.ts                        # Metrics collection
    └── helpers.ts                        # Shared helpers

```

## Component Documentation

### Performance Testing Tools (`tools/perf/`)

#### Load Testing (`load-test.ts`)
- Component verification testing for WebSocket connections
- Supports multiple test scenarios:
  - `basic`: Single client connectivity test (30s)
  - `quality`: Quality selection testing with 3 clients (1m)
  - `batching`: Message batching with 5 clients (1m)
- Detailed metrics collection and logging

#### Stream Performance (`stream-performance.ts`)
- Comprehensive stream pipeline testing
- Measures encoding, processing, and delivery performance
- Supports various quality and load configurations

#### Stream Component Testing (`stream-test.ts`)
- Isolated testing of stream components
- Verifies individual stream processing stages
- Quick validation of stream functionality

### Debugging Tools (`tools/debug/`)

#### Test Stream Generation (`generate-test-stream.ts`)
- Creates synthetic test streams
- Configurable frame rates and patterns
- Useful for testing without real input

#### Frame Debugging (`frame-debug.ts`)
- Provides utilities for debugging frame processing
- Helps identify frame-related issues

#### Memory Analysis (`heap-analyzer.ts`)
- Analyzes heap snapshots for memory leaks
- Helps identify memory management issues

#### Network Debugging (`network-trace.ts`)
- Traces network connections
- Helps identify network-related issues

#### Worker Debugging (`worker-debug.ts`)
- Provides utilities for debugging worker threads
- Helps identify worker-related issues

### Preview Streaming (`streaming/preview/`)

#### Frame Handler (`frame-handler.ts`)
```typescript
interface FrameQualityConfig {
  maxFPS: number;        // Target frame rate
  compression: number;   // JPEG quality (0-100)
  maxWidth: number;      // Maximum frame width
  maxHeight: number;     // Maximum frame height
}

// Quality configurations
const QUALITY_CONFIGS = {
  high: { maxFPS: 30, compression: 85, maxWidth: 1920, maxHeight: 1080 },
  medium: { maxFPS: 20, compression: 75, maxWidth: 1280, maxHeight: 720 },
  low: { maxFPS: 10, compression: 60, maxWidth: 854, maxHeight: 480 }
};
```

#### Message Batcher (`message-batcher.ts`)
- Optimizes WebSocket communication
- Batches frames and state updates
- Configurable batch size and interval
- Efficient binary message format

### State Management (`state/`)

#### State Manager (`state-manager.ts`)
- Centralized state management
- Real-time state synchronization
- Redis persistence
- Event broadcasting

#### Event Emitter (`event-emitter.ts`)
- Type-safe event system
- Asynchronous event handling
- Event filtering and routing

### Type System (`types/`)

#### New Type Definitions
- `state-manager.ts`: State management interfaces
- `events.ts`: Event system types
- `config.ts`: Configuration interfaces
- `core.ts`: Core component types
- `animation.ts`: Animation system types
- `frame-buffer.ts`: Frame handling types
- `global.d.ts`: Global type declarations

## Testing & Debugging Guide

### Test Categories

#### 1. Unit & Integration Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests

# Development
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

#### 2. Performance Testing
```bash
# Component Tests
npm run test:load         # Default load test
npm run test:load:basic   # Basic connectivity (1 client, 30s)
npm run test:load:quality # Quality switching (3 clients, 1m)
npm run test:load:batching # Message batching (5 clients, 1m)

# Stream Performance
npm run test:perf:stream  # Stream pipeline performance
npm run test:frames:timing # Frame timing analysis
npm run test:frames:drops # Frame drop analysis
```

#### 3. Memory Analysis
```bash
# Memory monitoring
npm run test:memory:leaks  # Leak detection
npm run test:memory:heap   # Heap snapshots
npm run test:memory:gc     # GC analysis

# Development monitoring
npm run dev:memory        # Run with heap profiling
```

### Debugging Tools

#### 1. Component Debugging
```bash
# Start with debugging
npm run dev:debug        # Debug mode with inspector

# Component-specific debugging
npm run debug:stream     # Stream generation
npm run debug:workers    # Worker pool
npm run debug:frames     # Frame pipeline
npm run debug:ws        # WebSocket
npm run debug:rtmp      # RTMP connections
```

#### 2. Performance Profiling
```bash
# CPU profiling
npm run dev:profile     # Run with CPU profiling

# Network analysis
npm run dev:network     # Network debugging
```

### Debug Configuration

```typescript
// Environment variables
DEBUG='stream:*'                           # All stream logs
DEBUG='stream:worker:*'                    # Worker logs only
DEBUG='stream:frames:*'                    # Frame logs only
DEBUG='stream:network,stream:rtmp,stream:ws' # Network logs

// Node.js options
NODE_OPTIONS='--inspect'                   # Node inspector
NODE_OPTIONS='--inspect --heap-prof'       # Memory profiling
NODE_OPTIONS='--prof'                      # CPU profiling
NODE_OPTIONS='--trace-gc'                  # GC tracking
```

### Metrics Collection

The metrics system provides unified monitoring across all components:

```typescript
interface MetricsConfig {
  // Collection settings
  sampleRate: number;     // Metrics collection frequency
  retentionPeriod: number; // Data retention time
  
  // Component monitoring
  components: {
    stream: boolean;     // Stream metrics
    workers: boolean;    // Worker pool metrics
    memory: boolean;     // Memory metrics
    network: boolean;    // Network metrics
  };
}
```

Key metrics collected:
- Stream performance (FPS, latency, quality)
- Worker pool utilization
- Memory usage and GC patterns
- Network statistics
- Frame processing metrics

### Common Debug Workflows

1. **Performance Investigation**
   ```bash
   # Start with performance monitoring
   npm run dev:profile
   
   # Run load test
   npm run test:load:basic
   
   # Analyze results
   npm run debug:timing
   ```

2. **Memory Leak Investigation**
   ```bash
   # Start with heap profiling
   npm run dev:memory
   
   # Run memory leak detection
   npm run test:memory:leaks
   
   # Generate heap snapshot
   npm run debug:heap
   ```

3. **Frame Pipeline Analysis**
   ```bash
   # Monitor frame processing
   npm run debug:frames
   
   # Run frame timing analysis
   npm run test:frames:timing
   
   # Check for drops
   npm run test:frames:drops
   ```

4. **Network Troubleshooting**
   ```bash
   # Enable network debugging
   npm run dev:network
   
   # Monitor WebSocket
   npm run debug:ws
   
   # Check RTMP
   npm run debug:rtmp
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
# Component verification tests
npm run test:load:basic    # Test basic connectivity (1 client, 30s)
npm run test:load:quality  # Test quality selection (3 clients, 1m)
npm run test:load:batching # Test batching logic (5 clients, 1m)

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
    received: number;
    dropped: number;
    avgProcessingTime: number;
    bufferUtilization: number;
    compositionTime: number;
    batched: number;
    lastBatchSize: number;
    avgFrameSize: number;
    avgInterval: number;
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

### Dynamic Debugging Tools

The debug utilities use Node.js's inspector protocol and diagnostic tools to analyze the application without modifying source code.

#### 1. Frame Pipeline Debugger (`debug:frames`)
```typescript
// tools/debug/frame-debug.ts
import { Session } from 'inspector';

class FrameDebugger {
  private session: Session;
  
  constructor() {
    this.session = new Session();
    this.session.connect();
  }

  async analyze() {
    // Set breakpoints in frame processing code
    await this.session.post('Debugger.setBreakpointByUrl', {
      lineNumber: 42,
      url: 'frame-handler.ts'
    });

    // Add expression to watch
    await this.session.post('Runtime.evaluate', {
      expression: 'frameStats',
      contextId: 1
    });

    // Listen for frame events
    this.session.on('Debugger.paused', (params) => {
      const frameData = params.callFrames[0].scopeChain;
      console.log('Frame processing stats:', frameData);
    });
  }
}
```

Usage:
```bash
# Start the application with inspector
npm run dev:debug

# In another terminal, run frame debugger
npm run debug:frames
```

#### 2. Worker Analysis (`debug:workers`)
```typescript
// tools/debug/worker-debug.ts
import { createHook } from 'async_hooks';
import { performance } from 'perf_hooks';

class WorkerDebugger {
  private taskTimings = new Map();
  
  constructor() {
    // Create async hook to track worker tasks
    const hook = createHook({
      init: (asyncId, type, triggerAsyncId) => {
        if (type === 'WORKER') {
          this.taskTimings.set(asyncId, performance.now());
        }
      },
      destroy: (asyncId) => {
        if (this.taskTimings.has(asyncId)) {
          const duration = performance.now() - this.taskTimings.get(asyncId);
          console.log(`Worker task ${asyncId} took ${duration}ms`);
        }
      }
    });
    hook.enable();
  }
}
```

Usage:
```bash
# Run with worker debugging
npm run debug:workers
```

#### 3. Memory Analysis (`debug:heap`)
```typescript
// tools/debug/heap-analyzer.ts
import v8 from 'v8';
import fs from 'fs';

class HeapAnalyzer {
  private snapshotInterval: NodeJS.Timeout;
  
  startAnalysis() {
    // Take heap snapshots every 30 seconds
    this.snapshotInterval = setInterval(() => {
      const snapshot = v8.getHeapSnapshot();
      const timestamp = Date.now();
      
      fs.writeFileSync(
        `heap-${timestamp}.heapsnapshot`,
        JSON.stringify(snapshot)
      );
      
      // Analyze for memory leaks
      this.analyzeSnapshot(snapshot);
    }, 30000);
  }

  private analyzeSnapshot(snapshot: any) {
    // Look for growing object collections
    const retainedObjects = new Map();
    for (const node of snapshot.nodes) {
      if (node.retainedSize > 1000000) { // 1MB
        console.warn('Large retained object:', {
          type: node.type,
          name: node.name,
          size: node.retainedSize
        });
      }
    }
  }
}
```

Usage:
```bash
# Start with heap profiling
npm run dev:memory

# Run heap analysis
npm run debug:heap
```

#### 4. Network Tracing (`debug:ws`, `debug:rtmp`)
```typescript
// tools/debug/network-trace.ts
import { createHook } from 'async_hooks';
import { performance } from 'perf_hooks';

class NetworkTracer {
  private connections = new Map();
  
  constructor(protocol: 'ws' | 'rtmp') {
    const hook = createHook({
      init: (asyncId, type, triggerAsyncId) => {
        if (type === 'TCPWRAP' || type === 'TLSWRAP') {
          this.connections.set(asyncId, {
            startTime: performance.now(),
            protocol,
            events: []
          });
        }
      },
      before: (asyncId) => {
        const connection = this.connections.get(asyncId);
        if (connection) {
          connection.events.push({
            timestamp: performance.now(),
            type: 'before'
          });
        }
      },
      after: (asyncId) => {
        const connection = this.connections.get(asyncId);
        if (connection) {
          connection.events.push({
            timestamp: performance.now(),
            type: 'after'
          });
          this.analyzeLatency(connection);
        }
      }
    });
    hook.enable();
  }

  private analyzeLatency(connection: any) {
    const latencies = [];
    for (let i = 0; i < connection.events.length - 1; i += 2) {
      const latency = connection.events[i + 1].timestamp - 
                     connection.events[i].timestamp;
      latencies.push(latency);
    }
    
    console.log(`${connection.protocol} connection stats:`, {
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      eventCount: connection.events.length / 2
    });
  }
}
```

Usage:
```bash
# Start with network debugging
npm run dev:network

# Check WebSocket
npm run debug:ws

# Check RTMP
npm run debug:rtmp
```

These debugging tools provide:
1. **Non-intrusive monitoring**: Uses Node.js APIs to inspect running code
2. **Real-time analysis**: Monitors performance and behavior while the app runs
3. **Automatic detection**: Identifies issues without manual logging
4. **Detailed metrics**: Collects comprehensive data about specific components

To use these tools effectively:

1. **Start with broad analysis**:
   ```bash
   # Run app with debugging enabled
   npm run dev:debug
   
   # In another terminal, start general monitoring
   npm run debug:frames
   ```

2. **Narrow down issues**:
   ```bash
   # If you spot frame issues
   npm run debug:frames
   
   # For worker problems
   npm run debug:workers
   
   # Memory concerns
   npm run debug:heap
   ```

3. **Network investigation**:
   ```bash
   # WebSocket issues
   npm run debug:ws
   
   # RTMP problems
   npm run debug:rtmp
   ```

The tools use Node.js's built-in capabilities:
- Inspector Protocol for runtime analysis
- Async hooks for operation tracking
- V8 profiler for memory analysis
- Performance hooks for timing
- Event tracing for network analysis

This approach allows debugging without code modification while providing detailed insights into the application's behavior.