# Stream Manager Implementation Plan

## Overview

This document outlines the detailed implementation plan for the Stream Manager service, which is responsible for generating, composing, and streaming visual content to Twitter/X.com. The implementation is divided into phases, with each phase building upon the previous one.

## Current Progress

### ✅ Initial Setup (Completed)
- [x] Basic project structure created
- [x] Dependencies installed
- [x] TypeScript configuration set up
- [x] Docker integration configured

## Phase 1: Core Infrastructure Enhancement (Week 1)

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

### 1.4 Enhanced Error Handling ✅
Fully implemented:
- [x] Basic error handling in services
- [x] Global error handler
- [x] Error reporting system with Pino logger
- [x] Recovery strategies in place

### 1.5 Logging System ✅
New section - Completed:
- [x] Structured logging with Pino
- [x] Log levels configuration
- [x] Context-based logging
- [x] Pretty printing in development
- [x] Specialized logging methods for different contexts
- [x] Performance metrics logging
- [x] HTTP request logging
- [x] WebSocket event logging
- [x] Layer event logging

## Phase 2: Layer Management System (Week 2)

### 2.1 Layer Types and Interfaces ✅
```typescript
interface BaseLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform;
}

interface HostLayer extends BaseLayer {
  type: 'host';
  character: VTuberCharacter;
}

interface AssistantLayer extends BaseLayer {
  type: 'assistant';
  character: VTuberCharacter;
}

interface VisualFeedLayer extends BaseLayer {
  type: 'visualFeed';
  content: NFTContent;
}

interface OverlayLayer extends BaseLayer {
  type: 'overlay';
  content: OverlayContent;
}

interface ChatLayer extends BaseLayer {
  type: 'chat';
  content: {
    messages: ChatMessage[];
    maxMessages: number;
    style: {
      font: string;
      fontSize: number;
      textColor: string;
      backgroundColor: string;
      padding: number;
      messageSpacing: number;
      fadeOutOpacity: number;
    };
  };
}

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  highlighted: boolean;
}
```

### 2.2 Layer Manager Implementation ✅
Completed:
- [x] Layer creation and destruction
- [x] Z-index management
- [x] Layer visibility control
- [x] Layer transformation handling
- [x] Layer event system
- [x] Type-safe layer operations
- [x] Active layer management

### 2.3 Redis State Management ✅
- [x] Layer state serialization
- [x] Redis persistence implementation
- [x] State recovery on startup
- [x] Real-time state updates

## Phase 3: Graphics Pipeline (Week 3)

### 3.1 Canvas Management ⏳
In Progress:
- [x] Basic canvas setup
- [x] Multiple canvas contexts
- [x] High-quality rendering settings
- [x] Resolution management
- [ ] WebGL context initialization
- [ ] Render loop optimization
- [x] Demo stream card implementation

### 3.2 Layer Renderer Implementation ⏳
In Progress:
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
  - [x] Image rendering with aspect ratio
  - [x] Shape rendering (rectangle, circle, polygon)
  - [x] Gradient and shadow support
  - [x] Resource caching
- [x] Demo stream card
  - [x] Status card design
  - [x] Dynamic content updates
  - [x] Stream state visualization
  - [x] Error handling
  - [x] Loading states
- [ ] Performance optimization

### 3.3 Resource Management ⏳
In Progress:
- [x] Image caching system
- [x] Resource timeout handling
- [x] Memory usage optimization
- [x] Error recovery
- [ ] Asset preloading
- [ ] Garbage collection

### 3.4 FFmpeg Integration
Pending:
- [ ] FFmpeg process management
- [ ] Video encoding pipeline
- [ ] Audio mixing
- [ ] Stream format configuration

### 3.5 UI Enhancements
New section:
- [ ] Stream control panel
  - [ ] Stream status indicators
  - [ ] Quality settings
  - [ ] Bitrate control
  - [ ] Audio levels
  - [ ] Stream health metrics
- [ ] Layer management UI
  - [ ] Layer visibility toggles
  - [ ] Layer ordering controls
  - [ ] Transform controls
  - [ ] Effect controls
- [ ] Resource monitor
  - [ ] CPU usage
  - [ ] Memory usage
  - [ ] Network stats
  - [ ] Frame rate graph
- [ ] Chat integration
  - [ ] Chat overlay customization
  - [ ] User interaction controls
  - [ ] Moderation tools
  - [ ] Chat analytics
- [ ] Stream preview
  - [ ] Multiple quality levels
  - [ ] Latency indicator
  - [ ] Audio preview
  - [ ] Stream delay control

### 3.6 Backend Enhancements
New section:
- [ ] Stream state management
  - [ ] State persistence
  - [ ] Recovery mechanisms
  - [ ] State synchronization
- [ ] API extensions
  - [ ] Stream control endpoints
  - [ ] Layer management API
  - [ ] Resource management endpoints
  - [ ] Analytics API
- [ ] Metrics collection
  - [ ] Performance metrics
  - [ ] Resource usage
  - [ ] Stream quality metrics
  - [ ] Error tracking
- [ ] WebSocket improvements
  - [ ] Bi-directional updates
  - [ ] State synchronization
  - [ ] Real-time controls
  - [ ] Error handling

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

