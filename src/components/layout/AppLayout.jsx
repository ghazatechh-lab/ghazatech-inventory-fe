import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

export function AppLayout() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="grain min-h-screen w-full flex">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      </div>
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
