import type { Config } from '../types/config.js';
import { configSchema } from '../types/config.js';

export async function loadConfig(): Promise<Config> {
  const config = configSchema.parse({
    PORT: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    WS_PORT: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : undefined,
    METRICS_PORT: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : undefined,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    STREAM_RESOLUTION: process.env.STREAM_RESOLUTION,
    TARGET_FPS: process.env.TARGET_FPS ? parseInt(process.env.TARGET_FPS) : undefined,
    STREAM_BITRATE: process.env.STREAM_BITRATE,
    ENABLE_HARDWARE_ACCELERATION: process.env.ENABLE_HARDWARE_ACCELERATION === 'true',
    STREAM_URL: process.env.STREAM_URL,

    // RTMP Configuration
    RTMP_PORT: process.env.RTMP_PORT ? parseInt(process.env.RTMP_PORT) : undefined,
    RTMP_CHUNK_SIZE: process.env.RTMP_CHUNK_SIZE ? parseInt(process.env.RTMP_CHUNK_SIZE) : undefined,
    RTMP_GOP_CACHE: process.env.RTMP_GOP_CACHE === 'true',
    RTMP_PING: process.env.RTMP_PING ? parseInt(process.env.RTMP_PING) : undefined,
    RTMP_PING_TIMEOUT: process.env.RTMP_PING_TIMEOUT ? parseInt(process.env.RTMP_PING_TIMEOUT) : undefined,

    // Pipeline Configuration
    PIPELINE_MAX_QUEUE_SIZE: process.env.PIPELINE_MAX_QUEUE_SIZE ? parseInt(process.env.PIPELINE_MAX_QUEUE_SIZE) : undefined,
    PIPELINE_POOL_SIZE: process.env.PIPELINE_POOL_SIZE ? parseInt(process.env.PIPELINE_POOL_SIZE) : undefined,
    PIPELINE_QUALITY: process.env.PIPELINE_QUALITY ? parseInt(process.env.PIPELINE_QUALITY) : undefined,
    PIPELINE_FORMAT: process.env.PIPELINE_FORMAT as 'raw' | 'jpeg' | undefined,

    // Muxer Configuration
    MUXER_MAX_QUEUE_SIZE: process.env.MUXER_MAX_QUEUE_SIZE ? parseInt(process.env.MUXER_MAX_QUEUE_SIZE) : undefined,
    MUXER_RETRY_ATTEMPTS: process.env.MUXER_RETRY_ATTEMPTS ? parseInt(process.env.MUXER_RETRY_ATTEMPTS) : undefined,
    MUXER_RETRY_DELAY: process.env.MUXER_RETRY_DELAY ? parseInt(process.env.MUXER_RETRY_DELAY) : undefined,

    // Render Configuration
    RENDER_QUALITY: process.env.RENDER_QUALITY as 'low' | 'medium' | 'high' | undefined,
    RENDER_FRAME_BUFFER: process.env.RENDER_FRAME_BUFFER ? parseInt(process.env.RENDER_FRAME_BUFFER) : undefined,
    RENDER_DROP_FRAMES: process.env.RENDER_DROP_FRAMES === 'true',
    RENDER_METRICS_INTERVAL: process.env.RENDER_METRICS_INTERVAL ? parseInt(process.env.RENDER_METRICS_INTERVAL) : undefined,

    // Effects Configuration
    EFFECTS_ENABLED: process.env.EFFECTS_ENABLED === 'true',
    EFFECTS_TRANSITION_DURATION: process.env.EFFECTS_TRANSITION_DURATION ? parseInt(process.env.EFFECTS_TRANSITION_DURATION) : undefined,
    EFFECTS_DEFAULT_EASING: process.env.EFFECTS_DEFAULT_EASING as 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | undefined,
    EFFECTS_CACHE_SIZE: process.env.EFFECTS_CACHE_SIZE ? parseInt(process.env.EFFECTS_CACHE_SIZE) : undefined,

    // Buffer Configuration
    BUFFER_POOL_SIZE: process.env.BUFFER_POOL_SIZE ? parseInt(process.env.BUFFER_POOL_SIZE) : undefined,
    BUFFER_MAX_MEMORY: process.env.BUFFER_MAX_MEMORY ? parseInt(process.env.BUFFER_MAX_MEMORY) : undefined,
    BUFFER_CLEANUP_INTERVAL: process.env.BUFFER_CLEANUP_INTERVAL ? parseInt(process.env.BUFFER_CLEANUP_INTERVAL) : undefined,
    BUFFER_REUSE_ENABLED: process.env.BUFFER_REUSE_ENABLED === 'true',

    // Core Settings
    VIEWPORT_WIDTH: process.env.VIEWPORT_WIDTH ? parseInt(process.env.VIEWPORT_WIDTH) : undefined,
    VIEWPORT_HEIGHT: process.env.VIEWPORT_HEIGHT ? parseInt(process.env.VIEWPORT_HEIGHT) : undefined,
    ASSET_STORAGE_PATH: process.env.ASSET_STORAGE_PATH,
    MAX_LAYERS: process.env.MAX_LAYERS ? parseInt(process.env.MAX_LAYERS) : undefined,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_PRETTY_PRINT: process.env.LOG_PRETTY_PRINT === 'true'
  });

  return config;
}

export const config = configSchema.parse({}); 