import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
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
const rows = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.results)
      ? v.results
      : Array.isArray(v?.data?.results)
        ? v.data.results
        : Array.isArray(v?.data)
          ? v.data
          : [];
export default function StockReclassificationPage() {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    product: "",
    variant: "",
    branch: "",
    warehouse: "",
    source_classification: "REGULAR",
    destination_classification: "RESTRICTED",
    quantity: 1,
    reason: "",
  });
  const { data: products = [] } = useQuery({
    queryKey: ["reclass-products"],
    queryFn: async () =>
      rows(unwrap(await api.get("/products/", { params: { page_size: 500 } }))),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["reclass-branches"],
    queryFn: async () =>
      rows(unwrap(await api.get("/branches/", { params: { page_size: 500 } }))),
  });
  const selected = products.find((p) => String(p.id) === String(form.product));
  const variants = (selected?.variants || []).filter(
    (v) => v.is_active !== false,
  );
  const save = useMutation({
    mutationFn: () =>
      api.post("/inventory/stock-reclassifications/", {
        ...form,
        product: Number(form.product),
        variant: form.variant ? Number(form.variant) : null,
        branch: Number(form.branch),
        warehouse: form.warehouse ? Number(form.warehouse) : null,
        quantity: Number(form.quantity),
      }),
    onSuccess: async () => {
      toast.success("Reclassification request created.");
      await qc.invalidateQueries({ queryKey: ["stock-reclassifications"] });
      setForm((f) => ({ ...f, quantity: 1, reason: "" }));
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to create request", {
        description: d.summary || d.message,
      });
    },
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Reclassification"
        subtitle="Controlled movement between regular and restricted stock"
      />
      <section className="card-surface grid gap-4 p-5 md:grid-cols-2">
        <div>
          <Label>Product *</Label>
          <Select
            value={form.product}
            onValueChange={(v) => {
              update("product", v);
              update("variant", "");
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Variant</Label>
          <Select
            value={form.variant || "__base__"}
            onValueChange={(v) => update("variant", v === "__base__" ? "" : v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__base__">Base product</SelectItem>
              {variants.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.display_name || v.sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Branch *</Label>
          <Select
            value={form.branch}
            onValueChange={(v) => update("branch", v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.branch_name || b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantity *</Label>
          <Input
            className="mt-2"
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
        </div>
        <div>
          <Label>Source</Label>
          <Select
            value={form.source_classification}
            onValueChange={(v) => {
              update("source_classification", v);
              update(
                "destination_classification",
                v === "REGULAR" ? "RESTRICTED" : "REGULAR",
              );
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REGULAR">Regular Stock</SelectItem>
              <SelectItem value="RESTRICTED">Restricted Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Destination</Label>
          <Input
            className="mt-2"
            value={form.destination_classification}
            disabled
          />
        </div>
        <div className="md:col-span-2">
          <Label>Reason *</Label>
          <Textarea
            className="mt-2"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
            rows={4}
          />
        </div>
      </section>
      <div className="flex justify-end">
        <Button
          onClick={() => save.mutate()}
          disabled={
            save.isPending || !form.product || !form.branch || !form.reason
          }
        >
          {save.isPending ? "Submitting..." : "Submit for Approval"}
        </Button>
      </div>
    </div>
  );
}
