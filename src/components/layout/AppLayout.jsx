import React from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

export function AppLayout() {
  const [collapsed, setCollapsed] = React.useState(false);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="grain flex min-h-screen w-full bg-slate-50 text-slate-900 transition-colors dark:bg-[#0A0E17] dark:text-slate-100">
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileSidebar={() => setMobileOpen(true)} />

        <main className="fade-in-up min-w-0 flex-1 bg-slate-50 p-4 transition-colors sm:p-6 lg:p-8 dark:bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
