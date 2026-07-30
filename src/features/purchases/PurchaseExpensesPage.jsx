import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Info,
  Plus,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
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
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const list = (v) =>
  Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [];
const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v || 0);
const initial = (branchId) => ({
  expense_number: "",
  description: "",
  category: "",
  branch: branchId ? String(branchId) : "",
  amount: 0,
  expense_date: today(),
  vendor_name: "",
  payment_method: "BANK_TRANSFER",
  bank_account: "",
  cash_register: "",
  reference_number: "",
  notes: "",
  status: "PENDING",
});

function Metric({ label, value, subtitle }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function PurchaseExpensesPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [mode, setMode] = React.useState("list");
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState(() => initial(branchId));
  const [files, setFiles] = React.useState([]);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  const { query, q, setQ, page, setPage } = useListQuery(
    "purchase-expenses",
    "/purchases/expenses/",
    {
      ...branchParams,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
    },
  );

  const { data: summary = {} } = useQuery({
    queryKey: ["purchase-expense-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/expenses/summary/", { params: branchParams }),
      ),
  });

  const { data: options = {} } = useQuery({
    queryKey: ["purchase-expense-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/expenses/form-options/", {
          params: { branch: form.branch || undefined },
        }),
      ),
    enabled: mode === "form",
  });

  const { data: existing } = useQuery({
    queryKey: ["purchase-expense", editingId],
    queryFn: async () =>
      unwrap(await api.get(`/purchases/expenses/${editingId}/`)),
    enabled: mode === "form" && Boolean(editingId),
  });

  React.useEffect(() => {
    if (!existing) return;
    setForm({
      expense_number: existing.expense_number || "",
      description: existing.description || "",
      category: existing.category || "",
      branch: String(existing.branch?.id || existing.branch || ""),
      amount: num(existing.amount),
      expense_date: existing.expense_date || today(),
      vendor_name: existing.vendor_name || "",
      payment_method: existing.payment_method || "BANK_TRANSFER",
      bank_account: existing.bank_account
        ? String(existing.bank_account?.id || existing.bank_account)
        : "",
      cash_register: existing.cash_register
        ? String(existing.cash_register?.id || existing.cash_register)
        : "",
      reference_number: existing.reference_number || "",
      notes: existing.notes || "",
      status: existing.status || "PENDING",
    });
  }, [existing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => {
    setEditingId(null);
    setForm(initial(branchId));
    setFiles([]);
    setMode("form");
  };
  const openEdit = (row) => {
    setEditingId(row.id);
    setFiles([]);
    setMode("form");
  };
  const close = () => {
    setMode("list");
    setEditingId(null);
    setFiles([]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (
        !form.description ||
        !form.category ||
        !form.branch ||
        num(form.amount) <= 0 ||
        !form.expense_date
      ) {
        throw new Error("Complete all required expense fields.");
      }
      const payload = {
        ...form,
        branch: Number(form.branch),
        amount: num(form.amount),
        bank_account: form.bank_account ? Number(form.bank_account) : null,
        cash_register: form.cash_register ? Number(form.cash_register) : null,
      };
      const data = new FormData();
      data.append("payload", JSON.stringify(payload));
      files.forEach((f) => data.append("attachments", f));
      const cfg = {
        headers: { "Content-Type": "multipart/form-data" },
        skipGlobalErrorToast: true,
      };
      return editingId
        ? api.patch(`/purchases/expenses/${editingId}/`, data, cfg)
        : api.post("/purchases/expenses/", data, cfg);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["purchase-expenses"] }),
        qc.invalidateQueries({ queryKey: ["purchase-expense-summary"] }),
      ]);
      toast.success("Purchase expense saved.");
      close();
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to save expense", {
        description: d.summary || d.message || e.message,
      });
    },
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const name = window.prompt("Enter the new expense category name");
      if (!name?.trim()) return null;
      return unwrap(
        await api.post("/purchases/expenses/categories/", {
          name: name.trim(),
        }),
      );
    },
    onSuccess: async (category) => {
      if (!category) return;
      await qc.invalidateQueries({ queryKey: ["purchase-expense-options"] });
      update("category", category.value || category.code);
      toast.success("Expense category created.");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to create category", {
        description: details.summary || details.message,
      });
    },
  });

  const columns = React.useMemo(
    () => [
      {
        key: "expense_number",
        header: "Expense",
        sortKey: "expense_number",
        sortType: "text",
        cell: (r) => (
          <button onClick={() => openEdit(r)} className="text-left">
            <div className="font-medium text-blue-600 dark:text-blue-400">
              {r.expense_number}
            </div>
            <div className="text-xs text-muted-foreground">{r.description}</div>
          </button>
        ),
      },
      {
        key: "category_display",
        header: "Category",
        sortKey: "category",
        sortType: "text",
      },
      {
        key: "branch_name",
        header: "Branch",
        sortKey: "branch__branch_name",
        sortType: "text",
      },
      {
        key: "expense_date",
        header: "Date",
        sortKey: "expense_date",
        sortType: "date",
        cell: (r) =>
          r.expense_date ? <DateText value={r.expense_date} /> : "—",
      },
      {
        key: "payment_method_display",
        header: "Payment Method",
        sortKey: "payment_method",
        sortType: "text",
      },
      {
        key: "amount",
        header: "Amount",
        sortKey: "amount",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.amount} />,
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        cell: (r) => <StatusBadge status={r.status} />,
      },
    ],
    [],
  );

  if (mode === "list") {
    const payload = query.data || { results: [], count: 0 };
    return (
      <div className="space-y-5">
        <PageHeader
          title="Purchase Expenses"
          subtitle="Non-stock operating costs across branches"
          actions={
            <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Log Expense
            </Button>
          }
        />
        <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="h-4 w-4" />
          Track rent, utilities, transport, maintenance, office, and
          miscellaneous expenses.
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="This Month"
            value={<CurrencyText value={summary.this_month_total || 0} />}
            subtitle={`${summary.this_month_count || 0} expense(s)`}
          />
          <Metric
            label="Pending Approval"
            value={<CurrencyText value={summary.pending_total || 0} />}
            subtitle={`${summary.pending_count || 0} awaiting review`}
          />
          <Metric
            label="Paid This Month"
            value={<CurrencyText value={summary.paid_this_month || 0} />}
            subtitle={`${summary.paid_count || 0} settled`}
          />
          <Metric
            label="Top Category"
            value={summary.top_category || "—"}
            subtitle={
              summary.top_category
                ? `AED ${summary.top_category_total || 0}`
                : "No data"
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search description, vendor, expense number"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {list(options.categories).map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No purchase expenses"
          emptyDescription="Log the first operating expense."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <PageHeader
        title={editingId ? "Edit Purchase Expense" : "Log Purchase Expense"}
        subtitle="Record a non-stock operating cost"
        actions={
          <Button variant="outline" onClick={close}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />
      <section className="card-surface p-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Description *</Label>
          <Input
            className="mt-2"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="e.g. DEWA electricity bill, July"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Category *</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => addCategory.mutate()}
              disabled={addCategory.isPending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Category
            </Button>
          </div>
          <Select
            value={form.category}
            onValueChange={(v) => update("category", v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {list(options.categories).map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
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
            disabled={Boolean(branchId)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {list(options.branches).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.branch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount (AED) *</Label>
          <Input
            className="mt-2 text-right"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
          />
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            className="mt-2"
            type="date"
            value={form.expense_date}
            onChange={(e) => update("expense_date", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Vendor / Paid To</Label>
          <Input
            className="mt-2"
            value={form.vendor_name}
            onChange={(e) => update("vendor_name", e.target.value)}
            placeholder="e.g. DEWA, ADNOC, Al Futtaim"
          />
        </div>
        <div>
          <Label>Payment Method *</Label>
          <Select
            value={form.payment_method}
            onValueChange={(v) => update("payment_method", v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                ["BANK_TRANSFER", "Bank Transfer"],
                ["CHEQUE", "Cheque"],
                ["CASH", "Cash"],
                ["CARD", "Company Card"],
                ["PETTY_CASH", "Petty Cash"],
                ["OTHER", "Other"],
              ].map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Paid From</Label>
          {["CASH", "PETTY_CASH"].includes(form.payment_method) ? (
            <Select
              value={form.cash_register}
              onValueChange={(v) => update("cash_register", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select cash register" />
              </SelectTrigger>
              <SelectContent>
                {list(options.cash_registers).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={form.bank_account}
              onValueChange={(v) => update("bank_account", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {list(options.bank_accounts).map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="md:col-span-2">
          <Label>Reference Number</Label>
          <Input
            className="mt-2"
            value={form.reference_number}
            onChange={(e) => update("reference_number", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea
            className="mt-2"
            rows={4}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Optional remarks"
          />
        </div>
      </section>
      <section className="card-surface p-5">
        <Label>Receipt / Invoice</Label>
        <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8">
          <UploadCloud className="h-7 w-7 text-blue-500" />
          <span className="mt-2 text-sm">Drop file or browse to upload</span>
          <span className="text-xs text-muted-foreground">
            PDF, JPG, PNG up to 10 MB
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => {
              const fs = [...e.target.files];
              setFiles((v) => [...v, ...fs]);
            }}
          />
        </label>
        {files.map((f, i) => (
          <div
            key={`${f.name}-${i}`}
            className="mt-2 flex items-center gap-2 rounded-lg border p-3"
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 truncate text-sm">{f.name}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFiles((v) => v.filter((_, x) => x !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving..." : "Save Expense"}
        </Button>
      </div>
    </div>
  );
}
