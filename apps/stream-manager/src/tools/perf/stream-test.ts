import type { LayerState } from '../../types/layers.js';
import type { PreviewClientState } from '../../types/state-manager.js';
import { FramePipeline } from '../../streaming/output/pipeline.js';
import sharp from 'sharp';
import { logger } from '../../utils/logger.js';
import type { Config } from '../../types/config.js';

class MockStateManager {
  private streamState = {
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
  private previewClients: Record<string, PreviewClientState> = {};

  async updateStreamState(state: any): Promise<void> {
    this.streamState = state;
  }

  async getStreamState(): Promise<any> {
    return this.streamState;
  }

  async getLayerState(): Promise<LayerState> {
    return this.layerState;
  }

  async getPreviewClients(): Promise<Record<string, PreviewClientState>> {
    return this.previewClients;
  }
}

async function generateTestFrame(width: number, height: number): Promise<Buffer> {
  const timestamp = new Date().toISOString();
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="black"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
        Test Frame ${timestamp}
      </text>
    </svg>
  `;
  
  return sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg()
    .toBuffer();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPerformanceTest(config: Config): Promise<void> {
  const stateManager = new MockStateManager();
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);

  const pipeline = FramePipeline.initialize({
    maxQueueSize: config.PIPELINE_MAX_QUEUE_SIZE,
    poolSize: config.PIPELINE_POOL_SIZE,
    quality: config.PIPELINE_QUALITY,
    format: config.PIPELINE_FORMAT
  });

  const frameInterval = 1000 / config.TARGET_FPS; // Time between frames in ms
  let lastFrameTime = Date.now();

  try {
    for (let i = 0; i < config.TARGET_FPS * 15; i++) { // Run for 15 seconds
      const now = Date.now();
      const elapsed = now - lastFrameTime;
      
      if (elapsed < frameInterval) {
        await sleep(frameInterval - elapsed);
      }

      try {
        const frame = await generateTestFrame(width, height);
        await pipeline.processFrame(frame);
        lastFrameTime = Date.now();
      } catch (err) {
        logger.error('Frame generation error', { error: err });
      }
    }
  } catch (err) {
    logger.error('Performance test error', { error: err });
  }
}

export { runPerformanceTest }; 