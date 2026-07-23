import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { CurrencyText } from "@/components/common/CurrencyText";
const list = (v) =>
  v?.results || v?.data?.results || (Array.isArray(v) ? v : []);
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => Number(n || 0);
export default function POFormPage() {
  const { id } = useParams(),
    edit = Boolean(id),
    nav = useNavigate(),
    qc = useQueryClient();
  const [form, setForm] = React.useState({
    supplier: "",
    branch: "",
    order_date: today(),
    expected_delivery_date: "",
    supplier_reference: "",
    discount_amount: 0,
    shipping_amount: 0,
    notes: "",
    status: "DRAFT",
    items: [],
  });
  const { data: suppliers } = useQuery({
    queryKey: ["supplier-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/suppliers/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const { data: branches } = useQuery({
    queryKey: ["branch-options"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const { data: products } = useQuery({
    queryKey: ["product-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const { data: existing } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => unwrap(await api.get(`/purchases/orders/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });
  React.useEffect(() => {
    if (existing)
      setForm({
        ...existing,
        supplier: String(existing.supplier?.id || existing.supplier || ""),
        branch: String(existing.branch?.id || existing.branch || ""),
        items: (existing.items || []).map((x) => ({
          ...x,
          product: String(x.product?.id || x.product),
          variant: x.variant ? String(x.variant?.id || x.variant) : "",
        })),
      });
  }, [existing]);
  const updateItem = (i, p) =>
    setForm((s) => ({
      ...s,
      items: s.items.map((x, n) => (n === i ? { ...x, ...p } : x)),
    }));
  const subtotal = form.items.reduce(
    (a, x) =>
      a + money(x.quantity) * money(x.unit_price) - money(x.discount_amount),
    0,
  );
  const vat = form.items.reduce((a, x) => a + money(x.vat_amount), 0);
  const total =
    subtotal - money(form.discount_amount) + money(form.shipping_amount) + vat;
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        supplier: Number(form.supplier),
        branch: Number(form.branch),
        discount_amount: money(form.discount_amount),
        shipping_amount: money(form.shipping_amount),
        items: form.items.map((x) => ({
          ...x,
          product: Number(x.product),
          variant: x.variant ? Number(x.variant) : null,
          quantity: Number(x.quantity),
          unit_price: money(x.unit_price),
          discount_amount: money(x.discount_amount),
          vat_amount: money(x.vat_amount),
        })),
      };
      return edit
        ? api.patch(`/purchases/orders/${id}/`, body)
        : api.post("/purchases/orders/", body);
    },
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(
        edit ? "Purchase order updated." : "Purchase order created.",
      );
      nav(`/purchases/orders/${unwrap(r)?.id || id || ""}`);
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title={edit ? "Edit Purchase Order" : "New Purchase Order"}
        subtitle="Raise an order against a supplier and track it through receiving"
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="card-surface grid gap-4 p-5 md:grid-cols-2">
            <div>
              <Label>Supplier *</Label>
              <Select
                value={form.supplier}
                onValueChange={(v) => setForm((s) => ({ ...s, supplier: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {list(suppliers).map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch *</Label>
              <Select
                value={form.branch}
                onValueChange={(v) => setForm((s) => ({ ...s, branch: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {list(branches).map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.branch_code || x.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order date</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.order_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, order_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Expected delivery</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.expected_delivery_date || ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    expected_delivery_date: e.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Supplier reference</Label>
              <Input
                className="mt-2"
                value={form.supplier_reference || ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, supplier_reference: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-semibold">Line items</h2>
                <p className="text-xs text-muted-foreground">
                  Products, quantity and unit cost
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((s) => ({
                    ...s,
                    items: [
                      ...s.items,
                      {
                        product: "",
                        variant: "",
                        quantity: 1,
                        unit_price: 0,
                        discount_amount: 0,
                        vat_amount: 0,
                        description: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            </div>
            <div className="space-y-3 p-4">
              {form.items.map((it, i) => (
                <div
                  key={i}
                  className="grid items-end gap-3 rounded-xl border p-3 md:grid-cols-[2fr_90px_130px_130px_40px]"
                >
                  <div>
                    <Label>Product</Label>
                    <Select
                      value={String(it.product || "")}
                      onValueChange={(v) => {
                        const p = list(products).find(
                          (x) => String(x.id) === v,
                        );
                        const price = p?.variants?.[0]?.purchase_price || 0;
                        updateItem(i, { product: v, unit_price: price });
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {list(products).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.product_name} · {p.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      className="mt-2"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(i, { quantity: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="mt-2"
                      value={it.unit_price}
                      onChange={(e) =>
                        updateItem(i, { unit_price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Line total</Label>
                    <div className="mt-2 flex h-10 items-center justify-end rounded-md border px-3">
                      <CurrencyText
                        value={
                          money(it.quantity) * money(it.unit_price) -
                          money(it.discount_amount) +
                          money(it.vat_amount)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm((s) => ({
                        ...s,
                        items: s.items.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {!form.items.length && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No items added.
                </div>
              )}
            </div>
          </div>
          <div className="card-surface p-5">
            <Label>Notes</Label>
            <Textarea
              className="mt-2"
              value={form.notes || ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="card-surface h-fit space-y-4 p-5">
          <h2 className="font-semibold">Order summary</h2>
          {[
            ["Subtotal", subtotal],
            ["VAT", vat],
            ["Shipping", form.shipping_amount],
            ["Discount", -money(form.discount_amount)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{l}</span>
              <CurrencyText value={v} />
            </div>
          ))}
          <div className="border-t pt-4 flex justify-between font-semibold">
            <span>Total</span>
            <CurrencyText value={total} />
          </div>
          <Button
            className="w-full"
            disabled={
              save.isPending ||
              !form.supplier ||
              !form.branch ||
              !form.items.length
            }
            onClick={() => save.mutate()}
          >
            {save.isPending
              ? "Saving..."
              : edit
                ? "Save changes"
                : "Create purchase order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
