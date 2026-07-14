import React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)} data-testid="page-header">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
