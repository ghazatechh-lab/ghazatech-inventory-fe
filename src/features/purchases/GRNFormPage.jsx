import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const list = (v) =>
    v?.results || v?.data?.results || (Array.isArray(v) ? v : []),
  today = () => new Date().toISOString().slice(0, 10);
export default function GRNFormPage() {
  const { id } = useParams(),
    edit = Boolean(id),
    nav = useNavigate(),
    qc = useQueryClient();
  const [form, setForm] = React.useState({
    purchase_order: "",
    supplier: "",
    branch: "",
    received_date: today(),
    warehouse_location: "",
    notes: "",
    status: "DRAFT",
    items: [],
  });
  const { data: orders } = useQuery({
    queryKey: ["po-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/orders/", { params: { page_size: 500 } }),
      ),
  });
  const { data: existing } = useQuery({
    queryKey: ["grn", id],
    queryFn: async () => unwrap(await api.get(`/purchases/grn/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });
  React.useEffect(() => {
    if (existing)
      setForm({
        ...existing,
        purchase_order: String(
          existing.purchase_order?.id || existing.purchase_order,
        ),
        supplier: String(existing.supplier?.id || existing.supplier),
        branch: String(existing.branch?.id || existing.branch),
        items: (existing.items || []).map((x) => ({
          ...x,
          product: String(x.product?.id || x.product),
          variant: x.variant ? String(x.variant?.id || x.variant) : "",
        })),
      });
  }, [existing]);
  const selectPO = (v) => {
    const po = list(orders).find((x) => String(x.id) === v);
    if (!po) return;
    setForm((s) => ({
      ...s,
      purchase_order: v,
      supplier: String(po.supplier?.id || po.supplier),
      branch: String(po.branch?.id || po.branch),
      items: (po.items || []).map((x) => ({
        product: String(x.product?.id || x.product),
        variant: x.variant ? String(x.variant?.id || x.variant) : "",
        ordered_quantity: Number(x.quantity || 0),
        received_quantity: Number(x.quantity || 0),
        damaged_quantity: 0,
        accepted_quantity: Number(x.quantity || 0),
        quality_status: "QC_PASSED",
        rack_location: "",
        remarks: "",
        product_name: x.product_name,
        sku: x.sku,
      })),
    }));
  };
  const update = (i, p) =>
    setForm((s) => ({
      ...s,
      items: s.items.map((x, n) => (n === i ? { ...x, ...p } : x)),
    }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        purchase_order: Number(form.purchase_order),
        supplier: Number(form.supplier),
        branch: Number(form.branch),
        items: form.items.map((x) => ({
          ...x,
          product: Number(x.product),
          variant: x.variant ? Number(x.variant) : null,
          ordered_quantity: Number(x.ordered_quantity),
          received_quantity: Number(x.received_quantity),
          damaged_quantity: Number(x.damaged_quantity),
          accepted_quantity: Number(x.accepted_quantity),
        })),
      };
      return edit
        ? api.patch(`/purchases/grn/${id}/`, body)
        : api.post("/purchases/grn/", body);
    },
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["grns"] });
      toast.success(edit ? "GRN updated." : "GRN created.");
      nav(`/purchases/grn/${unwrap(r)?.id || id || ""}`);
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title={edit ? "Edit GRN" : "New GRN"}
        subtitle="Confirm physical receipt, quality status, damage and accepted quantities"
      />
      <div className="card-surface grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Linked purchase order *</Label>
          <Select value={form.purchase_order} onValueChange={selectPO}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select approved purchase order" />
            </SelectTrigger>
            <SelectContent>
              {list(orders).map((x) => (
                <SelectItem key={x.id} value={String(x.id)}>
                  {x.po_number} · {x.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Received date</Label>
          <Input
            type="date"
            className="mt-2"
            value={form.received_date}
            onChange={(e) =>
              setForm((s) => ({ ...s, received_date: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Warehouse / Rack location</Label>
          <Input
            className="mt-2"
            value={form.warehouse_location || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, warehouse_location: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="card-surface overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Items received</h2>
          <p className="text-xs text-muted-foreground">
            Record received, damaged and accepted quantity for every line.
          </p>
        </div>
        <div className="space-y-3 p-4">
          {form.items.map((x, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border p-3 xl:grid-cols-[2fr_repeat(4,110px)_150px]"
            >
              <div>
                <p className="font-medium">
                  {x.product_name || x.sku || `Product ${x.product}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ordered: {x.ordered_quantity}
                </p>
              </div>
              <div>
                <Label>Received</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={x.received_quantity}
                  onChange={(e) => {
                    const received = Number(e.target.value || 0),
                      damaged = Number(x.damaged_quantity || 0);
                    update(i, {
                      received_quantity: received,
                      accepted_quantity: Math.max(0, received - damaged),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Damaged</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={x.damaged_quantity}
                  onChange={(e) => {
                    const damaged = Number(e.target.value || 0);
                    update(i, {
                      damaged_quantity: damaged,
                      accepted_quantity: Math.max(
                        0,
                        Number(x.received_quantity || 0) - damaged,
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Accepted</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={x.accepted_quantity}
                  onChange={(e) =>
                    update(i, { accepted_quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Rack</Label>
                <Input
                  className="mt-2"
                  value={x.rack_location || ""}
                  onChange={(e) => update(i, { rack_location: e.target.value })}
                />
              </div>
              <div>
                <Label>QC status</Label>
                <Select
                  value={x.quality_status}
                  onValueChange={(v) => update(i, { quality_status: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QC_PASSED">QC Passed</SelectItem>
                    <SelectItem value="PARTIAL_ACCEPT">
                      Partial Accept
                    </SelectItem>
                    <SelectItem value="QC_REJECTED">QC Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {!form.items.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a purchase order to load its products.
            </p>
          )}
        </div>
      </div>
      <div className="card-surface p-5">
        <Label>Notes</Label>
        <Textarea
          className="mt-2"
          value={form.notes || ""}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => nav("/purchases/grn")}>
          Cancel
        </Button>
        <Button
          disabled={
            save.isPending || !form.purchase_order || !form.items.length
          }
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving..." : edit ? "Save changes" : "Create GRN"}
        </Button>
      </div>
    </div>
  );
}
