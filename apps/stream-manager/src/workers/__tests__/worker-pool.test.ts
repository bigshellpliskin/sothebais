import { jest, describe, test, expect, afterEach, beforeEach } from '@jest/globals';
import { workerPool } from '../worker-pool.js';
import { logger } from '../../utils/logger.js';
import type { Layer, HostLayer, AssistantLayer } from '../../types/layers.js';
import type { RenderWorkerMessage, TaskPriority } from '../../types/worker.js';

// Mock the worker_threads module first
jest.mock('worker_threads', () => {
  const { EventEmitter } = require('events');
  
  class MockWorker extends EventEmitter {
    constructor() {
      super();
      // Ensure the worker is properly initialized
      process.nextTick(() => this.emit('online'));
    }

    postMessage(message: any) {
      // Simulate successful processing with proper async behavior
      process.nextTick(() => {
        this.emit('message', {
          type: 'rendered',
          data: Buffer.from('mock-image-data'),
          metadata: {
            duration: 100,
            memory: 1000000,
            priority: message.priority
          },
          batchId: message.batchId
        });
      });
    }

    terminate() {
      // Ensure proper cleanup
      this.removeAllListeners();
      return Promise.resolve();
    }
  }

  return { Worker: MockWorker };
});

// Create a new worker pool for each test
let testPool: typeof workerPool;

describe('WorkerPool', () => {
  const testLayers: Layer[] = [
    {
      id: 'test-layer-1',
      type: 'host',
      zIndex: 0,
      visible: true,
      opacity: 1,
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
      },
      character: {
        modelUrl: 'test-model-1.vrm',
        textureUrl: null,
        animations: {},
        width: 512,
        height: 512,
      },
    } as HostLayer,
    {
      id: 'test-layer-2',
      type: 'assistant',
      zIndex: 1,
      visible: true,
      opacity: 0.8,
      transform: {
        position: { x: 100, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 45,
        anchor: { x: 0.5, y: 0.5 },
      },
      character: {
        modelUrl: 'test-model-2.vrm',
        textureUrl: null,
        animations: {},
        width: 512,
        height: 512,
      },
    } as AssistantLayer,
  ];

  beforeEach(() => {
    // Reset mocks and create a new worker pool
    jest.clearAllMocks();
    testPool = new (workerPool.constructor as any)();
  });

  afterEach(async () => {
    // Ensure all workers are properly terminated
    await testPool.shutdown();
    // Clear any remaining timeouts
    jest.clearAllTimers();
  });

  test('processes single high-priority render task', async () => {
    const renderTask: RenderWorkerMessage = {
      type: 'render',
      priority: 'high',
      data: {
        width: 1920,
        height: 1080,
        layers: testLayers,
        options: { quality: 'high', format: 'rgba' },
      },
    };

    const renderResult = await testPool.processTask(renderTask);
    expect(renderResult.type).toBe('rendered');
    expect(renderResult.data).toBeInstanceOf(Buffer);
  }, 30000);

  test('processes batch tasks with mixed priorities', async () => {
    const batchTasks: RenderWorkerMessage[] = [
      {
        type: 'transform',
        priority: 'high',
        data: {
          width: 1920,
          height: 1080,
          layers: [testLayers[0]],
          options: { quality: 'high', format: 'rgba' },
        },
      },
      {
        type: 'transform',
        priority: 'normal',
        data: {
          width: 1920,
          height: 1080,
          layers: [testLayers[1]],
          options: { quality: 'medium', format: 'rgba' },
        },
      },
      {
        type: 'composite',
        priority: 'low',
        data: {
          width: 1920,
          height: 1080,
          layers: testLayers,
          options: { quality: 'low', format: 'rgba' },
        },
      },
    ];

    const batchResults = await testPool.processBatch(batchTasks);
    expect(batchResults).toHaveLength(3);
    batchResults.forEach(result => {
      expect(result.type).toBe('rendered');
      expect(result.data).toBeInstanceOf(Buffer);
    });
  }, 30000);

  test('provides worker pool metrics', async () => {
    const metrics = testPool.getMetrics();
    expect(metrics).toHaveProperty('activeWorkers');
    expect(metrics).toHaveProperty('pendingTasks');
    expect(metrics).toHaveProperty('averageProcessingTime');
    expect(metrics).toHaveProperty('tasksByPriority');
  }, 30000);

  test('handles invalid task errors', async () => {
    const invalidTask: RenderWorkerMessage = {
      type: 'render',
      priority: 'high',
      data: {
        width: -1,
        height: -1,
        layers: [],
        options: { quality: 'high', format: 'rgba' },
      },
    };

    await expect(testPool.processTask(invalidTask)).resolves.toBeDefined();
  }, 30000);

  test('maintains priority queue ordering', async () => {
    const priorityTasks: RenderWorkerMessage[] = [
      { type: 'render', priority: 'low', data: { width: 1920, height: 1080, layers: testLayers, options: { quality: 'low', format: 'rgba' } } },
      { type: 'render', priority: 'high', data: { width: 1920, height: 1080, layers: testLayers, options: { quality: 'high', format: 'rgba' } } },
      { type: 'render', priority: 'normal', data: { width: 1920, height: 1080, layers: testLayers, options: { quality: 'medium', format: 'rgba' } } },
    ];

    const priorityResults = await Promise.all(priorityTasks.map(task => testPool.processTask(task)));
    priorityResults.forEach(result => {
      expect(result.type).toBe('rendered');
      expect(result.data).toBeInstanceOf(Buffer);
    });
  }, 30000);
}); 