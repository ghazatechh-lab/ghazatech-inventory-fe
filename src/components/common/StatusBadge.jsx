import React from "react";
import { cn } from "@/lib/utils";

const styles = {
  ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  received: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  converted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  confirmed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",

  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  draft: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  partial: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  in_transit: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  dispatched: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  sent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  picked: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  out_for_delivery: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  late: "text-amber-400 bg-amber-500/10 border-amber-500/20",

  danger: "text-red-400 bg-red-500/10 border-red-500/20",
  out: "text-red-400 bg-red-500/10 border-red-500/20",
  overdue: "text-red-400 bg-red-500/10 border-red-500/20",
  unpaid: "text-red-400 bg-red-500/10 border-red-500/20",
  rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
  expired: "text-red-400 bg-red-500/10 border-red-500/20",
  absent: "text-red-400 bg-red-500/10 border-red-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",

  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  present: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  leave: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  hrms: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  closed: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const dotColor = {
  emerald: "bg-emerald-400", amber: "bg-amber-400", red: "bg-red-400", blue: "bg-blue-400", violet: "bg-violet-400", slate: "bg-slate-400",
};

function pickDot(cls) {
  if (cls.includes("emerald")) return dotColor.emerald;
  if (cls.includes("amber")) return dotColor.amber;
  if (cls.includes("red")) return dotColor.red;
  if (cls.includes("violet")) return dotColor.violet;
  if (cls.includes("blue")) return dotColor.blue;
  return dotColor.slate;
}

export function StatusBadge({ status, label, className }) {
  const key = (status || "").toString().toLowerCase();
  const c = styles[key] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
  const dot = pickDot(c);
  const text = (label || status || "").toString().replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border capitalize", c, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {text}
    </span>
  );
}
