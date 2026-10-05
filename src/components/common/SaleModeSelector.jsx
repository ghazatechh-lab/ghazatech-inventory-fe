import React from "react";
import { AlertCircle } from "lucide-react";

import {
  getAllowedSaleModes,
  getBranchSalesMode,
  saleModeLabel,
} from "@/lib/threeBranchFlow";

export function SaleModeSelector({
  branch,
  value,
  onChange,
  disabled = false,
}) {
  const allowed = getAllowedSaleModes(branch);
  const configuredMode = getBranchSalesMode(branch);
  const requiresChoice = allowed.length > 1;

  React.useEffect(() => {
    if (!requiresChoice && allowed[0] && value !== allowed[0]) {
      onChange?.(allowed[0]);
    }
  }, [allowed, onChange, requiresChoice, value]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current Branch
          </p>
          <p className="mt-1 font-semibold">
            {branch?.branch_name || branch?.name || "Select branch"}
          </p>
        </div>

        <div className="min-w-[240px]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sale Mode
          </p>

          {requiresChoice ? (
            <div className="mt-2 flex gap-2">
              {allowed.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange?.(mode)}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-medium",
                    value === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  ].join(" ")}
                >
                  {saleModeLabel(mode)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 font-semibold">
              {saleModeLabel(allowed[0] || configuredMode)}
            </p>
          )}
        </div>
      </div>

      {requiresChoice && !value ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4" />
          Select VAT or Non-VAT before billing.
        </div>
      ) : null}
    </div>
  );
}

export default SaleModeSelector;
