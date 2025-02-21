import { logger } from '../../utils/logger.js';
import { EventType, ConnectionType } from '../../types/events.js';
import type { RTMPEventPayload } from '../../types/events.js';
import { 
  rtmpConnectionsGauge, 
  rtmpErrorsGauge, 
  connectionCounter, 
  publishCounter 
} from './metrics.js';

// Define interface for RTMPServer to avoid circular dependency
interface RTMPServer {
  addConnection(connection: { id: string; type: ConnectionType; startTime: number; args: any; streamPath?: string }): void;
  getConnection(id: string): { id: string; type: ConnectionType; startTime: number; args: any; streamPath?: string } | undefined;
  removeConnection(id: string): void;
  getSession(id: string): { id: string; reject: () => void } | null;
  getStreamKeyByAlias(alias: string): Promise<string | null>;
  validateStreamKey(key: string, ip?: string): Promise<boolean>;
  addActiveStream(key: string, data: { id: string; startedAt: Date }): void;
  removeActiveStream(key: string): void;
  emit(event: string, payload: any): void;
}

export class RTMPEvents {
  private server: RTMPServer;

  constructor(server: RTMPServer) {
    this.server = server;
  }

  // Connection Events
  public async handlePreConnect(id: string, StreamPath: string, args: { query?: { role?: string }; ip?: string }): Promise<void> {
    connectionCounter.labels('attempt').inc();
    
    // Don't count encoder connections as players
    const isEncoder = args?.query?.role === 'encoder';
    
    this.server.addConnection({
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
    
    this.server.emit(EventType.RTMP_CONNECTION, payload);
    logger.info('RTMP pre-connect', { id, streamPath: StreamPath, args, isEncoder });
  }

  public async handlePostConnect(id: string, args: any): Promise<void> {
    connectionCounter.labels('success').inc();
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: conn.type,
        timestamp: Date.now()
      };
      this.server.emit(EventType.RTMP_CONNECTION, payload);
    }
    logger.info('RTMP client connected', { id, args });
    rtmpConnectionsGauge.inc();
  }

  public async handleDoneConnect(id: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: conn.type,
        streamPath: conn.streamPath,
        timestamp: Date.now(),
        duration: Date.now() - conn.startTime
      };
      this.server.emit(EventType.RTMP_DISCONNECTION, payload);
      this.server.removeConnection(id);
    }
    logger.info('RTMP client disconnected', { 
      id, 
      args,
      connectionType: conn?.type,
      duration: conn ? Date.now() - conn.startTime : 0
    });
    rtmpConnectionsGauge.dec();
  }

  // Publishing Events
  public async handlePrePublish(id: string, StreamPath: string, args: any): Promise<void> {
    publishCounter.labels('attempt').inc();
    const conn = this.server.getConnection(id);
    if (conn) {
      conn.type = ConnectionType.PUBLISHER;
      conn.streamPath = StreamPath;
    }
    
    // Extract stream key or alias from path (e.g., /live/stream-key or /live/preview)
    const keyOrAlias = StreamPath.split('/').pop();
    
    if (!keyOrAlias) {
      logger.warn('Invalid stream path, rejecting stream', {
        id,
        streamPath: StreamPath
      });
      
      const session = this.server.getSession(id);
      if (session?.reject) {
        session.reject();
      }
      return;
    }

    // Try to get stream key from alias first
    const streamKey = await this.server.getStreamKeyByAlias(keyOrAlias) || keyOrAlias;
    
    if (!await this.server.validateStreamKey(streamKey, args.ip)) {
      logger.warn('Invalid stream key/alias, rejecting stream', {
        id,
        streamPath: StreamPath,
        keyOrAlias
      });
      
      const session = this.server.getSession(id);
      if (session?.reject) {
        session.reject();
      } else {
        logger.warn('Could not reject invalid stream - session invalid', { id });
      }
      return;
    }

    publishCounter.labels('success').inc();
    logger.info('Stream key/alias validated, allowing stream', {
      id,
      streamPath: StreamPath,
      keyOrAlias
    });
  }

  public async handlePostPublish(id: string, StreamPath: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: ConnectionType.PUBLISHER,
        streamPath: StreamPath,
        timestamp: Date.now()
      };
      this.server.emit(EventType.RTMP_PUBLISH_START, payload);
    }
    logger.info('RTMP stream published', { id, StreamPath, args });
    const streamKey = StreamPath.split('/').pop();
    if (streamKey) {
      this.server.addActiveStream(streamKey, { id, startedAt: new Date() });
    }
  }

  public async handleDonePublish(id: string, StreamPath: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: ConnectionType.PUBLISHER,
        streamPath: StreamPath,
        timestamp: Date.now(),
        duration: Date.now() - conn.startTime
      };
      this.server.emit(EventType.RTMP_PUBLISH_STOP, payload);
    }
    logger.info('RTMP stream unpublished', { id, StreamPath, args });
    const streamKey = StreamPath.split('/').pop();
    if (streamKey) {
      this.server.removeActiveStream(streamKey);
    }
  }

  // Play Events
  public async handlePrePlay(id: string, StreamPath: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      conn.type = ConnectionType.PLAYER;
      conn.streamPath = StreamPath;
    }
    
    logger.info('RTMP client attempting to play', {
      id,
      streamPath: StreamPath,
      args
    });
  }

  public async handlePostPlay(id: string, StreamPath: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: ConnectionType.PLAYER,
        streamPath: StreamPath,
        timestamp: Date.now()
      };
      this.server.emit(EventType.RTMP_PLAY_START, payload);
    }
    logger.info('RTMP client started playing', { id, StreamPath, args });
  }

  public async handleDonePlay(id: string, StreamPath: string, args: any): Promise<void> {
    const conn = this.server.getConnection(id);
    if (conn) {
      const payload: RTMPEventPayload = {
        clientId: id,
        connectionType: ConnectionType.PLAYER,
        streamPath: StreamPath,
        timestamp: Date.now(),
        duration: Date.now() - conn.startTime
      };
      this.server.emit(EventType.RTMP_PLAY_STOP, payload);
    }
    logger.info('RTMP client stopped playing', { id, StreamPath, args });
  }

  // Error Handling
  public async handleError(error: unknown): Promise<void> {
    logger.error('RTMP server error', { error: error instanceof Error ? error.message : 'Unknown error' });
    rtmpErrorsGauge.inc();
    this.server.emit('error', error);
  }
}
