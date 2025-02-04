import { parentPort } from 'worker_threads';
import { SharpRenderer } from '../pipeline/sharp-renderer.js';
import type { Layer } from '../types/layers.js';
import type { RenderWorkerMessage, RenderWorkerResponse } from '../types/worker.js';

if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

// Create renderer instance with default options
const renderer = SharpRenderer.getInstance();
let isProcessing = false;

parentPort.on('message', async (message: RenderWorkerMessage) => {
  if (isProcessing) {
    parentPort?.postMessage({
      type: 'error',
      data: new Error('Worker is busy processing another frame'),
      batchId: message.batchId,
    } as RenderWorkerResponse);
    return;
  }

  try {
    isProcessing = true;
    const startTime = performance.now();

    switch (message.type) {
      case 'render': {
        const { width, height, layers, options } = message.data;
        const buffer = await renderer.composite(layers);
        
        const duration = performance.now() - startTime;
        const memoryUsage = process.memoryUsage();

        parentPort?.postMessage({
          type: 'rendered',
          data: buffer,
          batchId: message.batchId,
          metadata: {
            duration,
            memory: memoryUsage.heapUsed,
          },
        } as RenderWorkerResponse);
        break;
      }

      case 'transform': {
        const { width, height, layers, options } = message.data;
        // Process each layer individually
        const transformedLayers = await Promise.all(
          layers.map(async layer => {
            // Create a single-layer composition for transformation
            const buffer = await renderer.composite([layer]);
            return buffer;
          })
        );
        
        const duration = performance.now() - startTime;
        const memoryUsage = process.memoryUsage();

        parentPort?.postMessage({
          type: 'rendered',
          data: transformedLayers,
          batchId: message.batchId,
          metadata: {
            duration,
            memory: memoryUsage.heapUsed,
          },
        } as RenderWorkerResponse);
        break;
      }

      case 'composite': {
        const { width, height, layers, options } = message.data;
        // Composite multiple layers into a single buffer
        const composited = await renderer.composite(layers);
        
        const duration = performance.now() - startTime;
        const memoryUsage = process.memoryUsage();

        parentPort?.postMessage({
          type: 'rendered',
          data: composited,
          batchId: message.batchId,
          metadata: {
            duration,
            memory: memoryUsage.heapUsed,
          },
        } as RenderWorkerResponse);
        break;
      }

      default: {
        throw new Error(`Unknown message type: ${(message as any).type}`);
      }
    }
  } catch (error) {
    parentPort?.postMessage({
      type: 'error',
      data: error instanceof Error ? error : new Error('Unknown error occurred'),
      batchId: message.batchId,
    } as RenderWorkerResponse);
  } finally {
    isProcessing = false;
  }
});

// Handle worker termination
process.on('SIGTERM', async () => {
  try {
    renderer.clearCache();
    process.exit(0);
  } catch (error) {
    console.error('Error during worker cleanup:', error);
    process.exit(1);
  }
});