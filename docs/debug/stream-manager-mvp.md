# Stream Manager MVP Testing & Debugging Guide

This document outlines the methodical approach to testing, debugging, and validating the Stream Manager MVP functionality. The goal is to systematically verify each component and ensure they work together correctly.

## Visual Stream Verification

The stream manager generates test frames internally. Use VLC to visually verify the output:

### Installation
```bash
# macOS
brew install vlc

# Ubuntu/Debian
sudo apt-get install vlc
```

### Quick Visual Check
```bash
# Start the stream manager with test frame generation
npm run debug:stream

# In another terminal, view the output stream
vlc rtmp://sothebais.com:1935/live/test

# For lower latency viewing
vlc --network-caching=100 rtmp://sothebais.com:1935/live/test
```

**What to verify visually:**
- [ ] Stream connects and displays
- [ ] Frames are updating at expected FPS
- [ ] No visible artifacts or corruption
- [ ] Test pattern is correct
- [ ] Timestamp is updating

**Known Issues to Fix:**
1. Frame dropping
   - Current: ~11 FPS instead of target FPS
   - Possible causes:
     - Encoder performance (check FFmpeg CPU usage)
     - Network bandwidth limitations
     - Buffer size configuration
   - Metrics to monitor:
     ```typescript
     {
       droppedFrames: number;
       currentFPS: number;
       encoderLatency: number;
       bufferHealth: number;
     }
     ```

2. Text Rendering Issues
   - Current: Blue background with misrendered text blocks
   - Areas to investigate:
     - SVG generation in test pattern
     - Font availability in container
     - Sharp image processing settings
     - Color space conversion
   - Verification steps:
     ```typescript
     // Test pattern generation
     const svg = `
       <svg width="${width}" height="${height}">
         <rect width="100%" height="100%" fill="#001f3f"/>
         <text x="50%" y="50%" font-family="Arial" font-size="40" fill="white" text-anchor="middle">
           Test Text
         </text>
       </svg>
     `;
     ```

## Prerequisites

Before starting:
1. Ensure all dependencies are installed: `npm install`
2. Build the project: `npm run build`
3. Install VLC for visual verification

## Testing Methodology

### 1. Core System Health

Start with basic system functionality verification:

```bash
# Start with debug logging enabled
npm run dev:debug

# Monitor network connections
npm run dev:network
```

**What to verify:**
- [ ] Service starts without errors
- [ ] RTMP server binds successfully
- [ ] WebSocket server initializes
- [ ] Redis connection established
- [ ] Worker pool initializes

**Common issues:**
- Port conflicts (RTMP:1935, API:3000, WS:8080)
- Redis connection failures
- Worker initialization errors

### 2. Worker Pool Verification

Verify the worker system is functioning:

```bash
# Debug worker pool
npm run debug:workers

# Analyze task distribution
npm run debug:tasks
```

**Success criteria:**
- [ ] Workers spawn correctly
- [ ] Tasks are distributed evenly
- [ ] No worker crashes
- [ ] Memory usage is stable
- [ ] Task queue doesn't grow unbounded

**Metrics to monitor:**
```typescript
interface WorkerMetrics {
  activeWorkers: number;
  queueLength: number;
  avgProcessingTime: number;
  memoryPerWorker: number;
  taskCompletionRate: number;
}
```

### 3. Frame Pipeline Validation

Test the frame processing pipeline:

```bash
# Analyze frame timing
npm run debug:timing

# Check frame drops
npm run debug:frames

# Monitor buffer usage
npm run test:frames:buffer
```

**Pipeline checkpoints:**
1. Frame capture from RTMP
2. Frame preprocessing
3. Worker processing
4. Frame composition
5. Output encoding

**Success metrics:**
- [ ] Consistent FPS
- [ ] Minimal frame drops (<1%)
- [ ] Buffer utilization <80%
- [ ] Processing time < 16ms (60fps)
- [ ] No memory leaks

### 4. Memory Management

Verify memory usage patterns:

```bash
# Profile memory usage
npm run dev:memory

# Detect memory leaks
npm run test:memory:leaks

# Analyze garbage collection
npm run test:memory:gc
```

**Memory health indicators:**
- [ ] Stable heap usage
- [ ] Regular GC cycles
- [ ] No memory leaks
- [ ] Buffer pool efficiency
- [ ] No OOM risks

