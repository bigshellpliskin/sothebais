import { z } from 'zod';

// Stream Configuration Types
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

export interface AudioConfig {
  codec: 'aac' | 'opus';
  bitrate: number;
  sampleRate: number;
  channels: number;
}

export const configSchema = z.object({
  // Server ports
  PORT: z.number().default(4200),
  WS_PORT: z.number().default(4201),
  METRICS_PORT: z.number().default(9090),

  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Stream settings
  STREAM_RESOLUTION: z.string().default('1280x720'),
  TARGET_FPS: z.number().default(30),
  STREAM_BITRATE: z.string()
    .regex(/^\d+k$/, 'Bitrate must be a number followed by "k" (e.g., "2k", "6k")')
    .default('2k')
    .transform((val) => ({
      raw: val,                           // Original string with 'k' suffix for FFmpeg
      numeric: parseInt(val.slice(0, -1)) * 1000  // Numeric value in bits per second
    })),
  ENABLE_HARDWARE_ACCELERATION: z.boolean().default(false),
  STREAM_URL: z.string().default('rtmp://localhost/live/stream'),

  // RTMP Server Configuration
  RTMP_PORT: z.number().default(1935),
  RTMP_CHUNK_SIZE: z.number().default(60000),
  RTMP_GOP_CACHE: z.boolean().default(true),
  RTMP_PING: z.number().default(30),
  RTMP_PING_TIMEOUT: z.number().default(60),

  // Pipeline Configuration
  PIPELINE_MAX_QUEUE_SIZE: z.number().default(30),
  PIPELINE_POOL_SIZE: z.number().default(3),
  PIPELINE_QUALITY: z.number().default(80),
  PIPELINE_FORMAT: z.enum(['raw', 'jpeg']).default('jpeg'),

  // Render Configuration
  RENDER_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),
  RENDER_FRAME_BUFFER: z.number().default(2),
  RENDER_DROP_FRAMES: z.boolean().default(true),
  RENDER_METRICS_INTERVAL: z.number().default(1000),

  // Effects Configuration
  EFFECTS_ENABLED: z.boolean().default(true),
  EFFECTS_TRANSITION_DURATION: z.number().default(500),
  EFFECTS_DEFAULT_EASING: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).default('easeInOut'),
  EFFECTS_CACHE_SIZE: z.number().default(10),

  // Buffer Configuration
  BUFFER_POOL_SIZE: z.number().default(5),
  BUFFER_MAX_MEMORY: z.number().default(1024 * 1024 * 512), // 512MB
  BUFFER_CLEANUP_INTERVAL: z.number().default(5000),
  BUFFER_REUSE_ENABLED: z.boolean().default(true),

  // Worker Configuration
  WORKER_POOL_SIZE: z.number().default(4),
  WORKER_QUEUE_SIZE: z.number().default(100),
  WORKER_TASK_TIMEOUT: z.number().default(5000),

  // Core service settings
  VIEWPORT_WIDTH: z.number().default(1280),
  VIEWPORT_HEIGHT: z.number().default(720),
  ASSET_STORAGE_PATH: z.string().default('./assets'),
  MAX_LAYERS: z.number().default(10),

  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_PRETTY_PRINT: z.boolean().default(true)
});

export type Config = z.infer<typeof configSchema>;

// Configuration Types
export interface WorkerPoolConfig {
  poolSize: number;
  taskQueueSize: number;
  taskTimeout?: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface AssetConfig {
  storagePath: string;
}

export interface LayoutConfig {
  maxLayers: number;
}

export interface RTMPConfig {
  port: number;
  chunk_size: number;
  gop_cache: boolean;
  ping: number;
  ping_timeout: number;
}

export interface PipelineConfig {
  maxQueueSize: number;
  poolSize: number;
  quality: number;
  format: 'raw' | 'jpeg';
}

export interface RenderConfig {
  quality: 'low' | 'medium' | 'high';
  frameBuffer: number;
  dropFrames: boolean;
  metricsInterval: number;
}

export interface EffectsConfig {
  enabled: boolean;
  transitionDuration: number;
  defaultEasing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  cacheSize: number;
}

export interface BufferConfig {
  poolSize: number;
  maxMemory: number;
  cleanupInterval: number;
  reuseEnabled: boolean;
} 