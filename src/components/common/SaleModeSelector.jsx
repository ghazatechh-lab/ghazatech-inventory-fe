import React from "react";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import {
  getAllowedSaleModes,
  getBranchSalesMode,
  saleModeLabel,
} from "@/lib/threeBranchFlow";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export function SaleModeSelector({
  branch,
  branchId,
  value,
  onChange,
  disabled = false,
}) {
  const requestedBranchId = branch?.id || branchId || null;

  const { data: branchOptionsResponse } = useQuery({
    queryKey: ["sale-mode-branch-options"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    staleTime: 60_000,
  });

  const branches = React.useMemo(
    () => normalizeList(branchOptionsResponse),
    [branchOptionsResponse],
  );

  const resolvedBranch = React.useMemo(() => {
    if (branch) return branch;
    if (!requestedBranchId) return null;

    return (
      branches.find(
        (item) => String(item.id) === String(requestedBranchId),
      ) || null
    );
  }, [branch, branches, requestedBranchId]);

  const allowed = getAllowedSaleModes(resolvedBranch);
  const configuredMode = getBranchSalesMode(resolvedBranch);
  const requiresChoice = allowed.length > 1;

  React.useEffect(() => {
    if (!resolvedBranch) return;

    if (!requiresChoice && allowed[0] && value !== allowed[0]) {
      onChange?.(allowed[0]);
      return;
    }

    if (value && !allowed.includes(value)) {
      onChange?.("");
    }
  }, [allowed, onChange, requiresChoice, resolvedBranch, value]);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current Branch
          </p>
          <p className="mt-1 font-semibold">
            {resolvedBranch?.branch_name ||
              resolvedBranch?.name ||
              (requestedBranchId ? `Branch #${requestedBranchId}` : "Select branch")}
          </p>
        </div>

        <div className="min-w-[250px]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sale Mode
          </p>

          {requiresChoice ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {allowed.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange?.(mode)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                    value === mode
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "bg-background hover:bg-muted",
                    disabled ? "cursor-not-allowed opacity-60" : "",
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
