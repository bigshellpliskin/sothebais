import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { FramePipeline } from './output/pipeline.js';
import { StreamEncoder } from './output/encoder.js';
import { RTMPServer } from './rtmp/server.js';
import { StreamKeyService } from './rtmp/stream-key.js';
import { TwitterBroadcaster } from './output/twitter-broadcaster.js';
import { stateManager } from '../state/state-manager.js';
import { webSocketService } from '../server/websocket.js';
import type { StateManager } from '../types/state.js';
import type { Config } from '../types/config.js';
import type { AssetManager, CompositionEngine, Scene } from '../types/core.js';
import { EventType } from '../types/events.js';

interface StreamManagerDependencies {
  assets: AssetManager;
  composition: CompositionEngine;
  currentScene: Scene;
}

// High level class that manages the stream
export class StreamManager extends EventEmitter {
  private static instance: StreamManager | null = null;
  private pipeline: FramePipeline | null = null;
  private encoder: StreamEncoder | null = null;
  private rtmpServer: RTMPServer | null = null;
  private stateManager: StateManager;
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
      logger.info('Stream manager config', { config });

      // Initialize state manager first
      await this.stateManager.initialize(config);

      // Initialize StreamKeyService with same Redis URL as state manager
      logger.info('Initializing stream key service...');
      const streamKeyService = StreamKeyService.initialize(config.REDIS_URL);
      logger.info('Stream key service initialized');

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

      // Generate test stream key for development
      const streamKey = await streamKeyService.getOrCreateAlias('preview', 'test-user', 'test-stream');

      // Validate the stream key before using it
      const keyInfo = await streamKeyService.getKeyInfo(streamKey);
      if (!keyInfo || !keyInfo.isActive) {
        throw new Error('Failed to generate valid stream key');
      }

      logger.info('Generated test stream key for development', { 
        streamKey,
        userId: keyInfo.userId,
        streamId: keyInfo.streamId,
        expiresAt: keyInfo.expiresAt,
        alias: 'preview'
      });

      // Setup Twitter if credentials are provided
      if (process.env.TWITTER_BROADCAST_ENABLED === 'true' && 
          process.env.TWITTER_RTMP_URL && 
          process.env.TWITTER_STREAM_KEY) {
        this.setupTwitterBroadcast();
      }

      // Log config values before encoder init
      logger.info('Initializing encoder with config', { 
        streamKey,
        configBitrate: config.STREAM_BITRATE,
      });
      
      this.encoder = await StreamEncoder.initialize({
        width,
        height,
        fps: config.TARGET_FPS,
        bitrate: config.STREAM_BITRATE.raw,        // Pass raw string for FFmpeg
        bitrateNumeric: config.STREAM_BITRATE.numeric,  // Pass numeric value for metrics
        codec: 'h264',
        preset: 'veryfast',
        outputs: [`rtmp://stream-manager:${config.RTMP_PORT}/live/${streamKey}?role=encoder`]
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

    // If error is from encoder, attempt cleanup and restart
    if (this.encoder && error.message.includes('FFmpeg')) {
      logger.info('Attempting to recover from FFmpeg error');
      this.cleanup().catch(cleanupError => {
        logger.error('Failed to cleanup after FFmpeg error', {
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        });
      });
    } else {
      // For other errors, just emit
      this.emit('error', error);
    }
  }

  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Stream manager not initialized');
    }

