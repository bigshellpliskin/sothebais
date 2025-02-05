import type { RenderTask, TaskPriority } from './tasks.js';
import type { WorkerConfig } from './config.js';

export interface TaskMetadata {
  duration: number;
  startTime: number;
  endTime: number;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

export type WorkerMessageType = 'render' | 'config' | 'status';

export interface RenderWorkerMessage {
  type: WorkerMessageType;
  task?: RenderTask;
  config?: Partial<WorkerConfig>;
  batchId?: string;
  priority?: TaskPriority;
}

export interface RenderWorkerResponse {
  type: 'success' | 'error' | 'config_updated' | 'status';
  data?: Buffer;
  error?: string;
  config?: WorkerConfig;
  status?: WorkerStatus;
  batchId?: string;
  metadata?: TaskMetadata;
}

export interface BatchMetrics {
  totalTasks: number;
  completedTasks: number;
  errors: number;
  averageProcessingTime: number;
  startTime: number;
}

export interface WorkerMetrics {
  totalTasks: number;
  completedTasks: number;
  totalProcessingTime: number;
  tasksByPriority: {
    high: number;
    normal: number;
    low: number;
  };
  averageProcessingTime: number;
  errorRate: number;
  memoryUsage: number;
}

export interface WorkerTask {
  message: RenderWorkerMessage;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  priority: TaskPriority;
  addedTime: number;
}

export interface WorkerStatus {
  healthy: boolean;
  ready: boolean;
  currentConfig: WorkerConfig;
  metrics: {
    cpu: number;
    memory: number;
    tasks: number;
    errors: number;
  };
}
