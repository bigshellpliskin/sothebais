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
    maxQueueSize: config.PIPELINE_MAX_QUEUE_SIZE,
    poolSize: config.PIPELINE_POOL_SIZE,
    quality: config.PIPELINE_QUALITY,
    format: config.PIPELINE_FORMAT
  });

  const streamKey = 'test';
  const streamUrl = `rtmp://localhost:${config.RTMP_PORT}/live/${streamKey}`;

  const encoder = await StreamEncoder.initialize({
    width,
    height,
    fps: config.TARGET_FPS,
    bitrate: parseInt(config.STREAM_BITRATE.replace('k', '000')),
    codec: 'h264',
    preset: 'veryfast',
    streamUrl
  });

  const muxer = await StreamMuxer.initialize({
    outputs: [streamUrl],
    maxQueueSize: config.MUXER_MAX_QUEUE_SIZE,
    retryAttempts: config.MUXER_RETRY_ATTEMPTS,
    retryDelay: config.MUXER_RETRY_DELAY
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
  while (true) {
    try {
      const frame = await generateTestImage(width, height);
      const processedFrame = await pipeline.processFrame(frame);
      encoder.sendFrame(processedFrame);
      await muxer.processFrame(processedFrame);
      
      // Log metrics periodically
      logger.logMetrics({
        fps: config.TARGET_FPS,
        encoderMetrics: encoder.getMetrics(),
        muxerStats: muxer.getOutputStats()
      });
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, 1000 / config.TARGET_FPS));
    } catch (err) {
      logger.error('Frame processing error', { error: err });
    }
  }
}

main().catch(err => {
  logger.error('Test stream failed', { error: err });
  process.exit(1);
}); 