import { z } from 'zod';
import type { LogLevel } from '../utils/logger.js';

const ConfigSchema = z.object({
  PORT: z.number().default(4200),
  WS_PORT: z.number().default(4201),
  METRICS_PORT: z.number().default(9090),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  STREAM_RESOLUTION: z.string().default('1920x1080'),
  TARGET_FPS: z.number().default(30),
  RENDER_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),
  MAX_LAYERS: z.number().default(10),
  STREAM_BITRATE: z.string().default('4000k'),
  ENABLE_HARDWARE_ACCELERATION: z.boolean().default(true),
  METRICS_INTERVAL: z.number().default(5000),
  STREAM_URL: z.string().default('rtmp://localhost/live/stream')
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
    STREAM_RESOLUTION: process.env.STREAM_RESOLUTION,
    TARGET_FPS: process.env.TARGET_FPS ? parseInt(process.env.TARGET_FPS, 10) : undefined,
    RENDER_QUALITY: process.env.RENDER_QUALITY as 'low' | 'medium' | 'high' | undefined,
    MAX_LAYERS: process.env.MAX_LAYERS ? parseInt(process.env.MAX_LAYERS, 10) : undefined,
    STREAM_BITRATE: process.env.STREAM_BITRATE,
    ENABLE_HARDWARE_ACCELERATION: process.env.ENABLE_HARDWARE_ACCELERATION === 'true',
    METRICS_INTERVAL: process.env.METRICS_INTERVAL ? parseInt(process.env.METRICS_INTERVAL, 10) : undefined,
    STREAM_URL: process.env.STREAM_URL
  };

  config = ConfigSchema.parse(envConfig);
  return config;
}

export { config }; 