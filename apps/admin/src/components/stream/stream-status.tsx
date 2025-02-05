import { cn } from "@/lib/utils";

interface StreamStatusProps {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  layerCount: number;
  averageRenderTime: number;
}

export function StreamStatus({
  isLive,
  isPaused,
  fps,
  targetFPS,
  layerCount,
  averageRenderTime
}: StreamStatusProps) {
  return (
    <div className="flex items-center justify-center gap-2 -my-1">
      {/* Status Tab */}
      <div className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-0.5 text-sm font-medium",
        isLive 
          ? isPaused 
            ? "border-yellow-200 bg-yellow-50 text-yellow-700" 
            : "border-green-200 bg-green-50 text-green-700 animate-pulse"
          : "border-red-200 bg-red-50 text-red-700"
      )}>
        <div className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLive 
            ? isPaused 
              ? "bg-yellow-500" 
              : "bg-green-500"
            : "bg-red-500"
        )} />
        {isLive ? (isPaused ? 'Paused' : 'Live') : 'Offline'}
      </div>

      {/* Metrics Tabs */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        FPS: {(fps || 0).toFixed(1)} / {targetFPS || 30}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        Layers: {layerCount || 0}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        Render: {(averageRenderTime || 0).toFixed(1)}ms
      </div>
    </div>
  );
} 