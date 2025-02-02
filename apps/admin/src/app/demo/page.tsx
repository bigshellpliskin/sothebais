"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";

export default function DemoPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" aria-hidden="true" />
          <CardTitle>Stream Manager Demo</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">Stream Manager Demo Interface Coming Soon</p>
        </div>
      </CardContent>
    </Card>
  );
} 