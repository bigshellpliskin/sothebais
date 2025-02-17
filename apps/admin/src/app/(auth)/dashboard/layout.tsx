import { PropsWithChildren } from "react";

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 