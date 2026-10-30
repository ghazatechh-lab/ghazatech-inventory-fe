import React from "react";
import { PageHeader as SharedPageHeader } from "@/components/common/PageHeader";
import { usePurchaseBranchScope } from "./usePurchaseBranchScope";

export function PurchaseSourceBranchFilter() {
  const { isCombinedBranch, physicalBranches, sourceBranch, setSourceBranch } =
    usePurchaseBranchScope();
  if (!isCombinedBranch) return null;
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
    <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source branch</span>
    {[{ value: "ALL", label: "All branches" }, ...physicalBranches.map(b => ({
      value: b.branch_code.toUpperCase(), label: `${b.branch_code} — ${b.branch_name || b.name}`,
    }))].map(({value, label}) => <button key={value} type="button"
      onClick={() => setSourceBranch(value)}
      className={["rounded-lg border px-3 py-1.5 text-sm font-medium transition",
        sourceBranch === value ? "border-blue-600 bg-blue-600 text-white" : "bg-background hover:bg-muted"].join(" ")}>
      {label}
    </button>)}
    <span className="ml-auto text-xs text-muted-foreground">
      Consolidated combines suppliers across all physical branches.
    </span>
  </div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Purchase Management",
  icon,
  showSourceFilter = false,
}) {
  return (
    <div className="space-y-3">
      <SharedPageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        eyebrow={eyebrow}
        icon={icon}
      />
      {showSourceFilter ? <PurchaseSourceBranchFilter /> : null}
    </div>
  );
}

export default PageHeader;
