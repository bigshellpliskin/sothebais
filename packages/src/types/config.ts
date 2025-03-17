/**
 * Configuration Types
 * 
 * Interfaces and schema definitions for system configuration
 */

import { z } from 'zod';

// ----- Stream Configuration -----

/**
 * Stream configuration parameters
 */
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

/**
 * Audio configuration parameters
 */
export interface AudioConfig {
  codec: 'aac' | 'opus';
  bitrate: number;
  sampleRate: number;
  channels: number;
}

/**
 * Rendering configuration 
 */
export interface RenderConfig {
  quality: 'low' | 'medium' | 'high';
  frameBuffer: number;
  dropFrames: boolean;
  metricsInterval: number;
}

/**
 * RTMP server configuration
 */
export interface RTMPConfig {
  port: number;
  chunk_size: number;
  gop_cache: boolean;
  ping: number;
  ping_timeout: number;
}

// ----- System Configuration Components -----

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  poolSize: number;
  taskQueueSize: number;
  taskTimeout?: number;
}

/**
 * Viewport dimensions
 */
export interface ViewportConfig {
  width: number;
  height: number;
}

/**
 * Asset storage configuration
 */
export interface AssetConfig {
  storagePath: string;
}

/**
 * Layout parameters for scenes
 */
export interface LayoutConfig {
  maxLayers: number;
}

/**
 * Processing pipeline configuration
 */
export interface PipelineConfig {
  maxQueueSize: number;
  poolSize: number;
  quality: number;
  format: 'raw' | 'jpeg';
}

/**
 * Visual effects configuration
 */
export interface EffectsConfig {
  enabled: boolean;
  transitionDuration: number;
  defaultEasing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  cacheSize: number;
}

/**
 * Buffer management configuration
 */
export interface BufferConfig {
  poolSize: number;
  maxMemory: number;
  cleanupInterval: number;
  reuseEnabled: boolean;
}

// ----- Schema Definitions -----

/**
 * Zod schema for stream configuration validation
 */
export const streamConfigSchema = z.object({
  // Server ports
  PORT: z.number().default(4200),
  WS_PORT: z.number().default(4201),
  METRICS_PORT: z.number().default(9090),

  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Stream configuration
  STREAM_RESOLUTION: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
    toString: z.function()
      .returns(z.string())
      .optional()
  }),
  TARGET_FPS: z.number().default(30),
  STREAM_BITRATE: z.number().default(4500000), // 4.5 Mbps default
  STREAM_CODEC: z.enum(['h264', 'vp8', 'vp9']).default('h264'),
  STREAM_PRESET: z.enum([
    'ultrafast', 'superfast', 'veryfast', 'faster', 
    'fast', 'medium', 'slow', 'slower', 'veryslow'
  ]).default('veryfast'),
  STREAM_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),

  // Audio configuration
  AUDIO_CODEC: z.enum(['aac', 'opus']).default('aac'),
  AUDIO_BITRATE: z.number().default(128000), // 128 kbps default
  AUDIO_SAMPLE_RATE: z.number().default(44100),
  AUDIO_CHANNELS: z.number().default(2),

  // RTMP settings
  RTMP_PORT: z.number().default(1935),
  RTMP_CHUNK_SIZE: z.number().default(60000),
  RTMP_GOP_CACHE: z.boolean().default(true),
  RTMP_PING: z.number().default(60),
  RTMP_PING_TIMEOUT: z.number().default(30),

  // Worker pool settings
  WORKER_POOL_SIZE: z.number().default(4),
  WORKER_TASK_QUEUE_SIZE: z.number().default(100),
  WORKER_TASK_TIMEOUT: z.number().default(10000),

  // Render settings
  RENDER_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),
  RENDER_FRAME_BUFFER: z.number().default(5),
  RENDER_DROP_FRAMES: z.boolean().default(true),
  RENDER_METRICS_INTERVAL: z.number().default(1000),

  // Asset storage
  ASSET_STORAGE_PATH: z.string().default('./assets'),

  // Pipeline configuration
  PIPELINE_MAX_QUEUE_SIZE: z.number().default(30),
  PIPELINE_POOL_SIZE: z.number().default(2),
  PIPELINE_QUALITY: z.number().min(1).max(100).default(80),
  PIPELINE_FORMAT: z.enum(['raw', 'jpeg']).default('jpeg'),

  // Effects configuration
  EFFECTS_ENABLED: z.boolean().default(true),
  EFFECTS_TRANSITION_DURATION: z.number().default(500),
  EFFECTS_DEFAULT_EASING: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).default('easeInOut'),
  EFFECTS_CACHE_SIZE: z.number().default(100),

  // Buffer management
  BUFFER_POOL_SIZE: z.number().default(10),
  BUFFER_MAX_MEMORY: z.number().default(1024 * 1024 * 100), // 100MB
  BUFFER_CLEANUP_INTERVAL: z.number().default(5000),
  BUFFER_REUSE_ENABLED: z.boolean().default(true),
}); 