import React from "react";
import {
  BadgeDollarSign,
  Banknote,
  ClipboardList,
  FileText,
  ReceiptText,
  ShoppingCart,
  Truck,
} from "lucide-react";

const resolveIcon = (title = "", subtitle = "") => {
  const value = `${title} ${subtitle}`.toLowerCase();

  if (value.includes("quotation")) return ClipboardList;
  if (value.includes("sales order") || value.includes("order"))
    return ShoppingCart;
  if (value.includes("invoice")) return ReceiptText;
  if (value.includes("payment")) return Banknote;
  if (value.includes("delivery")) return Truck;
  if (value.includes("credit")) return BadgeDollarSign;
  return FileText;
};

export function SalesHeroHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Sales Management",
  icon,
}) {
  const Icon = icon || resolveIcon(title, subtitle);

  return (
    <>
      <style>{`
        .sales-hero-actions,
        .sales-hero-actions *,
        .sales-hero-actions *::before,
        .sales-hero-actions *::after {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .sales-hero-actions button,
        .sales-hero-actions a {
          background: #fbbf24 !important;
          background-color: #fbbf24 !important;
          border-color: #fcd34d !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 700 !important;
        }

        .sales-hero-actions button:hover,
        .sales-hero-actions a:hover {
          background: #fcd34d !important;
          background-color: #fcd34d !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .sales-hero-actions svg,
        .sales-hero-actions svg * {
          color: #020617 !important;
          stroke: #020617 !important;
        }
      `}</style>

      <section className="relative w-full overflow-hidden rounded-[28px] border border-blue-400/10 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] text-white shadow-xl shadow-slate-950/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_42%,rgba(90,178,225,0.28),transparent_30%),linear-gradient(90deg,rgba(2,18,37,0.28),transparent_55%)]" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />

        <div className="relative z-10 flex min-h-[168px] flex-col gap-6 px-6 py-7 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-300 shadow-inner backdrop-blur">
              <Icon className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-300">
                {eyebrow}
              </p>
              <h1
                className="mt-1.5 break-words text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-[1.05]"
                style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-200">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="sales-hero-actions flex shrink-0 flex-wrap gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default SalesHeroHeader;
