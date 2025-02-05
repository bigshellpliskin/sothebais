import type { RenderWorkerMessage, RenderWorkerResponse, BatchMetrics } from './messages.js';
import type { Worker } from 'worker_threads';
import type { WorkerConfig } from './config.js';

export interface WorkerTask {
  message: RenderWorkerMessage;
  resolve: (value: RenderWorkerResponse) => void;
  reject: (reason: any) => void;
  priority: 'high' | 'normal' | 'low';
  addedTime: number;
  retries?: number;
}

export interface WorkerState {
  isProcessing: boolean;
  processedTasks: number;
  errors: number;
  totalProcessingTime: number;
  startTime: number;
  lastError?: Error;
  currentTask?: WorkerTask;
  memoryUsage?: number; // Memory usage in bytes
  config?: WorkerConfig; // Worker-specific configuration
}

export interface PoolState {
  workers: Map<Worker, WorkerState>;
  taskQueue: WorkerTask[];
  batchMetrics: Map<string, BatchMetrics>;
  isShuttingDown: boolean;
}

export interface PoolConfig {
  minWorkers?: number;
  maxWorkers?: number;
  taskTimeout?: number;
  workerTimeout?: number;
  maxRetries?: number;
  queueSize?: number;
}

