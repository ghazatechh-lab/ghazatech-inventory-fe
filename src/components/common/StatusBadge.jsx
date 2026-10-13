import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  positive: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30",
  warning: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30",
  danger: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30",
  info: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30",
  neutral: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-500/10 dark:border-slate-500/30",
  violet: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-500/10 dark:border-violet-500/30",
};

const STATUS_TONE = {
  OK: "positive", SUCCESS: "positive", PAID: "positive", COMPLETED: "positive", APPROVED: "positive", ACTIVE: "positive", AVAILABLE: "positive", RECEIVED: "positive", DELIVERED: "positive", POSTED: "positive", VALID: "positive", IN_STOCK: "positive", RETURNED: "positive", CONFIRMED: "positive", CONVERTED: "positive", PRESENT: "positive", DEDUCTED: "positive",
  PENDING: "warning", DRAFT: "warning", PARTIAL: "warning", PARTIALLY_RECEIVED: "warning", PROCESSING: "warning", IN_PROGRESS: "warning", AWAITING: "warning", EXPIRING_SOON: "warning", LOW_STOCK: "warning", ON_HOLD: "warning", OUT: "warning", REQUESTED: "warning", IN_TRANSIT: "warning", DISPATCHED: "warning", SENT: "warning", PICKED: "warning", OUT_FOR_DELIVERY: "warning", LATE: "warning", SERVICE: "warning", PROBATION: "warning",
  CANCELLED: "danger", CANCELED: "danger", REJECTED: "danger", FAILED: "danger", OVERDUE: "danger", EXPIRED: "danger", UNPAID: "danger", INACTIVE: "danger", VOID: "danger", OUT_OF_STOCK: "danger", ABSENT: "danger", CRITICAL: "danger", TERMINATED: "danger", RESIGNED: "danger",
  LEAVE: "violet", ON_LEAVE: "violet", HRMS: "violet",
  INFO: "info", CLOSED: "neutral",
  RESTORED: "positive", RECONCILED: "positive", SETTLED: "positive",
  PARTIALLY_PAID: "warning", PARTIALLY_DELIVERED: "warning",
  AWAITING_APPROVAL: "warning", DIAGNOSING: "warning", REPAIRING: "warning",
  CHECKED_OUT: "warning", READY: "positive",
  SUSPENDED: "danger", DISABLED: "danger", BLOCKED: "danger",
  NOT_AVAILABLE: "danger", DELETED: "danger", EXPIRED_DOCUMENT: "danger",
  HIGH: "warning", URGENT: "danger", LOW: "neutral",
};

const DOTS = { positive: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500", info: "bg-blue-500", violet: "bg-violet-500", neutral: "bg-slate-500" };

export function formatStatusLabel(value) {
  return String(value ?? "").trim().replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ status, label, className }) {
  const key = String(status ?? "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  const tone = STATUS_TONE[key] || "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold", TONES[tone], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />
      {label ?? (formatStatusLabel(status) || "Unknown")}
    </span>
  );
}
