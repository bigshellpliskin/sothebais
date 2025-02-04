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
      const status = await fetchStreamStatus();
      if (status && typeof status.fps === 'number') {
        setCurrentFPS(status.fps);
      }
    };

    // Only poll if we're not getting status from props
    if (!streamStatus) {
      // Initial poll
      pollStatus();
      // Set up polling interval
      const interval = setInterval(pollStatus, 1000);
      // Cleanup
      return () => clearInterval(interval);
    }
  }, [streamStatus]); // Depend on streamStatus

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });  // Disable alpha for better performance
    if (!ctx) return;

    console.log('[StreamViewer] Initializing canvas with config:', {
      width,
      height,
      renderQuality: config.renderQuality
    });

    // Enable image smoothing based on render quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = config.renderQuality;

    // Set canvas size from config
    canvas.width = width;
    canvas.height = height;

    // Function to update canvas with new frame
    async function updateCanvas(timestamp: number) {
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
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        
        // Reset error count on success
        errorCountRef.current = 0;
        setError(null);
        
        // Update last frame time
        lastFrameTimeRef.current = timestamp;
      } catch (err) {
        // Ignore aborted requests
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Increase error count and adjust frame rate
        errorCountRef.current++;
        if (errorCountRef.current > 3) {
          // Slow down the frame rate when errors occur
          frameIntervalRef.current = Math.min(1000, frameIntervalRef.current * 1.5);
          console.log('[StreamViewer] Reducing frame rate due to errors:', {
            newInterval: frameIntervalRef.current,
            errorCount: errorCountRef.current
          });
        }

        setError(err instanceof Error ? err.message : 'Failed to update stream');
        console.error('[StreamViewer] Error updating canvas:', err);
      } finally {
        // Add a delay before the next frame if we're experiencing errors
        const delay = errorCountRef.current > 3 ? 1000 : 0;
        setTimeout(() => {
          frameRequestRef.current = requestAnimationFrame(updateCanvas);
        }, delay);
      }
    }

    // Start the render loop
    frameRequestRef.current = requestAnimationFrame(updateCanvas);

    // Cleanup function
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [width, height, config.renderQuality]);  // Re-initialize when dimensions or quality change

  return (
    <div className="relative w-full aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Canvas is only visible when streaming or paused */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${!streamStatus.isLive && !streamStatus.isPaused ? 'hidden' : ''}`}
        style={{ imageRendering: 'auto' }}
      />
      
      {/* Offline state - shows when not streaming and not paused */}
      {!streamStatus.isLive && !streamStatus.isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="text-lg font-medium">Stream Offline</div>
          </div>
          <div className="text-sm text-gray-400">
            Start the stream to begin broadcasting
          </div>
        </div>
      )}

      {/* Paused state - overlay on top of last frame */}
      {streamStatus.isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="text-lg font-medium">Stream Paused</div>
          </div>
          <div className="text-sm text-gray-400">
            Resume the stream to continue broadcasting
          </div>
        </div>
      )}

      {/* Error state - shows only during active streaming */}
      {error && streamStatus.isLive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="text-lg font-medium">Stream Error</div>
          </div>
          <div className="text-sm text-gray-400">
            {error}
          </div>
        </div>
      )}
    </div>
  );
} 