# Stream Manager Implementation Plan

## Overview

This document outlines the detailed implementation plan for the Stream Manager service, which is responsible for generating, composing, and streaming visual content to Twitter/X.com. The implementation is divided into phases, with each phase building upon the previous one.

## Current Progress

### ✅ Initial Setup (Completed)
- [x] Basic project structure created
- [x] Dependencies installed
- [x] TypeScript configuration set up
- [x] Docker integration configured

## Phase 1: Core Infrastructure Enhancement (Week 1) ✅

### 1.1 Project Structure Setup ✅
```typescript
stream-manager/
├── src/
│   ├── config/           // Configuration management
│   │   ├── index.ts      ✅ Implemented with Zod
│   │   └── validation.ts ✅ Implemented with config validation
│   ├── types/           // TypeScript type definitions
│   │   ├── layers.ts    ✅ Implemented layer interfaces
│   │   ├── animation.ts ✅ Implemented animation types
│   │   └── stream.ts    ✅ Implemented streaming types
│   ├── utils/           // Utility functions
│   │   ├── logger.ts    ✅ Implemented with Pino
│   │   └── metrics.ts   ✅ Implemented with Prometheus
│   ├── services/        // Core services
│   │   ├── redis.ts     ✅ Implemented Redis service
│   │   └── websocket.ts ✅ Implemented WebSocket service
│   └── index.ts         ✅ Basic implementation complete
```

### 1.2 Configuration Management ✅
Implemented using Zod with the following features:
- [x] Environment variable validation
- [x] Type-safe configuration object
- [x] Configuration loading and validation
- [x] Default values for optional configs

Current configuration schema:
```typescript
const configSchema = z.object({
  // Server ports
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4200"),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4201"),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4290"),
  HEALTH_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4291"),

  // Redis configuration
  REDIS_URL: z.string().url().default("redis://redis:6379"),
  REDIS_PASSWORD: z.string().min(1).default("default_password"),

  // Twitter configuration (optional for initial setup)
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().optional(),

  // Rendering configuration
  MAX_LAYERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("50"),
  TARGET_FPS: z.string().transform(Number).pipe(z.number().min(1).max(60)).default("30"),
  RENDER_QUALITY: z.enum(["low", "medium", "high"]).default("high"),
  STREAM_RESOLUTION: z.string().regex(/^\d+x\d+$/).default("1920x1080"),
});
```

### 1.3 Metrics and Monitoring ✅
Fully implemented:
- [x] Basic metrics collector
- [x] FPS tracking
- [x] Memory usage monitoring
- [x] Prometheus metrics endpoint (port 4290)
- [x] Stream performance metrics
- [x] Resource usage tracking
- [x] Metrics dashboard integration
- [x] Layer-specific metrics
- [x] Render time tracking
- [x] Error tracking

### 1.4 Enhanced Error Handling ✅
Fully implemented:
- [x] Basic error handling in services
- [x] Global error handler
- [x] Error reporting system with Pino logger
- [x] Recovery strategies in place
- [x] Layer-specific error handling
- [x] Resource loading error handling
- [x] Graceful degradation

### 1.5 Logging System ✅
Completed:
- [x] Structured logging with Pino
- [x] Log levels configuration
- [x] Context-based logging
- [x] Pretty printing in development
- [x] Specialized logging methods for different contexts
- [x] Performance metrics logging
- [x] HTTP request logging
- [x] WebSocket event logging
- [x] Layer event logging
- [x] Resource loading logging

## Phase 2: Layer Management System (Week 2) ✅

### 2.1 Layer Types and Interfaces ✅
All layer types implemented with full TypeScript support:
- [x] Base Layer interface
- [x] Host Layer
- [x] Assistant Layer
- [x] Visual Feed Layer
- [x] Overlay Layer
- [x] Chat Layer

### 2.2 Layer Manager Implementation ✅
Completed:
- [x] Layer creation and destruction
- [x] Z-index management
- [x] Layer visibility control
- [x] Layer transformation handling
- [x] Layer event system
- [x] Type-safe layer operations
- [x] Active layer management
- [x] Layer caching system
- [x] Resource cleanup

### 2.3 Redis State Management ✅
- [x] Layer state serialization
- [x] Redis persistence implementation
- [x] State recovery on startup
- [x] Real-time state updates
- [x] Cache invalidation
- [x] Error recovery

