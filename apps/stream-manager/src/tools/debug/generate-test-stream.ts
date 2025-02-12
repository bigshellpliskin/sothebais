import sharp from 'sharp';
import { RTMPServer } from '../../streaming/rtmp/server.js';
import { StreamEncoder } from '../../streaming/output/encoder.js';
import { StreamMuxer } from '../../streaming/output/muxer.js';
import { FramePipeline } from '../../streaming/output/pipeline.js';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

async function generateTestImage(width: number, height: number): Promise<Buffer> {
  // Create the complete SVG with background and text
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" 
         xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#001f3f"/>
      <text 
        x="50%" 
        y="45%" 
        font-family="sans-serif"
        font-size="48" 
        fill="white" 
        text-anchor="middle" 
        alignment-baseline="middle"
        font-weight="bold">
        Sothebais Test Stream
      </text>
      <text 
        x="50%" 
        y="55%" 
        font-family="sans-serif"
        font-size="36" 
        fill="white" 
        text-anchor="middle"
        alignment-baseline="middle">
        ${new Date().toLocaleTimeString()}
      </text>
    </svg>`;

  // Single sharp operation to convert SVG to image buffer
  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

async function main() {
  // Load configuration
  const config = await loadConfig();
  logger.initialize(config);
  
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);

  logger.info('Starting test stream generator', {
    resolution: `${width}x${height}`,
    fps: config.TARGET_FPS
  });

  // Initialize components
  const rtmpServer = await RTMPServer.initialize({
    port: config.RTMP_PORT,
    chunk_size: config.RTMP_CHUNK_SIZE,
    gop_cache: config.RTMP_GOP_CACHE,
    ping: config.RTMP_PING,
    ping_timeout: config.RTMP_PING_TIMEOUT
  });

  const pipeline = await FramePipeline.initialize({
    maxQueueSize: 30,
    poolSize: 4,
    quality: 85,
    format: 'raw'
  });

  const streamKey = 'test';
  const streamUrl = `rtmp://localhost:${config.RTMP_PORT}/live/${streamKey}`;

  logger.info('Initialized components', { streamUrl });

  // Add stream key to allowed list
  rtmpServer.addStreamKey(streamKey);

  const encoder = await StreamEncoder.initialize({
    width,
    height,
    fps: config.TARGET_FPS,
    bitrate: 2000, // 2Mbps for testing
    codec: 'h264',
    preset: 'ultrafast',
    outputs: [streamUrl],
    hwaccel: {
      enabled: false
    },
    pipeline: {
      maxLatency: 1000,
      dropThreshold: 500,
      zeroCopy: true,
      threads: 2,
      cpuFlags: ['sse4_2', 'avx2', 'fma', 'avx512f']
    }
  });

  const muxer = await StreamMuxer.initialize({
    outputs: [streamUrl],
    maxQueueSize: 60,
    retryAttempts: 3,
    retryDelay: 1000
  });

  // Start components
  rtmpServer.start();
  encoder.start();

  logger.info('Components started successfully');

  // Stream loop
  let isRunning = true;
  process.on('SIGINT', () => {
    isRunning = false;
    cleanup();
  });
  process.on('SIGTERM', () => {
    isRunning = false;
    cleanup();
  });

  async function cleanup() {
    logger.info('Cleaning up test stream...');
    encoder.stop();
    await pipeline.cleanup();
    await muxer.cleanup();
    rtmpServer.stop();
    process.exit(0);
  }

  let frameCount = 0;
  let errorCount = 0;
  const MAX_ERRORS = 5;

  while (isRunning) {
    try {
      logger.debug(`Generating frame ${frameCount}`);
      const frame = await generateTestImage(width, height);
      
      logger.debug('Processing frame through pipeline');
      const processedFrame = await pipeline.processFrame(frame);
      
      if (!processedFrame) {
        logger.warn('Null frame received from pipeline, skipping');
        continue;
      }

      logger.debug('Sending frame to encoder');
      encoder.sendFrame(processedFrame);
      
      logger.debug('Sending frame to muxer');
      await muxer.processFrame(processedFrame);
      
      // Log metrics every second
      if (frameCount % config.TARGET_FPS === 0) {
        const metrics = encoder.getMetrics();
        const muxerStats = muxer.getOutputStats();
        const rtmpStats = rtmpServer.getMetrics();
        
        logger.info('Stream metrics', {
          frameCount,
          encoderMetrics: {
            isStreaming: metrics.isStreaming,
            fps: metrics.currentFPS,
            bitrate: metrics.bitrate
          },
          muxerStats,
          rtmpStats,
          timestamp: new Date().toISOString()
        });
      }
      frameCount++;
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, 1000 / config.TARGET_FPS));
    } catch (err) {
      logger.error('Frame processing error', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        frameCount
      });
      
      errorCount++;
      if (errorCount > MAX_ERRORS) {
        logger.error('Too many errors, stopping test stream');
        await cleanup();
      }
    }
  }
}

main().catch(err => {
  logger.error('Test stream failed', { error: err });
  process.exit(1);
}); 