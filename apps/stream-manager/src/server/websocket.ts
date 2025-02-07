import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private static instance: WebSocketService | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize() {
    // Create WebSocket server without path restriction
    this.wss = new WebSocketServer({ 
      port: 4201,
      // Remove path restriction to accept any path
      // path: '/ws'
    });
    
    logger.info('WebSocket server initialized', { 
      port: 4201
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Log any server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    });

    // Log listening events
    this.wss.on('listening', () => {
      logger.info('WebSocket server listening', {
        port: 4201,
        clients: this.wss?.clients.size || 0
      });
    });

    // Add connection attempt logging
    this.wss.on('headers', (headers, request) => {
      logger.info('WebSocket upgrade headers received', {
        path: request.url,
        headers: headers,
        method: request.method
      });
    });
  }

  private handleConnection(ws: WebSocket, request: any): void {
    logger.info('Client connected', {
      path: request.url,
      headers: request.headers
    });

    // Send a welcome message
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      message: 'Connected to stream manager',
      timestamp: Date.now()
    }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('Received message', { 
          type: data.type,
          payload: data.payload
        });
        // Echo the message back
        ws.send(message);
      } catch (error) {
        logger.error('Failed to handle message', {
          error: error instanceof Error ? error.message : 'Unknown error',
          message: message.toString()
        });
      }
    });

    ws.on('close', (code, reason) => {
      logger.info('Client disconnected', {
        code,
        reason: reason.toString()
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    });

    // Send initial state
    this.broadcastStateUpdate({
      connected: true,
      timestamp: Date.now()
    });
  }

  public broadcastStateUpdate(state: any): void {
    if (!this.wss) return;

    const message: WebSocketMessage = {
      type: 'stateUpdate',
      payload: {
        state,
        timestamp: Date.now()
      }
    };

    this.broadcast(message);
  }

  private broadcast(message: WebSocketMessage): void {
    if (!this.wss) return;

    const clientCount = this.wss.clients.size;
    logger.debug('Broadcasting message', {
      type: message.type,
      clientCount
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public shutdown(): void {
    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket server shutdown');
      });
      this.wss = null;
    }
  }
}

export const webSocketService = WebSocketService.getInstance(); 