import React from "react";
import { useLocation } from "react-router-dom";
import { Boxes } from "lucide-react";

import {
  getModuleByPath,
  getNavigationItemByPath,
} from "@/config/moduleNavigation";

const moduleEyebrow = (module) => {
  if (!module) return "Ghazatech ERP";

  const labels = {
    dashboard: "Business Overview",
    inventory: "Inventory Setup",
    purchase: "Purchase Management",
    sales: "Sales Management",
    hrms: "Human Resources",
    fleet: "Fleet Management",
    reports: "Reports & Analytics",
    accounting: "Finance & Accounting",
    settings: "System Administration",
    recovery: "System Recovery",
    website: "Website Management",
  };

  return (
    labels[module.id] || module.title || module.shortTitle || "Ghazatech ERP"
  );
};

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  icon,
  className = "",
  children,
  variant = "hero",
}) {
  const location = useLocation();

  const module = React.useMemo(
    () => getModuleByPath(location.pathname),
    [location.pathname],
  );

  const navigationMatch = React.useMemo(
    () => getNavigationItemByPath(location.pathname),
    [location.pathname],
  );

  const Icon =
    icon ||
    navigationMatch?.item?.icon ||
    navigationMatch?.module?.icon ||
    module?.icon ||
    Boxes;

  const resolvedEyebrow = eyebrow || moduleEyebrow(module);

  if (variant === "plain") {
    return (
      <div
        className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${className}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {resolvedEyebrow}
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}

            {children}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      data-testid="page-header"
      className={`relative overflow-hidden rounded-3xl border border-slate-200/20 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] p-6 text-white shadow-xl sm:p-7 ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-36 w-36 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="page-header-content flex min-w-0 items-start gap-4">
          <div className="page-header-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-300 shadow-inner backdrop-blur">
            <Icon className="h-6 w-6" />
          </div>

          <div className="page-header-copy min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="page-header-eyebrow text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-200">
                {resolvedEyebrow}
              </span>
            </div>

            <h1
              className="page-header-title text-2xl font-extrabold tracking-tight !text-white sm:text-3xl"
              style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
            >
              {title}
            </h1>

            {subtitle ? (
              <p
                className="page-header-subtitle mt-2 max-w-2xl text-sm leading-6 !text-slate-100"
                style={{ color: "#f1f5f9", WebkitTextFillColor: "#f1f5f9" }}
              >
                {subtitle}
              </p>
            ) : null}

            {children}
          </div>
        </div>

        {actions ? (
          <div className="page-header-actions module-hero-actions flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PageHeader;
