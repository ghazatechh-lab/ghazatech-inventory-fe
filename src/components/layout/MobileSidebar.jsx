import React from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

export function MobileSidebar({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="sidebar-mobile-sheet h-dvh max-h-dvh w-[min(88vw,320px)] overflow-hidden border-r border-white/10 bg-transparent p-0 shadow-[24px_0_60px_rgba(2,8,23,0.45)] [&>button]:hidden"
      >
        <Sidebar
          collapsed={false}
          mobile
          onToggle={() => {}}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

export default MobileSidebar;
