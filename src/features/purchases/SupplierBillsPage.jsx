import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  v?.results || v?.data?.results || (Array.isArray(v) ? v : []);
const today = () => new Date().toISOString().slice(0, 10);
const blank = {
  supplier: "",
  purchase_order: "",
  grn: "",
  supplier_invoice_number: "",
  bill_date: today(),
  due_date: "",
  subtotal: "",
  vat_amount: "",
  total_amount: "",
  notes: "",
};
export default function SupplierBillsPage() {
  const qc = useQueryClient();
  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-bills",
    "/purchases/supplier-bills/",
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
  const { data: orders } = useQuery({
    queryKey: ["po-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/orders/", { params: { page_size: 500 } }),
      ),
  });
  const create = useMutation({
    mutationFn: () =>
      api.post("/purchases/supplier-bills/", {
        ...form,
        supplier: Number(form.supplier),
        purchase_order: form.purchase_order
          ? Number(form.purchase_order)
          : null,
        grn: form.grn ? Number(form.grn) : null,
        subtotal: Number(form.subtotal || 0),
        vat_amount: Number(form.vat_amount || 0),
        total_amount: Number(form.total_amount || 0),
        paid_amount: 0,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["supplier-bills"] });
      toast.success("Supplier bill recorded.");
      setOpen(false);
      setForm(blank);
    },
  });
  const cols = React.useMemo(
    () => [
      { key: "bill_number", header: "Bill #", sortType: "text" },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "supplier_invoice_number",
        header: "Supplier invoice",
        sortType: "text",
      },
      {
        key: "bill_date",
        header: "Bill date",
        sortType: "date",
        cell: (r) => <DateText value={r.bill_date} />,
      },
      {
        key: "due_date",
        header: "Due",
        sortType: "date",
        cell: (r) => (r.due_date ? <DateText value={r.due_date} /> : "—"),
      },
      {
        key: "total_amount",
        header: "Total",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.total_amount} />,
      },
      {
        key: "balance_due",
        header: "Balance",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.balance_due} />,
      },
      {
        key: "payment_status",
        header: "Status",
        sortType: "status",
        cell: (r) => <StatusBadge status={r.payment_status} />,
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Bills"
        subtitle="Three-way matching between purchase orders, goods receipts and supplier invoices"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Bill
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search bill, supplier invoice, PO or supplier"
      />
      <DataTable
        columns={cols}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No supplier bills"
        emptyDescription="Record the first supplier invoice."
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record supplier bill</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
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
              <Label>Purchase order</Label>
              <Select
                value={form.purchase_order || "none"}
                onValueChange={(v) =>
                  setForm((s) => ({
                    ...s,
                    purchase_order: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No PO</SelectItem>
                  {list(orders).map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.po_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier invoice #</Label>
              <Input
                className="mt-2"
                value={form.supplier_invoice_number}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    supplier_invoice_number: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Bill date *</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.bill_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, bill_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.due_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, due_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Subtotal</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-2"
                value={form.subtotal}
                onChange={(e) =>
                  setForm((s) => ({ ...s, subtotal: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>VAT</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-2"
                value={form.vat_amount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, vat_amount: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Total *</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-2"
                value={form.total_amount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, total_amount: e.target.value }))
                }
              />
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
                create.isPending || !form.supplier || !form.total_amount
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving..." : "Record bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
