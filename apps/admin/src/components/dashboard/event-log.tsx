"use client";

import { Clock } from "lucide-react";
import { Widget } from "@/components/ui/widget";

export function EventLog() {
  return (
    <Widget 
      title="Recent Events" 
      icon={Clock}
      className="w-full mb-6"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">No recent events to display.</p>
      </div>
    </Widget>
  );
} 