import { UserButton } from "@clerk/nextjs";
import { PropsWithChildren } from "react";

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      {/* Top navigation */}
      <header className="bg-white shadow fixed w-full z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">SothebAI Admin</h1>
          <UserButton fallbackRedirectUrl="/sign-in" />
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 px-6 pb-6">
        {children}
      </main>
    </div>
  );
} 