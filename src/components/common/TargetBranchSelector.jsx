import React from "react";
import { AlertCircle, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import {
  getAllowedTargets,
  getBranchOperatingMode,
  targetBranchLabel,
} from "@/lib/threeBranchFlow";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export function TargetBranchSelector({
  branch,
  branchId,
  value,
  onChange,
  disabled = false,
  inherited = false,
}) {
  const requestedBranchId = branch?.id || branchId || null;

  const { data } = useQuery({
    queryKey: ["target-branch-selector-options"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    staleTime: 60_000,
  });

  const branches = React.useMemo(() => normalizeList(data), [data]);

  const resolvedBranch = React.useMemo(() => {
    if (branch) return branch;
    if (!requestedBranchId) return null;
    return (
      branches.find((item) => String(item.id) === String(requestedBranchId)) ||
      null
    );
  }, [branch, branches, requestedBranchId]);

  const allowed = getAllowedTargets(resolvedBranch);
  const operatingMode = getBranchOperatingMode(resolvedBranch);
  const requiresChoice = operatingMode === "COMBINED";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active Interface
          </p>
          <p className="mt-1 font-semibold">
            {resolvedBranch?.branch_name ||
              resolvedBranch?.name ||
              (requestedBranchId ? `Branch #${requestedBranchId}` : "Select branch")}
          </p>

          {requiresChoice ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Combined Branch does not own inventory or transactions.
            </p>
          ) : null}
        </div>

        <div className="min-w-[270px]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {inherited ? "Source Branch" : "Target Branch"}
          </p>

          {requiresChoice && !inherited ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {allowed.map((target) => (
                <button
                  key={target}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange?.(target)}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                    value === target
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "bg-background hover:bg-muted",
                    disabled ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  <Database className="h-4 w-4" />
                  {targetBranchLabel(target)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 font-semibold">
              {targetBranchLabel(value || allowed[0])}
            </p>
          )}
        </div>
      </div>

      {requiresChoice && !inherited && !value ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4" />
          Select the data-owning branch before loading products or saving.
        </div>
      ) : null}
    </div>
  );
}

export default TargetBranchSelector;
