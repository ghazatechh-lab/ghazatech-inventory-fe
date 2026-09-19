import React from "react";
import {
  BadgeDollarSign,
  Banknote,
  ClipboardCheck,
  FileText,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Truck,
  WalletCards,
} from "lucide-react";

const resolveHeaderIcon = (title = "", subtitle = "") => {
  const value = `${title} ${subtitle}`.toLowerCase();

  if (value.includes("goods received") || value.includes("grn"))
    return ClipboardCheck;
  if (value.includes("purchase order")) return ShoppingCart;
  if (value.includes("supplier bill")) return ReceiptText;
  if (value.includes("supplier payment") || value.includes("payment"))
    return Banknote;
  if (value.includes("supplier return") || value.includes("return"))
    return RotateCcw;
  if (value.includes("expense")) return WalletCards;
  if (value.includes("credit")) return BadgeDollarSign;
  if (value.includes("shipment")) return Truck;
  if (value.includes("document")) return FileText;

  return PackageCheck;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Purchase Management",
  icon,
}) {
  const Icon = icon || resolveHeaderIcon(title, subtitle);

  return (
    <>
      <style>{`
        /* Force every action in the purchase header to use black text.
           WebKit text-fill is included because some app/global styles can
           visually keep text white even after the normal color is overridden. */
        .purchase-header-actions,
        .purchase-header-actions *,
        .purchase-header-actions *::before,
        .purchase-header-actions *::after {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .purchase-header-actions button,
        .purchase-header-actions a {
          background: #fbbf24 !important;
          background-color: #fbbf24 !important;
          border-color: #fcd34d !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 700 !important;
        }

        .purchase-header-actions button:hover,
        .purchase-header-actions a:hover {
          background: #fcd34d !important;
          background-color: #fcd34d !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .purchase-header-actions svg,
        .purchase-header-actions svg * {
          color: #020617 !important;
          stroke: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }
      `}</style>

      <section className="relative w-full overflow-hidden rounded-[28px] border border-blue-400/10 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] text-white shadow-xl shadow-slate-950/10 print:overflow-visible print:rounded-none print:border-0 print:bg-none print:bg-white print:text-slate-950 print:shadow-none">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_42%,rgba(90,178,225,0.28),transparent_30%),linear-gradient(90deg,rgba(2,18,37,0.28),transparent_55%)] print:hidden" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl print:hidden" />

        <div className="relative z-10 flex min-h-[168px] flex-col gap-6 px-6 py-7 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8 print:block print:min-h-0 print:p-0">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-300 shadow-inner backdrop-blur print:hidden">
              <Icon className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-300 print:text-slate-500">
                {eyebrow}
              </p>

              <h1 className="mt-1.5 break-words text-3xl font-extrabold tracking-tight text-white sm:text-[40px] sm:leading-[1.05] print:text-slate-950">
                {title}
              </h1>

              {subtitle ? (
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-200 print:text-slate-600">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="purchase-header-actions flex shrink-0 flex-wrap gap-2 lg:justify-end print:hidden">
              {actions}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default PageHeader;
