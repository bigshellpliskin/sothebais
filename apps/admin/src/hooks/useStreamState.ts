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
  const pollTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const [statusResponse, layersResponse] = await Promise.all([
        fetch('/api/stream/status', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-store'
          }
        }),
        fetch('/api/stream/layers', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-store'
          }
        })
      ]);

      if (!isMountedRef.current) return;

      if (!statusResponse.ok || !layersResponse.ok) {
        const errorResponse = !statusResponse.ok ? statusResponse : layersResponse;
        const errorData = await errorResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${errorResponse.status}: ${errorResponse.statusText}`);
      }

      const [statusData, layersData] = await Promise.all([
        statusResponse.json(),
        layersResponse.json()
      ]);

      if (!isMountedRef.current) return;

      // Validate response structure
      if (!statusData || !statusData.success || !statusData.data) {
        console.error('[Stream State] Invalid response format:', { statusData });
        throw new Error('Invalid response format: missing or invalid response structure');
      }

      // Get the stream state from the response
      const streamStateData = statusData.data;

      // Validate stream state data
      if (typeof streamStateData.isLive !== 'boolean') {
        console.error('[Stream State] Invalid stream state:', { streamStateData });
        throw new Error('Invalid stream state: missing or invalid isLive field');
      }

      // Create new state with proper type checking
      const newState = {
        isLive: Boolean(streamStateData.isLive),
        isPaused: Boolean(streamStateData.isPaused),
        fps: Number(streamStateData.fps) || 0,
        targetFPS: Number(streamStateData.targetFPS) || 30,
        frameCount: Number(streamStateData.frameCount) || 0,
        droppedFrames: Number(streamStateData.droppedFrames) || 0,
        averageRenderTime: Number(streamStateData.averageRenderTime) || 0,
        startTime: streamStateData.startTime || null,
        error: streamStateData.error || null
      };

      // Log state changes
      if (prevStateRef.current?.isLive !== newState.isLive) {
        console.log('[Stream State] State changed:', {
          previous: prevStateRef.current?.isLive,
          current: newState.isLive,
          raw: streamStateData,
          timestamp: new Date().toISOString()
        });
      }

      prevStateRef.current = newState;
      setStreamState(newState);

      // Update layers with validation
      if (layersData.success && Array.isArray(layersData.data)) {
        setLayers(layersData.data);
      } else {
        console.warn('[Stream State] Invalid layers data format');
        setLayers([]);
      }

      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      if (!isMountedRef.current) return;
      
      console.error('[Stream State] Error fetching data:', err);
      retryCountRef.current++;

      if (retryCountRef.current >= maxRetries) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stream data');
        // Keep last known good state but mark stream as offline if we can't connect
        setStreamState(prev => ({
          ...prev,
          isLive: false,
          error: err instanceof Error ? err.message : 'Connection lost'
        }));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [maxRetries]);

  // Set up polling with exponential backoff on errors
  useEffect(() => {
    isMountedRef.current = true;
    
    const poll = () => {
      if (!isMountedRef.current) return;
      
      fetchData();
      
      if (isMountedRef.current) {
        const nextPollDelay = retryCountRef.current > 0 
          ? Math.min(pollInterval * Math.pow(2, retryCountRef.current), 10000)
          : pollInterval;
          
        pollTimeoutRef.current = setTimeout(poll, nextPollDelay);
      }
    };

    // Initial fetch
    poll();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchData, pollInterval]);

  return {
    streamState,
    layers,
    error,
    isLoading,
    refetch: fetchData
  };
} 