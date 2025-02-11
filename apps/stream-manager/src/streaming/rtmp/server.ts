import NodeMediaServer from 'node-media-server';
import { EventEmitter } from 'events';
import { Registry, Gauge, Counter } from 'prom-client';
import { logger } from '../../utils/logger.js';
import { RTMPEvents } from './events.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const connectionsGauge = new Gauge({
  name: 'rtmp_connections',
  help: 'Number of active RTMP connections',
  registers: [register]
});

const bandwidthGauge = new Gauge({
  name: 'rtmp_bandwidth_bytes',
  help: 'RTMP bandwidth usage in bytes',
  registers: [register]
});

const errorsCounter = new Counter({
  name: 'rtmp_errors',
  help: 'Number of RTMP server errors',
  registers: [register]
});

// Add type definition for session
interface NodeMediaSession {
  reject: () => void;
  id: string;
  [key: string]: any;
}

// Extend NodeMediaServer type with correct session handling
interface NodeMediaServerExtended extends Omit<NodeMediaServer, 'getSession'> {
  getSession(id: string): unknown;
}

export interface RTMPConfig {
  port: number;
  chunk_size: number;
  gop_cache: boolean;
  ping: number;
  ping_timeout: number;
}

export class RTMPServer extends EventEmitter {
  private static instance: RTMPServer | null = null;
  private server: NodeMediaServerExtended;
  private config: RTMPConfig;
  private activeStreams: Map<string, any> = new Map();
  private events: RTMPEvents;
  private allowedStreamKeys: Set<string> = new Set();

  private constructor(config: RTMPConfig) {
    super();
    this.config = config;
    this.events = new RTMPEvents(this);

    // Configure Node-Media-Server
    this.server = new NodeMediaServer({
      rtmp: {
        port: config.port,
        chunk_size: config.chunk_size,
        gop_cache: config.gop_cache,
        ping: config.ping,
        ping_timeout: config.ping_timeout
      },
      logType: 3 // Log to callback only
    });

    // Setup event handlers
    this.setupEventHandlers();
    this.startMetricsCollection();

    logger.info('RTMP server initialized', {
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
      throw new Error('RTMP server not initialized');
    }
    return RTMPServer.instance;
  }

  private setupEventHandlers(): void {
    this.server.on('preConnect', (id, args) => {
      logger.debug('RTMP pre-connect', { id, args });
    });

    this.server.on('postConnect', (id, args) => {
      logger.info('RTMP client connected', { id, args });
      connectionsGauge.inc();
    });

    this.server.on('doneConnect', (id, args) => {
      logger.info('RTMP client disconnected', { id, args });
      connectionsGauge.dec();
    });

    this.server.on('prePublish', async (id, StreamPath, args) => {
      // Extract stream key from path (e.g., /live/stream-key)
      const streamKey = StreamPath.split('/').pop();
      
      if (!streamKey || !this.validateStreamKey(streamKey)) {
        logger.warn('Invalid stream key, rejecting stream', {
          id,
          streamPath: StreamPath
        });
        
        // Get session and safely type cast
        const rawSession = this.server.getSession(id);
        if (
          rawSession && 
          typeof rawSession === 'object' && 
          'reject' in rawSession && 
          typeof (rawSession as NodeMediaSession).reject === 'function'
        ) {
          const session = rawSession as NodeMediaSession;
          session.reject();
        } else {
          logger.warn('Could not reject invalid stream - session invalid', { id });
        }
        return;
      }

      logger.info('Stream key validated, allowing stream', {
        id,
        streamPath: StreamPath
      });
    });

    this.server.on('postPublish', (id, StreamPath, args) => {
      logger.info('RTMP stream published', { id, StreamPath, args });
      const streamKey = StreamPath.split('/').pop();
      if (streamKey) {
        this.activeStreams.set(streamKey, { id, startedAt: new Date() });
      }
    });

    this.server.on('donePublish', (id, StreamPath, args) => {
      logger.info('RTMP stream unpublished', { id, StreamPath, args });
      const streamKey = StreamPath.split('/').pop();
      if (streamKey) {
        this.activeStreams.delete(streamKey);
      }
    });

    this.server.on('error', (err) => {
      logger.error('RTMP server error', { error: err });
      errorsCounter.inc();
      this.emit('error', err);
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update bandwidth metrics
      bandwidthGauge.set(0); // TODO: Implement bandwidth tracking
    }, 1000);
  }

  public start(): void {
    this.server.run();
    logger.info('RTMP server started', {
      port: this.config.port
    });
  }

  public stop(): void {
    this.server.stop();
    this.activeStreams.clear();
    logger.info('RTMP server stopped');
  }

  public getActiveStreams(): Map<string, { id: string; startedAt: Date }> {
    return this.activeStreams;
  }

  /**
   * Add a valid stream key
   */
  public addStreamKey(key: string): void {
    this.allowedStreamKeys.add(key);
    logger.info('Added stream key', { key });
  }

  /**
   * Remove a stream key
   */
  public removeStreamKey(key: string): void {
    this.allowedStreamKeys.delete(key);
    logger.info('Removed stream key', { key });
  }

  /**
   * Validate a stream key
   */
  public validateStreamKey(key: string): boolean {
    return this.allowedStreamKeys.has(key);
  }

  public getMetrics(): {
    connections: number;
    bandwidth: number;
    errors: number;
  } {
    return {
      connections: 0, // TODO: Implement connection counting
      bandwidth: 0, // TODO: Implement bandwidth tracking
      errors: 0 // TODO: Implement error counting
    };
  }
}
