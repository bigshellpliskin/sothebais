# Stream Manager Service

## Overview

The Stream Manager is responsible for generating, composing, and streaming visual content to Twitter/X.com. It handles real-time graphics composition, animations, and layer management while maintaining high performance and low latency.

## Current Implementation

### Core Components
- Express HTTP server (port 4200)
- WebSocket server (port 4201)
- Health check server (port 4291)
- Metrics endpoint (port 4290)
- @napi-rs/canvas for graphics rendering
- Redis integration for state management

### System Requirements

#### Container Environment
- Docker and Docker Compose
- Node.js 18+ (handled by container)
- Alpine Linux packages (automatically installed):
  - Python3 and py3-setuptools for builds
  - build-base and g++ for native modules
  - Cairo and Pango for graphics
  - FFmpeg for video processing
  - curl for health checks
  - pixman-dev for @napi-rs/canvas
  - pkgconfig and libc6-compat for dependencies

#### Development Requirements
For local development outside containers:
```bash
# Ubuntu/Debian
apt-get update && apt-get install -y \
  python3 \
  build-essential \
  cairo-dev \
  jpeg-dev \
  pango-dev \
  ffmpeg \
  curl \
  pixman-dev \
  pkg-config

# macOS
brew install \
  python3 \
  cairo \
  pango \
  jpeg \
  ffmpeg \
  pixman \
  pkg-config

# Alpine Linux
apk add --no-cache \
  python3 \
  py3-setuptools \
  build-base \
  g++ \
  cairo-dev \
  jpeg-dev \
  pango-dev \
  ffmpeg \
  curl \
  pixman-dev \
  pkgconfig \
  libc6-compat
```

## Quick Start

1. **Using Docker (Recommended)**:
```bash
# Start the service
docker compose up stream-manager
```

2. **Local Development**:
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Architecture

### 1. Current Components

#### 1.1 Server Components
- Express HTTP server (port 4200)
- WebSocket server (port 4201)
- Health check server (port 4291)
- Metrics endpoint (port 4290)

#### 1.2 Graphics System
- @napi-rs/canvas for high-performance graphics
- Hardware-accelerated when available
- Canvas-based composition and rendering

#### 1.3 Data Management
- Redis for state management and caching
- WebSocket for real-time updates
- Health monitoring and metrics collection

### 2. Planned Components

#### 2.1 Layer Management System
- Hierarchical layer system with z-index ordering
- Support for multiple layer types:
  - Host Layer (VTuber character)
  - Assistant Layer (Secondary characters)
  - Visual Feed Layer (NFT displays, bid information)
  - Overlay Layer (Text, graphics, effects)
- Real-time layer manipulation and state management
- Redis-backed persistence for layer states

#### 2.2 Composition Engine
Using @napi-rs/canvas for high-performance graphics:
- Hardware-accelerated when available
- Fallback to software rendering
- WebGL support for complex effects
- FFmpeg integration for video output

#### 2.3 Animation System
- Timeline-based animation engine
- Support for multiple animation types:
  - Transitions (fade, slide, scale)
  - Keyframe animations
  - Path-based movements
  - Property animations
- Easing functions and interpolation
- Animation scheduling and synchronization

#### 2.4 Twitter/X Integration
- Twitter API v2 integration
- Live streaming protocol support
- Media encoding pipeline
- Connection management and error recovery
- Rate limiting and quota management

### 3. Technical Implementation

#### 3.1 Current Architecture
```
[Express Server] → [WebSocket Server] → [Canvas Renderer] → [Redis Cache]
```

#### 3.2 Planned Pipeline
```
[Layer Manager] → [Compositor] → [Animation Engine] → [Encoder] → [Twitter Output]
```

#### 3.3 Performance Targets
- Current: 30 FPS with basic canvas operations
- Planned: 30-60 FPS with full animation pipeline
- Maximum latency: 2-3 seconds
- Resource usage optimization
- Memory management for textures and buffers
- Garbage collection optimization

#### 3.4 Quality Settings
- Resolution: 1920x1080 (1080p)
- Video Codec: H.264
- Bitrate: 2-4 Mbps
- Color Space: sRGB
- Audio: AAC 128kbps (if needed)

## Configuration

Environment variables (from root .env):
```bash
# Core Settings
PORT=4200                 # Main API port
WS_PORT=4201             # WebSocket port
METRICS_PORT=4290        # Prometheus metrics
HEALTH_PORT=4291         # Health check endpoint

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=default_password

# Node Environment
NODE_ENV=development     # or production

# Future Settings (Not Yet Implemented)
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

# Stream Settings (Planned)
MAX_LAYERS=50
TARGET_FPS=30
RENDER_QUALITY=high
STREAM_RESOLUTION=1920x1080
STREAM_BITRATE=2000k
STREAM_CODEC=h264
STREAM_PRESET=veryfast
STREAM_AUDIO_CODEC=aac
STREAM_AUDIO_BITRATE=128k
```

## Development

### Directory Structure
```
stream-manager/
├── src/
│   ├── index.ts        # Main entry point
│   └── utils/          # Utilities
├── scripts/            # Build and utility scripts
└── dist/              # Compiled output

# Planned Structure
stream-manager/
├── src/
│   ├── compositor/     # Graphics composition
│   ├── animation/      # Animation system
│   ├── layers/         # Layer management
│   ├── output/         # Stream output
│   └── utils/          # Utilities
├── scripts/            # Build and utility scripts
├── tests/              # Test files
└── dist/              # Compiled output
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript for production
- `npm start` - Start production server
- `npm test` - Run tests (planned)
- `npm run lint` - Run linter (planned)

## Health Checks

The service includes built-in health checks:
- HTTP health endpoint: `:4291/health`
- Docker health check: 30s interval, 10s timeout
- Redis connection monitoring
- Prometheus metrics collection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 
