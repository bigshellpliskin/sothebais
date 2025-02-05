import { parentPort } from 'worker_threads';
import { LayerRenderer } from '../pipeline/layer-renderer.js';
import type { Layer } from '../types/layers.js';
import type { RenderWorkerMessage, RenderWorkerResponse } from '../types/worker.js';

// Create renderer instance with default options
const renderer = LayerRenderer.getInstance();
let isProcessing = false;

if (parentPort) {
  parentPort.on('message', async (message: RenderWorkerMessage) => {
    if (isProcessing) {
      parentPort?.postMessage({
        type: 'error',
        data: new Error('Already processing a frame'),
        batchId: message.batchId
      } as RenderWorkerResponse);
      return;
    }

    const startTime = performance.now();

    try {
      isProcessing = true;
      const { width, height } = message.data;

      // Render the frame
      const buffer = await renderer.renderFrame(width, height);

      const endTime = performance.now();
      isProcessing = false;

      // Send success response
      parentPort?.postMessage({
        type: 'rendered',
        data: buffer,
        batchId: message.batchId,
        metadata: {
          duration: endTime - startTime,
          memory: process.memoryUsage().heapUsed,
          priority: message.priority
        }
      } as RenderWorkerResponse);
    } catch (error) {
      isProcessing = false;
      parentPort?.postMessage({
        type: 'error',
        data: error instanceof Error ? error : new Error('Unknown error'),
        batchId: message.batchId
      } as RenderWorkerResponse);
    }
  });
}

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