import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
const DEFAULT_EXPENSE_CATEGORIES = [
  { value: "RENT_UTILITIES", label: "Rent & Utilities" },
  { value: "OFFICE", label: "Office" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PROFESSIONAL_FEES", label: "Professional Fees" },
  { value: "TRAVEL", label: "Travel" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
];

const normalizeCategories = (value) => {
  const rows = list(value?.data ?? value);
  return rows
    .map((item) => ({
      id: item.id,
      value: String(item.value ?? item.code ?? ""),
      label: item.label ?? item.name ?? item.value ?? item.code ?? "",
    }))
    .filter((item) => item.value && item.label);
};

const normalizeOptionList = (...candidates) => {
  for (const candidate of candidates) {
    const rows = list(candidate?.data ?? candidate);
    if (rows.length) {
      return rows;
    }
  }

  return [];
};

const getBankAccountLabel = (account) =>
  account.account_name ||
  account.name ||
  account.bank_name ||
  account.account_number ||
  `Bank Account ${account.id}`;

const getCashRegisterLabel = (register) =>
  register.name ||
  register.register_name ||
  register.cash_register_name ||
  register.reference ||
  register.opening_date ||
  `Cash Register ${register.id}`;

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

export default function PurchaseExpenseFormPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const { branchId, branchParams } = useActiveBranchFilter();
  const isNewRoute = location.pathname.endsWith("/new");
  const isEditRoute = location.pathname.endsWith("/edit") && Boolean(routeId);
  const [mode, setMode] = React.useState(() =>
    isNewRoute || isEditRoute ? "form" : "list",
  );
  const [editingId, setEditingId] = React.useState(() =>
    isEditRoute ? routeId : null,
  );
  const [form, setForm] = React.useState(() => initial(branchId));
  const [files, setFiles] = React.useState([]);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  React.useEffect(() => {
    if (isEditRoute) {
      setEditingId(routeId);
      setMode("form");
      return;
    }

    if (isNewRoute) {
      setEditingId(null);
      setForm(initial(branchId));
      setFiles([]);
      setMode("form");
      return;
    }

    setEditingId(null);
    setMode("list");
  }, [isEditRoute, isNewRoute, routeId, branchId]);

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

  const {
    data: bankAccountResponse,
    isLoading: bankAccountsLoading,
    isError: bankAccountsLoadFailed,
    error: bankAccountsLoadError,
  } = useQuery({
    queryKey: ["purchase-expense-bank-accounts", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/bank-accounts/", {
          params: {
            branch: form.branch || undefined,
            page_size: 500,
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: mode === "form",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const {
    data: cashRegisterResponse,
    isLoading: cashRegistersLoading,
    isError: cashRegistersLoadFailed,
    error: cashRegistersLoadError,
  } = useQuery({
    queryKey: ["purchase-expense-cash-registers", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/cash-registers/", {
          params: {
            branch: form.branch || undefined,
            page_size: 500,
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: mode === "form",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const {
    data: categoryResponse,
    isError: categoryLoadFailed,
    error: categoryLoadError,
  } = useQuery({
    queryKey: ["purchase-expense-categories"],
    queryFn: async () =>
      unwrap(await api.get("/purchases/expenses/categories/")),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: branchResponse,
    isLoading: branchesLoading,
    isError: branchesLoadFailed,
    error: branchesLoadError,
  } = useQuery({
    queryKey: ["purchase-expense-all-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
    staleTime: 5 * 60 * 1000,
    enabled: mode === "form",
  });

  const branches = React.useMemo(() => {
    const candidates = [
      branchResponse,
      branchResponse?.data,
      branchResponse?.results,
      branchResponse?.data?.results,
      options?.branches,
    ];

    for (const candidate of candidates) {
      const rows = list(candidate);
      if (rows.length) return rows;
    }

    return [];
  }, [branchResponse, options?.branches]);

  const categories = React.useMemo(() => {
    const direct = normalizeCategories(categoryResponse);
    const fromOptions = normalizeCategories(options?.categories);
    const merged = [...direct, ...fromOptions, ...DEFAULT_EXPENSE_CATEGORIES];
    const seen = new Set();
    return merged.filter((category) => {
      if (seen.has(category.value)) return false;
      seen.add(category.value);
      return true;
    });
  }, [categoryResponse, options?.categories]);

  const bankAccounts = React.useMemo(
    () =>
      normalizeOptionList(
        options?.bank_accounts,
        options?.data?.bank_accounts,
        bankAccountResponse,
        bankAccountResponse?.data,
        bankAccountResponse?.results,
        bankAccountResponse?.data?.results,
      ),
    [options, bankAccountResponse],
  );

  const cashRegisters = React.useMemo(
    () =>
      normalizeOptionList(
        options?.cash_registers,
        options?.data?.cash_registers,
        cashRegisterResponse,
        cashRegisterResponse?.data,
        cashRegisterResponse?.results,
        cashRegisterResponse?.data?.results,
      ).filter(
        (register) =>
          !["CLOSED", "INACTIVE"].includes(
            String(register.status || "").toUpperCase(),
          ),
      ),
    [options, cashRegisterResponse],
  );

  React.useEffect(() => {
    console.log("Purchase Expense category API response:", categoryResponse);
    console.log("Purchase Expense normalized categories:", categories);
    if (categoryLoadFailed) {
      console.error(
        "Purchase Expense category API error:",
        categoryLoadError?.response?.data || categoryLoadError,
      );
    }
  }, [categoryResponse, categories, categoryLoadFailed, categoryLoadError]);

  React.useEffect(() => {
    console.log("Purchase Expense branch API response:", branchResponse);
    console.log("Purchase Expense normalized branches:", branches);
    if (branchesLoadFailed) {
      console.error(
        "Purchase Expense branch API error:",
        branchesLoadError?.response?.data || branchesLoadError,
      );
    }
  }, [branchResponse, branches, branchesLoadFailed, branchesLoadError]);

  React.useEffect(() => {
    console.log("Purchase Expense form options:", options);
    console.log("Purchase Expense bank accounts:", bankAccounts);
    console.log("Purchase Expense cash registers:", cashRegisters);

    if (bankAccountsLoadFailed) {
      console.error(
        "Bank account API error:",
        bankAccountsLoadError?.response?.data || bankAccountsLoadError,
      );
    }

    if (cashRegistersLoadFailed) {
      console.error(
        "Cash register API error:",
        cashRegistersLoadError?.response?.data || cashRegistersLoadError,
      );
    }
  }, [
    options,
    bankAccounts,
    cashRegisters,
    bankAccountsLoadFailed,
    bankAccountsLoadError,
    cashRegistersLoadFailed,
    cashRegistersLoadError,
  ]);

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
    navigate("/purchases/purchase-expenses/new");
  };
  const openEdit = React.useCallback(
    (row) => {
      navigate(`/purchases/purchase-expenses/${row.id}/edit`);
    },
    [navigate],
  );
  const close = () => {
    setEditingId(null);
    setFiles([]);
    navigate("/purchases/purchase-expenses");
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["purchase-expense-categories"] }),
        qc.invalidateQueries({ queryKey: ["purchase-expense-options"] }),
      ]);
      update("category", String(category.value || category.code || ""));
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
    [openEdit],
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
              {categories.map((c) => (
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
              {categories.map((c) => (
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
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.branch_name || b.name || b.branch_code || `Branch ${b.id}`}
                </SelectItem>
              ))}
              {!branchesLoading && branches.length === 0 ? (
                <SelectItem value="__no_branches__" disabled>
                  No branches available
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount (AED) *</Label>
          <Input
            className="mt-2 text-left"
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
            onValueChange={(value) => {
              setForm((current) => ({
                ...current,
                payment_method: value,
                bank_account: ["CASH", "PETTY_CASH"].includes(value)
                  ? ""
                  : current.bank_account,
                cash_register: ["CASH", "PETTY_CASH"].includes(value)
                  ? current.cash_register
                  : "",
              }));
            }}
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
                {cashRegisters.map((register) => (
                  <SelectItem key={register.id} value={String(register.id)}>
                    {getCashRegisterLabel(register)}
                  </SelectItem>
                ))}

                {!cashRegistersLoading && cashRegisters.length === 0 ? (
                  <SelectItem value="__no_cash_registers__" disabled>
                    No open cash registers available
                  </SelectItem>
                ) : null}
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
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {getBankAccountLabel(account)}
                  </SelectItem>
                ))}

                {!bankAccountsLoading && bankAccounts.length === 0 ? (
                  <SelectItem value="__no_bank_accounts__" disabled>
                    No bank accounts available
                  </SelectItem>
                ) : null}
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
