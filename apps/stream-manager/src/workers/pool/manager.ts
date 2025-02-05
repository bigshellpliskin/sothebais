import { Worker } from 'worker_threads';
import { join } from 'path';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { MetricsCollector } from './metrics.js';
import { config } from '../../config/index.js';
import { getDefaultConfig, type WorkerConfig } from '../shared/config.js';
import { ErrorRecoveryManager } from '../shared/error-recovery.js';
import { HealthMonitor } from '../shared/health-monitor.js';
import type { RenderWorkerMessage, RenderWorkerResponse, WorkerMetrics, BatchMetrics } from '../shared/messages.js';
import type { WorkerTask, WorkerState, PoolState, PoolConfig } from '../shared/state.js';

const DEFAULT_CONFIG: Required<PoolConfig> = {
  minWorkers: config.MIN_WORKERS,
  maxWorkers: config.MAX_WORKERS,
  taskTimeout: config.TASK_TIMEOUT,
  workerTimeout: config.WORKER_TIMEOUT,
  maxRetries: config.MAX_RETRIES,
  queueSize: config.QUEUE_SIZE
};

export class WorkerPoolManager extends EventEmitter {
  private static instance: WorkerPoolManager | null = null;
  private state: PoolState;
  private config: Required<PoolConfig>;
  private metricsInterval: NodeJS.Timeout | null = null;
  private metricsCollector: MetricsCollector;
  private errorRecovery: ErrorRecoveryManager;
  private healthMonitor: HealthMonitor;

