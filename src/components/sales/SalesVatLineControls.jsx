import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SalesVatLineControls({
  item,
  onChange,
  canManageTax,
  canManageRestricted,
  readOnly = false,
}) {
  if (!canManageTax && !canManageRestricted) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-3 dark:border-white/10 dark:bg-white/[0.025]">
      {canManageTax ? (
        <>
          <div>
            <Label className="text-xs">VAT treatment</Label>

            <Select
              value={item.tax_treatment || "STANDARD_VAT"}
              onValueChange={(value) =>
                onChange({
                  tax_treatment: value,
                  vat_percentage: value === "STANDARD_VAT" ? 5 : 0,
                  tax_rate: value === "STANDARD_VAT" ? 5 : 0,
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="STANDARD_VAT">Standard VAT (5%)</SelectItem>
                <SelectItem value="ZERO_RATED">Zero rated</SelectItem>
                <SelectItem value="EXEMPT">Exempt</SelectItem>
                <SelectItem value="OUT_OF_SCOPE">Out of scope</SelectItem>
                <SelectItem value="REVERSE_CHARGE">Reverse charge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">
              Legal reason / supporting reference
            </Label>

            <Input
              className="mt-1"
              value={item.tax_reason || ""}
              onChange={(event) =>
                onChange({
                  tax_reason: event.target.value,
                })
              }
              placeholder={
                item.tax_treatment === "STANDARD_VAT"
                  ? "Optional"
                  : "Required for non-standard VAT"
              }
              disabled={readOnly}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={Boolean(item.tax_inclusive)}
              onChange={(event) =>
                onChange({
                  tax_inclusive: event.target.checked,
                })
              }
              disabled={readOnly}
              className="h-4 w-4 rounded border-slate-300"
            />
            Unit price includes VAT
          </label>
        </>
      ) : null}

      {canManageRestricted ? (
        <div>
          <Label className="text-xs">Stock classification</Label>

          <Select
            value={item.stock_classification || "REGULAR"}
            onValueChange={(value) =>
              onChange({
                stock_classification: value,
              })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="REGULAR">Regular stock</SelectItem>
              <SelectItem value="RESTRICTED">Restricted stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
