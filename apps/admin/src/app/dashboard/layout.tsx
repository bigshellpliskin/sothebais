import { UserButton } from "@clerk/nextjs";
import { PropsWithChildren } from "react";
import { HeaderStatus } from "@/components/dashboard/header-status";

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      {/* Top navigation */}
      <header className="bg-white shadow fixed w-full z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">SothebAI Admin</h1>
          <div className="flex items-center gap-6">
            <HeaderStatus />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 px-6 pb-6">
        {children}
      </main>
    </div>
  );
} 