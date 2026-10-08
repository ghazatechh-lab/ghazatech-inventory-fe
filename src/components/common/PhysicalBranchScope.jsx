import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export function usePhysicalBranchScope() {
  const active = useActiveBranchFilter();
  const [sourceBranch, setSourceBranch] = React.useState("ALL");

  const { data } = useQuery({
    queryKey: ["physical-branch-scope-options"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    staleTime: 60_000,
  });

  const branches = React.useMemo(() => normalizeList(data), [data]);
  const activeBranch = React.useMemo(
    () => branches.find((item) => String(item.id) === String(active.branchId)) || null,
    [branches, active.branchId],
  );
  const physicalBranches = React.useMemo(
    () => branches.filter((item) => ["BR01", "BR02"].includes(String(item.branch_code || "").toUpperCase())),
    [branches],
  );
  const isCombined = String(activeBranch?.branch_code || "").toUpperCase() === "BR03";

  React.useEffect(() => {
    setSourceBranch("ALL");
  }, [active.branchId]);

  const listParams = React.useMemo(
    () => ({
      ...active.branchParams,
      ...(isCombined ? { source_branch: sourceBranch } : {}),
    }),
    [active.branchParams, isCombined, sourceBranch],
  );

  return {
    ...active,
    activeBranch,
    physicalBranches,
    isCombined,
    sourceBranch,
    setSourceBranch,
    listParams,
  };
}

export function BranchSourceFilter({ scope, className = "" }) {
  if (!scope?.isCombined) return null;
  const options = [
    ["ALL", "All"],
    ["BR01", "Branch 1"],
    ["BR02", "Branch 2"],
  ];
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" /> Source
      </span>
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => scope.setSourceBranch(value)}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
            scope.sourceBranch === value
              ? "border-blue-600 bg-blue-600 text-white"
              : "bg-background hover:bg-muted",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PhysicalBranchField({ scope, value, onChange, label = "Branch", disabled = false }) {
  React.useEffect(() => {
    if (!scope?.isCombined && scope?.branchId && String(value || "") !== String(scope.branchId)) {
      onChange?.(String(scope.branchId));
    }
  }, [scope?.isCombined, scope?.branchId, value, onChange]);

  if (!scope?.isCombined) {
    return (
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {scope?.activeBranch?.branch_name || scope?.activeBranch?.branch_code || "Current branch"}
        </div>
      </div>
    );
  }

  return (
    <label className="block text-sm font-medium">
      {label} <span className="text-red-500">*</span>
      <select
        className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm"
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">Select Branch 1 or Branch 2</option>
        {scope.physicalBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.branch_code === "BR01" ? "Branch 1" : "Branch 2"} — {branch.branch_name}
          </option>
        ))}
      </select>
    </label>
  );
}
