"use client";

import { SystemOverview } from "./system-overview";
import { EventLog } from "./event-log";
import { SystemSettings } from "./system-settings";
import { SystemMetrics } from "./system-metrics";

export function DashboardContent() {
  return (
    <div className="space-y-8">
      <SystemOverview />
      <SystemMetrics />
      <EventLog />
      <SystemSettings />
    </div>
  );
} 