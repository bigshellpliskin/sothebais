import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '../../types/config.js';
import type { 
  AssetManager, 
  CompositionEngine, 
  StreamManager,
  AssetManagerStatic,
  CompositionEngineStatic,
  StreamManagerStatic
} from '../../types/core.js';
import { CompositionEngine as CE } from '../../core/composition.js';
import { AssetManager as AM } from '../../core/assets.js';
import { StreamManager as SM } from '../../streaming/stream-manager.js';
import { createDefaultScene } from '../../scenes/default-scene.js';
import { stateManager } from '../../state/state-manager.js';
import { StreamKeyService } from '../../streaming/rtmp/stream-key.js';
import express from 'express';
import type { Request, Response } from 'express';

// Get directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeCoreComponents(config: Config) {
  logger.info('Initializing core components for test stream...');

  // Parse resolution
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);

  // Initialize managers with proper typing
  const assets = AM.getInstance() as AssetManager;
  const composition = CE.getInstance(config) as CompositionEngine;

  // Update composition dimensions
  composition.updateDimensions(width, height);

  logger.info('Core components initialized');

  return { assets, composition };
}

async function startApiServer(config: Config, streamManager: StreamManager) {
  const app = express();
  app.use(express.json());

  // Basic health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Stream status endpoint for health checks
  app.get('/stream/status', (_req: Request, res: Response) => {
    // Get the state from stateManager since streamManager may not have getState method
    const state = stateManager.getStreamState();
    res.json({
      status: 'ok',
      isLive: state.isLive,
      metrics: streamManager.getMetrics()
    });
  });

  // Start HTTP server
  const port = config.PORT || 4200;
  app.listen(port, '0.0.0.0', () => {
    logger.info('Stream Manager API server ready', {
      port,
      status: 'active'
    });
  });

  return app;
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

  try {
    // Initialize core components
    const { assets, composition } = await initializeCoreComponents(config);

    // Create default scene
    const scene = createDefaultScene(config);

    // Initialize stream manager with proper typing
    const streamManager = SM.getInstance() as StreamManager;
    await streamManager.initialize(config, {
      assets,
      composition,
      currentScene: scene
    });

    // Start API server with health check endpoints
    const apiServer = await startApiServer(config, streamManager);
    logger.info('HTTP API server started with health check endpoints');

    // Start the stream
    await streamManager.start();

    // Setup cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Log connection information
    const rtmpPort = config.RTMP_PORT || 1935;
    const streamPath = '/live';
    const streamAlias = 'preview'; // Consistent alias for preview/debug streams
    
    // Get stream key from alias
    const streamKeyService = StreamKeyService.getInstance();
    const streamKey = await streamKeyService.getOrCreateAlias(streamAlias, 'test-user', 'test-stream');
    
    const rtmpUrl = `rtmp://localhost:${rtmpPort}${streamPath}/${streamKey}`;
    const previewUrl = `rtmp://localhost:${rtmpPort}${streamPath}/${streamAlias}`; // Easier to remember URL

    logger.info('Stream ready for playback', {
      playbackUrl: rtmpUrl,
      previewUrl: previewUrl,
      resolution: `${width}x${height}`,
      fps: config.TARGET_FPS,
      apiUrl: `http://localhost:${config.PORT || 4200}/stream/status`
    });

    // Monitor stream metrics
    const metricsInterval = setInterval(() => {
      const metrics = streamManager.getMetrics();
      logger.info('Stream metrics', {
        frameStats: {
          total: metrics.frameCount,
          dropped: metrics.droppedFrames,
          fps: metrics.fps
        },
        encoder: metrics.encoderMetrics,
        pipeline: metrics.pipelineMetrics
      });
    }, 5000);

    // Cleanup function
    async function cleanup() {
      logger.info('Cleaning up test stream...');
      clearInterval(metricsInterval);
      await streamManager.cleanup();
      process.exit(0);
    }

  } catch (error) {
    logger.error('Test stream failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('Test stream failed', { error: err });
  process.exit(1);
}); 