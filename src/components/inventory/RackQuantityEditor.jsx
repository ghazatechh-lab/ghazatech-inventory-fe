import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { unwrap, getApiErrorDetails } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * A physical rack's allocation is read from the authoritative stock endpoint.
 * Changing its value uses the same audited adjustment endpoint as Stock Adjustments.
 * It never edits ProductStock or RackStockAllocation directly from the product serializer.
 */
export function RackQuantityEditor({ branchId, productId, variantId, rackId, rackLabel, onSaved }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stock-adjustment-options", String(branchId), String(productId), String(variantId || "")],
    queryFn: async () => unwrap(await api.get("/inventory/stock/adjustment-options/", {
      params: { branch: branchId, product: productId, ...(variantId ? { variant: variantId } : {}) },
    })),
    enabled: Boolean(branchId && productId && (!variantId || String(variantId) !== "undefined")),
    staleTime: 0,
  });

  const rack = (data?.racks || []).find((row) => String(row.id) === String(rackId));
  const currentQuantity = Number(rack?.quantity || 0);
  const unallocated = Number(data?.unallocated_quantity || 0);
  const hasDraft = draft !== "";
  const desired = hasDraft ? Number(draft) : currentQuantity;
  const valid = Number.isSafeInteger(desired) && desired >= 0;
  const difference = desired - currentQuantity;
  const pending = valid && difference !== 0;

  const notifyError = (error, fallback) => {
    const details = getApiErrorDetails(error);
    toast.error(details?.summary || details?.title || fallback);
  };

  const submitChange = async () => {
    if (!valid || !pending || saving) return;
    setSaving(true);
    try {
      if (!data?.stock_id) throw new Error("Stock record not available");
      await api.put("/inventory/rack-allocations/set-rack-quantity/", {
        branch: Number(branchId),
        stock_id: Number(data.stock_id),
        rack_id: Number(rackId),
        quantity: desired,
      }, { skipGlobalErrorToast: true });
      await queryClient.invalidateQueries({ queryKey: ["stock-adjustment-options", String(branchId), String(productId), String(variantId || "")] });
      setDraft("");
      setDialogOpen(false);
      toast.success(`Rack ${rackLabel} updated to ${desired} units.`);
      onSaved?.({ difference });
    } catch (error) {
      notifyError(error, "Rack quantity could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const assignExisting = async () => {
    if (!valid || difference <= 0 || difference > unallocated || !data?.stock_id || saving) return;
    setSaving(true);
    try {
      await api.post("/inventory/rack-allocations/assign-unallocated/", {
        branch: Number(branchId), stock_id: Number(data.stock_id),
        rack_id: Number(rackId), quantity: difference,
      }, { skipGlobalErrorToast: true });
      await queryClient.invalidateQueries({ queryKey: ["stock-adjustment-options", String(branchId), String(productId), String(variantId || "")] });
      setDraft("");
      toast.success(`${difference} existing units assigned to ${rackLabel}. Total stock unchanged.`);
      onSaved?.({ difference: 0 });
    } catch (error) {
      notifyError(error, "Could not allocate existing stock to this rack.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <Input
          type="number" min="0" step="1" inputMode="numeric"
          aria-label={`Quantity in ${rackLabel}`}
          className="h-10 w-full min-w-0 text-right tabular-nums"
          disabled={isLoading || isError || saving}
          value={isLoading ? "" : hasDraft ? draft : String(currentQuantity)}
          placeholder={isLoading ? "Loading" : "0"}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="button" size="sm" variant="outline" className="h-10 shrink-0"
          disabled={isLoading || isError || saving || !pending}
          onClick={() => setDialogOpen(true)}>
          Update
        </Button>
      </div>
      {isError ? (
        <button type="button" className="text-xs text-red-600 underline" onClick={() => refetch()}>
          Could not load rack quantity · Retry
        </button>
      ) : !valid ? (
        <p className="text-xs text-red-600">Enter a whole number of zero or more.</p>
      ) : unallocated > 0 ? (
        <div className="text-[11px] leading-4 text-amber-700 dark:text-amber-400">
          {unallocated} unit(s) are not assigned to racks.
          {difference > 0 && difference <= unallocated ? (
            <button type="button" disabled={saving}
              className="ml-1 font-semibold underline disabled:opacity-50"
              onClick={assignExisting}>Assign {difference} existing</button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm rack allocation</DialogTitle>
            <DialogDescription>
              This changes the location allocation only. Physical stock and accounting totals will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <p className="font-semibold">{rackLabel}</p>
            <div className="flex justify-between"><span>Current rack quantity</span><strong>{currentQuantity}</strong></div>
            <div className="flex justify-between"><span>New rack quantity</span><strong>{desired}</strong></div>
            <div className="flex justify-between border-t pt-2"><span>Physical stock change</span><strong>0</strong></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!valid || !pending || saving} onClick={submitChange}>
              {saving ? "Updating..." : "Update allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
