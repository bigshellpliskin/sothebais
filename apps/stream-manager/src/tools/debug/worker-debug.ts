import { createHook } from 'async_hooks';
import type { AsyncHook } from 'async_hooks';
import { performance } from 'perf_hooks';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';

interface WorkerTask {
  id: number;
  type: string;
  startTime: number;
  endTime?: number;
  triggerAsyncId: number;
  status: 'running' | 'completed' | 'error';
  error?: Error;
}

interface WorkerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  taskTypes: Record<string, number>;
  timeRange: {
    start: number;
    end: number;
  };
}

class WorkerDebugger {
  private hook: AsyncHook;
  private tasks = new Map<number, WorkerTask>();
  private isAnalyzing = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Create async hook to track worker tasks
    this.hook = createHook({
      init: (asyncId, type, triggerAsyncId) => {
        if (type === 'WORKER' || type.includes('WORKER')) {
          this.tasks.set(asyncId, {
            id: asyncId,
            type,
            startTime: performance.now(),
            triggerAsyncId,
            status: 'running'
          });
        }
      },
      destroy: (asyncId) => {
        const task = this.tasks.get(asyncId);
        if (task) {
          task.endTime = performance.now();
          task.status = 'completed';
          this.logTaskCompletion(task);
        }
      },
      promiseResolve: (asyncId) => {
        const task = this.tasks.get(asyncId);
        if (task) {
          task.endTime = performance.now();
          task.status = 'completed';
          this.logTaskCompletion(task);
        }
      },
      after: (asyncId) => {
        const task = this.tasks.get(asyncId);
        if (task && !task.endTime) {
          task.endTime = performance.now();
          task.status = 'completed';
          this.logTaskCompletion(task);
        }
      }
    });

    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  startAnalysis() {
    try {
      this.isAnalyzing = true;
      this.hook.enable();
      
      logger.info('Starting worker analysis', {
        component: 'worker-debug',
        status: 'started'
      });

      // Start periodic analysis
      this.analysisInterval = setInterval(() => {
        this.analyzeWorkerStats();
      }, 5000);

    } catch (error) {
      logger.error('Failed to start worker analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'worker-debug'
      });
      this.cleanup();
    }
  }

  private cleanup() {
    this.isAnalyzing = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    this.hook.disable();
    this.analyzeWorkerStats();
    process.exit(0);
  }

  private logTaskCompletion(task: WorkerTask) {
    if (!task.endTime) return;

    const duration = task.endTime - task.startTime;
    
    logger.debug('Worker task completed', {
      taskId: task.id,
      type: task.type,
      duration,
      status: task.status,
      error: task.error?.message,
      component: 'worker-debug'
    });

    // Record metrics
    metricsService.recordRenderTime(duration / 1000); // Convert to seconds
    if (task.status === 'error') {
      metricsService.recordStateUpdate('worker_error');
    }
  }

  private analyzeWorkerStats(): WorkerStats {
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'completed' && task.endTime);

    if (completedTasks.length === 0) {
      logger.info('No completed tasks to analyze', {
        component: 'worker-debug'
      });
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        avgProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        taskTypes: {},
        timeRange: {
          start: 0,
          end: 0
        }
      };
    }

    const durations = completedTasks.map(task => task.endTime! - task.startTime);
    const failedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'error').length;

    const taskTypes = completedTasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats: WorkerStats = {
      totalTasks: this.tasks.size,
      completedTasks: completedTasks.length,
      failedTasks,
      avgProcessingTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ProcessingTime: this.calculatePercentile(durations, 95),
      p99ProcessingTime: this.calculatePercentile(durations, 99),
      taskTypes,
      timeRange: {
        start: Math.min(...completedTasks.map(t => t.startTime)),
        end: Math.max(...completedTasks.map(t => t.endTime!))
      }
    };

    logger.info('Worker pool analysis', {
      ...stats,
      component: 'worker-debug',
      timestamp: new Date().toISOString()
    });

    return stats;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Start the debugger if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const workerDebugger = new WorkerDebugger();
  workerDebugger.startAnalysis();
} 