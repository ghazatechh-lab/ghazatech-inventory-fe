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
export default function ShipmentFormPage() {
  const { id } = useParams(),
    edit = Boolean(id),
    nav = useNavigate(),
    qc = useQueryClient();
  const [form, setForm] = React.useState({
    shipment_type: "PURCHASE",
    purchase_order: "",
    supplier: "",
    branch: "",
    shipment_date: today(),
    shipment_method: "Purchase freight",
    courier: "",
    tracking_number: "",
    expected_date: "",
    received_date: "",
    status: "PENDING",
    notes: "",
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
    queryKey: ["shipment", id],
    queryFn: async () => unwrap(await api.get(`/shipments/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });
  React.useEffect(() => {
    if (existing)
      setForm({
        ...existing,
        purchase_order: String(
          existing.purchase_order?.id || existing.purchase_order || "",
        ),
        supplier: String(existing.supplier?.id || existing.supplier || ""),
        branch: String(existing.branch?.id || existing.branch || ""),
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
        expected_quantity: Number(x.quantity || 0),
        received_quantity: 0,
        accepted_quantity: 0,
        rejected_quantity: 0,
        unit_cost: Number(x.unit_price || 0),
        condition: "GOOD",
        batch_number: "",
        serial_number: "",
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
          expected_quantity: Number(x.expected_quantity),
          received_quantity: Number(x.received_quantity),
          accepted_quantity: Number(x.accepted_quantity),
          rejected_quantity: Number(x.rejected_quantity),
          unit_cost: Number(x.unit_cost),
        })),
      };
      return edit
        ? api.patch(`/shipments/${id}/`, body)
        : api.post("/shipments/", body);
    },
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["shipments"] });
      toast.success(edit ? "Shipment updated." : "Shipment logged.");
      nav(`/shipments/${unwrap(r)?.id || id || ""}`);
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title={edit ? "Edit Purchase Shipment" : "New Purchase Shipment"}
        subtitle="Record courier, tracking, expected date and products received against a purchase order"
      />
      <div className="card-surface grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <Label>Purchase order *</Label>
          <Select value={form.purchase_order} onValueChange={selectPO}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select purchase order" />
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
          <Label>Shipment date</Label>
          <Input
            type="date"
            className="mt-2"
            value={form.shipment_date || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, shipment_date: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Expected date</Label>
          <Input
            type="date"
            className="mt-2"
            value={form.expected_date || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, expected_date: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Shipment method</Label>
          <Input
            className="mt-2"
            value={form.shipment_method || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, shipment_method: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Courier</Label>
          <Input
            className="mt-2"
            value={form.courier || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, courier: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Tracking number</Label>
          <Input
            className="mt-2"
            value={form.tracking_number || ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, tracking_number: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "PENDING",
                "IN_TRANSIT",
                "RECEIVED",
                "COMPLETED",
                "CANCELLED",
              ].map((x) => (
                <SelectItem key={x} value={x}>
                  {x.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="card-surface overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Received products</h2>
          <p className="text-xs text-muted-foreground">
            Expected, received, accepted, rejected, condition, batch and serial
            details.
          </p>
        </div>
        <div className="space-y-3 p-4">
          {form.items.map((x, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border p-3 xl:grid-cols-[2fr_repeat(4,100px)_140px_140px]"
            >
              <div>
                <p className="font-medium">
                  {x.product_name || x.sku || `Product ${x.product}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expected: {x.expected_quantity}
                </p>
              </div>
              <div>
                <Label>Received</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={x.received_quantity}
                  onChange={(e) => {
                    const r = Number(e.target.value || 0);
                    update(i, {
                      received_quantity: r,
                      accepted_quantity: r,
                      rejected_quantity: 0,
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
                <Label>Rejected</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={x.rejected_quantity}
                  onChange={(e) =>
                    update(i, { rejected_quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Unit cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-2"
                  value={x.unit_cost}
                  onChange={(e) => update(i, { unit_cost: e.target.value })}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Select
                  value={x.condition}
                  onValueChange={(v) => update(i, { condition: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Batch / Serial</Label>
                <Input
                  className="mt-2"
                  value={x.batch_number || x.serial_number || ""}
                  onChange={(e) => update(i, { batch_number: e.target.value })}
                />
              </div>
            </div>
          ))}
          {!form.items.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a purchase order to load expected products.
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
        <Button variant="ghost" onClick={() => nav("/shipments")}>
          Cancel
        </Button>
        <Button
          disabled={save.isPending || !form.purchase_order}
          onClick={() => save.mutate()}
        >
          {save.isPending
            ? "Saving..."
            : edit
              ? "Save changes"
              : "Log shipment"}
        </Button>
      </div>
    </div>
  );
}
