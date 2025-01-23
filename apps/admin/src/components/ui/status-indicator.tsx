import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "offline";
  label: string;
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            status === "online" ? "bg-green-500" : "bg-red-500"
          )}
        />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    </div>
  );
} 