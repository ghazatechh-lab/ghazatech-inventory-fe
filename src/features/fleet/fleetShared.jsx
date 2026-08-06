import React from "react";
import { Link } from "react-router-dom";
import { CarFront, Gauge, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-cyan-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] !text-cyan-200">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight !text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 !text-slate-200 sm:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
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
        className="border-white/70 bg-white/10 !text-white hover:bg-white/20 hover:!text-white"
      >
        <Link to="/fleet/vehicles">
          <CarFront className="mr-2 h-4 w-4" />
          Vehicles
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="border-white/70 bg-white/10 !text-white hover:bg-white/20 hover:!text-white"
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
