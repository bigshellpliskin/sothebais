import { parentPort, workerData } from 'worker_threads';
import { performance } from 'perf_hooks';
import { CompositionEngine } from '../../core/composition.js';
import { ViewportManager } from '../../core/viewport.js';
import { AssetManager } from '../../core/assets.js';
import type { RenderWorkerMessage, RenderWorkerResponse, TaskMetadata, WorkerStatus } from '../shared/messages.js';
import type { RenderTask } from '../shared/tasks.js';
import { logger } from '../../utils/logger.js';
import { getDefaultConfig, type WorkerConfig, validateConfig } from '../shared/config.js';

class RenderWorker {
  private isProcessing: boolean = false;
  private workerId: number;
  private composition: CompositionEngine;
  private viewport: ViewportManager;
  private assetManager: AssetManager;
  private lastMemoryCheck: number = 0;
  private config: WorkerConfig;
  private isReady: boolean = false;
  private taskCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.workerId = workerData.id;
    this.composition = CompositionEngine.getInstance();
    this.viewport = ViewportManager.getInstance();
    this.assetManager = AssetManager.getInstance();
    this.config = getDefaultConfig(workerData.role || 'render');
    this.initialize();
  }

  private initialize(): void {
    if (!parentPort) {
      throw new Error('Parent port is not available');
    }

    // Log initial memory state
    const initialMemory = process.memoryUsage();
    logger.info('Render worker initialized', { 
      workerId: this.workerId,
      config: this.config,
      memory: {
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB',
        external: Math.round(initialMemory.external / 1024 / 1024) + 'MB'
      }
    });

    parentPort.on('message', async (message: RenderWorkerMessage) => {
      try {
        switch (message.type) {
          case 'render':
            if (!message.task) {
              throw new Error('No task provided for render message');
            }
            // Check memory before processing
            this.checkMemory('pre-task');
            await this.handleMessage(message);
            // Check memory after processing
            this.checkMemory('post-task');
            break;

          case 'config':
            if (message.config) {
              await this.updateConfig(message.config);
            }
            break;

          case 'status':
            this.sendStatus();
            break;
        }
      } catch (error) {
        this.errorCount++;
        this.sendError(error as Error, message.batchId);
      }
    });

    // Handle cleanup on exit
    process.on('SIGTERM', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());

    // Regular memory checks
    setInterval(() => this.checkMemory('periodic'), this.config.healthCheckInterval);
    
    // Regular status updates
    setInterval(() => this.sendStatus(), this.config.metricsInterval);

    this.isReady = true;
    this.sendStatus();
  }

  private async updateConfig(newConfig: Partial<WorkerConfig>): Promise<void> {
    try {
      // Validate and merge new configuration
      const validConfig = validateConfig({
        ...this.config,
        ...newConfig
      });

      // Apply changes
      const oldConfig = this.config;
      this.config = validConfig;

      // Log configuration update
      logger.info('Worker configuration updated', {
        workerId: this.workerId,
        oldConfig,
        newConfig: this.config,
        changes: Object.keys(newConfig)
      });

      // Send confirmation
      this.sendResponse({
        type: 'config_updated',
        config: this.config
      });

      // Apply any immediate effects
      if (newConfig.maxMemoryMB && newConfig.maxMemoryMB < oldConfig.maxMemoryMB) {
        // Force GC if memory limit was lowered
        this.checkMemory('config-update');
      }
    } catch (error) {
      logger.error('Configuration update failed', {
        workerId: this.workerId,
        error,
        config: newConfig
      });
      throw error;
    }
  }

  private checkMemory(context: 'pre-task' | 'post-task' | 'periodic' | 'config-update'): void {
    const now = Date.now();
    // Only log periodic checks at interval
    if (context === 'periodic' && now - this.lastMemoryCheck < this.config.healthCheckInterval) {
      return;
    }

    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const heapUsage = memory.heapUsed / memory.heapTotal;

    // Always log if it's pre/post task or if usage is high
    if (context !== 'periodic' || heapUsage > this.config.gcThreshold) {
      logger.info('Worker memory status', {
        workerId: this.workerId,
        context,
        memory: {
          heapUsed: heapUsedMB + 'MB',
          heapTotal: heapTotalMB + 'MB',
          usage: Math.round(heapUsage * 100) + '%',
          rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
          external: Math.round(memory.external / 1024 / 1024) + 'MB'
        }
      });
    }

    // Handle high memory usage
    if (heapUsedMB > this.config.maxMemoryMB || heapUsage > this.config.gcThreshold) {
      logger.warn('Critical memory usage detected', {
        workerId: this.workerId,
        usage: Math.round(heapUsage * 100) + '%',
        context
      });
      
      // Force garbage collection if available
      if (global.gc) {
        logger.info('Forcing garbage collection', { workerId: this.workerId });
        global.gc();
        
        // Log memory after GC
        const afterGC = process.memoryUsage();
        logger.info('Memory after garbage collection', {
          workerId: this.workerId,
          memory: {
            heapUsed: Math.round(afterGC.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(afterGC.heapTotal / 1024 / 1024) + 'MB',
            usage: Math.round((afterGC.heapUsed / afterGC.heapTotal) * 100) + '%'
          }
        });
      }
    }

    this.lastMemoryCheck = now;
  }

  private async handleMessage(message: RenderWorkerMessage): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Worker is already processing a task');
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      let result: Buffer | undefined;
      
      if (message.type === 'render') {
        result = await this.handleRender(message.task);
      }

      const endTime = performance.now();
      const metadata: TaskMetadata = {
        duration: endTime - startTime,
        startTime,
        endTime,
        memory: {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        }
      };

      this.sendResponse({
        type: 'success',
        data: result,
        batchId: message.batchId,
        metadata
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleRender(task: RenderTask): Promise<Buffer> {
    this.taskCount++;
    const startMemory = process.memoryUsage();
    try {
      // Update viewport dimensions if needed
      if (task.width !== this.viewport.getDimensions().width ||
          task.height !== this.viewport.getDimensions().height) {
        this.viewport.updateDimensions(task.width, task.height);
      }

      // Log memory before asset preloading
      logger.debug('Memory before asset preload', {
        workerId: this.workerId,
        layerCount: task.layers.length,
        memory: {
          heapUsed: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB'
        }
      });

      // Preload assets if needed
      if (task.layers.length > 0 && this.config.preloadAssets) {
        await this.assetManager.preloadAssets(task.layers);
      }

      // Log memory after asset preloading
      const afterPreload = process.memoryUsage();
      logger.debug('Memory after asset preload', {
        workerId: this.workerId,
        memory: {
          heapUsed: Math.round(afterPreload.heapUsed / 1024 / 1024) + 'MB',
          change: Math.round((afterPreload.heapUsed - startMemory.heapUsed) / 1024 / 1024) + 'MB'
        }
      });

      // Create scene and render
      const scene = {
        id: `worker_${this.workerId}_${Date.now()}`,
        name: 'Worker Render',
        assets: task.layers
      };

      // Apply any effects if specified
      const transition = task.effects?.[0];
      const frame = await this.composition.renderScene(scene, transition);

      // Log final memory usage
      const endMemory = process.memoryUsage();
      logger.debug('Render complete', {
        workerId: this.workerId,
        dimensions: { width: task.width, height: task.height },
        layerCount: task.layers.length,
        hasEffects: !!transition,
        memory: {
          total: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB',
          change: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024) + 'MB'
        }
      });

      return frame;
    } catch (error) {
      this.errorCount++;
      logger.error('Render error', {
        workerId: this.workerId,
        error,
        task: {
          dimensions: { width: task.width, height: task.height },
          layerCount: task.layers.length
        },
        memory: {
          start: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
          current: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        }
      });
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    const startMemory = process.memoryUsage();
    try {
      // Clear caches
      this.composition.clearCache();
      this.assetManager.clearCache();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const endMemory = process.memoryUsage();
      logger.info('Worker cleanup completed', { 
        workerId: this.workerId,
        memory: {
          before: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
          after: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB',
          freed: Math.round((startMemory.heapUsed - endMemory.heapUsed) / 1024 / 1024) + 'MB'
        }
      });
    } catch (error) {
      logger.error('Cleanup error', { 
        workerId: this.workerId, 
        error,
        memory: process.memoryUsage()
      });
      throw error;
    }
  }

  private createTaskMetadata(startTime: number): TaskMetadata {
    const endTime = performance.now();
    const memory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      startTime,
      endTime,
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss
      }
    };
  }

  private sendResponse(response: RenderWorkerResponse): void {
    if (!parentPort) {
      throw new Error('Parent port is not available');
    }
    parentPort.postMessage(response);
  }

  private sendError(error: Error, batchId?: string): void {
    logger.error('Worker error', {
      workerId: this.workerId,
      error,
      batchId
    });

    const metadata = this.createTaskMetadata(performance.now());
    this.sendResponse({
      type: 'error',
      error: error.message,
      batchId,
      metadata
    });
  }

  private sendStatus(): void {
    const memory = process.memoryUsage();
    const status: WorkerStatus = {
      healthy: true,
      ready: this.isReady && !this.isProcessing,
      currentConfig: this.config,
      metrics: {
        cpu: process.cpuUsage().user / 1000000, // Convert to seconds
        memory: memory.heapUsed / memory.heapTotal,
        tasks: this.taskCount,
        errors: this.errorCount
      }
    };

    this.sendResponse({
      type: 'status',
      status
    });
  }
}

// Create and initialize the worker
new RenderWorker();
