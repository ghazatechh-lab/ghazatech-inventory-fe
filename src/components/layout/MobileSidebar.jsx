import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

export function MobileSidebar({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 border-r border-white/5 w-[264px] bg-[#05070A]">
        <Sidebar collapsed={false} onToggle={() => {}} />
      </SheetContent>
    </Sheet>
  );
}
