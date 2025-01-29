# Stream Manager Service

## Overview

The Stream Manager is responsible for generating, composing, and streaming visual content to Twitter/X.com. It handles real-time graphics composition, animations, and layer management while maintaining high performance and low latency.

## System Requirements

### Container Environment
- Docker and Docker Compose
- Node.js 18+ (handled by container)
- Alpine Linux packages (automatically installed):
  - FFmpeg for video processing
  - Cairo, Pango for graphics
  - Python3, make, g++ for builds
  - Other graphics libraries (jpeg, gif, pixman)

### Development Requirements
For local development outside containers:
```bash
# Ubuntu/Debian
apt-get update && apt-get install -y \
  python3 \
  build-essential \
  libjpeg-dev \
  libcairo2-dev \
  libgif-dev \
  libpango1.0-dev \
  ffmpeg \
  pkg-config

# macOS
brew install \
  cairo \
  pango \
  jpeg \
  giflib \
  ffmpeg \
  pkg-config

# Alpine Linux
apk add --no-cache \
  python3 \
  make \
  g++ \
  jpeg-dev \
  cairo-dev \
  giflib-dev \
  pango-dev \
  ffmpeg \
  pixman-dev \
  pkgconfig \
  libc6-compat
```

## Quick Start

1. **Using Docker (Recommended)**:
```bash
# Start the service
docker compose up stream-manager

# Development mode with hot reload
docker compose -f docker-compose.dev.yml up stream-manager

# Production mode
docker compose -f docker-compose.prod.yml up stream-manager
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

### 1. Core Components

#### 1.1 Layer Management System
- Hierarchical layer system with z-index ordering
- Support for multiple layer types:
  - Host Layer (VTuber character)
  - Assistant Layer (Secondary characters)
  - Visual Feed Layer (NFT displays, bid information)
  - Overlay Layer (Text, graphics, effects)
- Real-time layer manipulation and state management
- Redis-backed persistence for layer states

#### 1.2 Composition Engine
Using @napi-rs/canvas for high-performance graphics:
- Hardware-accelerated when available
- Fallback to software rendering
- WebGL support for complex effects
- FFmpeg integration for video output

#### 1.3 Animation System
- Timeline-based animation engine
- Support for multiple animation types:
  - Transitions (fade, slide, scale)
  - Keyframe animations
  - Path-based movements
  - Property animations
- Easing functions and interpolation
- Animation scheduling and synchronization

#### 1.4 Twitter/X Integration
- Twitter API v2 integration
- Live streaming protocol support
- Media encoding pipeline
- Connection management and error recovery
- Rate limiting and quota management

### 2. Technical Implementation

#### 2.1 Graphics Pipeline
```
[Layer Manager] → [Compositor] → [Animation Engine] → [Encoder] → [Twitter Output]
```

#### 2.2 Performance Considerations
- Target frame rate: 30-60 FPS
- Maximum latency: 2-3 seconds
- Resource usage optimization
- Memory management for textures and buffers
- Garbage collection optimization

#### 2.3 Quality Settings
- Resolution: 1920x1080 (1080p)
- Video Codec: H.264
- Bitrate: 2-4 Mbps
- Color Space: sRGB
- Audio: AAC 128kbps (if needed)

## Configuration

Environment variables (from root .env):
```bash
# Core Settings
PORT=4200
WS_PORT=4201
METRICS_PORT=4290
HEALTH_PORT=4291

# Twitter API
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

# Stream Settings
MAX_LAYERS=50
TARGET_FPS=30
RENDER_QUALITY=high
STREAM_RESOLUTION=1920x1080
STREAM_BITRATE=2000k
STREAM_CODEC=h264
STREAM_PRESET=veryfast
STREAM_AUDIO_CODEC=aac
STREAM_AUDIO_BITRATE=128k

# Redis
REDIS_URL=redis://redis:6379
```

## Development

### Directory Structure
```
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
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 