    try {
      logger.info('Starting stream');

      // Start RTMP server
      logger.info('Starting RTMP server...');
      await this.rtmpServer?.start();
      logger.info('RTMP server started');

      // Initialize and start encoder
      logger.info('Starting encoder...');
      await this.encoder?.start();
      logger.info('Encoder started and connected');

      // Verify pipeline is ready
      if (!this.pipeline?.isReady()) {
        throw new Error('Frame pipeline not ready');
      }

      // Start frame generation with proper error handling
      const targetFps = this.config?.TARGET_FPS || 60;
      const frameInterval = 1000 / targetFps;
      
      this.frameInterval = setInterval(async () => {
        try {
          await this.generateFrame();
        } catch (error) {
          logger.error('Error in frame generation', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          this.handleError(error as Error);
        }
      }, frameInterval);

      // Update state
      await this.stateManager.updateStreamState({
        isLive: true,
        isPaused: false,
        startTime: Date.now()
      });

      this.emit('started');
      logger.info('Stream started successfully');

      // Start metrics collection
      this.startMetricsCollection();

    } catch (error) {
      logger.error('Failed to start stream', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Attempt cleanup on startup failure
      try {
        await this.cleanup();
      } catch (cleanupError) {
        logger.error('Failed to cleanup after startup error', {
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  private startMetricsCollection(): void {
    // Collect metrics every 5 seconds
    setInterval(() => {
      if (!this.isInitialized) return;

      const metrics = {
        frameStats: {
          total: this.frameCount,
          dropped: this.droppedFrames,
          fps: this.encoder?.getCurrentFPS() || 0
        },
        encoder: {
          isStreaming: this.encoder?.isActive() || false,
          currentFPS: this.encoder?.getCurrentFPS() || 0,
          bitrate: this.encoder?.getBitrate() || 0,
          restartAttempts: this.encoder?.getRestartAttempts() || 0
        },
        pipeline: {
          queueSize: this.pipeline?.getQueueSize() || 0,
          processingTime: this.pipeline?.getAverageProcessingTime() || 0,
          memoryUsage: process.memoryUsage().heapUsed
        }
      };

      logger.info('Stream metrics', metrics);
    }, 5000);
  }

  private async generateFrame(): Promise<void> {
    if (!this.composition || !this.pipeline || !this.encoder || !this.currentScene) {
      throw new Error('Required components not initialized');
    }

    const frameStartTime = Date.now();

    try {
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

      // Log performance metrics periodically
      if (this.frameCount % 300 === 0) { // Every 300 frames
        const frameTime = Date.now() - frameStartTime;
        logger.debug('Frame generation stats', {
          frameCount: this.frameCount,
          droppedFrames: this.droppedFrames,
          processingTime: frameTime
        });
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Stopping stream');

      // Stop frame generation first
      if (this.frameInterval) {
        clearInterval(this.frameInterval);
        this.frameInterval = null;
      }

      // Stop components in reverse order with proper cleanup
      logger.info('Stopping encoder...');
      await this.encoder?.stop();
      logger.info('Encoder stopped');

      logger.info('Cleaning up pipeline...');
      await this.pipeline?.cleanup();
      logger.info('Pipeline cleaned up');

      logger.info('Stopping RTMP server...');
      await this.rtmpServer?.stop();
      logger.info('RTMP server stopped');

      // Reset counters
      this.frameCount = 0;
      this.droppedFrames = 0;

      // Update state
      await this.stateManager.updateStreamState({
        isLive: false,
        isPaused: false,
        startTime: null,
        frameCount: 0,
        droppedFrames: 0,
        fps: 0
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

  /**
   * Setup Twitter broadcasting by configuring the RTMP endpoint
   */
  private setupTwitterBroadcast(): void {
    if (!process.env.TWITTER_RTMP_URL || !process.env.TWITTER_STREAM_KEY) {
      logger.warn('Twitter broadcasting disabled - missing RTMP URL or stream key');
      return;
    }
    
    try {
      const twitterBroadcaster = TwitterBroadcaster.getInstance();
      twitterBroadcaster.configure(
        process.env.TWITTER_RTMP_URL,
        process.env.TWITTER_STREAM_KEY
      );
      
      logger.info('Twitter broadcasting configured', {
        rtmpUrl: process.env.TWITTER_RTMP_URL,
        enabled: process.env.TWITTER_BROADCAST_ENABLED
      });
    } catch (error) {
      logger.error('Failed to configure Twitter broadcasting', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start Twitter broadcasting by configuring the RTMP server to forward streams
   */
  public async startTwitterBroadcast(): Promise<boolean> {
    if (!this.isInitialized) {
      logger.error('Cannot start Twitter broadcast - Stream manager not initialized');
      return false;
    }
    
    try {
      const twitterBroadcaster = TwitterBroadcaster.getInstance();
      if (!twitterBroadcaster.isReady()) {
        logger.warn('Twitter broadcasting not configured');
        return false;
      }
      
      // Get Twitter endpoint
      const twitterEndpoint = twitterBroadcaster.getTwitterEndpoint();
      if (!twitterEndpoint) {
        logger.error('Twitter endpoint not available');
        return false;
      }
      
      logger.info('Starting Twitter broadcast to', { endpoint: twitterEndpoint });
      
      // The actual RTMP forwarding is handled by the RTMP server
      // Here we would typically inform the RTMP server to start forwarding
      // to the Twitter endpoint if we had that functionality
      
      return true;
    } catch (error) {
      logger.error('Failed to start Twitter broadcast', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Stop Twitter broadcasting
   */
  public async stopTwitterBroadcast(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      // The actual RTMP forwarding stop would be handled by the RTMP server
      // Here we would typically inform the RTMP server to stop forwarding
      // to the Twitter endpoint if we had that functionality
      
      logger.info('Twitter broadcast stopped');
      return true;
    } catch (error) {
      logger.error('Failed to stop Twitter broadcast', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
} 