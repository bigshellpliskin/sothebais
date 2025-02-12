# Stream Manager Optimization Guide

This document tracks various optimization strategies, test results, and performance metrics for the stream manager service.

## Performance Testing Tools

Available test scripts:
```bash
# Core performance tests
npm run test:perf:stream     # Stream processing performance
npm run test:perf:workers    # Worker pool performance
npm run test:perf:memory     # Memory usage patterns
npm run test:perf:network    # Network throughput

# Frame analysis
npm run test:frames:timing   # Frame timing analysis
npm run test:frames:drops    # Frame drop analysis
npm run test:frames:buffer   # Buffer usage analysis
npm run test:frames:quality  # Visual quality metrics

# Core component tests
npm run test:perf:core       # Core components performance
npm run test:perf:render     # Renderer performance
npm run test:perf:compose    # Composition engine performance
```

## Optimization Categories

### 1. Core Components Optimization

#### Configuration Options
```typescript
interface CoreConfig {
  // Viewport settings
  viewport: {
    width: number;
    height: number;
    gridSize: number;
    safeAreaMargin: { x: number; y: number };
  };
  
  // Asset management
  assets: {
    cacheSize: number;
    preloadStrategy: 'eager' | 'lazy';
    cacheLifetime: number;
  };
  
  // Layout engine
  layout: {
    maxLayers: number;
    updateInterval: number;
    batchUpdates: boolean;
  };
  
  // Composition settings
  composition: {
    threadPool: number;
    batchSize: number;
    cacheStrategy: 'memory' | 'disk';
    optimizeFor: 'speed' | 'quality';
  };
}
```

#### Performance Metrics
```typescript
interface CoreMetrics {
  // Viewport metrics
  viewport: {
    updateTime: number;      // Time to update viewport (ms)
    resizeTime: number;      // Time to handle resize (ms)
    transformTime: number;   // Time for transformations (ms)
  };
  
  // Asset metrics
  assets: {
    loadTime: number;        // Asset load time (ms)
    cacheHitRate: number;    // Cache hit percentage
    memoryUsage: number;     // Asset cache memory (bytes)
  };
  
  // Layout metrics
  layout: {
    updateTime: number;      // Layout update time (ms)
    layerCount: number;      // Active layers
    complexityScore: number; // Layout complexity
  };
  
  // Composition metrics
  composition: {
    renderTime: number;      // Scene render time (ms)
    frameLatency: number;    // Frame composition latency (ms)
    batchEfficiency: number; // Batch processing efficiency
  };
}
```

### 2. Renderer Optimization

#### Configuration Options
```typescript
interface RendererConfig {
  // Performance settings
  performance: {
    maxConcurrent: number;   // Max concurrent renders
    batchSize: number;       // Render batch size
    priorityLevels: number;  // Priority queue levels
  };
  
  // Quality settings
  quality: {
    antialiasing: boolean;
    textureQuality: 'low' | 'medium' | 'high';
    filterMode: 'nearest' | 'linear' | 'cubic';
  };
  
  // Memory management
  memory: {
    textureCache: number;    // Texture cache size (MB)
    geometryCache: number;   // Geometry cache size (MB)
    shaderCache: number;     // Shader cache size (MB)
  };
}
```

#### Performance Metrics
```typescript
interface RenderMetrics {
  // Timing metrics
  timing: {
    setupTime: number;       // Scene setup time (ms)
    drawTime: number;        // Draw call time (ms)
    postProcessTime: number; // Post-processing time (ms)
    totalTime: number;       // Total render time (ms)
  };
  
  // Resource metrics
  resources: {
    drawCalls: number;       // Number of draw calls
    triangleCount: number;   // Triangles rendered
    textureMemory: number;   // Texture memory used (bytes)
    gpuMemory: number;       // Total GPU memory (bytes)
  };
  
  // Performance metrics
  performance: {
    fps: number;            // Current FPS
    frameTime: number;      // Time per frame (ms)
    batchEfficiency: number;// Batch efficiency score
    cacheHitRate: number;   // Cache hit rate
  };
}
```

### 3. Encoder Optimization

#### Configuration Options
```typescript
interface EncoderConfig {
  // Encoding preset (faster = lower quality but better performance)
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  
  // Hardware acceleration
  hwaccel: {
    enabled: boolean;
    device?: 'nvidia' | 'qsv' | 'amf' | 'videotoolbox';
    decode?: boolean;
    scaling?: boolean;
  };
  
  // Pipeline settings
  pipeline: {
    maxLatency: number;      // Maximum allowed latency (ms)
    dropThreshold: number;   // When to drop frames (ms)
    zeroCopy: boolean;       // Use zero-copy operations
    threads: number;         // Number of encoding threads
    cpuFlags?: string[];     // CPU-specific optimizations
  };
}
```

#### Tested Configurations

| Preset    | HW Accel | Threads | Zero Copy | FPS | CPU % | Memory | Notes |
|-----------|----------|---------|-----------|-----|-------|---------|-------|
| ultrafast | false    | 2       | true      | TBD | TBD   | TBD     | Baseline |

### 4. Frame Pipeline Optimization

#### Configuration Options
```typescript
interface PipelineConfig {
  maxQueueSize: number;  // Maximum frames in queue
  poolSize: number;      // Worker pool size
  quality: number;       // Image quality (1-100)
  format: 'raw' | 'jpeg' | 'png';  // Frame format
}
```

#### Tested Configurations

| Queue Size | Pool Size | Quality | Format | FPS | Memory | Drops | Notes |
|------------|-----------|---------|--------|-----|---------|--------|-------|
| 30         | 4         | 85      | raw    | TBD | TBD     | TBD    | Baseline |

