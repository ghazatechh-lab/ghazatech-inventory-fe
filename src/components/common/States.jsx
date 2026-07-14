import React from "react";
import { Loader2, Inbox, ShieldAlert, AlertTriangle } from "lucide-react";

export function LoadingState({ label = "Loading…", rows = 6 }) {
  return (
    <div className="space-y-2" data-testid="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
      ))}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs pt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {label}
      </div>
    </div>
  );
}

export function EmptyState({ title = "No records yet", description = "There is nothing to show here.", icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
      <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <div className="text-sm font-medium text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1 max-w-sm">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center" data-testid="error-state">
      <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
      <div className="text-sm font-medium text-slate-200">Something went wrong</div>
      <div className="text-xs text-slate-500 mt-1 max-w-sm">{error?.message || "Please try again."}</div>
    </div>
  );
}

export function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="permission-denied">
      <ShieldAlert className="w-9 h-9 text-red-400 mb-2" />
      <div className="text-base font-semibold text-slate-100">Permission denied</div>
      <div className="text-xs text-slate-500 mt-1 max-w-sm">You do not have permission to access this page.</div>
    </div>
  );
}
