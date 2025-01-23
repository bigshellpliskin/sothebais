"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "./icon-wrapper";

interface WidgetProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function Widget({ 
  title, 
  icon: Icon, 
  children, 
  className 
}: WidgetProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow", className)}>
      <div className="px-6 py-4 flex items-center gap-3 border-b">
        {Icon && (
          <IconWrapper 
            icon={Icon} 
            className="w-5 h-5 text-gray-500" 
          />
        )}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
} 