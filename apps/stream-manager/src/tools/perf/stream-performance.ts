import { performance } from 'perf_hooks';
import { cpus } from 'os';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { StreamManager } from '../../streaming/stream-manager.js';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { Config } from '../../types/config.js';
import { CompositionEngine } from '../../core/composition.js';
import { ViewportManager } from '../../core/viewport.js';
import { AssetManager } from '../../core/assets.js';
import { LayoutManager } from '../../core/layout.js';
import { Renderer } from '../../rendering/renderer.js';
import type { 
  ViewportManagerStatic, 
  AssetManagerStatic, 
  LayoutManagerStatic,
  CompositionEngineStatic
} from '../../types/core.js';
import type { StateManager } from '../../types/state-manager.js';
import type { StreamState } from '../../types/stream.js';
import type { LayerState } from '../../types/layers.js';
import type { PreviewClientState } from '../../types/state-manager.js';
import { FramePipeline } from '../../streaming/output/pipeline.js';
import { StreamEncoder } from '../../streaming/output/encoder.js';
import type { Asset, AssetTransform } from '../../types/layout.js';
import type { ViewportDimensions } from '../../types/viewport.js';
import type { RenderStats } from '../../rendering/renderer.js';
import type { EventType, EventListener } from '../../types/events.js';
import { stateManager } from '../../state/state-manager.js';

interface PerformanceMetrics {
  // Stream metrics
  fps: number;
  droppedFrames: number;
  encoderLatency: number;
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  elapsedSeconds: number;

  // Core component metrics
  core: {
    assetLoadTime: number;
    layoutUpdateTime: number;
    viewportUpdateTime: number;
    compositionTime: number;
  };

  // Render metrics
  render: {
    setupTime: number;
    drawTime: number;
    postProcessTime: number;
    totalRenderTime: number;
  };

  // Pipeline metrics
  pipeline: {
    queueTime: number;
    processTime: number;
    totalLatency: number;
  };
}

interface TestConfig extends Config {
  TEST_DURATION_MS: number;
  FRAME_INTERVAL_MS: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock state manager for testing
class MockStateManager implements StateManager {
  private streamState: StreamState = {
    isLive: false,
    isPaused: false,
    fps: 0,
    targetFPS: 30,
    frameCount: 0,
    droppedFrames: 0,
    averageRenderTime: 0,
    startTime: null,
    error: null
  };

  private layerState: LayerState = {
    layers: [],
    activeLayerId: null
  };

  getStreamState(): StreamState {
    return this.streamState;
  }

  async updateStreamState(update: Partial<StreamState>): Promise<void> {
    this.streamState = { ...this.streamState, ...update };
    logger.info('Mock state update', { update });
  }

  getLayerState(): LayerState {
    return this.layerState;
  }

  getPreviewClients(): Record<string, PreviewClientState> {
    return {};
  }

  // Implement other required methods
  async updateLayerState() {}
  async updatePreviewClient() {}
  addEventListener() {}
  removeEventListener() {}
  async loadState() {}
  async saveState() {}

  // Add missing event methods
  on(type: EventType, listener: EventListener): void {}
  off(type: EventType, listener: EventListener): void {}
  once(type: EventType, listener: EventListener): void {}
}

async function generateFrame(): Promise<Buffer> {
  const metrics = {
    assetLoadTime: 0,
    layoutUpdateTime: 0,
    viewportUpdateTime: 0,
    compositionTime: 0,
    renderTime: 0
  };

  try {
    // Get instances of core components
    const viewport = ViewportManager.getInstance();
    const assets = AssetManager.getInstance();
    const layout = LayoutManager.getInstance();
    const composition = CompositionEngine.getInstance();

    // Get the current scene from layout manager
    const viewportStart = performance.now();
    const scene = layout.getScene('performance-test');
    metrics.viewportUpdateTime = performance.now() - viewportStart;

    if (!scene) {
      // Create a test scene if none exists
      const layoutStart = performance.now();
      const testScene = layout.createScene('performance-test');
      
      // Get viewport dimensions
      const dims = viewport.getDimensions();
      
      // Add a test asset (e.g., color background)
      const assetStart = performance.now();
      const asset: Omit<Asset, 'id'> = {
        type: 'overlay',
        source: 'performance-test',
        position: { x: 0, y: 0 },
        transform: {
          scale: 1,
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
          opacity: 1
        },
        zIndex: 0,
        visible: true
      };
      
      layout.addAsset(testScene.id, asset);
      metrics.assetLoadTime = performance.now() - assetStart;
      metrics.layoutUpdateTime = performance.now() - layoutStart;

      return Buffer.alloc(dims.width * dims.height * 4); // RGBA buffer
    }

    // Render the scene using composition engine
    const compStart = performance.now();
    const frame = await composition.renderScene(scene);
    metrics.compositionTime = performance.now() - compStart;

    logger.debug('Frame generated through composition engine', { metrics });
    return frame;
  } catch (err) {
    logger.error('Frame generation error', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      metrics
    });
    throw err;
  }
}

