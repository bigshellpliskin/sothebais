import { useState, useEffect, useCallback, useRef } from 'react';

interface PreviewConfig {
  width: number;
  height: number;
  fps: number;
  quality: 'high' | 'medium' | 'low';
}

interface PreviewState {
  isConnected: boolean;
  lastFrameTimestamp: number | null;
  config: PreviewConfig | null;
  error: string | null;
  connectionAttempts: number;
}

interface PreviewMessage {
  type: 'config' | 'frame' | 'streamState';
  data: any;
  timestamp?: number;
}

interface UsePreviewSocketOptions {
  autoConnect?: boolean;
  quality?: 'high' | 'medium' | 'low';
  onFrame?: (frameData: string, timestamp: number) => void;
  maxRetries?: number;
}

export function usePreviewSocket(options: UsePreviewSocketOptions = {}) {
  const {
    autoConnect = true,
    quality = 'medium',
    onFrame,
    maxRetries = 5
  } = options;

  const [state, setState] = useState<PreviewState>({
    isConnected: false,
    lastFrameTimestamp: null,
    config: null,
    error: null,
    connectionAttempts: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const getWebSocketUrl = useCallback((): string => {
    // Use the new WebSocket endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}/api/stream/ws?target=preview`;
  }, []);

  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (state.connectionAttempts >= maxRetries) {
      setState(prev => ({
        ...prev,
        error: `Maximum connection attempts (${maxRetries}) reached`
      }));
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('[Preview] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.log('[Preview] WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
          connectionAttempts: 0
        }));

        // Send initial quality preference
        ws.send(JSON.stringify({
          type: 'quality',
          data: { quality }
        }));
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        console.log('[Preview] WebSocket disconnected');
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionAttempts: prev.connectionAttempts + 1
        }));

        // Attempt to reconnect after delay, but only if mounted and under max retries
        if (autoConnect && isMountedRef.current && state.connectionAttempts < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, state.connectionAttempts), 30000);
          console.log(`[Preview] Reconnecting in ${delay}ms (attempt ${state.connectionAttempts + 1}/${maxRetries})`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = (error) => {
        if (!isMountedRef.current) return;
        console.error('[Preview] WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'Connection error. Please check if the stream server is running.'
        }));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const message: PreviewMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'config':
              setState(prev => ({
                ...prev,
                config: message.data
              }));
              break;

            case 'frame':
              if (onFrame) {
                onFrame(message.data, message.timestamp || Date.now());
              }
              setState(prev => ({
                ...prev,
                lastFrameTimestamp: message.timestamp || Date.now()
              }));
              break;

            case 'streamState':
              // Handle stream state updates if needed
              break;

            default:
              console.warn('[Preview] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[Preview] Error processing message:', error);
        }
      };
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[Preview] Connection error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to establish connection',
        connectionAttempts: prev.connectionAttempts + 1
      }));
    }
  }, [autoConnect, quality, onFrame, state.connectionAttempts, maxRetries, getWebSocketUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionAttempts: 0
      }));
    }
  }, []);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    updateQuality: useCallback((newQuality: 'high' | 'medium' | 'low') => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'quality',
          data: { quality: newQuality }
        }));
      }
    }, [])
  };
} 