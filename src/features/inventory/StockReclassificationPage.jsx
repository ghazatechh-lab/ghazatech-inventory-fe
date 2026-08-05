import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { ArrowRightLeft, ShieldCheck } from "lucide-react";
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
  const { branchId, branchParams } = useActiveBranchFilter();
  const [form, setForm] = React.useState({
    product: "",
    variant: "",
    branch: branchId ? String(branchId) : "",
    warehouse: "",
    source_classification: "REGULAR",
    destination_classification: "RESTRICTED",
    quantity: 1,
    reason: "",
  });
  const { data: products = [] } = useQuery({
    queryKey: ["reclass-products"],
    queryFn: async () =>
      rows(
        unwrap(
          await api.get("/products/", {
            params: { page_size: 500, ...branchParams },
          }),
        ),
      ),
  });
  const selected = products.find((p) => String(p.id) === String(form.product));
  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      branch: branchId ? String(branchId) : "",
    }));
  }, [branchId]);

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
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <ArrowRightLeft className="h-7 w-7 text-sky-200" />
          </div>
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{ color: "#bae6fd" }}
            >
              Inventory control
            </p>
            <h1
              className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,.28)",
              }}
            >
              Stock Reclassification
            </h1>
            <p
              className="mt-2 max-w-2xl text-sm leading-6"
              style={{ color: "#f1f5f9" }}
            >
              Controlled movement between regular and restricted stock. Branch
              is taken from the global branch filter.
            </p>
          </div>
        </div>
      </section>
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
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          Branch is automatically selected from the global branch filter.
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
