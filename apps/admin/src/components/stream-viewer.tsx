"use client";

import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';

interface StreamViewerProps {
  width?: number;
  height?: number;
  fps?: number;
  streamStatus?: {
    isLive: boolean;
    fps: number;
    targetFPS: number;
    layerCount: number;
    averageRenderTime: number;
    isPaused?: boolean;
  };
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

export function StreamViewer({ 
  width = 1280,
  height = 720,
  fps = 30,
  streamStatus = { isLive: true, fps: 0, targetFPS: 30, layerCount: 0, averageRenderTime: 0 }
}: StreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFPS, setCurrentFPS] = useState<number>(fps);
  const abortControllerRef = useRef<AbortController | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(1000 / fps);

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

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Function to update canvas with new frame
    async function updateCanvas(timestamp: number) {
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

        // Always use the API route which will be handled by Traefik
        const response = await fetch('/api/stream/frame', {
          signal: abortControllerRef.current.signal,
          cache: 'no-store'  // Prevent caching of frames
        });

        if (!response.ok) {
          throw new Error('Failed to fetch frame');
        }
        
        const blob = await response.blob();
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
        }

        setError(err instanceof Error ? err.message : 'Failed to update stream');
        console.error('Error updating canvas:', err);
      } finally {
        // Schedule next frame
        frameRequestRef.current = requestAnimationFrame(updateCanvas);
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
  }, [width, height, fps]);  // Re-initialize when props change

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