import { z } from 'zod';

// Worker-specific configuration schema
export const workerConfigSchema = z.object({
  // Resource limits
  maxMemoryMB: z.number().min(512).max(8192).default(2048),
  maxCpuPercent: z.number().min(10).max(100).default(80),
  
  // Task processing
  batchSize: z.number().min(1).max(100).default(10),
  taskTimeout: z.number().min(1000).max(300000).default(30000),
  maxRetries: z.number().min(0).max(10).default(3),
  
  // Performance tuning
  preloadAssets: z.boolean().default(true),
  cacheSize: z.number().min(100).max(1000).default(500),
  gcThreshold: z.number().min(0.5).max(0.95).default(0.8),
  
  // Specialization
  preferredTaskTypes: z.array(z.enum(['render', 'encode', 'process'])).default(['render']),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  
  // Health checks
  healthCheckInterval: z.number().min(1000).max(60000).default(5000),
  metricsInterval: z.number().min(1000).max(60000).default(5000)
});

export type WorkerConfig = z.infer<typeof workerConfigSchema>;

// Default configurations for different worker roles
export const DEFAULT_CONFIGS: Record<string, Partial<WorkerConfig>> = {
  render: {
    maxMemoryMB: 4096,
    maxCpuPercent: 90,
    batchSize: 5,
    preferredTaskTypes: ['render'],
    priority: 'high',
    preloadAssets: true,
    gcThreshold: 0.85
  },
  encode: {
    maxMemoryMB: 2048,
    maxCpuPercent: 70,
    batchSize: 10,
    preferredTaskTypes: ['encode'],
    priority: 'normal',
    preloadAssets: false,
    gcThreshold: 0.8
  },
  process: {
    maxMemoryMB: 1024,
    maxCpuPercent: 60,
    batchSize: 20,
    preferredTaskTypes: ['process'],
    priority: 'low',
    preloadAssets: false,
    gcThreshold: 0.75
  }
};

// Configuration update message type
export interface ConfigUpdate {
  type: 'config';
  config: Partial<WorkerConfig>;
}

// Helper functions
export function validateConfig(config: Partial<WorkerConfig>): WorkerConfig {
  return workerConfigSchema.parse({
    ...workerConfigSchema.parse({}), // Get defaults
    ...config // Override with provided values
  });
}

export function mergeConfigs(base: WorkerConfig, update: Partial<WorkerConfig>): WorkerConfig {
  return validateConfig({ ...base, ...update });
}

export function getDefaultConfig(role: string = 'render'): WorkerConfig {
  return validateConfig(DEFAULT_CONFIGS[role] || DEFAULT_CONFIGS.render);
} 