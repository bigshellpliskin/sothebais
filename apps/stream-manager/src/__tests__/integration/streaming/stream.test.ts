import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger } from '../../../utils/logger.js';
import { FramePipeline } from '../../../streaming/output/pipeline.js';
import { StreamEncoder } from '../../../streaming/output/encoder.js';
import { EventEmitter } from 'events';

describe('Streaming Pipeline Integration', () => {
  let pipeline: FramePipeline;
  let encoder: StreamEncoder;

  beforeEach(async () => {
    encoder = await StreamEncoder.initialize({
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 4000000, // 4Mbps
      codec: 'h264',
      preset: 'veryfast',
      streamUrl: 'rtmp://localhost/live/test',
      outputs: ['rtmp://localhost/live/test']
    });

    pipeline = await FramePipeline.initialize({
      maxQueueSize: 5,
      poolSize: 2,
      quality: 80,
      format: 'raw',
      width: 1920,
      height: 1080
    });
  });

  afterEach(async () => {
    if (pipeline) {
      await pipeline.cleanup();
    }
    if (encoder) {
      encoder.stop();
    }
  });

  it('should initialize streaming pipeline', async () => {
    expect(pipeline).toBeDefined();
    expect(encoder.getMetrics().isStreaming).toBe(false);
  });

  it('should process frames through pipeline', async () => {
    // Create a test frame
    const frame = Buffer.alloc(1920 * 1080 * 4); // RGBA buffer
    
    // Process multiple frames
    for (let i = 0; i < 10; i++) {
      const processedFrame = await pipeline.processFrame(frame);
      encoder.sendFrame(processedFrame);
    }

    const encoderMetrics = encoder.getMetrics();
    
    expect(encoderMetrics.currentFPS).toBeGreaterThan(0);
  });

  it('should handle pipeline errors gracefully', async () => {
    // Simulate encoder error
    (encoder as unknown as EventEmitter).emit('error', new Error('Test encoder error'));

    await new Promise<void>((resolve) => {
      encoder.once('error', (error) => {
        expect(error.message).toContain('encoder error');
        resolve();
      });
    });
  });

  it('should maintain consistent frame rate', async () => {
    encoder.start();
    const frame = Buffer.alloc(1920 * 1080 * 4);
    const startTime = Date.now();
    
    // Process frames for 3 seconds
    for (let i = 0; i < 90; i++) { // 30fps * 3 seconds
      const processedFrame = await pipeline.processFrame(frame);
      encoder.sendFrame(processedFrame);
    }

    const duration = Date.now() - startTime;
    const fps = encoder.getMetrics().currentFPS;

    // Allow for some variance in frame rate
    expect(fps).toBeGreaterThanOrEqual(25); // At least 25fps
    expect(fps).toBeLessThanOrEqual(35); // No more than 35fps
  });

  it('should handle pipeline shutdown', async () => {
    encoder.start();
    const frame = Buffer.alloc(1920 * 1080 * 4);
    const processedFrame = await pipeline.processFrame(frame);
    encoder.sendFrame(processedFrame);
    
    await pipeline.cleanup();
    encoder.stop();
    
    expect(encoder.getMetrics().isStreaming).toBe(false);
    
    // Attempt to process frame after shutdown
    await expect(pipeline.processFrame(frame)).rejects.toThrow();
  });
}); 