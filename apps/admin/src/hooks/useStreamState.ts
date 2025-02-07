import { useState, useEffect, useCallback, useRef } from 'react';

export interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  frameCount: number;
  droppedFrames: number;
  averageRenderTime: number;
  startTime?: number;
  error?: string;
}

export interface LayerState {
  id: string;
  type: string;
  visible: boolean;
  content: Record<string, any>;
}

interface UseStreamStateOptions {
  pollInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export function useStreamState(options: UseStreamStateOptions = {}) {
  const {
    pollInterval = 1000,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const prevStateRef = useRef<StreamState | null>(null);
  const [streamState, setStreamState] = useState<StreamState>({
    isLive: false,
    isPaused: false,
    fps: 0,
    targetFPS: 30,
    frameCount: 0,
    droppedFrames: 0,
    averageRenderTime: 0
  });

  const [layers, setLayers] = useState<LayerState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // WebSocket connection handling
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect through the new WebSocket endpoint
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/stream/ws?target=state`);
    
    ws.onopen = () => {
      console.log('🟢 [Stream State] WebSocket connected');
      retryCountRef.current = 0;
      setIsLoading(false);
      
      // Subscribe to state updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { topics: ['state'] }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stateUpdate' && message.payload?.stream) {
          const newState = message.payload.stream;
          
          // Log state changes
          if (prevStateRef.current?.isLive !== newState.isLive) {
            console.log('🟡 [Stream State] Live state changed:', {
              from: prevStateRef.current?.isLive,
              to: newState.isLive,
              timestamp: new Date().toISOString()
            });
          }

          prevStateRef.current = newState;
          setStreamState(newState);
          setError(null);
        }
      } catch (error) {
        console.error('🔴 [Stream State] WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔴 [Stream State] WebSocket closed');
      wsRef.current = null;

      // Attempt reconnection with exponential backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;

      if (isMountedRef.current && retryCountRef.current <= maxRetries) {
        console.log(`🟡 [Stream State] Reconnecting in ${backoffDelay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoffDelay);
      }
    };

    ws.onerror = (error) => {
      console.error('🔴 [Stream State] WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [maxRetries]);

  // Fetch layers via HTTP (no WebSocket needed for this)
  const fetchLayers = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await fetch('/api/stream/layers', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-store'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data?.success || !Array.isArray(data?.data)) {
        throw new Error('Invalid layer data format');
      }

      if (isMountedRef.current) {
        setLayers(data.data);
      }
    } catch (error) {
      console.error('🔴 [Stream State] Error fetching layers:', error);
    }
  }, []);

  // Initial setup and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();
    fetchLayers();

    // Set up layer polling
    const layerInterval = setInterval(fetchLayers, pollInterval);

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(layerInterval);
    };
  }, [connectWebSocket, fetchLayers, pollInterval]);

  // Manual refetch function (useful after actions)
  const refetch = useCallback(async () => {
    await fetchLayers();
  }, [fetchLayers]);

  return {
    streamState,
    layers,
    error,
    isLoading,
    refetch
  };
} 