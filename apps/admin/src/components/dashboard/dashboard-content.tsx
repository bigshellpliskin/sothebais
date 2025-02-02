"use client";

import { SystemSettings } from "./system-settings";
import { SystemMetrics } from "./system-metrics";

export function DashboardContent() {
  return (
    <div className="space-y-8">
      <SystemMetrics />
      <SystemSettings />
    </div>
  );
} 