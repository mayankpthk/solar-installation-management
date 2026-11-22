"use client";

import * as React from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { ToastProvider } from "@/components/shared/toast-context";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex antialiased">
        {/* Navigation Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Main Content Area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
            isCollapsed ? "md:ml-20" : "md:ml-64"
          )}
        >
          <Header onToggleSidebar={() => setIsCollapsed((prev) => !prev)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
