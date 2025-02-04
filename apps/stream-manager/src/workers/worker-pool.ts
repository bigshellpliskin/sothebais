import { Worker } from 'worker_threads';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import type { RenderWorkerMessage, RenderWorkerResponse, WorkerMetrics, TaskPriority, BatchMetrics } from '../types/worker.js';

// Helper to determine worker configuration based on environment
const getWorkerConfig = () => {
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (isTestEnv) {
    return {
      workerData: { isTestEnv },
      execArgv: [
        '-r', 'ts-node/register',
        '--loader', 'ts-node/esm'
      ]
    };
  }
  return { workerData: { isTestEnv: false } };
};

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: { 
    message: RenderWorkerMessage; 
    resolve: (value: RenderWorkerResponse) => void; 
    reject: (reason: any) => void;
    priority: TaskPriority;
  }[] = [];
  private workerStatus: Map<Worker, boolean> = new Map();
  private batchMetrics: Map<string, BatchMetrics> = new Map();
  private metrics: {
    totalTasks: number;
    completedTasks: number;
    totalProcessingTime: number;
    tasksByPriority: {
      high: number;
      normal: number;
      low: number;
    };
  } = {
    totalTasks: 0,
    completedTasks: 0,
    totalProcessingTime: 0,
    tasksByPriority: {
      high: 0,
      normal: 0,
      low: 0,
    },
  };

  constructor(private numWorkers: number = Math.max(1, Math.floor(require('os').cpus().length * 0.75))) {
    this.initialize();
  }

  private initialize() {
    for (let i = 0; i < this.numWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker() {
    const workerPath = join(__dirname, process.env.NODE_ENV === 'test' ? 'render-worker.ts' : 'render-worker.js');
    const worker = new Worker(workerPath, getWorkerConfig());
    
    worker.on('message', (response: RenderWorkerResponse) => {
      this.workerStatus.set(worker, false);
      
      if (response.metadata) {
        this.metrics.completedTasks++;
        this.metrics.totalProcessingTime += response.metadata.duration;
        
        if (response.metadata.priority) {
          this.metrics.tasksByPriority[response.metadata.priority]++;
        }

        if (response.batchId) {
          const batchMetrics = this.batchMetrics.get(response.batchId);
          if (batchMetrics) {
            batchMetrics.completedTasks++;
            batchMetrics.averageProcessingTime = 
              (batchMetrics.averageProcessingTime * (batchMetrics.completedTasks - 1) + 
               response.metadata.duration) / batchMetrics.completedTasks;
            
            if (response.type === 'error') {
              batchMetrics.errors++;
            }
          }
        }
      }

      // Process next task from queue based on priority
      this.processNextTask(worker);
    });

    worker.on('error', (error) => {
      logger.error('Worker error occurred', { error: error.message });
      this.handleWorkerError(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error('Worker exited with non-zero code', { code });
        this.handleWorkerError(worker);
      }
    });

    this.workers.push(worker);
    this.workerStatus.set(worker, false);
  }

  private handleWorkerError(worker: Worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.workerStatus.delete(worker);
      this.createWorker(); // Replace the failed worker
    }
  }

  private processNextTask(worker: Worker) {
    if (this.taskQueue.length === 0) return;

    // Sort tasks by priority
    this.taskQueue.sort((a, b) => {
      const priorities = { high: 0, normal: 1, low: 2 };
      return priorities[a.priority] - priorities[b.priority];
    });

    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      this.processTaskWithWorker(worker, nextTask);
    }
  }

  private processTaskWithWorker(
    worker: Worker, 
    task: { 
      message: RenderWorkerMessage; 
      resolve: (value: RenderWorkerResponse) => void; 
      reject: (reason: any) => void;
      priority: TaskPriority;
    }
  ) {
    this.workerStatus.set(worker, true);
    worker.postMessage(task.message);

    const messageHandler = (response: RenderWorkerResponse) => {
      worker.removeListener('error', errorHandler);
      if (response.type === 'rendered') {
        task.resolve({
          ...response,
          metadata: {
            ...response.metadata,
            priority: task.priority,
          },
        });
      } else {
        task.reject(response.data);
      }
    };

    const errorHandler = (error: Error) => {
      worker.removeListener('message', messageHandler);
      task.reject(error);
    };

    worker.once('message', messageHandler);
    worker.once('error', errorHandler);
  }

  async processTask(message: RenderWorkerMessage): Promise<RenderWorkerResponse> {
    this.metrics.totalTasks++;
    const priority = message.priority || 'normal';

    if (message.batchId && !this.batchMetrics.has(message.batchId)) {
      this.batchMetrics.set(message.batchId, {
        batchId: message.batchId,
        totalTasks: 1,
        completedTasks: 0,
        averageProcessingTime: 0,
        errors: 0,
      });
    } else if (message.batchId) {
      const metrics = this.batchMetrics.get(message.batchId)!;
      metrics.totalTasks++;
    }

    return new Promise((resolve, reject) => {
      // Find an available worker
      const availableWorker = this.workers.find(worker => !this.workerStatus.get(worker));

      if (availableWorker) {
        this.processTaskWithWorker(availableWorker, { message, resolve, reject, priority });
      } else {
        // Queue the task if no worker is available
        this.taskQueue.push({ message, resolve, reject, priority });
      }
    });
  }

  async processBatch(messages: RenderWorkerMessage[]): Promise<RenderWorkerResponse[]> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messagesWithBatchId = messages.map(msg => ({ ...msg, batchId }));
    
    return Promise.all(messagesWithBatchId.map(msg => this.processTask(msg)));
  }

  getBatchMetrics(batchId: string): BatchMetrics | undefined {
    return this.batchMetrics.get(batchId);
  }

  getMetrics(): WorkerMetrics {
    const memoryUsage = process.memoryUsage();
    
    return {
      activeWorkers: this.workers.filter(w => this.workerStatus.get(w)).length,
      pendingTasks: this.taskQueue.length,
      averageProcessingTime: this.metrics.completedTasks > 0 
        ? this.metrics.totalProcessingTime / this.metrics.completedTasks 
        : 0,
      tasksByPriority: { ...this.metrics.tasksByPriority },
      batchesInProgress: this.batchMetrics.size,
      memoryUsage: {
        heap: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    };
  }

  async shutdown(): Promise<void> {
    // Wait for all pending tasks to complete
    while (this.taskQueue.length > 0 || [...this.workerStatus.values()].some(status => status)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clean up batch metrics
    this.batchMetrics.clear();

    // Terminate all workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    
    this.workers = [];
    this.workerStatus.clear();
    this.taskQueue = [];
  }
}

// Export singleton instance
export const workerPool = new WorkerPool(); 