## Phase 3: Graphics Pipeline (Week 3) ✅

### 3.1 Canvas Management ✅
Completed:
- [x] Basic canvas setup
- [x] Multiple canvas contexts
- [x] High-quality rendering settings
- [x] Resolution management
- [x] WebGL context initialization
- [x] Render loop optimization
- [x] Demo stream card implementation
- [x] Performance optimizations
- [x] Resource caching

### 3.2 Layer Renderer Implementation ✅
Completed:
- [x] Basic rendering pipeline
- [x] Layer transformation
- [x] Layer compositing
- [x] FPS control
- [x] Character rendering
  - [x] Resource loading and caching
  - [x] Model and texture compositing
  - [x] Loading and error states
  - [x] Performance metrics
- [x] Visual feed rendering
  - [x] NFT image loading
  - [x] Aspect ratio preservation
  - [x] Metadata overlay
  - [x] Resource caching
- [x] Overlay rendering
  - [x] Text rendering with styles
    - [x] Multiple font families (sans, serif, mono)
    - [x] Font weights and styles
    - [x] Font caching with TTL
    - [x] Text alignment options
    - [x] Line height control
    - [x] Letter spacing
    - [x] Maximum width/lines
    - [x] Ellipsis support
  - [x] Image rendering with aspect ratio
  - [x] Shape rendering
    - [x] Rectangle (with border radius)
    - [x] Circle
    - [x] Polygon
    - [x] Line
    - [x] SVG-based rendering
    - [x] Color and opacity support
  - [x] Animation support
    - [x] GIF animation
    - [x] Sprite sheet animation
    - [x] Frame-by-frame animation
    - [x] Animation effects
      - [x] Fade
      - [x] Scale
      - [x] Rotate
      - [x] Slide
    - [x] Easing functions
    - [x] Event handling (onStart, onFrame, onComplete)
    - [x] Performance monitoring
  - [x] Resource caching
- [x] Demo stream card
  - [x] Status card design
  - [x] Dynamic content updates
  - [x] Stream state visualization
  - [x] Error handling
  - [x] Loading states

### 3.3 Resource Management ✅
Completed:
- [x] Image caching system
- [x] Resource timeout handling
- [x] Memory usage optimization
- [x] Error recovery
- [x] Asset preloading
- [x] Garbage collection
- [x] Cache invalidation
- [x] Resource cleanup

### 3.4 Performance Monitoring ✅
Completed:
- [x] Frame processing metrics
  - [x] Frames processed counter
  - [x] Processing time tracking
  - [x] Memory usage monitoring
- [x] Animation metrics
  - [x] Active animations gauge
  - [x] Animation processing time
  - [x] Animation memory usage
- [x] Resource metrics
  - [x] Cache hit rates
  - [x] Memory consumption
  - [x] Load times
- [x] Error tracking
  - [x] Error rates by type
  - [x] Recovery times
  - [x] Resource failures

## Phase 4: Animation System (Week 4)

### 4.1 Animation Engine
```typescript
interface Animation {
  id: string;
  target: string; // Layer ID
  property: string;
  startValue: any;
  endValue: any;
  duration: number;
  easing: EasingFunction;
  delay?: number;
}

interface Timeline {
  id: string;
  animations: Animation[];
  duration: number;
  loop?: boolean;
}
```

### 4.2 Animation Types
- [ ] Basic property animations
- [ ] Transform animations
- [ ] Path animations
- [ ] Keyframe animations
- [ ] Spring physics

### 4.3 Animation Scheduling
- [ ] Timeline management
- [ ] Animation queuing
- [ ] Synchronization
- [ ] Event triggers

## Phase 5: Twitter Integration (Week 5)

### 5.1 Twitter API Setup
- [ ] API client implementation
- [ ] Authentication handling
- [ ] Rate limit management
- [ ] Error recovery

### 5.2 Stream Output ✅
- [x] RTMP stream setup
- [x] Stream health monitoring
- [x] Automatic reconnection
- [x] Quality adjustment
- [x] Hardware acceleration
- [x] Error recovery
- [x] Performance monitoring

### 5.3 Media Pipeline ✅
- [x] Video encoding optimization
  - [x] Multiple codec support (h264, vp8, vp9)
  - [x] Hardware acceleration (NVENC, QSV, VA-API)
  - [x] Quality presets
  - [x] GOP optimization
