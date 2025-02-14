import NodeMediaServer from 'node-media-server';
import { EventEmitter } from 'events';
import { Registry, Gauge, Counter } from 'prom-client';
import { logger } from '../../utils/logger.js';
import { RTMPEvents } from './events.js';
import { EventType, ConnectionType } from '../../types/events.js';
import type { RTMPEventPayload } from '../../types/events.js';

// Create a Registry for metrics
const register = new Registry();

// Define metrics
const rtmpConnectionsGauge = new Gauge({
  name: 'rtmp_connections_total',
  help: 'Total number of RTMP connections',
  registers: [register]
});

const rtmpBandwidthGauge = new Gauge({
  name: 'rtmp_bandwidth_bytes',
  help: 'Bandwidth usage in bytes',
  registers: [register]
});

const rtmpErrorsGauge = new Gauge({
  name: 'rtmp_errors_total',
  help: 'Total number of RTMP errors',
  registers: [register]
});

// Add type definition for session
interface NodeMediaSession {
  id: string;
  reject: () => void;
  getBytesRead?: () => number;
  [key: string]: any;
}

// Extend NodeMediaServer type with correct session handling
interface NodeMediaServerExtended extends Omit<NodeMediaServer, 'getSession'> {
  getSession(id: string): unknown;
}

// Update the connection tracking
interface Connection {
  id: string;
  type: ConnectionType;
  startTime: number;
  streamPath?: string;
  args: any;
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
  private connections: Map<string, Connection> = new Map();

