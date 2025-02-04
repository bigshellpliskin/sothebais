import { z } from 'zod';

const configSchema = z.object({
  // Server ports
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4200"),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4201"),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default("4290"),

  // Redis configuration
  REDIS_URL: z.string().url().default("redis://redis:6379"),
  REDIS_PASSWORD: z.string().min(1).default("default_password"),

  // Rendering configuration
  MAX_LAYERS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("50"),
  TARGET_FPS: z.string().transform(Number).pipe(z.number().min(1).max(60)).default("30"),
  RENDER_QUALITY: z.enum(["low", "medium", "high"]).default("high"),
  STREAM_RESOLUTION: z.string().regex(/^\d+x\d+$/).default("1920x1080"),

  // Stream configuration
  STREAM_URL: z.string().default("rtmp://rtmp/live/stream"),
  STREAM_BITRATE: z.string().transform(Number).pipe(z.number().min(100).max(10000)).default("4000"),
  STREAM_CODEC: z.enum(["h264", "vp8", "vp9"]).default("h264"),
  
  // FFmpeg configuration
  FFMPEG_PRESET: z.enum([
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium"
  ]).default("medium"),
  FFMPEG_HWACCEL: z.enum(["nvenc", "qsv", "vaapi", "videotoolbox"]).optional(),

  // Audio configuration
  AUDIO_ENABLED: z.string().transform((v) => v === "true").default("true"),
  AUDIO_CODEC: z.enum(["aac", "opus"]).default("aac"),
  AUDIO_BITRATE: z.string().transform(Number).pipe(z.number().min(64).max(320)).default("128"),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // New fields
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
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