import sharp from 'sharp';
import { RTMPServer } from '../../streaming/rtmp/server.js';
import { StreamEncoder } from '../../streaming/output/encoder.js';
import { StreamMuxer } from '../../streaming/output/muxer.js';
import { FramePipeline } from '../../streaming/output/pipeline.js';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

async function generateTestImage(width: number, height: number): Promise<Buffer> {
  // Create a test pattern with text
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#001f3f"/>
      <text x="50%" y="50%" font-family="Arial" font-size="40" fill="white" text-anchor="middle">
        Sothebais Test Stream
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="30" fill="white" text-anchor="middle">
        ${new Date().toLocaleTimeString()}
      </text>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .toBuffer();
}

async function main() {
  // Load configuration
  const config = await loadConfig();
  logger.initialize(config);
  
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);

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

  // Add stream key to allowed list
  rtmpServer.addStreamKey(streamKey);

  const encoder = await StreamEncoder.initialize({
    width,
    height,
    fps: config.TARGET_FPS,
    bitrate: parseInt(config.STREAM_BITRATE.replace('k', '000')),
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

  logger.logStreamEvent('server_started', { 
    url: streamUrl,
    resolution: config.STREAM_RESOLUTION,
    fps: config.TARGET_FPS,
    bitrate: config.STREAM_BITRATE
  });

  logger.logStreamEvent('stream_started');

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
      const frame = await generateTestImage(width, height);
      const processedFrame = await pipeline.processFrame(frame);
      
      if (!processedFrame) {
        logger.warn('Null frame received from pipeline, skipping');
        continue;
      }

      encoder.sendFrame(processedFrame);
      await muxer.processFrame(processedFrame);
      
      // Log metrics every 5 seconds (adjust TARGET_FPS * 5)
      if (frameCount % (config.TARGET_FPS * 5) === 0) {
        logger.logMetrics({
          fps: config.TARGET_FPS,
          encoderMetrics: encoder.getMetrics(),
          muxerStats: muxer.getOutputStats(),
          rtmpMetrics: rtmpServer.getMetrics()
        });
      }
      frameCount++;
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, 1000 / config.TARGET_FPS));
    } catch (err) {
      logger.error('Frame processing error', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // If we get too many errors, exit
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