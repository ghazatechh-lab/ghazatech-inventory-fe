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

const reasonOptions = [
  {
    value: "RETURN_DAMAGED",
    label: "Return / damaged goods",
  },
  {
    value: "PRICING_ERROR",
    label: "Pricing error",
  },
  {
    value: "DISCOUNT_ADJUSTMENT",
    label: "Discount adjustment",
  },
  {
    value: "ORDER_CANCELLED",
    label: "Order cancelled",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  invoice: "",
  customer: "",
  credit_note_number: "",
  credit_date: today(),
  reason: "RETURN_DAMAGED",
  refund_method: "CUSTOMER_CREDIT",
  status: "DRAFT",
  notes: "",
  items: [],
});

export default function CreditNotesPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [editingId, setEditingId] = React.useState(null);

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState(() => createForm(branchId));

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-credit-notes",
    "/sales/credit-notes/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-credit-notes-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/credit-notes/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["credit-note-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/credit-notes/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),
    enabled: open,
  });

  const { data: invoiceDetail, isLoading: invoiceLoading } = useQuery({
    queryKey: ["credit-note-invoice", form.invoice],
    queryFn: async () =>
      unwrap(
        await api.get(`/sales/credit-notes/invoice-options/${form.invoice}/`),
      ),
    enabled: open && Boolean(form.invoice),
    staleTime: 0,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["sales-credit-note", editingId],
    queryFn: async () =>
      unwrap(await api.get(`/sales/credit-notes/${editingId}/`)),
    enabled: open && Boolean(editingId),
    staleTime: 0,
  });

  const summary = summaryResponse || {};

  const options = optionsResponse || {};

  const invoices = normalizeList(options.invoices);

  React.useEffect(() => {
    if (!invoiceDetail || editingId) return;

    setForm((current) => ({
      ...current,
      customer: invoiceDetail.customer_id
        ? String(invoiceDetail.customer_id)
        : "",
      branch: invoiceDetail.branch_id
        ? String(invoiceDetail.branch_id)
        : current.branch,
      items: (invoiceDetail.items || []).map((item) => ({
        invoice_item: item.id,
        product: item.product_id,
        variant: item.variant_id || null,
        description: item.description || item.product_name || "",
        invoiced_quantity: number(item.invoiced_quantity),
        already_credited_quantity: number(item.already_credited_quantity),
        available_quantity: number(item.available_quantity),
        selected: number(item.available_quantity) > 0,
        credit_quantity: number(item.available_quantity),
        unit_price: number(item.unit_price),
        vat_percentage: number(item.vat_percentage),
      })),
    }));
  }, [invoiceDetail, editingId]);

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      branch: String(existing.branch?.id || existing.branch || ""),
      invoice: String(existing.invoice?.id || existing.invoice || ""),
      customer: String(existing.customer?.id || existing.customer || ""),
      credit_note_number: existing.credit_note_number || "",
      credit_date: existing.credit_date || today(),
      reason: existing.reason || "RETURN_DAMAGED",
      refund_method: existing.refund_method || "CUSTOMER_CREDIT",
      status: existing.status || "DRAFT",
      notes: existing.notes || "",
      items: (existing.items || []).map((item) => ({
        id: item.id,
        invoice_item: item.invoice_item?.id || item.invoice_item || null,
        product: item.product?.id || item.product || null,
        variant: item.variant?.id || item.variant || null,
        description: item.description || item.product_name || "",
        invoiced_quantity: number(item.invoiced_quantity),
        already_credited_quantity: number(item.already_credited_quantity),
        available_quantity: number(item.available_quantity),
        selected: true,
        credit_quantity: number(item.credit_quantity),
        unit_price: number(item.unit_price),
        vat_percentage: number(item.vat_percentage),
      })),
    });
  }, [existing]);

  const selectedItems = form.items.filter(
    (item) => item.selected && number(item.credit_quantity) > 0,
  );

  const calculatedItems = selectedItems.map((item) => {
    const subtotal = number(item.credit_quantity) * number(item.unit_price);

    const vat = (subtotal * number(item.vat_percentage)) / 100;

    return {
      ...item,
      subtotal,
      vat_amount: vat,
      line_total: subtotal + vat,
    };
  });

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  const vatAmount = calculatedItems.reduce(
    (sum, item) => sum + item.vat_amount,
    0,
  );

  const total = subtotal + vatAmount;

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));

    setErrors((current) => ({
      ...current,
      items: "",
    }));
  };

  const openNew = () => {
    setEditingId(null);
    setErrors({});
    setForm(createForm(branchId));
    setOpen(true);
  };

  const openExisting = (row) => {
    setEditingId(row.id);
    setErrors({});
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setErrors({});
    setForm(createForm(branchId));
  };

  const validate = () => {
    const next = {};

    if (!form.invoice) {
      next.invoice = "Related invoice is required.";
    }

    if (!form.credit_date) {
      next.credit_date = "Credit-note date is required.";
    }

    if (!selectedItems.length) {
      next.items = "Select at least one invoice item.";
    }

    for (const item of selectedItems) {
      if (number(item.credit_quantity) <= 0) {
        next.items = "Credit quantity must be greater than zero.";
      }

      if (number(item.credit_quantity) > number(item.available_quantity)) {
        next.items =
          "Credit quantity cannot exceed the remaining invoice quantity.";
      }
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ status }) => {
      const payload = {
        branch: form.branch ? Number(form.branch) : null,
        invoice: Number(form.invoice),
        customer: form.customer ? Number(form.customer) : null,
        credit_note_number: form.credit_note_number || undefined,
        credit_date: form.credit_date,
        reason: form.reason,
        refund_method: form.refund_method,
        status,
        notes: form.notes,
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),
          invoice_item: item.invoice_item ? Number(item.invoice_item) : null,
          product: item.product ? Number(item.product) : null,
          variant: item.variant ? Number(item.variant) : null,
          invoiced_quantity: number(item.invoiced_quantity),
          credit_quantity: number(item.credit_quantity),
          unit_price: number(item.unit_price),
          vat_percentage: number(item.vat_percentage),
        })),
      };

      return editingId
        ? api.patch(`/sales/credit-notes/${editingId}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/sales/credit-notes/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-credit-notes"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sales-credit-notes-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sales-invoices"],
        }),
      ]);

      toast.success(
        variables.status === "ISSUED"
          ? "Credit note issued."
          : "Credit note saved as draft.",
      );

      close();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save credit note", {
        description:
          details.summary ||
          details.message ||
          "Please review the credit-note details.",
      });
    },
  });

  const submit = (status) => {
    if (!validate()) return;

    saveMutation.mutate({
      status,
    });
  };

  const exportCreditNotes = async () => {
    const response = await api.get("/sales/credit-notes/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "sales-credit-notes.csv";

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const columns = React.useMemo(
    () => [
      {
        key: "credit_note_number",
        header: "Credit Note #",
        sortKey: "credit_note_number",
        sortType: "text",
        cell: (row) => (
          <button
            type="button"
            onClick={() => openExisting(row)}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.credit_note_number}
          </button>
        ),
      },
      {
        key: "customer_name",
        header: "Customer",
        sortKey: "customer__customer_name",
        sortType: "text",
      },
      {
        key: "invoice_number",
        header: "Related Invoice",
        sortKey: "invoice__invoice_number",
        sortType: "text",
      },
      {
        key: "credit_date",
        header: "Date",
        sortKey: "credit_date",
        sortType: "date",
        cell: (row) =>
          row.credit_date ? <DateText value={row.credit_date} /> : "—",
      },
      {
        key: "total_amount",
        header: "Amount",
        sortKey: "total_amount",
        sortType: "currency",
        align: "right",
        cell: (row) => (
          <CurrencyText
            value={row.total_amount}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Credit Notes"
        subtitle="Adjustments and refunds issued against invoices"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportCreditNotes}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              type="button"
              onClick={openNew}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Credit Note
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open Credit Notes"
          value={summary.open_credit_notes || 0}
        />

        <MetricCard
          label="Value Issued (MTD)"
          value={<CurrencyText value={summary.value_issued_mtd || 0} />}
        />

        <MetricCard
          label="Linked to Returns"
          value={`${summary.linked_to_returns || 0} of ${summary.total_credit_notes || 0}`}
        />

        <MetricCard
          label="Avg. Processing Time"
          value={`${summary.avg_processing_days || 0} day(s)`}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Credit Notes</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjustments and refunds issued against invoices
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search credit note, customer, or invoice"
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
          emptyTitle="No credit notes"
          emptyDescription="Issue a credit note against an invoice."
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-3xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingId ? "Edit Credit Note" : "New Credit Note"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {form.credit_note_number
                    ? `Credit note #${form.credit_note_number}`
                    : "Credit note number will be generated automatically"}
                  {" · "}
                  {form.status.toLowerCase()}
                </p>
              </div>

              <Button type="button" size="icon" variant="ghost" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Related Invoice *</Label>

                  <Select
                    value={form.invoice}
                    onValueChange={(value) => {
                      updateForm("invoice", value);

                      setForm((current) => ({
                        ...current,
                        invoice: value,
                        items: [],
                      }));
                    }}
                    disabled={Boolean(editingId)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={String(invoice.id)}>
                          {invoice.invoice_number}
                          {" — "}
                          {invoice.customer_name}
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
                  <Label>Credit Note Date *</Label>

                  <Input
                    type="date"
                    value={form.credit_date}
                    onChange={(event) =>
                      updateForm("credit_date", event.target.value)
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              {invoiceDetail && (
                <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-4 dark:bg-white/[0.025]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1 font-semibold">
                      {invoiceDetail.customer_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Invoice Total
                    </p>
                    <div className="mt-1 font-semibold">
                      <CurrencyText value={invoiceDetail.invoice_total} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Already Credited
                    </p>
                    <div className="mt-1 font-semibold">
                      <CurrencyText value={invoiceDetail.already_credited} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Linked Return
                    </p>
                    <p className="mt-1 font-semibold">
                      {invoiceDetail.linked_return_number || "—"}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label>Reason</Label>

                <div className="mt-2 flex flex-wrap gap-2">
                  {reasonOptions.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => updateForm("reason", reason.value)}
                      className={
                        form.reason === reason.value
                          ? "rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-full border border-slate-200 px-4 py-2 text-sm dark:border-white/10"
                      }
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Items to Credit</Label>

                <div className="mt-2 overflow-hidden rounded-xl border">
                  <div className="grid grid-cols-[42px_minmax(220px,1fr)_100px_100px_110px] gap-3 border-b bg-slate-50 px-3 py-3 text-[10px] uppercase tracking-wider text-muted-foreground dark:bg-white/[0.025]">
                    <span />
                    <span>Item</span>
                    <span className="text-right">Invoiced Qty</span>
                    <span className="text-right">Qty to Credit</span>
                    <span className="text-right">Line Total</span>
                  </div>

                  {invoiceLoading || existingLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Loading invoice items...
                    </div>
                  ) : form.items.length ? (
                    form.items.map((item, index) => {
                      const line =
                        number(item.credit_quantity) * number(item.unit_price);

                      const lineVat =
                        (line * number(item.vat_percentage)) / 100;

                      return (
                        <div
                          key={item.id || item.invoice_item || index}
                          className="grid grid-cols-[42px_minmax(220px,1fr)_100px_100px_110px] items-center gap-3 border-b px-3 py-3 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) =>
                              updateItem(index, {
                                selected: event.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />

                          <div>
                            <p className="font-medium">
                              {item.description || "Invoice item"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              AED {number(item.unit_price).toFixed(2)}
                              {" / unit"}
                            </p>
                          </div>

                          <div className="text-right">
                            {item.invoiced_quantity}
                          </div>

                          <Input
                            type="number"
                            min="0"
                            max={item.available_quantity}
                            step="0.01"
                            value={item.credit_quantity}
                            onChange={(event) =>
                              updateItem(index, {
                                credit_quantity: event.target.value,
                              })
                            }
                            disabled={!item.selected}
                            className="text-right"
                          />

                          <div className="text-right font-semibold">
                            <CurrencyText value={line + lineVat} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Select an invoice to load creditable items.
                    </div>
                  )}
                </div>

                {errors.items && (
                  <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Refund Method</Label>

                  <Select
                    value={form.refund_method}
                    onValueChange={(value) =>
                      updateForm("refund_method", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="CUSTOMER_CREDIT">
                        Credit to Customer Account
                      </SelectItem>

                      <SelectItem value="BANK_REFUND">Bank Refund</SelectItem>

                      <SelectItem value="CASH_REFUND">Cash Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>

                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm("status", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>

                      <SelectItem value="ISSUED">Issued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes (Optional)</Label>

                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Add a note explaining this credit note"
                  className="mt-2"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-5 dark:bg-white/[0.025]">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal Credited
                    </span>
                    <CurrencyText value={subtotal} />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <CurrencyText value={vatAmount} />
                  </div>

                  <div className="flex justify-between border-t pt-3 text-base font-semibold">
                    <span>Total Credit Amount</span>
                    <CurrencyText value={total} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => submit("DRAFT")}
                disabled={saveMutation.isPending}
              >
                Save as Draft
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => submit("ISSUED")}
                  disabled={saveMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Issue Credit Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