async function runPerformanceTest(testConfig: TestConfig): Promise<PerformanceMetrics[]> {
  const metrics: PerformanceMetrics[] = [];
  const startTime = Date.now();

  try {
    // Initialize Redis first
    const redisService = await import('../../state/redis-service.js');
    await redisService.redisService.initialize(testConfig);
    logger.info('Redis service initialized');

    // Initialize state manager
    await stateManager.loadState();
    logger.info('State manager initialized');

    // Initialize core components
    const ViewportManagerClass = ViewportManager as unknown as ViewportManagerStatic;
    const viewport = await ViewportManagerClass.initialize(testConfig);
    logger.info('Viewport manager initialized');

    const AssetManagerClass = AssetManager as unknown as AssetManagerStatic;
    const assets = await AssetManagerClass.initialize(testConfig);
    logger.info('Asset manager initialized');

    const LayoutManagerClass = LayoutManager as unknown as LayoutManagerStatic;
    const layout = await LayoutManagerClass.initialize(testConfig);
    logger.info('Layout manager initialized');

    const CompositionEngineClass = CompositionEngine as unknown as CompositionEngineStatic;
    const composition = await CompositionEngineClass.initialize({
      viewport,
      assets,
      layout
    });
    logger.info('Composition engine initialized');

    // Get renderer instance (no need to initialize, it's done internally)
    const renderer = Renderer.getInstance();
    renderer.start(); // Start the renderer
    logger.info('Renderer started');

    // Initialize stream manager
    logger.info('Initializing stream manager');
    const streamManager = StreamManager.getInstance();
    await streamManager.initialize(testConfig);

    // Start the stream
    logger.info('Starting stream');
    await streamManager.start();

    // Generate and process frames
    let frameCount = 0;
    let errorCount = 0;
    const MAX_ERRORS = 5;

    while (Date.now() - startTime < testConfig.TEST_DURATION_MS) {
      try {
        logger.debug(`Generating frame ${frameCount}`);
        const frameStart = performance.now();
        const frame = await generateFrame();
        
        if (!frame || frame.length === 0) {
          logger.warn('Generated frame is empty, skipping');
          continue;
        }

        // Let the stream manager handle the frame through its pipeline
        const pipeline = (streamManager as any).pipeline;
        const encoder = (streamManager as any).encoder;

        if (pipeline && encoder) {
          const pipelineStart = performance.now();
          logger.debug('Processing frame through pipeline');
          const processedFrame = await pipeline.processFrame(frame);
          const pipelineTime = performance.now() - pipelineStart;
          
          if (!processedFrame) {
            logger.warn('Null frame received from pipeline, skipping');
            continue;
          }

          // Send frame to encoder
          const encodeStart = performance.now();
          logger.debug('Sending frame to encoder');
          encoder.sendFrame(processedFrame);
          const encodeTime = performance.now() - encodeStart;

          // Log metrics every second
          if (frameCount % testConfig.TARGET_FPS === 0) {
            const currentMetrics = streamManager.getMetrics();
            const renderStats = renderer.getRenderStats();
            const frameMetrics = {
              assetLoadTime: 0,
              layoutUpdateTime: 0,
              viewportUpdateTime: 0,
              compositionTime: 0
            };
            
            logger.info('Stream metrics', {
              frameCount,
              metrics: currentMetrics,
              renderStats,
              timestamp: Date.now() - startTime
            });

            metrics.push({
              fps: currentMetrics.encoder?.currentFPS || 0,
              droppedFrames: currentMetrics.encoder?.droppedFrames || 0,
              encoderLatency: currentMetrics.encoder?.frameLatency || 0,
              processingTime: currentMetrics.pipeline?.processingTime || 0,
              memoryUsage: process.memoryUsage().heapUsed,
              cpuUsage: process.cpuUsage().user / 1000000,
              elapsedSeconds: (Date.now() - startTime) / 1000,
              core: {
                assetLoadTime: frameMetrics.assetLoadTime,
                layoutUpdateTime: frameMetrics.layoutUpdateTime,
                viewportUpdateTime: frameMetrics.viewportUpdateTime,
                compositionTime: frameMetrics.compositionTime
              },
              render: {
                setupTime: 0, // Not available in RenderStats
                drawTime: renderStats.frameTime,
                postProcessTime: 0, // Not available in RenderStats
                totalRenderTime: renderStats.frameTime
              },
              pipeline: {
                queueTime: pipelineTime,
                processTime: encodeTime,
                totalLatency: pipelineTime + encodeTime
              }
            });
          }
          frameCount++;
        }

        // Wait for next frame
        await sleep(testConfig.FRAME_INTERVAL_MS);
      } catch (err) {
        logger.error('Frame processing error', {
          error: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          frameCount
        });
        
        errorCount++;
        if (errorCount > MAX_ERRORS) {
          logger.error('Too many errors, stopping test');
          break;
        }
      }
    }

    // Graceful shutdown
    logger.info('Test complete, starting graceful shutdown');
    await streamManager.stop();

    // Cleanup Redis
    await redisService.redisService.disconnect();
    logger.info('Redis disconnected');

    if (metrics.length === 0) {
      logger.warn('No metrics collected during test run');
      return metrics;
    }

    // Calculate and log averages
    const avgMetrics = calculateAverageMetrics(metrics);
    logger.info('Test complete', {
      duration: testConfig.TEST_DURATION_MS,
      actualDuration: `${avgMetrics.elapsedSeconds.toFixed(2)}s`,
      samples: metrics.length,
      averages: avgMetrics
    });

    return metrics;
  } catch (err) {
    logger.error('Test failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
    throw err;
  }
}

function calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
  const avgMetrics = metrics.reduce((acc, curr) => ({
    fps: acc.fps + curr.fps,
    droppedFrames: acc.droppedFrames + curr.droppedFrames,
    encoderLatency: acc.encoderLatency + curr.encoderLatency,
    processingTime: acc.processingTime + curr.processingTime,
    memoryUsage: acc.memoryUsage + curr.memoryUsage,
    cpuUsage: acc.cpuUsage + curr.cpuUsage,
    elapsedSeconds: curr.elapsedSeconds,
    core: {
      assetLoadTime: acc.core.assetLoadTime + curr.core.assetLoadTime,
      layoutUpdateTime: acc.core.layoutUpdateTime + curr.core.layoutUpdateTime,
      viewportUpdateTime: acc.core.viewportUpdateTime + curr.core.viewportUpdateTime,
      compositionTime: acc.core.compositionTime + curr.core.compositionTime
    },
    render: {
      setupTime: acc.render.setupTime + curr.render.setupTime,
      drawTime: acc.render.drawTime + curr.render.drawTime,
      postProcessTime: acc.render.postProcessTime + curr.render.postProcessTime,
      totalRenderTime: acc.render.totalRenderTime + curr.render.totalRenderTime
    },
    pipeline: {
      queueTime: acc.pipeline.queueTime + curr.pipeline.queueTime,
      processTime: acc.pipeline.processTime + curr.pipeline.processTime,
      totalLatency: acc.pipeline.totalLatency + curr.pipeline.totalLatency
    }
  }), {
    fps: 0,
    droppedFrames: 0,
    encoderLatency: 0,
    processingTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    elapsedSeconds: 0,
    core: {
      assetLoadTime: 0,
      layoutUpdateTime: 0,
      viewportUpdateTime: 0,
      compositionTime: 0
    },
    render: {
      setupTime: 0,
      drawTime: 0,
      postProcessTime: 0,
      totalRenderTime: 0
    },
    pipeline: {
      queueTime: 0,
      processTime: 0,
      totalLatency: 0
    }
  });

  const count = metrics.length;
  
  // Helper function to recursively average object values
  function averageObject(obj: any, divisor: number) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        averageObject(obj[key], divisor);
      } else if (key !== 'elapsedSeconds') {
        obj[key] /= divisor;
      }
    });
  }

  averageObject(avgMetrics, count);
  avgMetrics.elapsedSeconds = metrics[metrics.length - 1].elapsedSeconds;

  return avgMetrics;
}

