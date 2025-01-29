import { z } from 'zod';
import { Config } from './index';

export class ConfigValidationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Configuration validation failed');
    this.name = 'ConfigValidationError';
  }
}

export function validateConfig(config: Config): void {
  // Additional validation rules beyond basic schema
  const { STREAM_RESOLUTION } = config;
  
  // Validate resolution format and values
  const [width, height] = STREAM_RESOLUTION.split('x').map(Number);
  if (width < 480 || width > 3840 || height < 360 || height > 2160) {
    throw new Error('Stream resolution must be between 480x360 and 3840x2160');
  }

  // Validate port conflicts
  const ports = new Set([config.PORT, config.WS_PORT, config.METRICS_PORT, config.HEALTH_PORT]);
  if (ports.size !== 4) {
    throw new Error('All ports must be unique');
  }
}

export function validateTwitterConfig(config: Config): void {
  const twitterKeys = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ] as const;

  // Check if any Twitter config is provided
  const hasAnyTwitterConfig = twitterKeys.some(key => config[key] !== undefined);
  
  // If any Twitter config is provided, all must be provided
  if (hasAnyTwitterConfig) {
    const missingKeys = twitterKeys.filter(key => !config[key]);
    if (missingKeys.length > 0) {
      throw new Error(`Missing required Twitter configuration: ${missingKeys.join(', ')}`);
    }
  }
} 