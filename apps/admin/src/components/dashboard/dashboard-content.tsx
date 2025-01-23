"use client";

import { SystemOverview } from "./system-overview";
import { EventLog } from "./event-log";
import { SystemSettings } from "./system-settings";

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <SystemOverview />
      <EventLog />
      <SystemSettings />
    </div>
  );
} 