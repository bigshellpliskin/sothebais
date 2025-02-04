# Stream Manager Configuration

This directory contains the configuration management system for the Stream Manager application.

## Overview

The configuration system provides:
- Type-safe configuration validation using Zod
- Environment variable parsing and validation
- Default values for all configuration options
- Runtime configuration access

## Components

### Configuration Schema (`index.ts`)

Central configuration definition that includes:

```typescript
const configSchema = z.object({
  // Server configuration
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),

  // Redis configuration
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().min(1),

  // Stream configuration
  MAX_LAYERS: z.number().min(1).max(100),
  TARGET_FPS: z.number().min(1).max(60),
  RENDER_QUALITY: z.enum(["low", "medium", "high"]),
  STREAM_RESOLUTION: z.string().regex(/^\d+x\d+$/),
  
  // Encoding configuration
  STREAM_BITRATE: z.number().min(100).max(10000),
  STREAM_URL: z.string(),
  STREAM_CODEC: z.enum(["h264", "vp8", "vp9"]),
  FFMPEG_PRESET: z.enum([
    "ultrafast", "superfast", "veryfast",
    "faster", "fast", "medium"
  ]),
  FFMPEG_HWACCEL: z.enum(["nvenc", "qsv", "vaapi", "videotoolbox"]).optional(),

  // Audio configuration
  AUDIO_ENABLED: z.boolean(),
  AUDIO_CODEC: z.enum(["aac", "opus"]),
  AUDIO_BITRATE: z.number().min(64).max(320),

  // Logging configuration
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"])
});
```

### Configuration Categories

1. **Server Settings**
   - Port configurations
   - WebSocket settings
   - Metrics endpoint

2. **Redis Settings**
   - Connection URL
   - Authentication
   - Connection options

3. **Stream Settings**
   - Resolution and quality
   - FPS and bitrate
   - Layer limits
   - Hardware acceleration

4. **FFmpeg Settings**
   - Encoding presets and codecs
   - Audio configuration
   - Stream output

5. **Logging Settings**
   - Log level configuration
   - Logging format and output

### Validation (`validation.ts`)

Configuration validation utilities:
- Schema validation
- Type checking
- Default value handling
- Error formatting

## Usage

```typescript
import { loadConfig, getConfig, type Config } from './config';

// Load and validate configuration
const config = loadConfig();

// Access configuration values
const {
  PORT,
  REDIS_URL,
  TARGET_FPS,
  STREAM_RESOLUTION
} = getConfig();
```

## Environment Variables

Required environment variables:

```bash
# Server Configuration
PORT=4200                    # Default: 4200
WS_PORT=4201                # Default: 4201
METRICS_PORT=4290           # Default: 4290

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_password

# Stream Configuration
TARGET_FPS=30               # Default: 30
RENDER_QUALITY=high         # Default: high
STREAM_RESOLUTION=1920x1080 # Default: 1920x1080
MAX_LAYERS=50              # Default: 50

# FFmpeg Configuration
STREAM_URL=rtmp://rtmp/live/stream
STREAM_BITRATE=4000         # Default: 4000
STREAM_CODEC=h264          # Default: h264
FFMPEG_PRESET=medium       # Default: medium
FFMPEG_HWACCEL=           # Optional: nvenc, qsv, vaapi, videotoolbox

# Audio Configuration
AUDIO_ENABLED=true         # Default: true
AUDIO_CODEC=aac           # Default: aac
AUDIO_BITRATE=128         # Default: 128

# Logging Configuration
LOG_LEVEL=info            # Default: info

# Environment
NODE_ENV=production       # Default: development
```

## Validation Rules

1. **Port Numbers**
   - Must be between 1000 and 65535
   - Must be unique for each service

2. **URLs**
   - Must be valid URL format
   - Must include protocol
   - Must include host

3. **Performance Settings**
   - FPS: 1-60
   - Layers: 1-100
   - Quality: low/medium/high

4. **Stream Settings**
   - Resolution: WxH format
   - Bitrate: 100-10000
   - Valid codec selections

## Error Handling

Configuration errors are handled with detailed messages:

```typescript
try {
  const config = loadConfig();
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Configuration validation failed:', error.errors);
    process.exit(1);
  }
}
``` 