import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { FramePipeline } from './output/pipeline.js';
import { StreamEncoder } from './output/encoder.js';
import { RTMPServer } from './rtmp/server.js';
import { stateManager } from '../state/state-manager.js';
import { webSocketService } from '../server/websocket.js';
import type { StateManagerImpl } from '../state/state-manager.js';
import type { Config } from '../types/config.js';
import type { AssetManager, CompositionEngine } from '../types/core.js';
import type { Scene } from '../core/scene-manager.js';
import { EventType } from '../types/events.js';

interface StreamManagerDependencies {
  assets: AssetManager;
  composition: CompositionEngine;
  currentScene: Scene;
}

export class StreamManager extends EventEmitter {
  private static instance: StreamManager | null = null;
  private pipeline: FramePipeline | null = null;
  private encoder: StreamEncoder | null = null;
  private rtmpServer: RTMPServer | null = null;
  private stateManager: StateManagerImpl;
  private isInitialized: boolean = false;
  private frameInterval: NodeJS.Timeout | null = null;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private config: Config | null = null;

  // Core components
  private assets: AssetManager | null = null;
  private composition: CompositionEngine | null = null;
  private currentScene: Scene | null = null;

  private constructor() {
    super();
    this.stateManager = stateManager;
  }

  public static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  public async initialize(config: Config, dependencies: StreamManagerDependencies): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Stream manager already initialized');
      return;
    }

    try {
      logger.info('Initializing stream manager');
      this.config = config;

      // Store core components
      this.assets = dependencies.assets;
      this.composition = dependencies.composition;
      this.currentScene = dependencies.currentScene;

      // Initialize RTMP server
      this.rtmpServer = await RTMPServer.initialize({
        port: config.RTMP_PORT,
        chunk_size: config.RTMP_CHUNK_SIZE,
        gop_cache: config.RTMP_GOP_CACHE,
        ping: config.RTMP_PING,
        ping_timeout: config.RTMP_PING_TIMEOUT
      });

      // Add test stream key for development
      this.rtmpServer.addStreamKey('test-stream');

      // Initialize frame pipeline
      const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
      this.pipeline = await FramePipeline.initialize({
        maxQueueSize: config.PIPELINE_MAX_QUEUE_SIZE,
        poolSize: config.PIPELINE_POOL_SIZE,
        quality: config.PIPELINE_QUALITY,
        format: config.PIPELINE_FORMAT,
        width,
        height
      });

      // Initialize encoder
      this.encoder = await StreamEncoder.initialize({
        width,
        height,
        fps: config.TARGET_FPS,
        bitrate: parseInt(config.STREAM_BITRATE.replace('k', '000')),
        codec: 'h264',
        preset: 'veryfast',
        outputs: [`rtmp://localhost:${config.RTMP_PORT}/live/test-stream`]
      });

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('Stream manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize stream manager', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.pipeline || !this.encoder || !this.rtmpServer) {
      throw new Error('Components not initialized');
    }

    // Handle encoder frames
    this.encoder.on('frame', async (frame: Buffer) => {
      logger.debug('Frame processed by encoder');
    });

    // Handle errors
    this.pipeline.on('error', this.handleError.bind(this));
    this.encoder.on('error', this.handleError.bind(this));
    this.rtmpServer.on('error', this.handleError.bind(this));

    // Handle state changes
    this.stateManager.on(EventType.STATE_STREAM_UPDATE, this.handleStateChange.bind(this));
  }

  private async handleStateChange(update: any): Promise<void> {
    try {
      // Broadcast state update via WebSocket
      webSocketService.broadcastStateUpdate(update);
    } catch (error) {
      logger.error('Failed to handle state change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        update
      });
    }
  }

  private handleError(error: Error): void {
    logger.error('Stream component error', {
      error: error.message,
      stack: error.stack
    });
    this.emit('error', error);
  }

  private async generateFrame(): Promise<void> {
    if (!this.composition || !this.pipeline || !this.encoder || !this.currentScene) {
      throw new Error('Required components not initialized');
    }

    try {
      const frameStartTime = Date.now();

      // Render frame through composition engine
      const frame = await this.composition.renderScene(this.currentScene);

      // Process through pipeline
      const processedFrame = await this.pipeline.processFrame(frame);

      if (!processedFrame) {
        this.droppedFrames++;
        logger.warn('Frame dropped - null frame from pipeline');
        return;
      }

      // Send to encoder
      await this.encoder.sendFrame(processedFrame);

      this.frameCount++;

      // Log performance metrics
      const frameTime = Date.now() - frameStartTime;
      logger.debug('Frame generated', {
        frameCount: this.frameCount,
        droppedFrames: this.droppedFrames,
        processingTime: frameTime
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Stream manager not initialized');
    }

    try {
      logger.info('Starting stream');

      // Start components in sequence
      this.rtmpServer?.start();
      logger.info('RTMP server started');

      this.encoder?.start();
      logger.info('Encoder started');

      // Start frame generation
      const targetFps = this.config?.TARGET_FPS || 60;
      const frameInterval = 1000 / targetFps;
      this.frameInterval = setInterval(() => this.generateFrame(), frameInterval);

      // Update state
      await this.stateManager.updateStreamState({
        isLive: true,
        isPaused: false,
        startTime: Date.now()
      });

      this.emit('started');
      logger.info('Stream started successfully');
    } catch (error) {
      logger.error('Failed to start stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Stopping stream');

      // Stop frame generation
      if (this.frameInterval) {
        clearInterval(this.frameInterval);
        this.frameInterval = null;
      }

      // Stop components in reverse order
      this.encoder?.stop();
      await this.pipeline?.cleanup();
      this.rtmpServer?.stop();

      // Update state
      await this.stateManager.updateStreamState({
        isLive: false,
        isPaused: false,
        startTime: null
      });

      this.emit('stopped');
      logger.info('Stream stopped successfully');
    } catch (error) {
      logger.error('Failed to stop stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public getMetrics() {
    return {
      frameCount: this.frameCount,
      droppedFrames: this.droppedFrames,
      fps: this.encoder?.getMetrics().currentFPS || 0,
      isLive: this.stateManager.getStreamState().isLive,
      encoderMetrics: this.encoder?.getMetrics() || {},
      pipelineMetrics: this.pipeline?.getMetrics() || {}
    };
  }

  public async cleanup(): Promise<void> {
    await this.stop();
    
    // Cleanup core components
    await this.composition?.cleanup();
    await this.assets?.cleanup();

    // Reset instance
    StreamManager.instance = null;
    this.isInitialized = false;
  }
} 