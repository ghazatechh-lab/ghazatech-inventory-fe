import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
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
  description: "",
  category: "Freight",
  branch: "",
  amount: "",
  expense_date: today(),
  vendor_name: "",
  supplier: "",
  payment_method: "BANK_TRANSFER",
  status: "PENDING",
  notes: "",
};

export default function PurchaseExpensesPage() {
  const qc = useQueryClient();
  const { query, q, setQ, page, setPage } = useListQuery(
    "purchase-expenses",
    "/purchases/expenses/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(blank);
  const { data: branches } = useQuery({
    queryKey: ["branch-options"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
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
  const create = useMutation({
    mutationFn: () =>
      api.post("/purchases/expenses/", {
        ...form,
        branch: Number(form.branch),
        supplier: form.supplier ? Number(form.supplier) : null,
        amount: Number(form.amount),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["purchase-expenses"] });
      toast.success("Purchase expense recorded.");
      setOpen(false);
      setForm(blank);
    },
  });
  const columns = React.useMemo(
    () => [
      { key: "expense_number", header: "Expense #", sortType: "text" },
      { key: "description", header: "Description", sortType: "text" },
      { key: "category", header: "Category", sortType: "text" },
      {
        key: "branch_name",
        header: "Branch",
        sortKey: "branch__branch_name",
        sortType: "text",
      },
      {
        key: "expense_date",
        header: "Date",
        sortType: "date",
        cell: (r) => <DateText value={r.expense_date} />,
      },
      { key: "payment_method", header: "Payment method", sortType: "status" },
      {
        key: "amount",
        header: "Amount",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.amount} />,
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
        title="Purchase Expenses"
        subtitle="Freight, customs, utilities, transport and other purchase-related costs"
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log expense
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search expense, vendor or category"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No purchase expenses"
        emptyDescription="Log the first purchase-related expense."
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              Log Purchase Expense
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Description *</Label>
              <Input
                className="mt-2"
                placeholder="e.g. DEWA electricity bill, July"
                value={form.description}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Freight",
                    "Customs",
                    "Rent & Utilities",
                    "Transport",
                    "Office",
                    "Maintenance",
                    "Other",
                  ].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
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
                  {list(branches).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.branch_code || b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (AED) *</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-2"
                value={form.amount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.expense_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, expense_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Select
                value={form.supplier || "none"}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, supplier: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Optional supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {list(suppliers).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor / Paid to</Label>
              <Input
                className="mt-2"
                value={form.vendor_name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, vendor_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, payment_method: v }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CARD">Company Card</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
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
                !form.description ||
                !form.branch ||
                !form.amount
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving..." : "Save expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
