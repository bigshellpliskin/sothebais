import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { FramePipeline } from './output/pipeline.js';
import { StreamEncoder } from './output/encoder.js';
import { StreamMuxer } from './output/muxer.js';
import { RTMPServer } from './rtmp/server.js';
import { StateManagerImpl } from '../state/state-manager.js';
import type { Config } from '../config/index.js';

export class StreamManager extends EventEmitter {
    private static instance: StreamManager | null = null;
    private pipeline: FramePipeline | null = null;
    private encoder: StreamEncoder | null = null;
    private muxer: StreamMuxer | null = null;
    private rtmpServer: RTMPServer | null = null;
    private stateManager: StateManagerImpl;
    private isInitialized: boolean = false;

    private constructor() {
        super();
        this.stateManager = StateManagerImpl.getInstance();
    }

    public static getInstance(): StreamManager {
        if (!StreamManager.instance) {
            StreamManager.instance = new StreamManager();
        }
        return StreamManager.instance;
    }

    public async initialize(config: Config): Promise<void> {
        if (this.isInitialized) {
            logger.warn('Stream manager already initialized');
            return;
        }

        try {
            logger.info('Initializing stream manager');

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
            this.pipeline = await FramePipeline.initialize({
                maxQueueSize: config.PIPELINE_MAX_QUEUE_SIZE,
                poolSize: config.PIPELINE_POOL_SIZE,
                quality: config.PIPELINE_QUALITY,
                format: config.PIPELINE_FORMAT
            });

            const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
            const streamUrl = config.STREAM_URL;

            // Initialize encoder
            this.encoder = await StreamEncoder.initialize({
                width,
                height,
                fps: config.TARGET_FPS,
                bitrate: parseInt(config.STREAM_BITRATE.replace('k', '000')),
                codec: 'h264',
                preset: 'veryfast',
                outputs: [`rtmp://stream-manager:1935/live/test-stream`]
            });

            // Initialize muxer
            this.muxer = await StreamMuxer.initialize({
                outputs: [`rtmp://stream-manager:1935/live/test-stream`],
                maxQueueSize: config.MUXER_MAX_QUEUE_SIZE,
                retryAttempts: config.MUXER_RETRY_ATTEMPTS,
                retryDelay: config.MUXER_RETRY_DELAY
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
        if (!this.pipeline || !this.encoder || !this.muxer || !this.rtmpServer) {
            throw new Error('Components not initialized');
        }

        // Handle pipeline frames
        this.pipeline.on('frame', async (frame: Buffer) => {
            if (this.encoder) {
                this.encoder.sendFrame(frame);
            }
        });

        // Handle encoder frames
        this.encoder.on('frame', async (frame: Buffer) => {
            if (this.muxer) {
                await this.muxer.processFrame(frame);
            }
        });

        // Handle errors
        this.pipeline.on('error', this.handleError.bind(this));
        this.encoder.on('error', this.handleError.bind(this));
        this.muxer.on('error', this.handleError.bind(this));
        this.rtmpServer.on('error', this.handleError.bind(this));
    }

    private handleError(error: Error): void {
        logger.error('Streaming error', {
            error: error.message,
            stack: error.stack
        });
        this.emit('error', error);
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

            this.pipeline?.processFrame(Buffer.from([])); // Start pipeline with empty frame
            logger.info('Frame pipeline started');

            this.encoder?.start();
            logger.info('Encoder started');

            this.muxer?.processFrame(Buffer.from([])); // Start muxer with empty frame
            logger.info('Muxer started');

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

            // Stop components
            this.encoder?.stop();
            await this.pipeline?.cleanup();
            await this.muxer?.cleanup();

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

    public getMetrics(): {
        pipeline: any;
        encoder: any;
        muxer: any;
        rtmp: any;
    } {
        return {
            pipeline: this.pipeline?.getMetrics(),
            encoder: this.encoder?.getMetrics(),
            muxer: this.muxer?.getOutputStats(),
            rtmp: this.rtmpServer?.getMetrics()
        };
    }
} 