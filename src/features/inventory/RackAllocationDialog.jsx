import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const rowsFrom = (v) => Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [];
const bodyFrom = (v) => v?.data?.data ?? v?.data ?? v;

export default function RackAllocationDialog({ target, onClose }) {
  const [allocations, setAllocations] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const queryClient = useQueryClient();
  const params = target ? {
    branch_code: target.branchCode, sku: target.sku, stock_id: target.stockId,
  } : {};
  const { data, isLoading, error } = useQuery({
    queryKey: ["rack-allocations", target?.branchCode, target?.stockId, target?.sku],
    enabled: Boolean(target?.branchCode && target?.stockId && target?.sku),
    queryFn: async () => bodyFrom(await api.get("/rack-allocations/for-stock/", { params })),
  });
  const { data: racks = [] } = useQuery({
    queryKey: ["rack-allocation-racks", target?.branchCode],
    enabled: Boolean(target?.branchCode),
    queryFn: async () => rowsFrom(unwrap(await api.get("/racks/"))),
  });
  React.useEffect(() => {
    if (target && data) setAllocations(data.allocations || []);
  }, [target, data]);
  const selected = new Set(allocations.map((a) => a.rack_code));
  const total = allocations.reduce((sum, a) => sum + Number(a.quantity || 0), 0);
  const physical = Number(data?.physical_quantity || 0);
  const update = (code, quantity) => setAllocations((prev) => prev.map((a) =>
    a.rack_code === code ? { ...a, quantity } : a
  ));
  const save = async () => {
    if (allocations.some((a) => !Number.isInteger(Number(a.quantity)) || Number(a.quantity) < 0) || total > physical) {
      toast.error("Rack quantities must be whole numbers and cannot exceed physical stock.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/rack-allocations/for-stock/", {
        allocations: allocations.map((a) => ({ rack_code: a.rack_code, quantity: Number(a.quantity) })),
      }, { params });
      await queryClient.invalidateQueries({ queryKey: ["rack-allocations"] });
      toast.success("Rack quantities saved. Total stock was not changed.");
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.allocations;
      toast.error(typeof detail === "string" ? detail : "Unable to save rack quantities. Check access and branch mapping.");
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rack stock allocation</DialogTitle>
          <DialogDescription>{target?.title} — allocate existing units without increasing total stock.</DialogDescription>
        </DialogHeader>
        {isLoading ? <p>Loading rack quantities…</p> : error ? (
          <p className="text-sm text-red-600">Unable to load physical stock allocation.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm dark:border-white/20">
              Physical stock: <strong>{physical}</strong> · Assigned: <strong>{total}</strong> · Unassigned: <strong>{physical - total}</strong>
            </div>
            <div className="grid gap-2">
              {allocations.map((entry) => (
                <div key={entry.rack_code} className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
                  <label className="truncate text-sm" title={entry.rack_code}>{entry.rack_name || entry.rack_code}</label>
                  <input aria-label={`${entry.rack_code} quantity`} type="number" min="0" step="1" value={entry.quantity} onChange={(e) => update(entry.rack_code, e.target.value)} className="w-full rounded-md border bg-background px-2 py-2" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAllocations((prev) => prev.filter((a) => a.rack_code !== entry.rack_code))}>Remove</Button>
                </div>
              ))}
            </div>
            <select aria-label="Add rack" className="w-full rounded-md border bg-background p-2" value="" onChange={(e) => {
              const rack = racks.find((r) => r.rack_code === e.target.value && !selected.has(r.rack_code));
              if (rack) setAllocations((prev) => [...prev, { rack_code: rack.rack_code, rack_name: rack.rack_name, quantity: 0 }]);
            }}>
              <option value="">Add another rack…</option>
              {racks.filter((rack) => !selected.has(rack.rack_code) && rack.is_active !== false && (rack.branch?.branch_code === target?.branchCode || rack.branch_code === target?.branchCode)).map((rack) => (
                <option key={rack.id} value={rack.rack_code}>{rack.rack_code} — {rack.rack_name}</option>
              ))}
            </select>
            {total > physical && <p className="text-sm text-red-600">Allocations exceed physical stock.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!data || saving || total > physical}>Save allocations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