async function main() {
  try {
    // Create results directory if it doesn't exist
    const resultsDir = join(process.cwd(), 'src', 'tools', 'perf', 'results');
    await mkdir(resultsDir, { recursive: true });
    
    // Load base config
    const baseConfig = await loadConfig();

    // Run tests with different configurations
    const testConfigs: TestConfig[] = [
      // Baseline test
      {
        ...baseConfig,
        TEST_DURATION_MS: 30000,
        FRAME_INTERVAL_MS: 100,
        RTMP_PORT: 1936,
        PIPELINE_MAX_QUEUE_SIZE: 10,
        PIPELINE_POOL_SIZE: 8,
        PIPELINE_QUALITY: 70,
        PIPELINE_FORMAT: 'raw' as const,
        TARGET_FPS: 10,
        STREAM_BITRATE: '2000k',
        STREAM_RESOLUTION: '854x480',
        WORKER_POOL_SIZE: 8,
        STREAM_URL: 'rtmp://localhost:1936/live/test-stream',
        RTMP_CHUNK_SIZE: 60000,
        RTMP_GOP_CACHE: false,
        RTMP_PING: 30,
        RTMP_PING_TIMEOUT: 60
      },
      
      // CPU optimization test
      {
        ...baseConfig,
        TEST_DURATION_MS: 30000,
        FRAME_INTERVAL_MS: 100,
        RTMP_PORT: 1936,
        PIPELINE_QUALITY: 80,
        PIPELINE_FORMAT: 'raw' as const,
        PIPELINE_POOL_SIZE: cpus().length,
        WORKER_POOL_SIZE: cpus().length,
        TARGET_FPS: 10,
        STREAM_BITRATE: '2000k',
        STREAM_RESOLUTION: '854x480',
        STREAM_URL: 'rtmp://localhost:1936/live/test-stream',
        RTMP_CHUNK_SIZE: 60000,
        RTMP_GOP_CACHE: false,
        RTMP_PING: 30,
        RTMP_PING_TIMEOUT: 60
      },
      
      // Memory optimization test
      {
        ...baseConfig,
        TEST_DURATION_MS: 30000,
        FRAME_INTERVAL_MS: 100,
        RTMP_PORT: 1936,
        PIPELINE_MAX_QUEUE_SIZE: 15,
        PIPELINE_POOL_SIZE: 2,
        PIPELINE_QUALITY: 70,
        PIPELINE_FORMAT: 'raw' as const,
        WORKER_POOL_SIZE: 2,
        TARGET_FPS: 10,
        STREAM_BITRATE: '2000k',
        STREAM_RESOLUTION: '854x480',
        STREAM_URL: 'rtmp://localhost:1936/live/test-stream',
        RTMP_CHUNK_SIZE: 60000,
        RTMP_GOP_CACHE: false,
        RTMP_PING: 30,
        RTMP_PING_TIMEOUT: 60
      }
    ];
    
    for (const config of testConfigs) {
      logger.info('Running test configuration', {
        poolSize: config.PIPELINE_POOL_SIZE,
        quality: config.PIPELINE_QUALITY,
        format: config.PIPELINE_FORMAT,
        fps: config.TARGET_FPS
      });

      const results = await runPerformanceTest(config);
      
      // Save results to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = join(resultsDir, `perf-results-${timestamp}.json`);
      
      await writeFile(filename, JSON.stringify({
        config,
        results,
        timestamp,
        system: {
          cpus: cpus(),
          memory: process.memoryUsage(),
          platform: process.platform
        }
      }, null, 2));
      
      logger.info('Results saved', { filename });
    }
  } catch (error) {
    logger.error('Performance test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'basic';
  
  const testConfig: TestConfig = {
    ...loadConfig(),
    TEST_DURATION_MS: 60000, // 1 minute
    FRAME_INTERVAL_MS: 33 // ~30fps
  };

  runPerformanceTest(testConfig).catch(error => {
    logger.error('Performance test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  });
}

main(); 