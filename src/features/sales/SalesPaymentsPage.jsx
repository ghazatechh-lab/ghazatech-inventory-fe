import React from "react";
import { Download, Plus, Save, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const paymentMethods = [
  ["BANK_TRANSFER", "Bank Transfer"],
  ["CARD", "Card"],
  ["CASH", "Cash"],
  ["CHEQUE", "Cheque"],
];

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  invoice: "",
  customer: "",
  payment_date: today(),
  amount: 0,
  currency: "AED",
  payment_method: "BANK_TRANSFER",
  bank_account: "",
  cash_register: "",
  reference_number: "",
  status: "PAID",
  notes: "",
  full_balance: true,
});

export default function SalesPaymentsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-payments",
    "/sales/payments/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-payments-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/payments/summary/", { params: branchParams }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-payments-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/payments/form-options/", {
          params: { branch: form.branch || undefined },
        }),
      ),
    enabled: open,
  });

  const { data: invoiceDetail } = useQuery({
    queryKey: ["sales-payment-invoice", form.invoice],
    queryFn: async () =>
      unwrap(await api.get(`/sales/payments/invoice-options/${form.invoice}/`)),
    enabled: open && Boolean(form.invoice),
    staleTime: 0,
  });

  const options = optionsResponse || {};
  const invoices = normalizeList(options.invoices);
  const bankAccounts = normalizeList(options.bank_accounts);
  const cashRegisters = normalizeList(options.cash_registers);
  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };

  React.useEffect(() => {
    if (!invoiceDetail) return;

    setForm((current) => ({
      ...current,
      customer: invoiceDetail.customer_id
        ? String(invoiceDetail.customer_id)
        : "",
      branch: invoiceDetail.branch_id
        ? String(invoiceDetail.branch_id)
        : current.branch,
      currency: invoiceDetail.currency || "AED",
      amount: current.full_balance
        ? number(invoiceDetail.balance_due)
        : current.amount,
    }));
  }, [invoiceDetail]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const openNew = () => {
    setForm(createForm(branchId));
    setErrors({});
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setForm(createForm(branchId));
    setErrors({});
  };

  const validate = () => {
    const next = {};

    if (!form.invoice) next.invoice = "Invoice is required.";
    if (!form.payment_date) next.payment_date = "Payment date is required.";
    if (number(form.amount) <= 0)
      next.amount = "Amount must be greater than zero.";

    if (
      invoiceDetail &&
      number(form.amount) > number(invoiceDetail.balance_due)
    ) {
      next.amount = "Payment cannot exceed the invoice balance.";
    }

    if (form.payment_method === "BANK_TRANSFER" && !form.bank_account) {
      next.bank_account = "Bank account is required.";
    }

    if (form.payment_method === "CASH" && !form.cash_register) {
      next.cash_register = "Cash register is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () =>
      api.post(
        "/sales/payments/",
        {
          branch: form.branch ? Number(form.branch) : null,
          invoice: Number(form.invoice),
          customer: form.customer ? Number(form.customer) : null,
          payment_date: form.payment_date,
          amount: number(form.amount),
          currency: form.currency,
          payment_method: form.payment_method,
          bank_account: form.bank_account ? Number(form.bank_account) : null,
          cash_register: form.cash_register ? Number(form.cash_register) : null,
          reference_number: form.reference_number || null,
          status: form.status,
          notes: form.notes,
        },
        { skipGlobalErrorToast: true },
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-payments-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-invoices"] }),
      ]);
      toast.success("Payment recorded.");
      close();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to record payment", {
        description: details.summary || details.message,
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const exportRows = async () => {
    const response = await api.get("/sales/payments/export/", {
      params: branchParams,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sales-payments.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "payment_number", header: "Payment #" },
    { key: "customer_name", header: "Customer" },
    { key: "invoice_number", header: "Invoice" },
    { key: "payment_method_display", header: "Method" },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <CurrencyText value={row.amount} currency={row.currency || "AED"} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Sales Payments"
        subtitle="Payments received against invoices and direct sales"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={openNew}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Received Today"
          value={<CurrencyText value={summary.received_today || 0} />}
        />
        <MetricCard
          label="Received (MTD)"
          value={<CurrencyText value={summary.received_mtd || 0} />}
        />
        <MetricCard
          label="Pending Clearance"
          value={<CurrencyText value={summary.pending_clearance || 0} />}
        />
        <MetricCard
          label="Payment Methods"
          value={`${summary.active_methods || 0} active`}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Sales Payments</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Payments received against invoices and direct sales
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search payment, customer, invoice"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No payments"
          emptyDescription="Record the first customer payment."
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">Record Payment</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payment number will be generated automatically
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Invoice *</Label>
                  <Select
                    value={form.invoice}
                    onValueChange={(value) => updateForm("invoice", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={String(invoice.id)}>
                          {invoice.invoice_number} — {invoice.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.invoice && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.invoice}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(event) =>
                      updateForm("payment_date", event.target.value)
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              {invoiceDetail && (
                <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-4 dark:bg-white/[0.025]">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1 font-semibold">
                      {invoiceDetail.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Invoice Total
                    </p>
                    <CurrencyText value={invoiceDetail.invoice_total} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Already Paid
                    </p>
                    <CurrencyText value={invoiceDetail.paid_amount} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Balance Due
                    </p>
                    <div className="text-red-500">
                      <CurrencyText value={invoiceDetail.balance_due} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Amount Received *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => {
                      updateForm("amount", event.target.value);
                      updateForm("full_balance", false);
                    }}
                    className="mt-2"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
                  )}
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => updateForm("currency", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.full_balance}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    updateForm("full_balance", checked);
                    if (checked && invoiceDetail) {
                      updateForm("amount", number(invoiceDetail.balance_due));
                    }
                  }}
                />
                Full balance — untick to record a partial payment
              </label>

              <div>
                <Label>Payment Method</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {paymentMethods.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("payment_method", value)}
                      className={
                        form.payment_method === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600"
                          : "rounded-lg border px-3 py-2 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Bank / Account</Label>
                  {form.payment_method === "CASH" ? (
                    <Select
                      value={form.cash_register || "__none__"}
                      onValueChange={(value) =>
                        updateForm(
                          "cash_register",
                          value === "__none__" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select cash register
                        </SelectItem>
                        {cashRegisters.map((register) => (
                          <SelectItem
                            key={register.id}
                            value={String(register.id)}
                          >
                            {register.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={form.bank_account || "__none__"}
                      onValueChange={(value) =>
                        updateForm(
                          "bank_account",
                          value === "__none__" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select bank account
                        </SelectItem>
                        {bankAccounts.map((account) => (
                          <SelectItem
                            key={account.id}
                            value={String(account.id)}
                          >
                            {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Reference / Transaction #</Label>
                  <Input
                    value={form.reference_number}
                    onChange={(event) =>
                      updateForm("reference_number", event.target.value)
                    }
                    className="mt-2"
                    placeholder="e.g. TRF-88213"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    ["PAID", "Paid / Cleared"],
                    ["PENDING", "Pending Clearance"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("status", value)}
                      className={
                        form.status === value
                          ? "rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700"
                          : "rounded-lg border px-3 py-3 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  className="mt-2"
                  placeholder="Add a note about this payment"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={mutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
