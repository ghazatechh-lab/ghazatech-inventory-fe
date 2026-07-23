import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
const blank = {
  supplier: "",
  grn: "",
  return_date: today(),
  reason: "Damaged goods",
  status: "DRAFT",
  notes: "",
  items: [],
};
export default function SupplierReturnsPage() {
  const qc = useQueryClient();
  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-returns",
    "/purchases/supplier-returns/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const [open, setOpen] = React.useState(false),
    [form, setForm] = React.useState(blank);
  const { data: suppliers } = useQuery({
    queryKey: ["supplier-options"],
    queryFn: async () =>
      unwrap(await api.get("/suppliers/", { params: { page_size: 500 } })),
  });
  const { data: grns } = useQuery({
    queryKey: ["grn-options", form.supplier],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/grn/", {
          params: {
            page_size: 500,
            supplier: form.supplier,
            is_confirmed: true,
          },
        }),
      ),
    enabled: Boolean(form.supplier),
  });
  const selected = list(grns).find((x) => String(x.id) === String(form.grn));
  React.useEffect(() => {
    if (selected)
      setForm((s) => ({
        ...s,
        items: (selected.items || []).map((x) => ({
          product: x.product,
          variant: x.variant || null,
          quantity: 0,
          unit_price: 0,
          reason: "",
        })),
      }));
  }, [selected]);
  const update = (i, p) =>
    setForm((s) => ({
      ...s,
      items: s.items.map((x, n) => (n === i ? { ...x, ...p } : x)),
    }));
  const create = useMutation({
    mutationFn: () =>
      api.post("/purchases/supplier-returns/", {
        ...form,
        supplier: Number(form.supplier),
        grn: Number(form.grn),
        items: form.items
          .filter((x) => Number(x.quantity) > 0)
          .map((x) => ({
            ...x,
            product: Number(x.product),
            variant: x.variant ? Number(x.variant) : null,
            quantity: Number(x.quantity),
            unit_price: Number(x.unit_price || 0),
          })),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Supplier return created.");
      setOpen(false);
      setForm(blank);
    },
  });
  const cols = React.useMemo(
    () => [
      { key: "return_number", header: "Return #", sortType: "text" },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "return_date",
        header: "Date",
        sortType: "date",
        cell: (r) => <DateText value={r.return_date} />,
      },
      { key: "reason", header: "Reason", sortType: "text" },
      {
        key: "total_amount",
        header: "Amount",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.total_amount} />,
      },
      {
        key: "status",
        header: "Status",
        sortType: "status",
        cell: (r) => <StatusBadge status={r.status} />,
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Returns"
        subtitle="Return damaged, rejected or incorrect goods against a confirmed GRN"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search return, supplier or reason"
      />
      <DataTable
        columns={cols}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No supplier returns"
        emptyDescription="Create a return against a GRN."
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>New Supplier Return</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Supplier *</Label>
              <Select
                value={form.supplier}
                onValueChange={(v) => setForm({ ...blank, supplier: v })}
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
              <Label>Linked GRN *</Label>
              <Select
                value={form.grn}
                onValueChange={(v) => setForm((s) => ({ ...s, grn: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select GRN" />
                </SelectTrigger>
                <SelectContent>
                  {list(grns).map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.grn_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Return date</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.return_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, return_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                className="mt-2"
                value={form.reason}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reason: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Items to return</Label>
              <div className="mt-2 space-y-2 rounded-xl border p-3">
                {form.items.map((x, i) => (
                  <div
                    key={i}
                    className="grid gap-2 md:grid-cols-[1fr_100px_130px_1fr_40px]"
                  >
                    <div className="flex items-center text-sm">
                      {selected?.items?.[i]?.product_name ||
                        `Product ${x.product}`}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={x.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      value={x.unit_price}
                      onChange={(e) =>
                        update(i, { unit_price: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Item reason"
                      value={x.reason}
                      onChange={(e) => update(i, { reason: e.target.value })}
                    />
                    <Trash2 className="mt-2 h-4 w-4 text-red-500" />
                  </div>
                ))}
                {!form.items.length && (
                  <p className="text-sm text-muted-foreground">
                    Select a confirmed GRN.
                  </p>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                className="mt-2"
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                create.isPending ||
                !form.supplier ||
                !form.grn ||
                !form.items.some((x) => Number(x.quantity) > 0)
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving..." : "Create return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
