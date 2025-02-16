import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private static instance: WebSocketService | null = null;
  private isInitialized = false;

  private constructor() {
    logger.info('WebSocketService instance created');
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      logger.info('Creating new WebSocketService instance');
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        logger.warn('WebSocket server already initialized, skipping initialization');
        resolve();
        return;
      }

      const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 4201;

      logger.info('Initializing WebSocket server', {
        port: wsPort,
        timestamp: new Date().toISOString()
      });

      try {
        // Create WebSocket server with path configuration
        this.wss = new WebSocketServer({ 
          port: wsPort,
          path: '/ws',
          // Add custom headers for WebSocket upgrade
          handleProtocols: (protocols, request) => {
            logger.debug('WebSocket protocols', {
              protocols,
              headers: request.headers,
              timestamp: new Date().toISOString()
            });
            return protocols[0];
          }
        });
        
        // Wait for the server to start listening
        this.wss.on('listening', () => {
          logger.info('WebSocket server created successfully', { 
            port: wsPort,
            path: '/ws',
            timestamp: new Date().toISOString()
          });
          
          // Setup event listeners
          this.setupEventListeners();
          
          this.isInitialized = true;
          logger.info('WebSocket server initialization complete', {
            status: 'ready',
            port: wsPort,
            path: '/ws',
            timestamp: new Date().toISOString()
          });
          resolve();
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error during initialization', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to initialize WebSocket server', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.wss) {
      logger.error('Cannot setup event listeners - WebSocket server is null');
      return;
    }

    logger.info('Setting up WebSocket server event listeners');

    this.wss.on('connection', (ws, request) => {
      const clientIp = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      logger.info('New WebSocket connection attempt', {
        path: request.url,
        ip: clientIp,
        headers: request.headers,
        timestamp: new Date().toISOString()
      });
      this.handleConnection(ws, request);
    });
    
    // Log any server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    });

    // Log listening events
    this.wss.on('listening', () => {
      logger.info('WebSocket server listening', {
        port: 4201,
        clients: this.wss?.clients.size || 0,
        timestamp: new Date().toISOString()
      });
    });

    // Add connection attempt logging
    this.wss.on('headers', (headers, request) => {
      logger.info('WebSocket upgrade headers received', {
        path: request.url,
        headers: headers,
        method: request.method,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('WebSocket server event listeners setup complete');
  }

  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = Math.random().toString(36).substring(7);
    
    logger.info('Client connected', {
      clientId,
      path: request.url,
      headers: request.headers,
      timestamp: new Date().toISOString(),
      totalClients: this.wss?.clients.size || 0
    });

    // Send a welcome message
    const welcomeMessage = {
      type: 'welcome', 
      message: 'Connected to stream manager',
      clientId,
      timestamp: Date.now()
    };

    try {
      ws.send(JSON.stringify(welcomeMessage));
      logger.debug('Welcome message sent', {
        clientId,
        message: welcomeMessage
      });
    } catch (error) {
      logger.error('Failed to send welcome message', {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('Received message', { 
          clientId,
          type: data.type,
          payload: data.payload,
          timestamp: new Date().toISOString()
        });
        // Echo the message back
        ws.send(message);
      } catch (error) {
        logger.error('Failed to handle message', {
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: message.toString(),
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('close', (code, reason) => {
      logger.info('Client disconnected', {
        clientId,
        code,
        reason: reason.toString(),
        timestamp: new Date().toISOString(),
        remainingClients: (this.wss?.clients.size || 0) - 1
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    });

    // Send initial state
    this.broadcastStateUpdate({
      connected: true,
      clientId,
      timestamp: Date.now()
    });
  }

  public broadcastStateUpdate(state: any): void {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized, cannot broadcast state update', {
        timestamp: new Date().toISOString()
      });
      return;
    }

    const message: WebSocketMessage = {
      type: 'stateUpdate',
      payload: {
        stream: state
      }
    };

    logger.debug('Broadcasting state update', {
      clientCount: this.wss.clients.size,
      state: state,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  private broadcast(message: WebSocketMessage): void {
    if (!this.wss) {
      logger.warn('Cannot broadcast - WebSocket server not initialized');
      return;
    }

    const clientCount = this.wss.clients.size;
    logger.debug('Broadcasting message', {
      type: message.type,
      clientCount,
      timestamp: new Date().toISOString()
    });

    let successCount = 0;
    let failCount = 0;

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          successCount++;
        } catch (error) {
          failCount++;
          logger.error('Failed to send message to client', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    logger.debug('Broadcast complete', {
      type: message.type,
      totalClients: clientCount,
      successCount,
      failCount,
      timestamp: new Date().toISOString()
    });
  }

  public shutdown(): void {
    if (!this.wss) {
      logger.info('WebSocket server already shutdown');
      return;
    }

    logger.info('Initiating WebSocket server shutdown', {
      activeConnections: this.wss.clients.size,
      timestamp: new Date().toISOString()
    });

    this.wss.close((error) => {
      if (error) {
        logger.error('Error during WebSocket server shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.info('WebSocket server shutdown complete', {
          timestamp: new Date().toISOString()
        });
      }
    });
    
    this.wss = null;
    this.isInitialized = false;
  }

  public getStatus(): object {
    return {
      isInitialized: this.isInitialized,
      activeConnections: this.wss?.clients.size || 0,
      timestamp: new Date().toISOString()
    };
  }
}

export const webSocketService = WebSocketService.getInstance(); 