  private constructor(config: PoolConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      workers: new Map(),
      taskQueue: [],
      batchMetrics: new Map(),
      isShuttingDown: false
    };
    this.metricsCollector = MetricsCollector.getInstance();
    this.errorRecovery = new ErrorRecoveryManager(
      {
        failureThreshold: 3,
        resetTimeout: 30000 // 30 seconds
      },
      {
        maxRetries: this.config.maxRetries,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
      }
    );
    this.healthMonitor = new HealthMonitor();
    this.initialize();
  }

  public static getInstance(config?: PoolConfig): WorkerPoolManager {
    if (!WorkerPoolManager.instance) {
      WorkerPoolManager.instance = new WorkerPoolManager(config);
    }
    return WorkerPoolManager.instance;
  }

  private initialize(): void {
    // Create initial workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker();
    }

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      const metrics = this.metricsCollector.collectMetrics(this.state, this.config.queueSize);
      this.emit('metrics', metrics);
    }, config.METRICS_INTERVAL);

    // Set up health monitor events
    this.healthMonitor.on('workerUnhealthy', async (workerId: number) => {
      const worker = Array.from(this.state.workers.entries())
        .find(([w]) => w.threadId === workerId)?.[0];
      
      if (worker) {
        logger.warn('Replacing unhealthy worker', { workerId });
        await this.replaceWorker(worker);
      }
    });

    // Log initialization
    logger.info('Worker pool initialized', {
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
      queueSize: this.config.queueSize,
      metricsInterval: config.METRICS_INTERVAL
    });
  }

  private createWorker(): Worker {
    const worker = new Worker(
      join(__dirname, '..', 'render', 'worker.js'),
      { 
        workerData: { 
          id: this.state.workers.size,
          role: this.determineWorkerRole()
        } 
      }
    );

    const workerState: WorkerState = {
      isProcessing: false,
      processedTasks: 0,
      errors: 0,
      totalProcessingTime: 0,
      startTime: Date.now(),
      config: getDefaultConfig(this.determineWorkerRole())
    };

    this.state.workers.set(worker, workerState);
    this.healthMonitor.registerWorker(worker.threadId);

    worker.on('message', (response: RenderWorkerResponse) => {
      if (response.type === 'status' && response.status) {
        this.healthMonitor.updateWorkerStatus(worker.threadId, response.status);
      }
      this.handleWorkerResponse(worker, response);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(worker, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(worker, code);
    });

    return worker;
  }

  private determineWorkerRole(): string {
    const workerCounts = {
      render: 0,
      encode: 0,
      process: 0
    };

    // Count existing worker roles
    for (const [_, state] of this.state.workers) {
      const role = state.config?.preferredTaskTypes?.[0] || 'render';
      workerCounts[role as keyof typeof workerCounts]++;
    }

    // Determine needed role based on current distribution
    if (workerCounts.render < this.config.minWorkers / 2) {
      return 'render';
    } else if (workerCounts.encode < this.config.minWorkers / 4) {
      return 'encode';
    } else {
      return 'process';
    }
  }

  private handleWorkerResponse(worker: Worker, response: RenderWorkerResponse): void {
    const state = this.state.workers.get(worker);
    if (!state) return;

    state.isProcessing = false;
    state.processedTasks++;
    
    if (response.metadata) {
      state.totalProcessingTime += response.metadata.duration;
      // Update memory usage from worker metrics
      if (response.metadata.memory) {
        state.memoryUsage = response.metadata.memory.heapUsed;
      }
    }

    // Update batch metrics
    this.updateBatchMetrics(response);

    // Handle response
    if (response.type === 'error') {
      state.errors++;
      state.currentTask?.reject(new Error(response.error));
    } else {
      state.currentTask?.resolve(response);
    }

    state.currentTask = undefined;

    // Try to process next task
    this.processNextTask(worker);
  }

  private async handleWorkerError(worker: Worker, error: Error): Promise<void> {
    const state = this.state.workers.get(worker);
    if (!state) return;

    state.errors++;
    state.lastError = error;
    logger.error('Worker error', { error, workerId: worker.threadId });

    // Record failure in circuit breaker
    this.errorRecovery.executeWithRecovery(
      `worker-${worker.threadId}`,
      async () => {
        throw error; // This will record the failure
      }
    ).catch(() => {}); // We don't need to handle the error here

    if (state.currentTask) {
      // Retry the current task if possible
      if (!state.currentTask.retries) state.currentTask.retries = 0;
      if (state.currentTask.retries < this.config.maxRetries) {
        state.currentTask.retries++;
        this.addTask(state.currentTask);
      } else {
        state.currentTask.reject(error);
      }
      state.currentTask = undefined;
    }

    // Replace worker if circuit breaker is open
    const circuitState = this.errorRecovery.getCircuitBreakerState(`worker-${worker.threadId}`);
    if (circuitState === 'open') {
      await this.replaceWorker(worker);
    }
  }

  private async handleWorkerExit(worker: Worker, code: number): Promise<void> {
    const state = this.state.workers.get(worker);
    if (!state) return;

    logger.info('Worker exited', { code, workerId: worker.threadId });
    this.state.workers.delete(worker);
    this.healthMonitor.unregisterWorker(worker.threadId);

    if (!this.state.isShuttingDown && this.state.workers.size < this.config.minWorkers) {
      this.createWorker();
    }
  }

  private async replaceWorker(worker: Worker): Promise<void> {
    const state = this.state.workers.get(worker);
    if (!state) return;

    logger.info('Replacing worker', {
      workerId: worker.threadId,
      processedTasks: state.processedTasks,
      memory: Math.round((state.memoryUsage || 0) / 1024 / 1024) + 'MB'
    });

    // Create new worker before terminating old one
    const newWorker = this.createWorker();

    // Wait for new worker to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Terminate old worker
    try {
      await worker.terminate();
      this.state.workers.delete(worker);
      this.healthMonitor.unregisterWorker(worker.threadId);
      
      logger.info('Worker replaced successfully', {
        oldWorker: worker.threadId,
        newWorker: newWorker.threadId
      });
    } catch (error) {
      logger.error('Error replacing worker', {
        workerId: worker.threadId,
        error
      });
      throw error;
    }
  }

  private updateBatchMetrics(response: RenderWorkerResponse): void {
    if (!response.batchId) return;

    let metrics = this.state.batchMetrics.get(response.batchId);
    if (!metrics) {
      metrics = {
        totalTasks: 0,
        completedTasks: 0,
        errors: 0,
        averageProcessingTime: 0,
        startTime: Date.now()
      };
      this.state.batchMetrics.set(response.batchId, metrics);
    }

    metrics.completedTasks++;
    if (response.type === 'error') {
      metrics.errors++;
    }
    if (response.metadata) {
      metrics.averageProcessingTime = 
        (metrics.averageProcessingTime * (metrics.completedTasks - 1) + 
         response.metadata.duration) / metrics.completedTasks;
    }
  }

  public async processTask(message: RenderWorkerMessage): Promise<RenderWorkerResponse> {
    if (this.state.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        message,
        resolve,
        reject,
        priority: message.priority,
        addedTime: Date.now()
      };

      this.addTask(task);
    });
  }

  private addTask(task: WorkerTask): void {
    // Check queue size limit
    if (this.state.taskQueue.length >= this.config.queueSize) {
      task.reject(new Error('Task queue is full'));
      return;
    }

    // Add task to queue
    this.state.taskQueue.push(task);
    this.state.taskQueue.sort((a, b) => {
      // Sort by priority first, then by age
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0;
      }
      return a.addedTime - b.addedTime;
    });

    // Try to process task immediately if workers are available
    for (const [worker, state] of this.state.workers) {
      if (!state.isProcessing) {
        this.processNextTask(worker);
        break;
      }
    }

    // Check if we need to scale the pool
    this.scalePool().catch(error => {
      logger.error('Error scaling worker pool', { error });
    });
  }

  private processNextTask(worker: Worker): void {
    const state = this.state.workers.get(worker);
    if (!state || state.isProcessing || this.state.taskQueue.length === 0) return;

    const task = this.state.taskQueue.shift();
    if (!task) return;

    state.isProcessing = true;
    state.currentTask = task;

    worker.postMessage(task.message);

    // Set task timeout
    setTimeout(() => {
      if (state.isProcessing && state.currentTask === task) {
        this.handleWorkerError(worker, new Error('Task timeout'));
      }
    }, this.config.taskTimeout);
  }

  private shouldScaleUp(): boolean {
    const metrics = this.metricsCollector.collectMetrics(this.state, this.config.queueSize);
    const activeWorkers = metrics.activeWorkers;
    const queueLength = metrics.queueLength;
    
    // Check if we're under heavy CPU load
    const cpuThreshold = 80; // 80% CPU usage threshold
    const isHighCPU = metrics.resourceUtilization.cpu.total > cpuThreshold;

    // Check if we have enough memory available
    const memoryThreshold = 0.9; // 90% memory usage threshold
    const isHighMemory = metrics.resourceUtilization.memory > memoryThreshold;

    // Don't scale if system resources are constrained
    if (isHighCPU || isHighMemory) {
      logger.warn('Resource limits reached, cannot scale up', {
        cpu: Math.round(metrics.resourceUtilization.cpu.total),
        memory: Math.round(metrics.resourceUtilization.memory * 100),
        activeWorkers,
        queueLength
      });
      return false;
    }

    // Calculate optimal number of workers based on queue length and processing rate
    const avgProcessingTime = metrics.averageProcessingTime || 1000; // Default to 1s if no data
    const targetWorkers = Math.ceil(queueLength * (avgProcessingTime / 1000));

    // Scale up if we need more workers and haven't hit limits
    const shouldScale = (
      this.state.workers.size < this.config.maxWorkers &&
      queueLength > activeWorkers &&
      targetWorkers > this.state.workers.size
    );

    if (shouldScale) {
      logger.info('Scaling up worker pool', {
        currentWorkers: this.state.workers.size,
        activeWorkers,
        queueLength,
        targetWorkers,
        avgProcessingTime
      });
    }

    return shouldScale;
  }

  private shouldScaleDown(): boolean {
    const metrics = this.metricsCollector.collectMetrics(this.state, this.config.queueSize);
    const activeWorkers = metrics.activeWorkers;
    const queueLength = metrics.queueLength;

    // Only consider scaling down if we have more than minimum workers
    if (this.state.workers.size <= this.config.minWorkers) {
      return false;
    }

    // Calculate worker utilization
    const utilization = activeWorkers / this.state.workers.size;
    const utilizationThreshold = 0.5; // 50% utilization threshold

    // Calculate optimal number of workers based on current load
    const avgProcessingTime = metrics.averageProcessingTime || 1000;
    const targetWorkers = Math.ceil(queueLength * (avgProcessingTime / 1000));

    // Scale down if utilization is low and we have excess capacity
    const shouldScale = (
      utilization < utilizationThreshold &&
      targetWorkers < this.state.workers.size &&
      this.state.workers.size > this.config.minWorkers
    );

    if (shouldScale) {
      logger.info('Scaling down worker pool', {
        currentWorkers: this.state.workers.size,
        activeWorkers,
        queueLength,
        utilization,
        targetWorkers
      });
    }

    return shouldScale;
  }

  private async scalePool(): Promise<void> {
    const metrics = this.metricsCollector.collectMetrics(this.state, this.config.queueSize);
    const memoryUsage = metrics.resourceUtilization.memory;
    const cpuUsage = metrics.resourceUtilization.cpu.total;

    // Log current resource state
    logger.info('Pool scaling check', {
      workers: this.state.workers.size,
      activeWorkers: metrics.activeWorkers,
      queueLength: metrics.queueLength,
      memory: Math.round(memoryUsage * 100) + '%',
      cpu: Math.round(cpuUsage) + '%'
    });

    // Check if we're approaching memory limits
    if (memoryUsage > 0.85) { // 85% memory usage
      logger.warn('High memory usage detected', {
        usage: Math.round(memoryUsage * 100) + '%',
        activeWorkers: metrics.activeWorkers,
        queueLength: metrics.queueLength
      });

      // Try to free up memory
      await this.optimizeMemory();
    }

    if (this.shouldScaleUp()) {
      // Only scale up if we have enough memory headroom
      if (memoryUsage < 0.8) { // 80% memory threshold for scaling up
        this.createWorker();
        logger.info('Scaled up worker pool', {
          newSize: this.state.workers.size,
          memory: Math.round(memoryUsage * 100) + '%',
          cpu: Math.round(cpuUsage) + '%'
        });
      } else {
        logger.warn('Skipping scale up due to memory constraints', {
          memory: Math.round(memoryUsage * 100) + '%',
          workers: this.state.workers.size
        });
      }
    } else if (this.shouldScaleDown()) {
      // Find least utilized worker to terminate
      const workerEntries = Array.from(this.state.workers.entries());
      const inactiveWorkers = workerEntries.filter(([_, state]) => !state.isProcessing);

      if (inactiveWorkers.length > 0) {
        // Sort by memory usage and processed tasks
        const [workerToRemove] = inactiveWorkers.sort(([_, a], [__, b]) => {
          // Prioritize removing workers with higher memory usage
          const aMemory = a.memoryUsage || 0;
          const bMemory = b.memoryUsage || 0;
          if (Math.abs(aMemory - bMemory) > 50 * 1024 * 1024) { // 50MB difference
            return bMemory - aMemory; // Remove higher memory usage first
          }
          // If memory usage is similar, consider processed tasks
          return a.processedTasks - b.processedTasks;
        })[0];

        logger.info('Scaling down worker pool', {
          removingWorker: workerToRemove.threadId,
          reason: 'optimization',
          memory: Math.round(memoryUsage * 100) + '%'
        });

        await this.replaceWorker(workerToRemove);
      }
    }
  }

  private async optimizeMemory(): Promise<void> {
    logger.info('Starting memory optimization');
    const startMemory = process.memoryUsage();

    // 1. Clear any cached metrics older than 1 hour
    const oldMetrics = this.metricsCollector.getHistory(3600000); // 1 hour
    if (oldMetrics.length > 100) { // Keep last 100 entries
      this.metricsCollector.reset();
      logger.info('Cleared old metrics history');
    }

    // 2. Identify workers with high memory usage
    const highMemoryWorkers = Array.from(this.state.workers.entries())
      .filter(([_, state]) => {
        const workerMemory = state.memoryUsage || 0;
        return workerMemory > 500 * 1024 * 1024; // 500MB threshold
      });

    // 3. Replace high memory workers if they're not processing
    for (const [worker] of highMemoryWorkers) {
      const state = this.state.workers.get(worker);
      if (state && !state.isProcessing) {
        logger.info('Replacing high-memory worker', {
          workerId: worker.threadId,
          memory: Math.round((state.memoryUsage || 0) / 1024 / 1024) + 'MB'
        });
        await this.replaceWorker(worker);
      }
    }

    // 4. Force garbage collection if available
    if (global.gc) {
      logger.info('Forcing garbage collection');
      global.gc();
    }

    // Log memory optimization results
    const endMemory = process.memoryUsage();
    logger.info('Memory optimization complete', {
      before: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
      after: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB',
      freed: Math.round((startMemory.heapUsed - endMemory.heapUsed) / 1024 / 1024) + 'MB',
      replacedWorkers: highMemoryWorkers.length
    });
  }

  public getMetrics(): WorkerMetrics {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalProcessingTime = 0;
    let totalErrors = 0;
    let memoryUsage = 0;

    for (const state of this.state.workers.values()) {
      completedTasks += state.processedTasks;
      totalProcessingTime += state.totalProcessingTime;
      totalErrors += state.errors;
    }

    return {
      totalTasks: completedTasks + this.state.taskQueue.length,
      completedTasks,
      totalProcessingTime,
      tasksByPriority: {
        high: this.state.taskQueue.filter(t => t.priority === 'high').length,
        normal: this.state.taskQueue.filter(t => t.priority === 'normal').length,
        low: this.state.taskQueue.filter(t => t.priority === 'low').length
      },
      averageProcessingTime: completedTasks > 0 ? totalProcessingTime / completedTasks : 0,
      errorRate: completedTasks > 0 ? totalErrors / completedTasks : 0,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  public async shutdown(): Promise<void> {
    this.state.isShuttingDown = true;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Reject remaining tasks
    for (const task of this.state.taskQueue) {
      task.reject(new Error('Worker pool shutting down'));
    }
    this.state.taskQueue = [];

    // Terminate all workers
    const terminations = Array.from(this.state.workers.keys()).map(worker => 
      worker.terminate()
    );

    await Promise.all(terminations);
    this.state.workers.clear();
    this.healthMonitor.shutdown();
    WorkerPoolManager.instance = null;
  }

  public async updateWorkerConfig(workerId: number, config: Partial<WorkerConfig>): Promise<void> {
    const worker = Array.from(this.state.workers.entries())
      .find(([w]) => w.threadId === workerId)?.[0];

    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    const state = this.state.workers.get(worker);
    if (!state) return;

    try {
      // Send config update to worker
      worker.postMessage({
        type: 'config',
        config
      });

      // Wait for confirmation
      const response = await new Promise<RenderWorkerResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Config update timeout'));
        }, this.config.taskTimeout);

        const handler = (response: RenderWorkerResponse) => {
          if (response.type === 'config_updated') {
            clearTimeout(timeout);
            worker.off('message', handler);
            resolve(response);
          }
        };

        worker.on('message', handler);
      });

      // Update state with new config
      if (response.config) {
        state.config = response.config;
        logger.info('Worker config updated', {
          workerId,
          config: response.config
        });
      }
    } catch (error) {
      logger.error('Failed to update worker config', {
        workerId,
        error,
        config
      });
      throw error;
    }
  }

  public async updatePoolConfig(config: Partial<WorkerConfig>): Promise<void> {
    logger.info('Updating pool configuration', { config });

    const updates = Array.from(this.state.workers.entries()).map(([worker]) => 
      this.updateWorkerConfig(worker.threadId, config)
    );

    try {
      await Promise.all(updates);
      logger.info('Pool configuration updated successfully');
    } catch (error) {
      logger.error('Failed to update pool configuration', { error });
      throw error;
    }
  }

  private async optimizeWorkerConfigs(): Promise<void> {
    const metrics = this.metricsCollector.collectMetrics(this.state, this.config.queueSize);
    
    for (const [worker, state] of this.state.workers) {
      if (!state.config) continue;

      const workerMetrics = metrics.resourceUtilization;
      const config: Partial<WorkerConfig> = {};

      // Adjust memory limits based on usage patterns
      if (state.memoryUsage) {
        const memoryUsageMB = state.memoryUsage / 1024 / 1024;
        if (memoryUsageMB > state.config.maxMemoryMB * 0.9) {
          config.maxMemoryMB = Math.min(
            Math.ceil(memoryUsageMB * 1.2), // 20% headroom
            8192 // Max 8GB
          );
        } else if (memoryUsageMB < state.config.maxMemoryMB * 0.5) {
          config.maxMemoryMB = Math.max(
            Math.ceil(memoryUsageMB * 1.5), // 50% headroom
            512 // Min 512MB
          );
        }
      }

      // Adjust batch size based on processing speed
      if (state.processedTasks > 0) {
        const avgProcessingTime = state.totalProcessingTime / state.processedTasks;
        if (avgProcessingTime < 100) { // Fast processing
          config.batchSize = Math.min(state.config.batchSize + 5, 100);
        } else if (avgProcessingTime > 500) { // Slow processing
          config.batchSize = Math.max(state.config.batchSize - 5, 1);
        }
      }

      // Update if changes needed
      if (Object.keys(config).length > 0) {
        try {
          await this.updateWorkerConfig(worker.threadId, config);
        } catch (error) {
          logger.error('Failed to optimize worker config', {
            workerId: worker.threadId,
            error
          });
        }
      }
    }
  }

  private async processTaskWithWorker(worker: Worker, task: WorkerTask): Promise<void> {
    const state = this.state.workers.get(worker);
    if (!state) return;

    state.isProcessing = true;
    state.currentTask = task;

    try {
      await this.errorRecovery.executeWithRecovery(
        `worker-${worker.threadId}`,
        async () => {
          return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Task timeout'));
            }, this.config.taskTimeout);

            worker.once('message', (response: RenderWorkerResponse) => {
              clearTimeout(timeout);
              if (response.type === 'error') {
                reject(new Error(response.error));
              } else {
                resolve();
              }
            });

            worker.once('error', reject);
            worker.postMessage(task.message);
          });
        }
      );

      // Task completed successfully
      state.isProcessing = false;
      state.currentTask = undefined;
      this.processNextTask(worker);
    } catch (error) {
      // Handle task failure
      state.errors++;
      state.lastError = error;
      logger.error('Task processing failed', {
        workerId: worker.threadId,
        taskId: task.message.batchId,
        error,
        retries: task.retries || 0
      });

      // Check if we should retry
      if (!task.retries) task.retries = 0;
      if (task.retries < this.config.maxRetries) {
        task.retries++;
        logger.info('Retrying failed task', {
          workerId: worker.threadId,
          taskId: task.message.batchId,
          attempt: task.retries
        });
        this.addTask(task);
      } else {
        task.reject(error);
      }

      // Reset worker state
      state.isProcessing = false;
      state.currentTask = undefined;

      // Check if worker needs replacement
      const circuitState = this.errorRecovery.getCircuitBreakerState(`worker-${worker.threadId}`);
      if (circuitState === 'open') {
        logger.warn('Replacing worker due to circuit breaker open', {
          workerId: worker.threadId,
          errors: state.errors
        });
        await this.replaceWorker(worker);
      } else {
        this.processNextTask(worker);
      }
    }
  }
}
