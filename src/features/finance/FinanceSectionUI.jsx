import React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Generic finance tabs component.
 *
 * Supports both:
 *   <Tabs items={[...]} />
 * and:
 *   <FinanceTabs tabs={[...]} />
 */
export function Tabs({ items = [], tabs = [], value, onChange }) {
  const options = Array.isArray(items) && items.length ? items : tabs;

  return (
    <div className="flex flex-wrap gap-6 border-b">
      {options.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange?.(tab.value)}
          className={`border-b-2 px-1 pb-3 font-medium transition-colors ${
            value === tab.value
              ? "border-amber-600 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Backward-compatible finance tabs export.
 */
export function FinanceTabs({ tabs = [], items = [], value, onChange }) {
  return <Tabs tabs={tabs} items={items} value={value} onChange={onChange} />;
}

/**
 * Shared field wrapper used by Bank, Assets, Payables, and reporting forms.
 */
export function Field({
  label,
  required = false,
  description,
  error,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <Label className="text-foreground">
          {label}
          {required ? " *" : ""}
        </Label>
      )}

      <div className={label ? "mt-2" : ""}>{children}</div>

      {description && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/**
 * Generic modal component used by existing finance pages.
 */
export function Modal({
  open,
  title,
  eyebrow,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-5xl",
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Finance modal"}
    >
      <div
        className={`mx-auto my-4 w-full ${maxWidth} overflow-hidden rounded-2xl border bg-background shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b p-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </p>
            )}

            {title && (
              <h2 className="mt-1 text-2xl font-semibold text-foreground">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {children}

        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t p-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Backward-compatible modal export.
 */
export function FinanceModal(props) {
  return <Modal {...props} />;
}

export function SectionTitle({ number, title, note }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h3 className="text-lg font-semibold text-foreground">
        {number && (
          <span className="mr-2 rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            {number}
          </span>
        )}

        {title}
      </h3>

      {note && <span className="text-sm text-muted-foreground">{note}</span>}
    </div>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label className="flex items-start justify-between gap-4 border-b py-4 last:border-0">
      <span>
        <span className="block font-medium text-foreground">{title}</span>

        {description && (
          <span className="mt-1 block text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>

      <input
        type="checkbox"
        className="mt-1 h-5 w-5"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}

/**
 * Compact statistic card used in fixed-asset, depreciation, disposal,
 * banking, and accounting summary forms.
 */
export function Stat({ label, value, hint, accent, className = "" }) {
  const accentClass =
    accent === true
      ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
      : accent === false
        ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        : "border-border bg-card text-foreground";

  return (
    <div className={`rounded-xl border p-4 ${accentClass} ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">{value ?? "—"}</p>

      {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
    </div>
  );
}

export function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
