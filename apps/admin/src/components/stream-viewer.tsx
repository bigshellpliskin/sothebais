"use client";

import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';

interface StreamViewerProps {
  streamStatus?: {
    isLive: boolean;
    fps: number;
    targetFPS: number;
    layerCount: number;
    averageRenderTime: number;
    isPaused?: boolean;
  };
}

interface StreamConfig {
  resolution: string;
  targetFPS: number;
  renderQuality: 'low' | 'medium' | 'high';
  maxLayers: number;
  audioBitrate: number;
  audioEnabled: boolean;
  streamBitrate: number;
}

// Function to fetch stream status
async function fetchStreamStatus() {
  try {
    const response = await fetch('/api/stream/status');
    if (!response.ok) {
      throw new Error('Failed to fetch stream status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stream status:', error);
    return null;
  }
}

// Function to fetch stream configuration
async function fetchStreamConfig(): Promise<StreamConfig> {
  try {
    console.log('[StreamViewer] Fetching stream configuration...');
    const response = await fetch('/api/stream/config');
    if (!response.ok) {
      console.error('[StreamViewer] Failed to fetch config:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to fetch stream configuration');
    }
    const data = await response.json();
    console.log('[StreamViewer] Received raw config:', data);
    return data;
  } catch (error) {
    console.error('[StreamViewer] Error fetching config:', error);
    // Return default values if config fetch fails
    const defaultConfig: StreamConfig = {
      resolution: '1280x720',
      targetFPS: 30,
      renderQuality: 'high',
      maxLayers: 10,
      audioBitrate: 128,
      audioEnabled: true,
      streamBitrate: 4000
    };
    console.log('[StreamViewer] Using default config:', defaultConfig);
    return defaultConfig;
  }
}

export function StreamViewer({ 
  streamStatus = { isLive: true, fps: 0, targetFPS: 30, layerCount: 0, averageRenderTime: 0 }
}: StreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFPS, setCurrentFPS] = useState<number>(30);
  const [config, setConfig] = useState<StreamConfig>({
    resolution: '1280x720',
    targetFPS: 30,
    renderQuality: 'high',
    maxLayers: 10,
    audioBitrate: 128,
    audioEnabled: true,
    streamBitrate: 4000
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(1000 / config.targetFPS);

  // Parse dimensions from resolution
  const [width, height] = config.resolution.split('x').map(Number);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas element not found');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not get canvas context');
      return;
    }

    ctxRef.current = context;
    
    // Set initial canvas size
    canvas.width = width;
    canvas.height = height;

    // Configure context
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = config.renderQuality;

    return () => {
      // Cleanup
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      ctxRef.current = null;
    };
  }, [width, height, config.renderQuality]);

  // Fetch initial configuration
  useEffect(() => {
    console.log('[StreamViewer] Initializing with default config:', config);
    fetchStreamConfig().then(newConfig => {
      console.log('[StreamViewer] Updating to fetched config:', newConfig);
      setConfig(newConfig);
    });
  }, []);

  // Update frame interval when config changes
  useEffect(() => {
    const newInterval = 1000 / config.targetFPS;
    console.log('[StreamViewer] Updating frame interval:', {
      targetFPS: config.targetFPS,
      newInterval,
      previousInterval: frameIntervalRef.current
    });
    frameIntervalRef.current = newInterval;
  }, [config.targetFPS]);

  // Add status polling effect
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await fetchStreamStatus();
        setCurrentFPS(status.fps);
      } catch (err) {
        console.error('[StreamViewer] Error polling status:', err);
      }
    };

    const intervalId = setInterval(pollStatus, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Function to update canvas with new frame
  async function updateCanvas(timestamp: number) {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!ctx || !canvas) {
      console.error('[StreamViewer] Canvas or context is not available for frame update');
      return;
    }

    // Don't fetch frames if stream is not live or is paused
    if (!streamStatus.isLive || streamStatus.isPaused) {
      frameRequestRef.current = requestAnimationFrame(updateCanvas);
      return;
    }

    // Check if enough time has passed since last frame
    const elapsed = timestamp - lastFrameTimeRef.current;
    if (elapsed < frameIntervalRef.current) {
      frameRequestRef.current = requestAnimationFrame(updateCanvas);
      return;
    }

    try {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      console.log('[StreamViewer] Fetching frame...');
      const response = await fetch('/api/stream/frame', {
        signal: abortControllerRef.current.signal,
        cache: 'no-store'  // Prevent caching of frames
      });

      if (!response.ok) {
        console.error('[StreamViewer] Frame fetch failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error('Failed to fetch frame');
      }
      
      const blob = await response.blob();
      console.log('[StreamViewer] Frame received:', {
        size: blob.size,
        type: blob.type
      });

      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw black background first
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw the frame
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(null);
          } catch (err) {
            reject(err);
          } finally {
            // Clean up the blob URL
            URL.revokeObjectURL(img.src);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load frame image'));
        };

        img.src = URL.createObjectURL(blob);
      });

      // Update timing references
      lastFrameTimeRef.current = timestamp;
      errorCountRef.current = 0;
    } catch (err) {
      console.error('[StreamViewer] Error updating canvas:', err);
      errorCountRef.current++;
      
      if (errorCountRef.current > 5) {
        setError('Stream playback failed');
        return;
      }
    }

    // Request next frame
    frameRequestRef.current = requestAnimationFrame(updateCanvas);
  }

  // Start animation loop
  useEffect(() => {
    frameRequestRef.current = requestAnimationFrame(updateCanvas);
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [streamStatus.isLive, streamStatus.isPaused]);

  if (error) {
    return (
      <div className="stream-viewer-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="stream-viewer">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black'
        }}
      />
      {currentFPS > 0 && (
        <div className="fps-counter">
          {currentFPS.toFixed(1)} FPS
        </div>
      )}
    </div>
  );
} 