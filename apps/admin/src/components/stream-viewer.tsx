"use client";

import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';

interface StreamViewerProps {
  width?: number;
  height?: number;
  fps?: number;
}

export function StreamViewer({ 
  width = 1920, 
  height = 1080,
  fps = 30
}: StreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(1000 / fps);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error('Failed to fetch frame');
        }
        
        const blob = await response.blob();
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Clean up the blob URL
        URL.revokeObjectURL(img.src);
        
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
      // Cancel any pending animation frame
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [width, height, fps]);

  return (
    <Card className="overflow-hidden">
      <div className="relative w-full bg-black">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ aspectRatio: `${width}/${height}` }}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
} 