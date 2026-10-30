import React from "react";
import { Building2 } from "lucide-react";
import { usePurchaseBranchScope } from "./usePurchaseBranchScope";

export function PurchaseBranchField({
  value, onChange, label = "Branch *", disabled = false,
  locked = false, className = "",
}) {
  const { activeBranch, physicalBranches, isCombinedBranch, isPhysicalBranch,
    formBranchId, branchesLoading } = usePurchaseBranchScope();
  const selected = physicalBranches.find(b => String(b.id) === String(value || ""));
  const readonly = locked || isPhysicalBranch;
  React.useEffect(() => {
    if (disabled || locked) return;
    if (isPhysicalBranch && formBranchId && String(value || "") !== formBranchId) {
      onChange?.(formBranchId);
    } else if (isCombinedBranch && value && !selected && !branchesLoading) {
      onChange?.("");
    }
  }, [disabled, locked, isPhysicalBranch, isCombinedBranch, formBranchId,
    value, selected, branchesLoading, onChange]);
  const display = selected || (isPhysicalBranch ? activeBranch : null);
  return <div className={className}>
    <label className="text-sm font-medium">{label}</label>
    {readonly ? (
      <div className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span>{display ? `${display.branch_code} — ${display.branch_name || display.name}` :
          branchesLoading ? "Loading branch…" : "Branch not found"}</span>
      </div>
    ) : <select value={value || ""} onChange={e => onChange?.(e.target.value)}
      disabled={disabled || branchesLoading}
      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
      <option value="">{branchesLoading ? "Loading branches…" : "Select physical branch"}</option>
      {physicalBranches.map(b => <option key={b.id} value={String(b.id)}>
        {b.branch_code} — {b.branch_name || b.name} ({b.tax_mode === "VAT" ? "VAT" : "Non-VAT"})
      </option>)}
    </select>}
    <p className="mt-1 text-xs text-muted-foreground">
      {locked ? "Supplier ownership cannot be changed after creation." :
        isCombinedBranch ? "The supplier will be saved only in the selected branch schema." :
        "The current physical branch owns this supplier."}
    </p>
  </div>;
}
export default PurchaseBranchField;
