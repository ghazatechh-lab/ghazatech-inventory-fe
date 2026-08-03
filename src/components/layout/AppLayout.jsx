import React from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

const SIDEBAR_STORAGE_KEY = "ghazatech-sidebar-collapsed";

const getInitialSidebarState = () => {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export function AppLayout() {
  const [collapsed, setCollapsed] = React.useState(getInitialSidebarState);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // The layout still works when browser storage is unavailable.
      }

      return next;
    });
  }, []);

  return (
    <div
      data-sidebar-collapsed={collapsed ? "true" : "false"}
      className="grain flex h-dvh min-h-0 w-full overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-[#0A0E17] dark:text-slate-100"
    >
      {/*
        The desktop sidebar owns the full viewport height and never joins the
        page scroll. Its navigation area scrolls internally when required.
      */}
      <div className="sidebar-desktop-shell sticky top-0 hidden h-dvh min-h-0 shrink-0 self-start overflow-hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Prevent the content column from increasing the document height. */}
      <div className="app-content-shell flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[width,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <div className="relative z-20 shrink-0">
          <Header onOpenMobileSidebar={() => setMobileOpen(true)} />
        </div>

        {/* Only this section scrolls. The sidebar and header remain visible. */}
        <main className="fade-in-up min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-4 transition-colors sm:p-6 lg:p-8 dark:bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
