import type { Layer } from './layers.js';

export type TaskPriority = 'high' | 'normal' | 'low';

export interface RenderOptions {
  quality: 'low' | 'medium' | 'high';
  format: 'rgba' | 'rgb';
  compression?: number;
}

export interface RenderWorkerMessage {
  type: 'render' | 'transform' | 'composite';
  priority?: TaskPriority;
  batchId?: string;
  data: {
    width: number;
    height: number;
    layers: Layer[];
    options: RenderOptions;
  };
}

export interface RenderWorkerResponse {
  type: 'rendered' | 'error';
  batchId?: string;
  data: Buffer | Buffer[] | Error;
  metadata?: {
    duration: number;
    memory: number;
    priority?: TaskPriority;
  };
}

export interface WorkerMetrics {
  activeWorkers: number;
  pendingTasks: number;
  averageProcessingTime: number;
  tasksByPriority: {
    high: number;
    normal: number;
    low: number;
  };
  batchesInProgress: number;
  memoryUsage: {
    heap: number;
    external: number;
  };
}

export interface BatchMetrics {
  batchId: string;
  totalTasks: number;
  completedTasks: number;
  averageProcessingTime: number;
  errors: number;
} 