- [x] Audio processing
  - [x] Basic audio support
  - [x] Multiple codec support (AAC, Opus)
  - [x] Configurable bitrate
- [x] Buffer management
  - [x] Backpressure handling
  - [x] Frame dropping detection
  - [x] Memory optimization
- [x] Latency optimization
  - [x] Frame timing control
  - [x] Stream format optimization
  - [x] Buffer size tuning

### 5.4 Advanced Media Features (New)
- [ ] Enhanced Audio Pipeline
  - [ ] Real audio input support
  - [ ] Audio mixing and filters
  - [ ] Volume normalization
  - [ ] Multiple audio tracks
- [ ] Advanced Video Features
  - [ ] Multiple output streams
  - [ ] Adaptive bitrate streaming
  - [ ] Scene-based encoding
  - [ ] Content-aware quality control

## Phase 6: Performance Optimization (Week 6)

### 6.1 Resource Management ✅
- [x] Memory usage optimization
  - [x] Buffer pooling
  - [x] Cache management
  - [x] Memory limits
- [x] Asset management
  - [x] Resource loading/unloading
  - [x] Cache invalidation
  - [x] Garbage collection
- [x] Performance monitoring
  - [x] Memory tracking
  - [x] CPU usage monitoring
  - [x] Resource metrics

### 6.2 Rendering Optimization ✅
- [x] Layer optimization
  - [x] Efficient compositing
  - [x] Layer caching
  - [x] Transform optimization
- [x] GPU utilization
  - [x] Hardware acceleration
  - [x] Memory management
  - [x] Pipeline optimization
- [x] Frame timing
  - [x] FPS control
  - [x] Frame synchronization
  - [x] Latency management

### 6.3 Advanced Optimizations (New)
- [ ] Enhanced GPU Features
  - [ ] Multi-GPU support
  - [ ] Zero-copy transfers
  - [ ] Advanced memory management
- [ ] Pipeline Optimization
  - [ ] Thread pool management
  - [ ] SIMD operations
  - [ ] Parallel processing
- [ ] Quality Optimization
  - [ ] Content-aware encoding
  - [ ] Dynamic quality adjustment
  - [ ] Bandwidth optimization

## Phase 7: Chat Integration and Interaction (Week 7)

### 7.1 Chat Display System ✅
- [x] Chat layer implementation
  - [x] Message rendering with styles
  - [x] Message animation (fade in/out)
  - [x] Message scrolling
  - [x] Message highlighting
  - [x] Vertical layout in 25% screen width
  - [x] Message queueing and cleanup
  - [x] Performance optimization for large message volumes

### 7.2 Chat Performance Optimization ✅
- [x] Message batching
- [x] Render optimization
- [x] Memory management
- [x] Animation performance
- [x] Resource usage monitoring

### 7.3 Advanced Chat Features (New)
- [ ] Enhanced Message Processing
  - [ ] Message filtering and moderation
  - [ ] Message prioritization
  - [ ] Spam detection
  - [ ] Content analysis
- [ ] Interactive Features
  - [ ] User mentions highlighting
  - [ ] Emoji reactions
  - [ ] Message threading
  - [ ] User interaction tracking
- [ ] Performance Features
  - [ ] Message virtualization
  - [ ] Lazy loading
  - [ ] Advanced caching
  - [ ] Memory optimization

### 7.4 Twitter Integration
- [ ] Chat API Integration
  - [ ] Real-time message streaming
  - [ ] Rate limit management
  - [ ] Error recovery
  - [ ] Message format standardization
- [ ] Interaction System
  - [ ] Message analysis
  - [ ] Bid detection
  - [ ] Question detection
  - [ ] Sentiment analysis
- [ ] Auctioneer Integration
  - [ ] Dynamic animation triggers
  - [ ] Contextual responses
  - [ ] Interaction timing
  - [ ] State management

## Implementation Progress

### Advanced Media Features
- [x] Process Management
  - [x] Process spawning and termination
  - [x] Error handling and recovery
  - [x] Automatic restart on failure
  - [x] Graceful shutdown
- [x] Video Encoding Pipeline
  - [x] Raw video frame input
  - [x] Multiple codec support (h264, vp8, vp9)
  - [x] Quality presets
  - [x] Bitrate control
  - [x] GOP size optimization
