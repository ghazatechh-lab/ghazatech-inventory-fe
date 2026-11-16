import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import api, { unwrap, getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const rowsOf = (value) => Array.isArray(value) ? value : (value?.results || value?.data?.results || []);

/** Branch-scoped rack picker with immediate auto-selection when only one rack exists. */
export function RackPicker({ branchId, value, onChange, title = "Rack *", disabled = false, allocations = [], onCreated }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [rackCode, setRackCode] = React.useState("");
  const [rackName, setRackName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ["rack-picker-options", String(branchId || "")],
    enabled: Boolean(branchId),
    queryFn: async () => unwrap(await api.get("/racks/", { params: { branch: branchId, is_active: true, page_size: 500 } })),
  });
  const racks = React.useMemo(
    () => rowsOf(data).filter(
      (r) => String(r.branch_id ?? r.branch?.id ?? r.branch) === String(branchId)
    ),
    [data, branchId]
  );
  React.useEffect(() => {
    if (!value && !isFetching && branchId && racks.length === 1) {
      onChange(String(racks[0].id));
    }
  }, [value, isFetching, branchId, racks, onChange]);
  async function createRack() {
    if (!rackCode.trim() || !branchId) { toast.error("Enter a rack code and select a physical branch."); return; }
    setSaving(true);
    try {
      const created = unwrap(await api.post("/racks/", {
        branch: Number(branchId), rack_code: rackCode.trim(), rack_name: rackName.trim(), is_active: true,
      }));
      await qc.invalidateQueries({ queryKey: ["rack-picker-options", String(branchId)] });
      await qc.invalidateQueries({ queryKey: ["racks"] });
      onChange(String(created.id));
      onCreated?.(created);
      setShowCreate(false); setRackCode(""); setRackName("");
      toast.success("Rack created and selected.");
    } catch (e) { toast.error(getApiErrorMessage(e, "Unable to create rack.")); }
    finally { setSaving(false); }
  }
  return <div className="min-w-0 space-y-2">
    <div className="flex min-h-7 items-center justify-between gap-2">
      <Label>{title}</Label>
      <Button type="button" size="sm" variant="ghost" disabled={!branchId || disabled}
        onClick={() => setShowCreate((v) => !v)} className="h-7 shrink-0 px-2 text-xs text-blue-600">
        <Plus className="mr-1 h-3.5 w-3.5"/> New Rack
      </Button>
    </div>
    <Select value={value ? String(value) : undefined} disabled={!branchId || disabled || isFetching}
      onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full"><SelectValue placeholder={isFetching ? "Loading racks..." : "Select rack"}/></SelectTrigger>
      <SelectContent>{racks.map(r => {
        const allocated = allocations.find(a => String(a.id ?? a.rack_id) === String(r.id));
        return <SelectItem key={r.id} value={String(r.id)}>
          {r.rack_code}{r.rack_name ? ` — ${r.rack_name}` : ""}
          {allocated ? ` (${allocated.quantity} in rack)` : ""}
        </SelectItem>;
      })}</SelectContent>
    </Select>
    {racks.length === 1 && <p className="text-xs text-muted-foreground">Only rack available; selected automatically.</p>}
    {showCreate && <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
      <Input className="h-10" value={rackCode} placeholder="Rack code *" onChange={e => setRackCode(e.target.value)}/>
      <Input className="h-10" value={rackName} placeholder="Rack name (optional)" onChange={e => setRackName(e.target.value)}/>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" type="button" disabled={saving} onClick={createRack}>{saving ? "Saving..." : "Create & Select"}</Button>
        <Button size="sm" type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
      </div>
    </div>}
  </div>;
}
