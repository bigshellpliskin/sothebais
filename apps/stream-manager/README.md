# Stream Manager

A high-performance streaming service that manages real-time video composition and streaming.

## Architecture

The service is built around a streaming pipeline architecture:

```
src/
├── pipeline/           # Core streaming components
│   ├── stream-manager.ts   # Pipeline orchestration
│   ├── sharp-renderer.ts   # Image processing
│   ├── frame-buffer.ts     # Memory management
│   ├── stream-encoder.ts   # FFmpeg encoding
│   └── README.md          # Pipeline documentation
├── services/          # Supporting services
│   ├── layer-manager.ts   # Layer state management
│   ├── layer-renderer.ts  # Layer rendering service
│   ├── redis.ts          # Redis integration
│   └── websocket.ts      # WebSocket service
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── workers/          # Worker thread implementations
└── config/           # Configuration management
```

## Features

- Real-time video composition and streaming
- Layer-based rendering system
- High-performance image processing with Sharp
- FFmpeg-based video encoding
- Redis-backed state management
- WebSocket real-time updates
- Prometheus metrics integration
- Worker thread support for parallel processing

## Configuration

Configuration is centralized in `config/index.ts` and includes:

```typescript
{
  // Server configuration
  PORT: number;
  WS_PORT: number;
  METRICS_PORT: number;
  HEALTH_PORT: number;

  // Redis configuration
  REDIS_URL: string;
  REDIS_PASSWORD: string;

  // Streaming configuration
  STREAM_RESOLUTION: string;     // e.g., "1920x1080"
  TARGET_FPS: number;           // Target frames per second
  RENDER_QUALITY: "low" | "medium" | "high";
  STREAM_BITRATE: number;       // in kbps
  STREAM_URL: string;           // RTMP URL
  
  // Audio configuration
  AUDIO_ENABLED: boolean;
  AUDIO_CODEC: "aac" | "opus";
  AUDIO_BITRATE: number;
}
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the service:
   ```bash
   npm start
   ```

4. For development:
   ```bash
   npm run dev
   ```

## API

The service provides several endpoints:

- `POST /api/stream/control` - Control stream state
- `GET /api/stream/status` - Get stream status
- `POST /api/layers` - Manage layers
- `WS /ws` - Real-time updates

See API documentation for details.

## Metrics

Prometheus metrics are available at `/metrics` including:
- Frame processing times
- Memory usage
- Stream health
- Layer statistics
- Encoding performance

## Development

### Pipeline Development

The streaming pipeline (`src/pipeline/`) is the core of the service. See the [pipeline README](src/pipeline/README.md) for details on:
- Component architecture
- Data flow
- Performance considerations
- Extension points

### Testing

```bash
npm test        # Run all tests
npm run test:e2e # Run end-to-end tests
```

### Contributing

1. Create a feature branch
2. Make changes
3. Add tests
4. Submit PR

## License

MIT 
