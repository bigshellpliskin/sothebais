import { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends React.ComponentPropsWithoutRef<"span"> {
  icon: LucideIcon;
  "aria-label"?: string;
}

const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ icon: Icon, className, "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <span ref={ref} className={cn("inline-flex", className)} {...props}>
        <Icon
          aria-hidden={!!ariaLabel}
          aria-label={ariaLabel}
          className="h-4 w-4"
          strokeWidth={2}
        />
      </span>
    );
  }
);

Icon.displayName = "Icon";

export { Icon }; 