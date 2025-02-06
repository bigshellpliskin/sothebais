import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlaybackControlsProps {
  isLive: boolean;
  isPaused: boolean;
  onControlStream: (action: 'start' | 'stop' | 'pause') => Promise<void>;
}

export function PlaybackControls({ isLive, isPaused, onControlStream }: PlaybackControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <CardTitle className="text-lg">Playback Controls</CardTitle>
      <div className="flex items-center justify-center gap-2">
        {/* Start/Stop Stream Button */}
        <Button
          variant={isLive ? "destructive" : "default"}
          onClick={() => onControlStream('start')}
          disabled={isLive}
          className={cn(
            "flex items-center gap-2",
            !isLive && "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          <Play className="h-4 w-4" />
          Start Stream
        </Button>

        {/* Play/Pause Button */}
        <Button
          variant="outline"
          onClick={() => onControlStream('pause')}
          disabled={!isLive}
          className="flex items-center gap-2"
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          )}
        </Button>

        {/* Stop Button */}
        <Button
          variant="outline"
          onClick={() => onControlStream('stop')}
          disabled={!isLive}
          className={cn(
            "flex items-center gap-2",
            isLive && "hover:bg-red-50"
          )}
        >
          <Square className="h-4 w-4" fill="currentColor" />
          Stop
        </Button>
      </div>
    </div>
  );
} 