### 5. RTMP Server Optimization

#### Configuration Options
```typescript
interface RTMPConfig {
  chunk_size: number;     // RTMP chunk size
  gop_cache: boolean;     // Group of Pictures cache
  ping: number;          // Ping interval (seconds)
  ping_timeout: number;  // Ping timeout (seconds)
}
```

#### Tested Configurations

| Chunk Size | GOP Cache | Ping | Timeout | Bandwidth | Latency | Notes |
|------------|-----------|------|---------|-----------|---------|-------|
| 60000      | true      | 30   | 60      | TBD       | TBD     | Baseline |

## Performance Metrics

### Available Metrics
```typescript
interface StreamMetrics {
  // Stream health
  fps: number;
  bitrate: number;
  droppedFrames: number;
  encoderLatency: number;
  bufferHealth: number;
  
  // Resource usage
  cpuUsage: number;
  memoryUsage: number;
}
```

### Prometheus Metrics

- `stream_manager_encoding_time_ms`: Frame encoding time
- `stream_manager_bitrate_kbps`: Stream bitrate
- `stream_manager_fps`: Current FPS
- `stream_manager_dropped_frames`: Number of dropped frames
- `stream_manager_queue_size`: Frame queue size
- `stream_manager_memory_bytes`: Memory usage

## Test Results

### Baseline Performance (Default Configuration)
```typescript
// Test configuration
const config = {
  encoder: {
    preset: 'ultrafast',
    hwaccel: { enabled: false },
    pipeline: {
      maxLatency: 1000,
      dropThreshold: 500,
      zeroCopy: true,
      threads: 2
    }
  },
  pipeline: {
    maxQueueSize: 30,
    poolSize: 4,
    quality: 85,
    format: 'raw'
  }
};

// Results: TBD
```

## Optimization Strategies

### 1. Memory Optimization
- [ ] Implement buffer pooling
- [ ] Optimize frame queue size
- [ ] Add memory pressure monitoring
- [ ] Implement automatic cleanup

### 2. CPU Optimization
- [ ] Enable hardware acceleration
- [ ] Optimize thread count
- [ ] Test different presets
- [ ] Enable CPU-specific flags

### 3. Frame Pipeline Optimization
- [ ] Test different queue sizes
- [ ] Optimize worker pool size
- [ ] Test format conversion impact
- [ ] Implement frame dropping strategy

### 4. Network Optimization
- [ ] Optimize chunk sizes
- [ ] Test GOP cache impact
- [ ] Implement bandwidth monitoring
- [ ] Add network quality metrics

## Best Practices

1. **Memory Management**
   - Use buffer pooling for frame data
   - Implement proper cleanup
   - Monitor heap usage
   - Track GC pauses

2. **CPU Usage**
   - Match thread count to CPU cores
   - Use hardware acceleration when available
   - Monitor CPU usage per component
   - Track encoding times

3. **Frame Processing**
   - Balance queue size with memory
   - Monitor frame drops
   - Track processing times
   - Optimize worker distribution

4. **Network**
   - Monitor RTMP connection health
   - Track bandwidth usage
   - Monitor latency
   - Handle connection drops

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check frame queue size
   - Monitor buffer pool
   - Look for memory leaks
   - Check GC patterns

2. **Frame Drops**
   - Check encoding times
   - Monitor queue size
   - Check CPU usage
   - Verify network capacity

3. **High Latency**
   - Check network conditions
   - Monitor buffer health
   - Check encoding times
   - Verify frame timing

## Future Optimizations

- [ ] Implement adaptive bitrate
- [ ] Add quality scaling under load
- [ ] Implement smart worker scaling
- [ ] Add network quality adaptation

## System-wide Timing Analysis

### Critical Path Timers
```typescript
interface SystemTimers {
  // Frame generation path
  frame: {
    generation: number;     // Frame generation time
    preprocessing: number;  // Preprocessing time
    composition: number;    // Composition time
    encoding: number;      // Encoding time
    total: number;         // Total frame time
  };
  
  // Core component path
  core: {
    assetLoad: number;     // Asset loading time
    layoutUpdate: number;  // Layout update time
    viewportUpdate: number;// Viewport update time
    renderSetup: number;   // Render setup time
  };
  
  // Pipeline path
  pipeline: {
    queueTime: number;     // Time in queue
    processingTime: number;// Processing time
    encoderLatency: number;// Encoder latency
    networkLatency: number;// Network latency
  };
}
```

### Performance Monitoring Points
```typescript
const MONITORING_POINTS = {
  // Core components
  ASSET_LOAD_START: 'asset:load:start',
  ASSET_LOAD_END: 'asset:load:end',
  LAYOUT_UPDATE_START: 'layout:update:start',
  LAYOUT_UPDATE_END: 'layout:update:end',
  
  // Rendering
  RENDER_SETUP_START: 'render:setup:start',
  RENDER_SETUP_END: 'render:setup:end',
  RENDER_FRAME_START: 'render:frame:start',
  RENDER_FRAME_END: 'render:frame:end',
  
  // Pipeline
  PIPELINE_QUEUE_START: 'pipeline:queue:start',
  PIPELINE_PROCESS_START: 'pipeline:process:start',
  PIPELINE_PROCESS_END: 'pipeline:process:end',
  
  // Encoding
  ENCODE_START: 'encode:start',
  ENCODE_END: 'encode:end',
  
  // Network
  NETWORK_SEND_START: 'network:send:start',
  NETWORK_SEND_END: 'network:send:end'
};
``` 