  private constructor(config: RTMPConfig) {
    super();
    this.config = config;
    this.events = new RTMPEvents(this);

    // Configure Node-Media-Server
    this.server = new NodeMediaServer({
      rtmp: {
        port: config.port,
        chunk_size: config.chunk_size,
        gop_cache: true,
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
    this.server.on('preConnect', (id: string, StreamPath: string, args: { query?: { role?: string } }) => {
      // Don't count encoder connections as players
      const isEncoder = args?.query?.role === 'encoder';
      
      this.connections.set(id, {
        id,
        type: isEncoder ? ConnectionType.PUBLISHER : ConnectionType.PENDING,
        startTime: Date.now(),
        args,
        streamPath: StreamPath
      });
      
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: isEncoder ? ConnectionType.PUBLISHER : ConnectionType.PENDING,
        timestamp: Date.now(),
        streamPath: StreamPath
      };
      
      this.emit(EventType.RTMP_CONNECTION, payload);
      logger.debug('RTMP pre-connect', { id, streamPath: StreamPath, args, isEncoder });
    });

    this.server.on('postConnect', (id, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: conn.type,
          timestamp: Date.now()
        };
        this.emit(EventType.RTMP_CONNECTION, payload);
      }
      logger.info('RTMP client connected', { id, args });
      rtmpConnectionsGauge.inc();
    });

    this.server.on('doneConnect', (id, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: conn.type,
          streamPath: conn.streamPath,
          timestamp: Date.now(),
          duration: Date.now() - conn.startTime
        };
        this.emit(EventType.RTMP_DISCONNECTION, payload);
        this.connections.delete(id);
      }
      logger.info('RTMP client disconnected', { 
        id, 
        args,
        connectionType: conn?.type,
        duration: conn ? Date.now() - conn.startTime : 0
      });
      rtmpConnectionsGauge.dec();
    });

    this.server.on('prePublish', async (id, StreamPath, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        conn.type = ConnectionType.PUBLISHER;
        conn.streamPath = StreamPath;
      }
      
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
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: ConnectionType.PUBLISHER,
          streamPath: StreamPath,
          timestamp: Date.now()
        };
        this.emit(EventType.RTMP_PUBLISH_START, payload);
      }
      logger.info('RTMP stream published', { id, StreamPath, args });
      const streamKey = StreamPath.split('/').pop();
      if (streamKey) {
        this.activeStreams.set(streamKey, { id, startedAt: new Date() });
      }
    });

    this.server.on('donePublish', (id, StreamPath, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: ConnectionType.PUBLISHER,
          streamPath: StreamPath,
          timestamp: Date.now(),
          duration: Date.now() - conn.startTime
        };
        this.emit(EventType.RTMP_PUBLISH_STOP, payload);
      }
      logger.info('RTMP stream unpublished', { id, StreamPath, args });
      const streamKey = StreamPath.split('/').pop();
      if (streamKey) {
        this.activeStreams.delete(streamKey);
      }
    });

    this.server.on('prePlay', (id, StreamPath, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        conn.type = ConnectionType.PLAYER;
        conn.streamPath = StreamPath;
      }
      
      logger.info('RTMP client attempting to play', {
        id,
        streamPath: StreamPath,
        args
      });
    });

    this.server.on('postPlay', (id, StreamPath, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: ConnectionType.PLAYER,
          streamPath: StreamPath,
          timestamp: Date.now()
        };
        this.emit(EventType.RTMP_PLAY_START, payload);
      }
      logger.info('RTMP client started playing', { id, StreamPath, args });
    });

    this.server.on('donePlay', (id, StreamPath, args) => {
      const conn = this.connections.get(id);
      if (conn) {
        const payload: RTMPEventPayload = {
          clientId: id,
          connectionType: ConnectionType.PLAYER,
          streamPath: StreamPath,
          timestamp: Date.now(),
          duration: Date.now() - conn.startTime
        };
        this.emit(EventType.RTMP_PLAY_STOP, payload);
      }
      logger.info('RTMP client stopped playing', { id, StreamPath, args });
    });

    this.server.on('error', (err) => {
      logger.error('RTMP server error', { error: err });
      rtmpErrorsGauge.inc();
      this.emit('error', err);
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update bandwidth metrics
      rtmpBandwidthGauge.set(0); // TODO: Implement bandwidth tracking
    }, 1000);
  }

  public start(): void {
    this.server.run();
    logger.info('RTMP server started', {
      port: this.config.port
    });
  }

  public stop(): void {
    try {
        // Force close all active sessions
        Array.from(this.connections.values()).forEach(conn => {
            const session = this.server.getSession(conn.id) as NodeMediaSession;
            if (session) {
                try {
                    session.reject();
                } catch (e) {
                    logger.warn('Error closing session', { id: conn.id, error: e });
                }
            }
        });

        // Clear all tracking maps
        this.connections.clear();
        this.activeStreams.clear();

        // Reset metrics
        rtmpConnectionsGauge.set(0);
        rtmpBandwidthGauge.set(0);
        rtmpErrorsGauge.set(0);

        // Stop the server
        this.server.stop();
        
        logger.info('RTMP server stopped and cleaned up');
    } catch (error) {
        logger.error('Error during RTMP server shutdown', { error });
        throw error;
    }
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
    publishers: number;
    players: number;
    bandwidth: number;
    errors: number;
    activeConnections: Array<{
      id: string;
      type: ConnectionType;
      duration: number;
      streamPath?: string;
    }>;
  } {
    const publishers = Array.from(this.connections.values())
      .filter(conn => conn.type === ConnectionType.PUBLISHER).length;
    const players = Array.from(this.connections.values())
      .filter(conn => conn.type === ConnectionType.PLAYER).length;
      
    const metrics = {
      connections: this.connections.size,
      publishers,
      players,
      bandwidth: Array.from(this.connections.values()).reduce((total, conn) => {
        // Get actual bandwidth from node-media-server session if available
        const session = this.server.getSession(conn.id) as NodeMediaSession | null;
        const bandwidth = session?.getBytesRead?.() || 0;
        return total + bandwidth;
      }, 0),
      errors: Number(rtmpErrorsGauge.get()),
      activeConnections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        type: conn.type,
        duration: Date.now() - conn.startTime,
        streamPath: conn.streamPath
      }))
    };

    // Update Prometheus metrics
    rtmpConnectionsGauge.set(metrics.connections);
    rtmpBandwidthGauge.set(metrics.bandwidth);

    return metrics;
  }

  private setupProcessHandlers(): void {
    const cleanup = async () => {
        logger.info('Received shutdown signal');
        try {
            await this.stop();
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown', { error });
            process.exit(1);
        }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }
}