### 5. Stream Pipeline Testing

Test the complete streaming pipeline:

```bash
# Test single stream
npm run test:perf:stream

# Test multiple streams
npm run test:load -- --concurrent=3 --duration=300
```

**Test sequence:**
1. Start test stream
2. Verify RTMP ingestion
3. Check frame processing
4. Validate output quality
5. Monitor resource usage

## Component-Specific Testing

### RTMP Server
```typescript
interface RTMPTests {
  connection: {
    establish: boolean;
    authenticate: boolean;
    maintain: boolean;
  };
  streaming: {
    ingest: boolean;
    keyframes: boolean;
    bitrate: number;
  };
  recovery: {
    disconnect: boolean;
    reconnect: boolean;
    resume: boolean;
  };
}
```

### Worker Pool
```typescript
interface WorkerTests {
  initialization: {
    spawn: boolean;
    configure: boolean;
    connect: boolean;
  };
  processing: {
    distribute: boolean;
    execute: boolean;
    respond: boolean;
  };
  recovery: {
    crash: boolean;
    restart: boolean;
    rebalance: boolean;
  };
}
```

### Frame Pipeline
```typescript
interface FrameTests {
  capture: {
    receive: boolean;
    decode: boolean;
    buffer: boolean;
  };
  processing: {
    transform: boolean;
    compose: boolean;
    encode: boolean;
  };
  output: {
    buffer: boolean;
    stream: boolean;
    quality: boolean;
  };
}
```

## Debugging Common Issues

### 1. High Memory Usage
```bash
# Generate heap snapshot
npm run debug:heap

# Analyze memory leaks
npm run debug:leaks
```

**Check for:**
- Unbounded collections
- Frame buffer leaks
- Worker memory retention
- Cached resources

### 2. Frame Drops
```bash
# Monitor frame pipeline
npm run debug:frames

# Analyze timing
npm run debug:timing
```

**Common causes:**
- Worker pool overload
- Buffer overflow
- Network congestion
- CPU bottlenecks

### 3. Worker Issues
```bash
# Debug worker pool
npm run debug:workers

# Monitor tasks
npm run debug:tasks
```

**Verify:**
- Worker lifecycle
- Task distribution
- Error handling
- Resource cleanup

### 4. Network Issues
```bash
# Debug RTMP
npm run debug:rtmp

# Monitor WebSocket
npm run debug:ws
```

**Check:**
- Connection stability
- Bandwidth usage
- Protocol errors
- Latency spikes

## Performance Optimization

### 1. Worker Pool Optimization
- Adjust pool size based on CPU cores
- Optimize task distribution
- Implement work stealing
- Monitor worker health

### 2. Memory Management
- Use buffer pools
- Implement proper cleanup
- Monitor heap usage
- Track GC patterns

### 3. Frame Pipeline
- Optimize buffer sizes
- Reduce copying
- Improve encoding efficiency
- Balance quality vs performance

### 4. Network Performance
- Monitor connection health
- Optimize packet sizes
- Handle backpressure
- Implement recovery strategies

## MVP Success Criteria

### Core Functionality
- [ ] RTMP ingestion works reliably
- [ ] Frame processing is stable
- [ ] Output quality meets requirements
- [ ] Resource usage is optimized

### Performance Targets
- [ ] Support 3+ concurrent streams
- [ ] Maintain target FPS
- [ ] Keep memory usage stable
- [ ] Handle network issues gracefully

### Stability Requirements
- [ ] No crashes under normal load
- [ ] Proper error recovery
- [ ] Graceful degradation
- [ ] Monitoring and alerts

## Next Steps

After validating the MVP:
1. Load testing with more streams
2. Long-running stability tests
3. Error injection testing
4. Production environment testing

## Troubleshooting Guide

### System-wide Issues
1. Check system resources
2. Verify network connectivity
3. Monitor service logs
4. Check component health

### Component-specific Issues
1. RTMP server problems
2. Worker pool issues
3. Frame pipeline bottlenecks
4. Memory management problems

## Development Workflow

1. Start with basic functionality
2. Add instrumentation
3. Test components individually
4. Integrate and test together
5. Optimize based on metrics
6. Validate improvements
7. Document findings

Remember to use the debugging tools progressively and methodically. Don't try to optimize everything at once - focus on one component at a time and verify improvements with metrics. 