"use client";

import { EventLog } from "./event-log";
import { SystemSettings } from "./system-settings";
import { SystemMetrics } from "./system-metrics";

export function DashboardContent() {
  return (
    <div className="space-y-8">
      <SystemMetrics />
      <EventLog />
      <SystemSettings />
    </div>
  );
} 