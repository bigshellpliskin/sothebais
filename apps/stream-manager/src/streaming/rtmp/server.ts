import NodeMediaServer from 'node-media-server';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { EVENT_TYPES, CONNECTION_TYPES } from '../../types/index.js';
import type { RTMPEventPayload, ConnectionType } from '../../types/index.js';
import { StreamKeyService } from './stream-key.js';
import { RTMPEvents } from './events.js';
import { rtmpBandwidthGauge } from './metrics.js';

// Local RTMP connection type constants
// TODO: These should be moved to the shared package
const RTMP_CONNECTION_TYPES = {
  PUBLISHER: 'PUBLISHER',
  PLAYER: 'PLAYER',
  PENDING: 'PENDING'
} as const;

// Local type for RTMP connection types
type RTMPConnectionType = typeof RTMP_CONNECTION_TYPES[keyof typeof RTMP_CONNECTION_TYPES];

// Add type definition for session
export interface NodeMediaSession {
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
  private connections: Map<string, Connection> = new Map();
  private isRunning: boolean = false;
  private streamKeyService: StreamKeyService;
  private eventHandler: RTMPEvents;

  private constructor(config: RTMPConfig) {
    super();
    this.config = config;
    this.streamKeyService = StreamKeyService.getInstance();

    try {
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
      
      // Create event handler after server is initialized but before setupEventHandlers
      const self = this as any; // Use any to bypass TypeScript checking during initialization
      this.eventHandler = new RTMPEvents(self);
      
      // Setup event handlers
      this.setupEventHandlers();
      this.setupProcessHandlers();
      
      // Mark server as running since NodeMediaServer starts on construction
      this.isRunning = true;
      this.startMetricsCollection();

      // Start the server
      this.server.run();
      
      logger.info('RTMP server initialized and running', {
        port: this.config.port
      });
    } catch (error) {
      logger.error('Failed to initialize RTMP server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
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
    this.server.on('preConnect', (id, StreamPath, args) => this.eventHandler.handlePreConnect(id, StreamPath, args));
    this.server.on('postConnect', (id, args) => this.eventHandler.handlePostConnect(id, args));
    this.server.on('doneConnect', (id, args) => this.eventHandler.handleDoneConnect(id, args));
    this.server.on('prePublish', (id, StreamPath, args) => this.eventHandler.handlePrePublish(id, StreamPath, args));
    this.server.on('postPublish', (id, StreamPath, args) => this.eventHandler.handlePostPublish(id, StreamPath, args));
    this.server.on('donePublish', (id, StreamPath, args) => this.eventHandler.handleDonePublish(id, StreamPath, args));
    this.server.on('prePlay', (id, StreamPath, args) => this.eventHandler.handlePrePlay(id, StreamPath, args));
    this.server.on('postPlay', (id, StreamPath, args) => this.eventHandler.handlePostPlay(id, StreamPath, args));
    this.server.on('donePlay', (id, StreamPath, args) => this.eventHandler.handleDonePlay(id, StreamPath, args));
    this.server.on('error', (error) => this.eventHandler.handleError(error));
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update bandwidth metrics
      const totalBandwidth = Array.from(this.connections.values()).reduce((total, conn) => {
        const session = this.server.getSession(conn.id) as NodeMediaSession | null;
        const bandwidth = session?.getBytesRead?.() || 0;
        return total + bandwidth;
      }, 0);
      rtmpBandwidthGauge.set(totalBandwidth);
    }, 1000);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isRunning) {
        logger.info('RTMP server is already running');
        resolve();
        return;
      }

      // This should never happen since server is created in constructor
      logger.error('RTMP server not running - this should never happen');
      throw new Error('RTMP server not running');
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Stopping RTMP server...');
        
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

        // Stop the server
        this.server.stop();
        this.isRunning = false;
        
        logger.info('RTMP server stopped and cleaned up');
        resolve();
      } catch (error) {
        logger.error('Error during RTMP server shutdown', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        reject(error);
      }
    });
  }

  // Connection Management
  public addConnection(connection: Connection): void {
    this.connections.set(connection.id, connection);
  }

  public getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  public removeConnection(id: string): void {
    this.connections.delete(id);
  }

  // Stream Management
  public addActiveStream(key: string, data: { id: string; startedAt: Date }): void {
    this.activeStreams.set(key, data);
  }

  public removeActiveStream(key: string): void {
    this.activeStreams.delete(key);
  }

  public getActiveStreams(): Map<string, { id: string; startedAt: Date }> {
    return this.activeStreams;
  }

  // Stream Key Management
  public async validateStreamKey(key: string, ip?: string): Promise<boolean> {
    return this.streamKeyService.validateKey(key, ip);
  }

  public async getStreamKeyByAlias(alias: string): Promise<string | null> {
    return this.streamKeyService.getKeyByAlias(alias);
  }

  // Session Management
  public getSession(id: string): NodeMediaSession | null {
    return this.server.getSession(id) as NodeMediaSession | null;
  }

  public getMetrics(): {
    connections: number;
    publishers: number;
    players: number;
    bandwidth: number;
    activeConnections: Array<{
      id: string;
      type: ConnectionType;
      duration: number;
      streamPath?: string | undefined;
    }>;
  } {
    const publishers = Array.from(this.connections.values())
      .filter(conn => conn.type === CONNECTION_TYPES.PUBLISHER).length;
    const players = Array.from(this.connections.values())
      .filter(conn => conn.type === CONNECTION_TYPES.PLAYER).length;
      
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
      activeConnections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        type: conn.type,
        duration: Date.now() - conn.startTime,
        streamPath: conn.streamPath
      }))
    };

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
