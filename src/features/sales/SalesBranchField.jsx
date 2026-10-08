import React from "react";
import { Building2 } from "lucide-react";

import { useSalesBranchScope, saleModeForBranch } from "./useSalesBranchScope";

export function SalesBranchField({
  value,
  onChange,
  onSaleModeChange,
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
  } = useSalesBranchScope();

  React.useEffect(() => {
    if (disabled) return;

    if (isPhysicalBranch && formBranchId && String(value || "") !== String(formBranchId)) {
      onChange?.(String(formBranchId));
      onSaleModeChange?.(saleModeForBranch(activeBranch));
      return;
    }

    if (isCombinedBranch && value) {
      const selected = physicalBranches.find(
        (branch) => String(branch.id) === String(value),
      );
      if (!selected) {
        onChange?.("");
        onSaleModeChange?.("");
      } else {
        onSaleModeChange?.(saleModeForBranch(selected));
      }
    }
  }, [
    activeBranch,
    disabled,
    formBranchId,
    isCombinedBranch,
    isPhysicalBranch,
    onChange,
    onSaleModeChange,
    physicalBranches,
    value,
  ]);

  const handleChange = (next) => {
    const selected = physicalBranches.find((branch) => String(branch.id) === String(next));
    onChange?.(next);
    onSaleModeChange?.(saleModeForBranch(selected));
  };

  if (isCombinedBranch) {
    return (
      <div className={className}>
        <label className="text-sm font-medium">{label}</label>
        <select
          value={value || ""}
          onChange={(event) => handleChange(event.target.value)}
          disabled={disabled}
          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select Branch 1 or Branch 2</option>
          {physicalBranches.map((branch) => (
            <option key={branch.id} value={String(branch.id)}>
              {branch.branch_code === "BR01" ? "Branch 1" : "Branch 2"} — {branch.branch_name || branch.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Branch 3 is a combined interface and cannot own sales data.
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
            ? `${activeBranch.branch_code === "BR01" ? "Branch 1" : "Branch 2"} — ${activeBranch.branch_name || activeBranch.name}`
            : "Current physical branch"}
        </span>
      </div>
    </div>
  );
}

export default SalesBranchField;