- [x] Basic Audio Support
  - [x] Null source audio
  - [x] Multiple codec support (aac, opus)
  - [x] Configurable bitrate
- [x] Stream Format Configuration
  - [x] Resolution control
  - [x] FPS control
  - [x] Format settings (FLV/RTMP)
- [x] Hardware Acceleration
  - [x] NVIDIA NVENC
  - [x] Intel QuickSync
  - [x] VA-API
  - [x] Apple VideoToolbox
- [x] Quality Management
  - [x] Dynamic bitrate adjustment
  - [x] FPS control
  - [x] Preset selection
- [x] Performance Monitoring
  - [x] Encoding time tracking
  - [x] Bitrate monitoring
  - [x] FPS monitoring
  - [x] CPU usage tracking
  - [x] Memory usage tracking

## Remaining Tasks

### 1. Advanced Media Features
- [ ] Enhanced Audio Features
  - [ ] Real audio input support
  - [ ] Audio mixing and filters
  - [ ] Volume normalization
  - [ ] Multiple audio tracks
- [ ] Enhanced Hardware Acceleration
  - [ ] AMD AMF support
  - [ ] Multiple GPU support
  - [ ] Hardware decoding
  - [ ] Zero-copy pipeline
- [ ] Advanced Streaming Features
  - [ ] Multiple output streams
  - [ ] Adaptive bitrate
  - [ ] Stream reconnection
  - [ ] Stream health monitoring

### 2. Animation System
- [ ] Frame blending for smoother transitions
- [ ] Animation sequences
- [ ] Keyframe animation
- [ ] Path animation
- [ ] Spring physics
- [ ] Timeline management
- [ ] Animation synchronization

### 3. Production Readiness
- [ ] Comprehensive logging
- [ ] Health checks
- [ ] Monitoring alerts
- [ ] Deployment scripts
- [ ] Failover handling
- [ ] Backup systems
- [ ] Documentation

### 4. Sharp Integration (Performance Optimization)
- [ ] Setup Sharp with optimal configuration
- [ ] Implement layer composition
- [ ] Add effect processing
- [ ] Create caching system
- [ ] Implement error handling
- [ ] Add performance monitoring

### 5. Frame Buffer Implementation
- [ ] Create frame buffer manager
- [ ] Implement basic drawing operations
- [ ] Add text rendering
- [ ] Optimize memory usage
- [ ] Add buffer pooling
- [ ] Implement thread safety

### 6. Chat System Enhancement
- [ ] Enhanced Message Processing
  - [ ] Message filtering and moderation
  - [ ] Message prioritization
  - [ ] Spam detection
  - [ ] Content analysis
- [ ] Interactive Features
  - [ ] User mentions highlighting
  - [ ] Emoji reactions
  - [ ] Message threading
  - [ ] User interaction tracking
- [ ] Performance Features
  - [ ] Message virtualization
  - [ ] Lazy loading
  - [ ] Advanced caching
  - [ ] Memory optimization
- [ ] Chat API Integration
  - [ ] Real-time message streaming
  - [ ] Rate limit management
  - [ ] Error recovery
  - [ ] Message format standardization
- [ ] Interaction System
  - [ ] Message analysis
  - [ ] Bid detection
  - [ ] Question detection
  - [ ] Sentiment analysis
- [ ] Auctioneer Integration
  - [ ] Dynamic animation triggers
  - [ ] Contextual responses
  - [ ] Interaction timing
  - [ ] State management

## Recent Updates

1. FFmpeg Integration:
   - Implemented FFmpegService with process management
   - Added support for multiple codecs and hardware acceleration
   - Implemented performance monitoring and metrics
   - Added error handling and automatic recovery
   - Integrated basic audio support

2. Enhanced Shape Rendering:
   - Added SVG-based shape rendering
   - Implemented multiple shape types
   - Added style support (color, opacity)
   - Improved performance with caching

3. Improved Text Rendering:
   - Multiple font families
   - Font weights and styles
   - Advanced text layout
   - Performance optimizations
   - Caching system

## Optimized Streaming Architecture

### Overview
Replacing the Canvas-based rendering with a more efficient streaming pipeline using Sharp, direct frame buffer manipulation, and FFmpeg integration. This new architecture aims to improve performance from 3 FPS to stable 30+ FPS on Linux VPS environments.

