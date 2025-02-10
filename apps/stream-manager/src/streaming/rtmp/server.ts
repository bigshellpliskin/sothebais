import { NodeMediaServer } from 'node-media-server';
import { EventEmitter } from 'events';
import { Registry, Gauge, Counter } from 'prom-client';
import { logger } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';
import { RTMPEvents } from './events.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const connectionsGauge = new Gauge({
  name: 'rtmp_connections_total',
  help: 'Total number of RTMP connections',
  registers: [register]
});

const activeStreamsGauge = new Gauge({
  name: 'rtmp_active_streams',
  help: 'Number of active streams',
  registers: [register]
});

const bandwidthGauge = new Gauge({
  name: 'rtmp_bandwidth_bytes',
  help: 'Bandwidth usage in bytes',
  registers: [register]
});

const errorsCounter = new Counter({
  name: 'rtmp_errors_total',
  help: 'Total number of RTMP errors',
  registers: [register]
});

export interface RTMPConfig {
  port: number;
  chunk_size: number;
  gop_cache: boolean;
  ping: number;
  ping_timeout: number;
}

export class RTMPServer extends EventEmitter {
  private static instance: RTMPServer | null = null;
  private server: NodeMediaServer;
  private config: RTMPConfig;
  private activeStreams: Map<string, any> = new Map();
  private events: RTMPEvents;

  private constructor(config: RTMPConfig) {
    super();
    this.config = config;
    this.events = new RTMPEvents(this);

    // Configure Node-Media-Server
    this.server = new NodeMediaServer({
      rtmp: {
        port: this.config.port,
        chunk_size: this.config.chunk_size,
        gop_cache: this.config.gop_cache,
        ping: this.config.ping,
        ping_timeout: this.config.ping_timeout
      },
      logType: 3 // Use custom logging
    });

    // Setup event handlers
    this.setupEventHandlers();

    logger.info('RTMP Server initialized', {
      config: this.config
    });
  }

  public static initialize(config: RTMPConfig): RTMPServer {
    if (!RTMPServer.instance) {
      RTMPServer.instance = new RTMPServer(config);
    }
    return RTMPServer.instance;
  }

  public static getInstance(): RTMPServer {
    if (!RTMPServer.instance) {
      throw new Error('RTMP Server not initialized');
    }
    return RTMPServer.instance;
  }

  private setupEventHandlers(): void {
    // Client connection events
    this.server.on('preConnect', this.events.handlePreConnect.bind(this.events));
    this.server.on('postConnect', this.events.handlePostConnect.bind(this.events));
    this.server.on('doneConnect', this.events.handleDoneConnect.bind(this.events));

    // Stream events
    this.server.on('prePublish', this.events.handlePrePublish.bind(this.events));
    this.server.on('postPublish', this.events.handlePostPublish.bind(this.events));
    this.server.on('donePublish', this.events.handleDonePublish.bind(this.events));

    // Error events
    this.server.on('error', this.events.handleError.bind(this.events));
  }

  public async start(): Promise<void> {
    try {
      this.server.run();
      logger.info('RTMP Server started', {
        port: this.config.port
      });
    } catch (error) {
      logger.error('Failed to start RTMP Server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.server.stop();
      this.activeStreams.clear();
      logger.info('RTMP Server stopped');
    } catch (error) {
      logger.error('Failed to stop RTMP Server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public getActiveStreams(): Map<string, any> {
    return this.activeStreams;
  }

  public validateStreamKey(streamKey: string): boolean {
    // TODO: Implement stream key validation logic
    return true;
  }

  public updateMetrics(): void {
    connectionsGauge.set(this.server.getConnections());
    activeStreamsGauge.set(this.activeStreams.size);
    // TODO: Implement bandwidth tracking
    bandwidthGauge.set(0);
  }
}
