"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '../ui/card';
import { usePreviewSocket } from '@/hooks/usePreviewSocket';
import { useStreamState } from '@/hooks/useStreamState';

interface StreamViewerProps {
  width?: number;
  height?: number;
  quality?: 'high' | 'medium' | 'low';
}

export function StreamViewer({ 
  width = 1280,
  height = 720,
  quality = 'medium'
}: StreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { streamState } = useStreamState({
    pollInterval: 2000 // Increase poll interval to reduce updates
  });
  
  const handleFrame = useCallback((frameData: string, timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => {
      setError('Failed to load frame');
    };
    img.src = `data:image/png;base64,${frameData}`;
  }, []); // Empty deps since it doesn't use any external values

  const { isConnected, error: socketError } = usePreviewSocket({
    quality,
    onFrame: handleFrame,
    autoConnect: streamState.isLive // Only connect when stream is live
  });

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only update if dimensions actually changed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = quality;
    }
  }, [width, height, quality]);

  return (
    <Card className="relative overflow-hidden">
      <div className="aspect-video relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <p className="text-lg font-semibold">
                {streamState.isLive ? 'Connecting...' : 'Stream Offline'}
              </p>
              {(error || socketError) && (
                <p className="text-sm text-red-400 mt-2">
                  {error || socketError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stream Stats */}
        {isConnected && streamState.isLive && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
            <p>FPS: {streamState.fps}/{streamState.targetFPS}</p>
            <p>Quality: {quality}</p>
            <p>Latency: {streamState.averageRenderTime.toFixed(1)}ms</p>
          </div>
        )}
      </div>
    </Card>
  );
} 