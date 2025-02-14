import sharp from 'sharp';
import { RTMPServer } from '../../streaming/rtmp/server.js';
import { StreamEncoder } from '../../streaming/output/encoder.js';
import { FramePipeline } from '../../streaming/output/pipeline.js';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '../../types/config.js';

// Get directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateTestImage(width: number, height: number): Promise<Buffer> {
  try {
    // Load background image from assets
    const bgPath = path.join(__dirname, '../../../assets/bgs/layoutFull-BG.png');
    logger.debug('Loading background image', {
      path: bgPath,
      absolutePath: path.resolve(bgPath),
      cwd: process.cwd(),
      __dirname
    });
    
    // Create image processor
    const image = sharp(bgPath);
    
    // Get image metadata
    const metadata = await image.metadata();
    logger.debug('Background image metadata', {
      ...metadata,
      path: bgPath
    });

    // Process the image - just resize for now, overlays should be handled by composition engine
    const processedImage = await image
      .resize(width, height, {
        fit: 'cover', // Cover entire area
        position: 'center'
      })
      .png()
      .toBuffer();

    logger.debug('Generated test frame', {
      size: processedImage.length,
      timestamp: new Date().toISOString()
    });

    return processedImage;
  } catch (error) {
    logger.error('Error generating test image', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cwd: process.cwd(),
      __dirname,
      resolvedPath: path.resolve(__dirname, '../../../../assets/bgs/layoutFull-BG.png')
    });
    throw error;
  }
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

  const streamKey = 'test';
  const streamPath = `/live/${streamKey}`;
  const rtmpUrl = `rtmp://localhost:1935${streamPath}`;

  // Initialize RTMP server
  const rtmpServer = await RTMPServer.initialize({
    port: config.RTMP_PORT,
    chunk_size: config.RTMP_CHUNK_SIZE,
    gop_cache: true,
    ping: config.RTMP_PING,
    ping_timeout: config.RTMP_PING_TIMEOUT
  });

  // Add test stream key
  rtmpServer.addStreamKey(streamKey);

  // Initialize pipeline first (handles frame processing)
  const pipeline = await FramePipeline.initialize({
    maxQueueSize: 30,
    poolSize: 4,
    quality: 85,
    format: 'raw', // Changed to raw for encoder
    width,
    height
  });

  // Initialize encoder (processes raw frames)
  const encoder = await StreamEncoder.initialize({
    width,
    height,
    fps: config.TARGET_FPS,
    bitrate: 4000,
    codec: 'h264',
    preset: 'ultrafast',
    streamUrl: rtmpUrl,
    outputs: [rtmpUrl],
    pipeline: {
      maxLatency: 1000,
      dropThreshold: 500,
      threads: 2,
      inputFormat: 'rgba',
      zeroCopy: false  // Disable zero copy since we need format conversion
    }
  });

  logger.info('Initialized components', { 
    streamPath,
    streamKey,
    rtmpUrl,
    rtmpPort: config.RTMP_PORT,
    rtmpConfig: {
      chunk_size: config.RTMP_CHUNK_SIZE,
      gop_cache: true,
      ping: config.RTMP_PING,
      ping_timeout: config.RTMP_PING_TIMEOUT
    },
    pipelineConfig: {
      format: 'raw',
      quality: 85,
      poolSize: 4
    },
    encoderConfig: {
      codec: 'h264',
      preset: 'ultrafast',
      bitrate: 4000,
      pipeline: {
        maxLatency: 1000,
        dropThreshold: 500,
        threads: 2,
        inputFormat: 'rgba'
      }
    }
  });

  // Track active connections
  let activeConnections = 0;

  // Track connections by type
  let publisherConnections = 0;
  let playerConnections = 0;

  // Track connection details
  const connections = new Map();

  // Add RTMP server event listeners with more detailed logging
  rtmpServer.on('client_connected', (client: any) => {
    connections.set(client.id, {
      id: client.id,
      type: 'pending',
      startTime: Date.now(),
      args: client.args,
      streamPath: client.args?.streamPath
    });
    
    logger.info('RTMP client initial connect', {
      clientId: client.id,
      args: client.args,
      streamPath: client.args?.streamPath,
      activeConnections: connections.size,
      timestamp: new Date().toISOString()
    });
  });

  rtmpServer.on('client_disconnected', (client: any) => {
    const conn = connections.get(client.id);
    if (conn) {
      if (conn.type === 'publisher') {
        publisherConnections = Math.max(0, publisherConnections - 1);
      } else if (conn.type === 'player') {
        playerConnections = Math.max(0, playerConnections - 1);
      }
      connections.delete(client.id);
    }

    logger.info('RTMP client disconnected', {
      clientId: client.id,
      connectionType: conn?.type || 'unknown',
      duration: conn ? Date.now() - conn.startTime : 0,
      remainingPublishers: publisherConnections,
      remainingPlayers: playerConnections,
      timestamp: new Date().toISOString()
    });
  });

  rtmpServer.on('stream_started', (stream: any) => {
    const conn = connections.get(stream.clientId);
    if (conn) {
      conn.type = stream.isPublisher ? 'publisher' : 'player';
      if (stream.isPublisher) {
        publisherConnections++;
        logger.info('RTMP publisher started stream', {
          clientId: stream.clientId,
          streamPath: stream.path,
          publisherConnections,
          timestamp: new Date().toISOString()
        });
      } else {
        playerConnections++;
        logger.info('RTMP player joined stream', {
          clientId: stream.clientId,
          streamPath: stream.path,
          playerConnections,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  rtmpServer.on('stream_ended', (stream: any) => {
    const conn = connections.get(stream.clientId);
    if (conn) {
      if (stream.isPublisher) {
        publisherConnections = Math.max(0, publisherConnections - 1);
        logger.info('RTMP publisher ended stream', {
          clientId: stream.clientId,
          streamPath: stream.path,
          publisherConnections,
          duration: Date.now() - conn.startTime,
          timestamp: new Date().toISOString()
        });
      } else {
        playerConnections = Math.max(0, playerConnections - 1);
        logger.info('RTMP player left stream', {
          clientId: stream.clientId,
          streamPath: stream.path,
          playerConnections,
          duration: Date.now() - conn.startTime,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Add encoder event listeners with more detailed logging
  encoder.on('error', (error: Error) => {
    logger.error('Encoder error', {
      error: error.message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      streamUrl: rtmpUrl,
      encoderState: encoder.getMetrics()
    });
  });

  encoder.on('start', () => {
    logger.info('Encoder started', {
      resolution: `${width}x${height}`,
      fps: config.TARGET_FPS,
      timestamp: new Date().toISOString(),
      streamUrl: rtmpUrl,
      encoderState: encoder.getMetrics()
    });
  });

  // Start components in correct order
  logger.info('Starting components...');
  
  // 1. Start RTMP server first
  rtmpServer.start();
  logger.info('RTMP server started');
  
  // 2. Start encoder
  await encoder.start();
  logger.info('Encoder started');
  
  logger.info('Components started successfully', {
    streamPath,
    resolution: `${width}x${height}`,
    fps: config.TARGET_FPS,
    rtmpUrl
  });

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
    logger.info('Cleaning up test stream...', {
      activeConnections: connections.size,
      isRunning: false
    });
    
    // Stop components in reverse order
    await encoder.stop();
    await pipeline.cleanup();
    rtmpServer.stop();
    process.exit(0);
  }

  let frameCount = 0;
  let errorCount = 0;
  const MAX_ERRORS = 5;

  while (isRunning) {
    try {
      // 1. Generate test frame
      logger.debug(`Generating frame ${frameCount}`);
      const frame = await generateTestImage(width, height);
      
      // 2. Process through pipeline
      logger.debug('Processing frame through pipeline');
      const processedFrame = await pipeline.processFrame(frame);
      
      if (!processedFrame) {
        logger.warn('Null frame received from pipeline, skipping');
        continue;
      }

      // 3. Send to encoder
      logger.debug('Sending frame to encoder');
      encoder.sendFrame(processedFrame);
      
      // Log metrics every second
      if (frameCount % config.TARGET_FPS === 0) {
        const metrics = encoder.getMetrics();
        const rtmpStats = rtmpServer.getMetrics();
        const pipelineMetrics = pipeline.getMetrics();
        
        logger.info('Stream metrics', {
          frameCount,
          pipeline: {
            queueSize: pipelineMetrics.queueSize,
            processingTime: pipelineMetrics.processingTime,
            memoryUsage: pipelineMetrics.memoryUsage
          },
          encoder: {
            isStreaming: metrics.isStreaming,
            fps: metrics.currentFPS,
            bitrate: metrics.bitrate,
            restartAttempts: metrics.restartAttempts
          },
          rtmp: rtmpStats
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