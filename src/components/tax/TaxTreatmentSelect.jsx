import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TAX_TREATMENTS = [
  ["STANDARD_VAT", "Standard VAT"],
  ["ZERO_RATED", "Zero-rated"],
  ["EXEMPT", "VAT exempt"],
  ["NON_TAXABLE", "Non-taxable"],
];

export function TaxTreatmentSelect({
  value,
  onChange,
  taxRate = 5,
  onTaxRateChange,
  reason = "",
  onReasonChange,
  disabled = false,
}) {
  const nonStandard = value && value !== "STANDARD_VAT";
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <Label>Tax Treatment</Label>
        <Select
          value={value || "STANDARD_VAT"}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAX_TREATMENTS.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tax Rate %</Label>
        <Input
          className="mt-2"
          type="number"
          min="0"
          step="0.01"
          value={value === "STANDARD_VAT" ? taxRate : 0}
          disabled={value !== "STANDARD_VAT" || disabled}
          onChange={(e) => onTaxRateChange?.(e.target.value)}
        />
      </div>
      <div>
        <Label>Reason / Reference {nonStandard ? "*" : ""}</Label>
        <Input
          className="mt-2"
          value={reason}
          disabled={disabled}
          onChange={(e) => onReasonChange?.(e.target.value)}
          placeholder="Legal reason or supporting reference"
        />
      </div>
    </div>
  );
}
