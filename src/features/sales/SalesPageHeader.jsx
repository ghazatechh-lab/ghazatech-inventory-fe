import React from "react";
import { PageHeader as SharedPageHeader } from "@/components/common/PageHeader";
import { useSalesBranchScope } from "./useSalesBranchScope";

export function SalesSourceBranchFilter() {
  const { isCombinedBranch, sourceBranch, setSourceBranch } = useSalesBranchScope();
  if (!isCombinedBranch) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Source branch
      </span>
      {[["ALL", "All"], ["BR01", "Branch 1"], ["BR02", "Branch 2"]].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setSourceBranch(value)}
          className={[
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
            sourceBranch === value
              ? "border-blue-600 bg-blue-600 text-white"
              : "bg-background hover:bg-muted",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
      <span className="ml-auto text-xs text-muted-foreground">
        Branch 3 combines Branch 1 and Branch 2; it never owns sales data.
      </span>
    </div>
  );
}

export function SourceBranchBadge({ row }) {
  const code = row?.source_branch_code || row?.branch?.branch_code || row?.branch_code || "";
  const label = code === "BR01" ? "Branch 1" : code === "BR02" ? "Branch 2" : (row?.branch_name || row?.branch?.branch_name || code || "—");
  return (
    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-semibold">
      {label}
    </span>
  );
}

export function PageHeader({ showSourceFilter = false, ...props }) {
  return (
    <div className="space-y-3">
      <SharedPageHeader {...props} />
      {showSourceFilter ? <SalesSourceBranchFilter /> : null}
    </div>
  );
}

export default PageHeader;
