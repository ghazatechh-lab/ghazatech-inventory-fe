import React from "react";

import { useAuth } from "@/lib/auth";
import { canChangeActiveBranch } from "@/lib/permissions";
import { BranchSelector } from "@/components/common/BranchSelector";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className = "",
  children,
  variant = "default",
}) {
  const { user } = useAuth();
  const canSwitchBranch = canChangeActiveBranch(user);
  const isHero = variant === "hero";

  if (isHero) {
    return (
      <>
        <style>{`
          .module-hero-actions,
          .module-hero-actions *,
          .module-hero-actions *::before,
          .module-hero-actions *::after {
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
          }

          .module-hero-actions button,
          .module-hero-actions a {
            background: #fbbf24 !important;
            background-color: #fbbf24 !important;
            border-color: #fcd34d !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            font-weight: 700 !important;
          }

          .module-hero-actions button:hover,
          .module-hero-actions a:hover {
            background: #fcd34d !important;
            background-color: #fcd34d !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
          }

          .module-hero-actions svg,
          .module-hero-actions svg * {
            color: #020617 !important;
            stroke: #020617 !important;
          }
        `}</style>

        <section
          className={`relative w-full overflow-hidden rounded-[28px] border border-blue-400/10 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] text-white shadow-xl shadow-slate-950/10 ${className}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_42%,rgba(90,178,225,0.28),transparent_30%),linear-gradient(90deg,rgba(2,18,37,0.28),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />

          <div className="relative z-10 flex min-h-[168px] flex-col gap-6 px-6 py-7 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="min-w-0">
              {eyebrow ? (
                <p
                  className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em]"
                  style={{ color: "#7dd3fc", WebkitTextFillColor: "#7dd3fc" }}
                >
                  {eyebrow}
                </p>
              ) : null}

              <h1
                className="break-words text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-[1.05]"
                style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
              >
                {title}
              </h1>

              {subtitle ? (
                <p
                  className="mt-2 max-w-4xl text-sm font-medium leading-6"
                  style={{ color: "#e2e8f0", WebkitTextFillColor: "#e2e8f0" }}
                >
                  {subtitle}
                </p>
              ) : null}

              {children}
            </div>

            <div className="module-hero-actions flex shrink-0 flex-wrap items-center gap-2">
              {canSwitchBranch ? <BranchSelector /> : null}
              {actions}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <div
      className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        ) : null}

        {children}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canSwitchBranch ? <BranchSelector /> : null}
        {actions}
      </div>
    </div>
  );
}

export default PageHeader;
