import { createLogger } from './logger.js';

const logger = createLogger('WebSocketClient');

/**
 * WebSocket connection states
 */
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED'
}

/**
 * WebSocketClient options
 */
export interface WebSocketClientOptions {
  url: string;
  protocols?: string | string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  pongTimeout?: number;
  onOpen?: (event: Event, client: WebSocketClient) => void;
  onMessage?: (data: any, client: WebSocketClient) => void;
  onClose?: (event: CloseEvent, client: WebSocketClient) => void;
  onError?: (event: Event, client: WebSocketClient) => void;
  onReconnect?: (attempt: number, client: WebSocketClient) => void;
  onStateChange?: (state: WebSocketState, client: WebSocketClient) => void;
}

/**
 * WebSocketClient for handling WebSocket connections with automatic reconnection
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[] | undefined;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: number;
  private pongTimeout: number;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;
  private _state: WebSocketState = WebSocketState.DISCONNECTED;
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  // Callback handlers
  private onOpenHandler?: ((event: Event, client: WebSocketClient) => void) | undefined;
  private onMessageHandler?: ((data: any, client: WebSocketClient) => void) | undefined;
  private onCloseHandler?: ((event: CloseEvent, client: WebSocketClient) => void) | undefined;
  private onErrorHandler?: ((event: Event, client: WebSocketClient) => void) | undefined;
  private onReconnectHandler?: ((attempt: number, client: WebSocketClient) => void) | undefined;
  private onStateChangeHandler?: ((state: WebSocketState, client: WebSocketClient) => void) | undefined;

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.protocols = options.protocols;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.pingInterval = options.pingInterval || 30000;
    this.pongTimeout = options.pongTimeout || 5000;
    
    // Set callback handlers if provided
    this.onOpenHandler = options.onOpen;
    this.onMessageHandler = options.onMessage;
    this.onCloseHandler = options.onClose;
    this.onErrorHandler = options.onError;
    this.onReconnectHandler = options.onReconnect;
    this.onStateChangeHandler = options.onStateChange;
  }

  /**
   * Get the current WebSocket connection state
   */
  get state(): WebSocketState {
    return this._state;
  }

  /**
   * Set the WebSocket state and trigger the state change handler
   */
  private set state(newState: WebSocketState) {
    if (this._state !== newState) {
      const prevState = this._state;
      this._state = newState;
      logger.info(`WebSocket state changed from ${prevState} to ${newState}`, { url: this.url });
      
      // Trigger state change handler if provided
      if (this.onStateChangeHandler) {
        this.onStateChangeHandler(newState, this);
      }
      
      // Trigger state-specific event
      this.emit(`state:${newState.toLowerCase()}`, this);
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      logger.warn('WebSocket is already connecting or connected', { url: this.url });
      return;
    }

    this.cleanup();
    this.state = WebSocketState.CONNECTING;
    
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.setupEventListeners();
      logger.info('Connecting to WebSocket', { url: this.url });
    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error, url: this.url });
      this.state = WebSocketState.FAILED;
      this.handleReconnect();
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = (event: Event) => {
      logger.info('WebSocket connection opened', { url: this.url });
      this.state = WebSocketState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startPingInterval();
      
      // Call the onOpen handler if provided
      if (this.onOpenHandler) {
        this.onOpenHandler(event, this);
      }
      
      // Trigger open event
      this.emit('open', event, this);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let data: any;
      
      // Try to parse JSON data
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          // If not valid JSON, use the raw data
          data = event.data;
        }
      } else {
        data = event.data;
      }
      
      // Reset pong timer on any message
      this.resetPongTimer();
      
      // Handle ping-pong protocol messages
      if (data && typeof data === 'object' && data.type === 'ping') {
        this.send({ type: 'pong', timestamp: Date.now() });
        return;
      }
      
      // Call the onMessage handler if provided
      if (this.onMessageHandler) {
        this.onMessageHandler(data, this);
      }
      
      // Trigger message event
      this.emit('message', data, this);
    };

    this.ws.onclose = (event: CloseEvent) => {
      const wasConnected = this.state === WebSocketState.CONNECTED;
      this.state = WebSocketState.DISCONNECTED;
      
      logger.info('WebSocket connection closed', { 
        code: event.code, 
        reason: event.reason, 
        wasClean: event.wasClean, 
        url: this.url 
      });
      
      this.cleanup();
      
      // Call the onClose handler if provided
      if (this.onCloseHandler) {
        this.onCloseHandler(event, this);
      }
      
      // Trigger close event
      this.emit('close', event, this);
      
      // Only attempt to reconnect if we were previously connected
      // and the close wasn't clean (or we're configured to always reconnect)
      if (wasConnected && this.autoReconnect && (!event.wasClean || event.code !== 1000)) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (event: Event) => {
      logger.error('WebSocket error occurred', { url: this.url });
      
      // Call the onError handler if provided
      if (this.onErrorHandler) {
        this.onErrorHandler(event, this);
      }
      
      // Trigger error event
      this.emit('error', event, this);
      
      // Check if the connection is still attempting
      if (this.state === WebSocketState.CONNECTING) {
        this.state = WebSocketState.FAILED;
        this.cleanup();
        this.handleReconnect();
      }
    };
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Maximum reconnect attempts reached, giving up', { 
        attempts: this.reconnectAttempts, 
        maxAttempts: this.maxReconnectAttempts,
        url: this.url
      });
      this.state = WebSocketState.FAILED;
      return;
    }

    this.state = WebSocketState.RECONNECTING;
    this.reconnectAttempts++;
    
    logger.info('Scheduling WebSocket reconnect', { 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts,
      delayMs: this.reconnectInterval,
      url: this.url
    });
    
    // Call the onReconnect handler if provided
    if (this.onReconnectHandler) {
      this.onReconnectHandler(this.reconnectAttempts, this);
    }
    
    // Trigger reconnect event
    this.emit('reconnect', this.reconnectAttempts, this);
    
    // Schedule the reconnection attempt
    this.reconnectTimer = setTimeout(() => {
      logger.info('Attempting to reconnect', { 
        attempt: this.reconnectAttempts, 
        url: this.url 
      });
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Start the ping interval to keep the connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingTimer = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping
        this.send({ type: 'ping', timestamp: Date.now() });
        
        // Set timeout for pong response
        this.pongTimer = setTimeout(() => {
          logger.warn('No pong response received within timeout', { url: this.url });
          // Force close the connection which will trigger reconnect
          this.close(4000, 'Ping timeout');
        }, this.pongTimeout);
      }
    }, this.pingInterval);
  }

  /**
   * Stop the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.resetPongTimer();
  }

  /**
   * Reset the pong timeout timer
   */
  private resetPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  /**
   * Clean up resources when closing the connection
   */
  private cleanup(): void {
    this.stopPingInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      // Remove all event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Close connection if still open
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.close(1000, 'Client closed connection');
        } catch (e) {
          logger.error('Error while closing WebSocket', { error: e, url: this.url });
        }
      }
      
      this.ws = null;
    }
  }

  /**
   * Send data to the WebSocket server
   * @param data The data to send
   * @returns true if data was sent, false otherwise
   */
  public send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('Cannot send data, WebSocket is not open', { 
        state: this.state, 
        url: this.url 
      });
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      logger.error('Error sending data over WebSocket', { error, url: this.url });
      return false;
    }
  }

  /**
   * Close the WebSocket connection
   * @param code Close code
   * @param reason Close reason
   */
  public close(code: number = 1000, reason: string = 'Client initiated close'): void {
    if (!this.ws) return;

    // Disable auto-reconnect when manually closing
    this.autoReconnect = false;
    
    try {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(code, reason);
      }
    } catch (error) {
      logger.error('Error closing WebSocket', { error, url: this.url });
    }
    
    this.cleanup();
    this.state = WebSocketState.DISCONNECTED;
  }

  /**
   * Disconnect and cleanup all resources
   */
  public destroy(): void {
    this.close(1000, 'Client destroyed');
    this.cleanup();
    this.eventListeners.clear();
  }

  /**
   * Add event listener
   * @param event Event name
   * @param callback Callback function
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param callback Callback function
   */
  public off(event: string, callback: Function): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with arguments
   * @param event Event name
   * @param args Event arguments
   */
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (error) {
          logger.error('Error in event listener', { error, event, url: this.url });
        }
      }
    }
  }
} 