### Components

#### 1. Sharp Integration (Image Processing Layer)
```typescript
interface SharpRenderer {
  width: number;
  height: number;
  composite(layers: ImageLayer[]): Promise<Buffer>;
  processEffects(buffer: Buffer): Promise<Buffer>;
}
```

Responsibilities:
- High-performance image composition
- Layer blending and effects
- Image scaling and transformations
- Memory-efficient processing
- Format conversions

Dependencies:
- sharp: ^0.32.0
- @types/sharp

#### 2. Frame Buffer Manager (Raw Pixel Layer)
```typescript
interface FrameBufferManager {
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
  setPixel(x: number, y: number, rgba: RGBA): void;
  drawRect(x: number, y: number, w: number, h: number, style: Style): void;
  drawText(text: string, x: number, y: number, style: TextStyle): void;
  getBuffer(): Buffer;
}
```

Responsibilities:
- Direct pixel manipulation
- Basic shape rendering
- Text rendering
- Custom effects
- Buffer management

Dependencies:
- node-ffi-napi (for potential hardware acceleration)

#### 3. FFmpeg Integration (Encoding Layer)
```typescript
interface StreamEncoder {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  
  sendFrame(buffer: Buffer): void;
  updateBitrate(newBitrate: number): void;
  updateFPS(newFPS: number): void;
}
```

Responsibilities:
- Frame encoding
- Stream packaging
- Protocol handling
- Quality management
- Performance monitoring

Dependencies:
- fluent-ffmpeg
- @types/fluent-ffmpeg

### Implementation Plan

#### Phase 1: Sharp Integration (Week 1)
- [ ] Setup Sharp with optimal configuration
- [ ] Implement layer composition
- [ ] Add effect processing
- [ ] Create caching system
- [ ] Implement error handling
- [ ] Add performance monitoring

#### Phase 2: Frame Buffer Implementation (Week 1-2)
- [ ] Create frame buffer manager
- [ ] Implement basic drawing operations
- [ ] Add text rendering
- [ ] Optimize memory usage
- [ ] Add buffer pooling
- [ ] Implement thread safety

#### Phase 3: FFmpeg Integration (Week 2)
- [ ] Setup FFmpeg pipeline
- [ ] Implement frame encoding
- [ ] Add quality management
- [ ] Create monitoring system
- [ ] Implement error recovery
- [ ] Add performance optimization

### Performance Targets

1. Frame Rate:
   - Minimum: 30 FPS
   - Target: 60 FPS
   - Maximum latency: 100ms

2. Memory Usage:
   - Maximum: 512MB
   - Target: 256MB
   - Buffer pool size: 32MB

3. CPU Usage:
   - Maximum: 50% (single core)
   - Target: 30% (single core)
   - Thread pool: 4 workers

### Error Handling

1. Sharp Errors:
   - Image loading failures
   - Composition errors
   - Memory limits
   - Recovery strategies

2. Frame Buffer Errors:
   - Memory allocation
   - Buffer overflow
   - Thread safety
   - Cleanup procedures

3. FFmpeg Errors:
   - Encoding failures
   - Stream disconnections
   - Quality degradation
   - Recovery procedures

### Monitoring

1. Performance Metrics:
   - FPS counter
   - Frame timing
   - Memory usage
   - CPU usage
   - Buffer utilization

2. Quality Metrics:
   - Encoding quality
   - Frame drops
   - Latency
   - Bitrate stability

3. Error Metrics:
   - Error rates
   - Recovery times
   - Component health
   - Resource usage

### Example Implementation

```typescript
class OptimizedStreamManager {
  private sharpRenderer: SharpRenderer;
  private frameBuffer: FrameBufferManager;
  private encoder: StreamEncoder;
  
  async renderFrame(layers: Layer[]): Promise<void> {
    // 1. Composite layers with Sharp
    const composited = await this.sharpRenderer.composite(layers);
    
    // 2. Apply real-time effects via frame buffer
    this.frameBuffer.writeBuffer(composited);
    this.frameBuffer.applyEffects();
    
    // 3. Encode and stream via FFmpeg
    this.encoder.sendFrame(this.frameBuffer.getBuffer());
  }
  
  async updateQuality(params: QualityParams): Promise<void> {
    // Dynamic quality adjustment
    this.encoder.updateBitrate(params.bitrate);
    this.encoder.updateFPS(params.fps);
  }
}
```

