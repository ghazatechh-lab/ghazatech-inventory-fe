import React from "react";
import { ReceiptText } from "lucide-react";

export function SalesHeroHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Sales Management",
  icon: Icon = ReceiptText,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-sm dark:border-white/10">
      <div className="flex flex-col gap-6 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              {eyebrow}
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SalesHeroHeader;
