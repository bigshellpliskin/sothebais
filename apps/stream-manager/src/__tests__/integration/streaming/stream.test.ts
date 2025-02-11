import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger } from '../../../utils/logger.js';
import { FramePipeline } from '../../../streaming/output/pipeline.js';
import { StreamEncoder } from '../../../streaming/output/encoder.js';
import { StreamMuxer } from '../../../streaming/output/muxer.js';
import { EventEmitter } from 'events';

describe('Streaming Pipeline Integration', () => {
  let pipeline: FramePipeline;
  let encoder: StreamEncoder;
  let muxer: StreamMuxer;

  beforeEach(async () => {
    encoder = await StreamEncoder.initialize({
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 4000000, // 4Mbps
      codec: 'h264',
      preset: 'veryfast',
      streamUrl: 'rtmp://localhost/live/test'
    });

    muxer = await StreamMuxer.initialize({
      outputs: ['rtmp://localhost/live/test'],
      maxQueueSize: 60,
      retryAttempts: 3,
      retryDelay: 1000
    });

    pipeline = await FramePipeline.initialize({
      maxQueueSize: 5,
      poolSize: 2,
      quality: 80,
      format: 'raw'
    });
  });

  afterEach(async () => {
    if (pipeline) {
      await pipeline.cleanup();
    }
    if (encoder) {
      encoder.stop();
    }
    if (muxer) {
      await muxer.cleanup();
    }
  });

  it('should initialize streaming pipeline', async () => {
    expect(pipeline).toBeDefined();
    expect(encoder.getMetrics().isStreaming).toBe(false);
    expect(Array.from(muxer.getOutputStats().values())[0]).toBeDefined();
  });

  it('should process frames through pipeline', async () => {
    // Create a test frame
    const frame = Buffer.alloc(1920 * 1080 * 4); // RGBA buffer
    
    // Process multiple frames
    for (let i = 0; i < 10; i++) {
      const processedFrame = await pipeline.processFrame(frame);
      encoder.sendFrame(processedFrame);
      await muxer.processFrame(processedFrame);
    }

    const encoderMetrics = encoder.getMetrics();
    const muxerStats = muxer.getOutputStats();
    
    expect(encoderMetrics.currentFPS).toBeGreaterThan(0);
    expect(muxerStats.size).toBeGreaterThan(0);
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
      await muxer.processFrame(processedFrame);
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
    await muxer.processFrame(processedFrame);
    
    await pipeline.cleanup();
    encoder.stop();
    await muxer.cleanup();
    
    expect(encoder.getMetrics().isStreaming).toBe(false);
    
    // Attempt to process frame after shutdown
    await expect(pipeline.processFrame(frame)).rejects.toThrow();
  });
}); 