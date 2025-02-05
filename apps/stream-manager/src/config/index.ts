import { z } from 'zod';
import type { LogLevel } from '../utils/logger.js';

const configSchema = z.object({
  // Server
  PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default("3000"),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default("3001"),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default("3002"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Scene Management
  MAX_LAYERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("10"),
  TARGET_FPS: z.string().transform(Number).pipe(z.number().min(1).max(60)).default("30"),
  RENDER_QUALITY: z.enum(['low', 'medium', 'high']).default('medium'),
  STREAM_RESOLUTION: z.string().default("1920x1080"),
  STREAM_BITRATE: z.string().transform(Number).pipe(z.number().min(1000).max(10000000)).default("5000000"),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('warn'),
  LOG_PRETTY_PRINT: z.boolean().default(true),

  // Worker Pool
  MIN_WORKERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("5"),
  MAX_WORKERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("10"),
  TASK_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(300000)).default("30000"),
  WORKER_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(600000)).default("60000"),
  MAX_RETRIES: z.string().transform(Number).pipe(z.number().min(1).max(10)).default("3"),
  QUEUE_SIZE: z.string().transform(Number).pipe(z.number().min(1).max(1000)).default("100"),

  // Rendering
  MAX_RENDER_SIZE: z.string().transform(Number).pipe(z.number().min(1024).max(4096)).default("4096"),
  ENABLE_HARDWARE_ACCELERATION: z.boolean().default(true),

  // Asset Management
  ASSET_CACHE_SIZE: z.string().transform(Number).pipe(z.number().min(1024 * 1024 * 1024).max(1024 * 1024 * 1024 * 1024)).default("1073741824"), // 1GB
  ASSET_CACHE_TTL: z.string().transform(Number).pipe(z.number().min(3600).max(86400)).default("3600"), // 1 hour
  ASSET_PREFETCH_ENABLED: z.boolean().default(true),

  // Monitoring
  METRICS_INTERVAL: z.string().transform(Number).pipe(z.number().min(1000).max(30000)).default("5000"),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).pipe(z.number().min(10000).max(300000)).default("30000"),
  ENABLE_PERFORMANCE_MONITORING: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error.errors);
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig(); 