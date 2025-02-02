import { Suspense } from 'react';
import { EventLog } from "@/components/dashboard/event-log";

export default function LogsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventLog />
    </Suspense>
  );
} 