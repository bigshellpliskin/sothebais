import { useState, useEffect } from 'react';
import type { StreamState } from '@sothebais/packages/types/stream';

interface UseStreamStateOptions {
  pollInterval?: number;
}

export function useStreamState({ pollInterval = 1000 }: UseStreamStateOptions = {}) {
  const [streamState, setStreamState] = useState<StreamState>({
    isLive: false,
    isPaused: false,
    fps: 0,
    targetFPS: 30,
    frameCount: 0,
    droppedFrames: 0,
    averageRenderTime: 0,
    startTime: null,
    error: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = async () => {
    try {
      const response = await fetch('/api/stream/state');
      if (!response.ok) throw new Error('Failed to fetch stream state');
      const data = await response.json();
      setStreamState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { streamState, error, isLoading, refetch: fetchState };
} 