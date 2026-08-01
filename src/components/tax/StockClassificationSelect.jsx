import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function StockClassificationSelect({
  value = "REGULAR",
  onChange,
  canUseRestricted = false,
  disabled = false,
}) {
  return (
    <div>
      <Label>Stock Classification</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="mt-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="REGULAR">Regular Stock</SelectItem>
          {canUseRestricted ? (
            <SelectItem value="RESTRICTED">Restricted Stock</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
