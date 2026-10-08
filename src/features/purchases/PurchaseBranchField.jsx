import React from "react";
import { Building2 } from "lucide-react";

import { usePurchaseBranchScope } from "./usePurchaseBranchScope";

export function PurchaseBranchField({
  value,
  onChange,
  label = "Branch *",
  disabled = false,
  className = "",
}) {
  const {
    activeBranch,
    physicalBranches,
    isCombinedBranch,
    isPhysicalBranch,
    formBranchId,
  } = usePurchaseBranchScope();

  React.useEffect(() => {
    if (disabled) return;

    if (isPhysicalBranch && formBranchId && String(value || "") !== String(formBranchId)) {
      onChange?.(String(formBranchId));
      return;
    }

    if (isCombinedBranch && value) {
      const valid = physicalBranches.some(
        (branch) => String(branch.id) === String(value),
      );
      if (!valid) onChange?.("");
    }
  }, [
    disabled,
    formBranchId,
    isCombinedBranch,
    isPhysicalBranch,
    onChange,
    physicalBranches,
    value,
  ]);

  if (isCombinedBranch) {
    return (
      <div className={className}>
        <label className="text-sm font-medium">{label}</label>
        <select
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select Branch 1 or Branch 2</option>
          {physicalBranches.map((branch) => (
            <option key={branch.id} value={String(branch.id)}>
              {branch.branch_code} — {branch.branch_name || branch.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Branch 3 is a combined interface and cannot own purchase data.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span>
          {activeBranch
            ? `${activeBranch.branch_code} — ${activeBranch.branch_name || activeBranch.name}`
            : "Current physical branch"}
        </span>
      </div>
    </div>
  );
}

export default PurchaseBranchField;
