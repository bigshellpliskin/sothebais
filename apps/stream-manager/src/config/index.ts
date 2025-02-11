import { z } from 'zod';
import type { LogLevel } from '../utils/logger.js';

const ConfigSchema = z.object({
  PORT: z.number().default(4200),
  WS_PORT: z.number().default(4201),
  METRICS_PORT: z.number().default(9090),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Streaming Configuration
  STREAM_RESOLUTION: z.string().default('1280x720'),
  TARGET_FPS: z.number().default(30),
  STREAM_BITRATE: z.string().default('2500k'),
  ENABLE_HARDWARE_ACCELERATION: z.boolean().default(true),
  STREAM_URL: z.string().default('rtmp://localhost/live/stream'),
  
  // Streaming Pipeline Configuration
  PIPELINE_MAX_QUEUE_SIZE: z.number().default(30),
  PIPELINE_POOL_SIZE: z.number().default(3),
  PIPELINE_QUALITY: z.number().default(80),
  PIPELINE_FORMAT: z.enum(['raw', 'jpeg']).default('jpeg'),
  
  // RTMP Server Configuration
  RTMP_PORT: z.number().default(1935),
  RTMP_CHUNK_SIZE: z.number().default(60000),
  RTMP_GOP_CACHE: z.boolean().default(true),
  RTMP_PING: z.number().default(30),
  RTMP_PING_TIMEOUT: z.number().default(60),
  
  // Muxer Configuration
  MUXER_MAX_QUEUE_SIZE: z.number().default(60),
  MUXER_RETRY_ATTEMPTS: z.number().default(3),
  MUXER_RETRY_DELAY: z.number().default(1000),
  
  // General Configuration
  RENDER_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),
  MAX_LAYERS: z.number().default(10),
  METRICS_INTERVAL: z.number().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY_PRINT: z.boolean().default(false)
});

export type Config = z.infer<typeof ConfigSchema>;

let config: Config;

export async function loadConfig(): Promise<Config> {
  const envConfig = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    WS_PORT: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : undefined,
    METRICS_PORT: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : undefined,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    
    // Streaming Configuration
    STREAM_RESOLUTION: process.env.STREAM_RESOLUTION,
    TARGET_FPS: process.env.TARGET_FPS ? parseInt(process.env.TARGET_FPS, 10) : undefined,
    STREAM_BITRATE: process.env.STREAM_BITRATE,
    ENABLE_HARDWARE_ACCELERATION: process.env.ENABLE_HARDWARE_ACCELERATION === 'true',
    STREAM_URL: process.env.STREAM_URL,
    
    // Streaming Pipeline Configuration
    PIPELINE_MAX_QUEUE_SIZE: process.env.PIPELINE_MAX_QUEUE_SIZE ? parseInt(process.env.PIPELINE_MAX_QUEUE_SIZE, 10) : undefined,
    PIPELINE_POOL_SIZE: process.env.PIPELINE_POOL_SIZE ? parseInt(process.env.PIPELINE_POOL_SIZE, 10) : undefined,
    PIPELINE_QUALITY: process.env.PIPELINE_QUALITY ? parseInt(process.env.PIPELINE_QUALITY, 10) : undefined,
    PIPELINE_FORMAT: process.env.PIPELINE_FORMAT as 'raw' | 'jpeg' | undefined,
    
    // RTMP Server Configuration
    RTMP_PORT: process.env.RTMP_PORT ? parseInt(process.env.RTMP_PORT, 10) : undefined,
    RTMP_CHUNK_SIZE: process.env.RTMP_CHUNK_SIZE ? parseInt(process.env.RTMP_CHUNK_SIZE, 10) : undefined,
    RTMP_GOP_CACHE: process.env.RTMP_GOP_CACHE === 'true',
    RTMP_PING: process.env.RTMP_PING ? parseInt(process.env.RTMP_PING, 10) : undefined,
    RTMP_PING_TIMEOUT: process.env.RTMP_PING_TIMEOUT ? parseInt(process.env.RTMP_PING_TIMEOUT, 10) : undefined,
    
    // Muxer Configuration
    MUXER_MAX_QUEUE_SIZE: process.env.MUXER_MAX_QUEUE_SIZE ? parseInt(process.env.MUXER_MAX_QUEUE_SIZE, 10) : undefined,
    MUXER_RETRY_ATTEMPTS: process.env.MUXER_RETRY_ATTEMPTS ? parseInt(process.env.MUXER_RETRY_ATTEMPTS, 10) : undefined,
    MUXER_RETRY_DELAY: process.env.MUXER_RETRY_DELAY ? parseInt(process.env.MUXER_RETRY_DELAY, 10) : undefined,
    
    // General Configuration
    RENDER_QUALITY: process.env.RENDER_QUALITY as 'low' | 'medium' | 'high' | undefined,
    MAX_LAYERS: process.env.MAX_LAYERS ? parseInt(process.env.MAX_LAYERS, 10) : undefined,
    METRICS_INTERVAL: process.env.METRICS_INTERVAL ? parseInt(process.env.METRICS_INTERVAL, 10) : undefined,
    LOG_LEVEL: process.env.LOG_LEVEL as LogLevel | undefined,
    LOG_PRETTY_PRINT: process.env.LOG_PRETTY_PRINT === 'true'
  };

  config = ConfigSchema.parse(envConfig);
  return config;
}

export { config }; 