## Implementation Details

### Types System
We've implemented a comprehensive type system that includes:

#### Layer Types
```typescript
export interface BaseLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform;
}

export type Layer = HostLayer | AssistantLayer | VisualFeedLayer | OverlayLayer;
```

#### Animation System
```typescript
export interface Animation {
  id: string;
  targetLayerId: string;
  property: AnimatableProperty;
  startValue: AnimationValue;
  endValue: AnimationValue;
  duration: number;
  easing: EasingFunction;
}
```

#### Streaming System
```typescript
export interface StreamConfig {
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  quality: 'low' | 'medium' | 'high';
}
```

### Services

#### Redis Service
- Connection management
- Layer state persistence
- Error handling and reconnection

#### WebSocket Service
- Real-time updates
- Client management
- Message broadcasting
- Error handling

## Testing Strategy

### Unit Tests (To Be Implemented)
- Configuration validation
- Layer management
- Animation system
- State persistence

### Integration Tests (To Be Implemented)
- Redis integration
- WebSocket communication
- Graphics pipeline
- Stream output

## Deployment

Currently running in Docker with the following configuration:
- Node.js 18+ Alpine base image
- Required system dependencies installed
- Volume mounts for development
- Health checks configured
- Exposed ports: 4200, 4201, 4290, 4291

## Known Issues

1. TypeScript configuration needs adjustment for Node.js types
2. Logger implementation pending
3. Main application entry point needs updating
4. Prometheus metrics endpoint not yet implemented

## Success Metrics (To Be Implemented)

- Performance monitoring
- Error rate tracking
- Resource usage metrics
- Stream quality metrics

## Implementation Details

### FFmpeg Service
```typescript
interface FFmpegConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  streamUrl: string;
  hwaccel?: 'nvenc' | 'qsv' | 'vaapi' | 'videotoolbox';
  audioEnabled?: boolean;
  audioCodec?: 'aac' | 'opus';
  audioBitrate?: number;
}

class FFmpegService extends EventEmitter {
  // Process management
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async sendFrame(frameBuffer: Buffer): Promise<void>;
  updateConfig(newConfig: Partial<FFmpegConfig>): void;

  // Events
  on('streamStart', () => void);
  on('streamStop', () => void);
  on('frameEncoded', (info: { frameNumber: number, encodingTime: number }) => void);
  on('error', (error: Error) => void);
  on('exit', (info: { code: number | null, signal: NodeJS.Signals | null }) => void);
  on('maxRestartsReached', () => void);
}
```

### Performance Metrics
```typescript
// FFmpeg metrics
stream_manager_ffmpeg_encoding_time_ms
stream_manager_ffmpeg_bitrate_kbps
stream_manager_ffmpeg_fps
stream_manager_ffmpeg_cpu_percent
stream_manager_ffmpeg_memory_bytes
```

### Error Handling
1. Process Errors:
   - Automatic restart on failure
   - Maximum restart attempts
   - Graceful shutdown
   - Error event emission

2. Stream Errors:
   - Backpressure handling
   - Frame dropping detection
   - Stream reconnection
   - Error logging

3. Configuration Errors:
   - Config validation
   - Safe defaults
   - Graceful fallbacks
   - Error reporting

### FFmpeg Command Arguments
```bash
# Input options
-f rawvideo          # Input format
-pix_fmt rgba        # Pixel format
-s 1920x1080        # Resolution
-r 30               # FPS
-i pipe:0           # Read from stdin

# Hardware acceleration
-hwaccel nvenc      # NVIDIA GPU acceleration

# Video encoding
-c:v h264_nvenc     # Video codec
-b:v 4000k          # Video bitrate
-maxrate 6000k      # Maximum bitrate
-bufsize 8000k      # Buffer size
-preset veryfast    # Encoding preset
-g 60               # GOP size (2 seconds)
-keyint_min 30      # Minimum keyframe interval

# Audio options
-f lavfi            # Audio input format
-i anullsrc         # Null audio source
-c:a aac            # Audio codec
-b:a 128k           # Audio bitrate

# Output options
-f flv              # Output format
-flvflags no_duration_filesize
-shortest           # End with shortest stream
rtmp://server/live  # Output URL
``` 