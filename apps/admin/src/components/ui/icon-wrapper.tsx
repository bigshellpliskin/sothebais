"use client";

import { LucideIcon } from "lucide-react";
import { HTMLAttributes } from "react";

interface IconWrapperProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  className?: string;
}

export function IconWrapper({ icon: Icon, className, ...props }: IconWrapperProps) {
  return (
    <div {...props} suppressHydrationWarning>
      <Icon className={className} suppressHydrationWarning aria-hidden="true" />
    </div>
  );
} 