### 5.2 Stream Output
- [ ] RTMP stream setup
- [ ] Stream health monitoring
- [ ] Automatic reconnection
- [ ] Quality adjustment

### 5.3 Media Pipeline
- [ ] Video encoding optimization
- [ ] Audio processing
- [ ] Buffer management
- [ ] Latency optimization

## Phase 6: Performance Optimization (Week 6)

### 6.1 Resource Management
- [ ] Memory usage optimization
- [ ] Texture management
- [ ] Asset loading/unloading
- [ ] Garbage collection optimization

### 6.2 Rendering Optimization
- [ ] Layer culling
- [ ] Draw call batching
- [ ] GPU memory management
- [ ] Frame timing optimization

### 6.3 Monitoring and Profiling
- [ ] Performance metrics collection
- [ ] Bottleneck identification
- [ ] Automated performance testing
- [ ] Resource usage alerts

## Phase 7: Chat Integration and Interaction (Week 7)

### 7.1 Chat Display System
- [ ] Chat layer implementation
  - [ ] Message rendering with styles
  - [ ] Message animation (fade in/out)
  - [ ] Message scrolling
  - [ ] Message highlighting
  - [ ] Vertical layout in 25% screen width
  - [ ] Message queueing and cleanup
  - [ ] Performance optimization for large message volumes

### 7.2 Twitter Chat Integration
- [ ] Twitter chat API integration
  - [ ] Real-time message streaming
  - [ ] Message filtering and moderation
  - [ ] Rate limiting handling
  - [ ] Error recovery
  - [ ] Message format standardization

### 7.3 Auctioneer Chat Interaction
- [ ] Chat message analysis system
  - [ ] Message relevance scoring
  - [ ] Bid detection
  - [ ] Question detection
  - [ ] Sentiment analysis
- [ ] Auctioneer reaction system
  - [ ] Dynamic animation selection
  - [ ] Contextual responses
  - [ ] Emotion-based reactions
  - [ ] Interaction timing management

### 7.4 Layout Management
- [ ] Screen space optimization
  - [ ] 25% width allocation for chat and auctioneer
  - [ ] Dynamic resizing support
  - [ ] Responsive layout adjustments
  - [ ] Collision prevention
  - [ ] Visual hierarchy maintenance

### 7.5 Performance Optimization
- [ ] Message batching
- [ ] Render optimization
- [ ] Memory management
- [ ] Animation performance
- [ ] Resource usage monitoring

## Testing Strategy

### Unit Tests
- Layer management
- Animation system
- State persistence
- Configuration validation

### Integration Tests
- Graphics pipeline
- Twitter API integration
- WebSocket communication
- Redis state management

### Performance Tests
- FPS benchmarks
- Memory usage profiling
- Network latency testing
- Load testing

## Deployment Strategy

### Development
- Local development setup
- Docker compose configuration
- Hot reload support
- Debug logging

### Staging
- Performance monitoring
- Error tracking
- Load testing
- Integration testing

### Production
- High availability setup
- Automatic scaling
- Error recovery
- Monitoring alerts

## Success Metrics

### Performance
- Maintain 30-60 FPS
- < 2s end-to-end latency
- < 500MB memory usage
- < 50% CPU usage

### Reliability
- 99.9% uptime
- < 1s failover time
- Zero data loss
- Automatic recovery

### Quality
- 1080p output
- Consistent frame rate
- Clear audio
- Smooth animations

### Chat Performance
- < 500ms message display latency
- Smooth scrolling at 60 FPS
- Support for 100+ messages/minute
- < 100MB additional memory usage
- Zero message loss

### Interaction Quality
- < 2s auctioneer reaction time
- 95% message comprehension rate
- Natural animation transitions
- Consistent frame rate during reactions

## Timeline and Milestones

### Week 1
- Complete core infrastructure
- Basic metrics collection
- Error handling

### Week 2
- Layer management system
- Redis state persistence
- Basic layer operations

### Week 3
- Graphics pipeline
- Hardware acceleration
- Basic compositing

### Week 4
- Animation system
- Timeline management
- Basic animations

### Week 5
- Twitter integration
- Stream output
- Media pipeline

### Week 6
- Performance optimization
- Resource management
- Production readiness

### Week 7
- Chat system implementation
- Twitter chat integration
- Auctioneer interaction system
- Layout optimization
- Performance tuning

## Next Steps

1. Complete Phase 3:
   - Set up FFmpeg integration
   - Optimize render loop performance
   - Add asset preloading
   - Implement garbage collection

2. Begin Phase 4 (Animation System):
   - Design animation engine
   - Implement timeline system
   - Create animation types
   - Set up scheduling

## Recent Updates

1. Implemented Overlay Rendering:
   - Text rendering with advanced styles
   - Image rendering with aspect ratio
   - Shape rendering with gradients
   - Resource caching and management
   - Error handling and recovery

2. Enhanced Layer Renderer:
   - Integrated all renderer types
   - Improved error handling
   - Added loading states
   - Resource management

3. Resource Management:
   - Unified caching system
   - Timeout handling
   - Memory optimization
   - Error recovery strategies

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