import { cn } from "@/lib/utils";

interface StreamStatusProps {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  averageRenderTime: number;
}

export function StreamStatus({
  isLive,
  isPaused,
  fps,
  targetFPS,
  averageRenderTime
}: StreamStatusProps) {
  // Determine status text and styles
  const getStatusConfig = () => {
    if (isLive) {
      if (isPaused) {
        return {
          text: 'Paused',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          dotColor: 'bg-yellow-500',
          animate: false
        };
      }
      return {
        text: 'Live',
        borderColor: 'border-green-200',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        dotColor: 'bg-green-500',
        animate: true
      };
    }
    return {
      text: 'Offline',
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      dotColor: 'bg-red-500',
      animate: false
    };
  };

  const status = getStatusConfig();

  return (
    <div className="flex items-center justify-center gap-2 -my-1">
      {/* Status Tab */}
      <div className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-0.5 text-sm font-medium transition-colors duration-200",
        status.borderColor,
        status.bgColor,
        status.textColor,
        status.animate && "animate-pulse"
      )}>
        <div className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors duration-200",
          status.dotColor
        )} />
        {status.text}
      </div>

      {/* Metrics Tabs */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        FPS: {isLive ? (fps || 0).toFixed(1) : '0.0'} / {targetFPS || 30}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        Render: {isLive ? (averageRenderTime || 0).toFixed(1) : '0.0'}ms
      </div>
    </div>
  );
} 