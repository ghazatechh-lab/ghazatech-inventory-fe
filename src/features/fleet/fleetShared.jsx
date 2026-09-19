import React from "react";
import { Link } from "react-router-dom";
import { CarFront, Gauge, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";

export const rowsFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/10";

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";

export const getEmployeeName = (row) =>
  row.full_name ||
  row.display_name ||
  row.employee_name ||
  `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
  row.employee_code ||
  "Employee";

export function FleetHero({ eyebrow, title, description, actions }) {
  return (
    <PageHeader
      title={title}
      subtitle={description}
      eyebrow={eyebrow || "Fleet Management"}
      actions={actions}
    />
  );
}

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "blue",
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    green:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] || tones.blue}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export function EmptyState({
  title = "No records found",
  description = "Records will appear here when they are available.",
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <CarFront className="h-10 w-10 text-slate-300" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function VehicleIdentity({ row }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
        <CarFront className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold">
          {row.display_name || `${row.make || ""} ${row.model || ""}`.trim()}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.registration_number || "—"}
        </div>
      </div>
    </div>
  );
}

export function FleetQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        asChild
        variant="outline"
        className="border-amber-300 bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
      >
        <Link to="/fleet/vehicles">
          <CarFront className="mr-2 h-4 w-4" />
          Vehicles
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="border-amber-300 bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
      >
        <Link to="/fleet/trips">
          <MapPin className="mr-2 h-4 w-4" />
          Trip Logs
        </Link>
      </Button>
      <Button asChild>
        <Link to="/fleet/checkout">
          <Gauge className="mr-2 h-4 w-4" />
          New Checkout
        </Link>
      </Button>
    </div>
  );
}
