import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { extractRows, money, today } from "./accountingUtils";

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const blankLine = () => ({
  description: "",
  quantity: "1",
  unit_price: "",
  vat_rate: "5",
});

const blankInvoice = () => ({
  customer: "",
  branch: "",
  invoice_number: `INV-${Date.now()}`,
  invoice_date: today(),
  due_date: addDays(today(), 30),
  credit_terms: "NET_30",
  customer_credit_limit: "0",
  linked_sales_invoice_id: "",
  status: "DRAFT",
  automatic_overdue_reminders: true,
  first_reminder_days_before: "7",
  repeat_reminder_days: "7",
  allow_credit_note_write_off: true,
  auto_post_to_ledger: true,
  credit_override_approved: false,
  notes: "",
  lines: [blankLine()],
});

export default function ReceivablesPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [tab, setTab] = React.useState("invoices");

  const [search, setSearch] = React.useState("");

  const [open, setOpen] = React.useState(false);

  const [form, setForm] = React.useState(blankInvoice);

  React.useEffect(() => {
    if (branchId) {
      setForm((current) => ({
        ...current,
        branch: String(branchId),
      }));
    }
  }, [branchId]);

  const customersQuery = useQuery({
    queryKey: ["receivable-customers"],
    queryFn: async () =>
      api.get("/customers/", {
        params: {
          page_size: 1000,
          ordering: "name",
        },
      }),
  });

  const branchesQuery = useQuery({
    queryKey: ["receivable-branches"],
    queryFn: async () =>
      api.get("/branches/", {
        params: {
          page_size: 500,
        },
      }),
  });

  const invoicesQuery = useQuery({
    queryKey: ["receivable-invoices", branchId, search],
    queryFn: async () =>
      api.get("/finance/receivable-invoices/", {
        params: {
          ...branchParams,
          search: search || undefined,
          page_size: 1000,
          ordering: "-invoice_date",
        },
      }),
    staleTime: 0,
  });

  const receiptsQuery = useQuery({
    queryKey: ["receivable-receipts", branchId],
    queryFn: async () =>
      api.get("/finance/receivable-receipts/", {
        params: {
          ...branchParams,
          page_size: 1000,
        },
      }),
    staleTime: 0,
  });

  const agingQuery = useQuery({
    queryKey: ["receivable-aging", branchId],
    queryFn: async () =>
      api.get("/finance/receivable-invoices/aging-summary/", {
        params: branchParams,
      }),
  });

  const customers = extractRows(customersQuery.data);
  const branches = extractRows(branchesQuery.data);
  const invoices = extractRows(invoicesQuery.data);
  const receipts = extractRows(receiptsQuery.data);
  const aging = agingQuery.data?.data?.data || agingQuery.data?.data || {};

  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (result, line) => {
          const amount =
            Number(line.quantity || 0) * Number(line.unit_price || 0);
          const vat = (amount * Number(line.vat_rate || 0)) / 100;

          return {
            subtotal: result.subtotal + amount,
            vat: result.vat + vat,
          };
        },
        {
          subtotal: 0,
          vat: 0,
        },
      ),
    [form.lines],
  );

  const save = useMutation({
    mutationFn: async (sendAfterSave) => {
      const payload = {
        ...form,
        customer: Number(form.customer),
        branch: Number(form.branch),
        customer_credit_limit: Number(form.customer_credit_limit || 0),
        linked_sales_invoice_id: form.linked_sales_invoice_id
          ? Number(form.linked_sales_invoice_id)
          : null,
        first_reminder_days_before: Number(
          form.first_reminder_days_before || 7,
        ),
        repeat_reminder_days: Number(form.repeat_reminder_days || 7),
        lines: form.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_price || 0),
          vat_rate: Number(line.vat_rate || 0),
        })),
      };

      const response = await api.post(
        "/finance/receivable-invoices/",
        payload,
        {
          skipGlobalErrorToast: true,
        },
      );

      const invoice = response?.data?.data || response?.data || response;

      if (sendAfterSave) {
        await api.post(
          `/finance/receivable-invoices/${invoice.id}/mark-sent/`,
          {},
          {
            skipGlobalErrorToast: true,
          },
        );
      }

      return response;
    },

    onSuccess: async (_, sendAfterSave) => {
      await queryClient.invalidateQueries({
        queryKey: ["receivable-invoices"],
        exact: false,
      });

      await Promise.all([invoicesQuery.refetch(), agingQuery.refetch()]);

      toast.success(
        sendAfterSave
          ? "Invoice saved and marked as sent."
          : "Invoice saved as draft.",
      );

      setOpen(false);
      setForm({
        ...blankInvoice(),
        branch: branchId ? String(branchId) : "",
      });
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save invoice", {
        description:
          details.summary || details.message || error?.response?.data?.detail,
      });
    },
  });

  const updateLine = (index, key, value) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [key]: value,
            }
          : line,
      ),
    }));
  };

  const submit = (sendAfterSave) => {
    if (
      !form.customer ||
      !form.branch ||
      !form.invoice_date ||
      !form.due_date
    ) {
      toast.error("Customer, branch, invoice date, and due date are required.");
      return;
    }

    if (
      form.lines.some(
        (line) => !line.description || Number(line.quantity || 0) <= 0,
      )
    ) {
      toast.error("Complete all invoice lines.");
      return;
    }

    save.mutate(sendAfterSave);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Customer invoices, receipts, aging, statements, credit limits, and collection controls."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-6 border-b">
        {[
          ["invoices", "Customer Invoices"],
          ["receipts", "Receipts"],
          ["aging", "Aging Report"],
          ["statements", "Customer Statements"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 px-1 pb-3 font-medium ${
              tab === value
                ? "border-amber-600 text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <section className="space-y-4">
          <Input
            className="max-w-sm"
            placeholder="Search customer or invoice no."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="min-w-[950px] w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {[
                    "Invoice No.",
                    "Customer",
                    "Date",
                    "Due Date",
                    "Amount",
                    "Paid",
                    "Balance",
                    "Status",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="px-4 py-3 font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3">{invoice.customer_name}</td>
                    <td className="px-4 py-3">{invoice.invoice_date}</td>
                    <td className="px-4 py-3">{invoice.due_date}</td>
                    <td className="px-4 py-3">{money(invoice.total_amount)}</td>
                    <td className="px-4 py-3">{money(invoice.paid_amount)}</td>
                    <td className="px-4 py-3">{money(invoice.balance_due)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                        {invoice.status_display || invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!invoices.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="p-10 text-center text-muted-foreground"
                    >
                      No customer invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "receipts" && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="min-w-[850px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Receipt No.",
                  "Invoice",
                  "Customer",
                  "Date",
                  "Method",
                  "Amount",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b">
                  <td className="px-4 py-3">{receipt.receipt_number}</td>
                  <td className="px-4 py-3">{receipt.invoice_number}</td>
                  <td className="px-4 py-3">{receipt.customer_name}</td>
                  <td className="px-4 py-3">{receipt.receipt_date}</td>
                  <td className="px-4 py-3">{receipt.payment_method}</td>
                  <td className="px-4 py-3">{money(receipt.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "aging" && (
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["Current", aging.current],
            ["1–30 days", aging.days_1_30],
            ["31–60 days", aging.days_31_60],
            ["61–90 days", aging.days_61_90],
            ["90+ days", aging.days_90_plus],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold">{money(value)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "statements" && (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          Customer statement data is generated from invoices and receipts.
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Finance & Accounting · Accounts Receivable
                </p>
                <h2 className="mt-1 text-2xl font-semibold">New Invoice</h2>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <section className="border-b p-6">
              <h3 className="mb-4 text-lg font-semibold">
                01 Customer & credit
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>Customer *</Label>
                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.customer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Credit Terms</Label>
                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.credit_terms}
                    onChange={(event) => {
                      const value = event.target.value;
                      const days = {
                        DUE_ON_RECEIPT: 0,
                        NET_7: 7,
                        NET_15: 15,
                        NET_30: 30,
                        NET_45: 45,
                        NET_60: 60,
                      }[value];

                      setForm((current) => ({
                        ...current,
                        credit_terms: value,
                        due_date: addDays(current.invoice_date, days),
                      }));
                    }}
                  >
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                    <option value="NET_7">Net 7</option>
                    <option value="NET_15">Net 15</option>
                    <option value="NET_30">Net 30</option>
                    <option value="NET_45">Net 45</option>
                    <option value="NET_60">Net 60</option>
                  </select>
                </div>

                <div>
                  <Label>Credit Limit</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    value={form.customer_credit_limit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer_credit_limit: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Branch *</Label>
                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.branch}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name || branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="border-b p-6">
              <h3 className="mb-4 text-lg font-semibold">02 Invoice details</h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Invoice No.</Label>
                  <Input
                    className="mt-2"
                    value={form.invoice_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        invoice_number: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Invoice Date *</Label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={form.invoice_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        invoice_date: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Due Date *</Label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={form.due_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        due_date: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="border-b p-6">
              <h3 className="mb-4 text-lg font-semibold">03 Line items</h3>

              <div className="space-y-3">
                {form.lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[2fr_0.6fr_0.8fr_0.6fr_0.9fr_auto]"
                  >
                    <Input
                      placeholder="Description"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, "description", event.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, "quantity", event.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit Price"
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(index, "unit_price", event.target.value)
                      }
                    />

                    <select
                      className="h-10 rounded-md border bg-background px-3"
                      value={line.vat_rate}
                      onChange={(event) =>
                        updateLine(index, "vat_rate", event.target.value)
                      }
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                    </select>

                    <div className="flex h-10 items-center rounded-md border px-3 font-mono">
                      {money(
                        Number(line.quantity || 0) *
                          Number(line.unit_price || 0),
                      )}
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={form.lines.length <= 1}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          lines: current.lines.filter(
                            (_, rowIndex) => rowIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    lines: [...current.lines, blankLine()],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>

              <div className="ml-auto mt-5 max-w-sm space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{money(totals.subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>VAT</span>
                  <strong>{money(totals.vat)}</strong>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg">
                  <span>Total due</span>
                  <strong>{money(totals.subtotal + totals.vat)}</strong>
                </div>
              </div>
            </section>

            <section className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                04 Collection & adjustments
              </h3>

              <div className="space-y-4">
                {[
                  [
                    "automatic_overdue_reminders",
                    "Automatic overdue reminders",
                  ],
                  [
                    "allow_credit_note_write_off",
                    "Allow credit note / write-off",
                  ],
                  ["auto_post_to_ledger", "Auto-post to ledger"],
                  [
                    "credit_override_approved",
                    "Credit-limit override approved",
                  ],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <span className="font-medium">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-3 border-t p-5">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => submit(false)}
              >
                Save as Draft
              </Button>

              <Button
                type="button"
                disabled={save.isPending}
                onClick={() => submit(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
              >
                Save & Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
