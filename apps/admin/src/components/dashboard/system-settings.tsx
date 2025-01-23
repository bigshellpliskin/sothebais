"use client";

import { Settings } from "lucide-react";
import { Widget } from "@/components/ui/widget";

export function SystemSettings() {
  return (
    <Widget 
      title="System Settings" 
      icon={Settings}
      className="w-full mb-6"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">Maintenance Mode</h4>
            <p className="text-sm text-gray-500">Temporarily disable all services</p>
          </div>
          <div className="h-6 w-11 bg-gray-200 rounded-full" />
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">Debug Logging</h4>
            <p className="text-sm text-gray-500">Enable detailed system logs</p>
          </div>
          <div className="h-6 w-11 bg-gray-200 rounded-full" />
        </div>
      </div>
    </Widget>
  );
} 