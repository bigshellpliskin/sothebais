import { z } from 'zod';

const configSchema = z.object({
  // Server ports
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4200"),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4201"),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4290"),
  HEALTH_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4291"),

  // Redis configuration
  REDIS_URL: z.string().url().default("redis://redis:6379"),
  REDIS_PASSWORD: z.string().min(1).default("default_password"),

  // Twitter configuration (optional for initial setup)
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().optional(),

  // Rendering configuration
  MAX_LAYERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("50"),
  TARGET_FPS: z.string().transform(Number).pipe(z.number().min(1).max(60)).default("30"),
  RENDER_QUALITY: z.enum(["low", "medium", "high"]).default("high"),
  STREAM_RESOLUTION: z.string().regex(/^\d+x\d+$/).default("1920x1080"),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof configSchema>;

let config: Config;

export function loadConfig(): Config {
  if (!config) {
    config = configSchema.parse(process.env);
  }
  return config;
}

export function getConfig(): Config {
  if (!config) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }
  return config;
} 