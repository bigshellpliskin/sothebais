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

// Get directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeCoreComponents(config: Config) {
  logger.info('Initializing core components for test stream...');

  // Parse resolution
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);

  // Initialize managers with proper typing
  const assets = (await (AM as unknown as AssetManagerStatic).initialize(config)) as AssetManager;
  const composition = (await (CE as unknown as CompositionEngineStatic).initialize(config)) as CompositionEngine;

  // Update composition dimensions
  composition.updateDimensions(width, height);

  logger.info('Core components initialized');

  return { assets, composition };
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
    const streamManager = (SM as unknown as StreamManagerStatic).getInstance() as StreamManager;
    await streamManager.initialize(config, {
      assets,
      composition,
      currentScene: scene
    });

    // Start the stream
    await streamManager.start();

    // Setup cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Log connection information
    const rtmpPort = config.RTMP_PORT || 1935;
    const streamPath = '/live';
    const streamKey = 'test-stream';
    const rtmpUrl = `rtmp://localhost:${rtmpPort}${streamPath}/${streamKey}`;

    logger.info('Stream ready for playback', {
      playbackUrl: rtmpUrl,
      vlcUrl: `rtmp://localhost:${rtmpPort}${streamPath}/${streamKey}`,
      resolution: `${width}x${height}`,
      fps: config.TARGET_FPS
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