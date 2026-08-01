import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function ClassifiedQuantityFields({
  regular = 0,
  restricted = 0,
  onRegularChange,
  onRestrictedChange,
  canUseRestricted = false,
  disabled = false,
}) {
  const total = Number(regular || 0) + Number(restricted || 0);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <Label>Regular Quantity</Label>
        <Input
          className="mt-2"
          type="number"
          min="0"
          value={regular}
          disabled={disabled}
          onChange={(e) => onRegularChange?.(e.target.value)}
        />
      </div>
      {canUseRestricted ? (
        <div>
          <Label>Restricted Quantity</Label>
          <Input
            className="mt-2"
            type="number"
            min="0"
            value={restricted}
            disabled={disabled}
            onChange={(e) => onRestrictedChange?.(e.target.value)}
          />
        </div>
      ) : null}
      <div>
        <Label>Total Quantity</Label>
        <Input
          className="mt-2"
          value={canUseRestricted ? total : Number(regular || 0)}
          disabled
        />
      </div>
    </div>
  );
}
