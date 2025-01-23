"use client";

import { LucideIcon } from "lucide-react";
import { IconWrapper } from "./icon-wrapper";

interface StatusCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  loading?: boolean;
}

export function StatusCard({ title, value, icon: Icon, loading }: StatusCardProps) {
  return (
    <div className={`bg-white/50 rounded-lg p-4 ${loading ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-semibold">
            {loading ? '...' : value}
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-full">
          <IconWrapper icon={Icon} className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
} 