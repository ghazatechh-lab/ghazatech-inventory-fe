import React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Edit, Mail } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { downloadSalesPdf } from "@/lib/salesPdf";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const getEntityId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return String(value.id || "");
  return String(value);
};

const isInvoiceEditLocked = (paymentStatus) =>
  ["PAID", "VOID"].includes(
    String(paymentStatus || "").toUpperCase(),
  );

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => unwrap(await api.get(`/sales/invoices/${id}/`)),
  });

  const invoiceCustomerId = getEntityId(invoice?.customer);

  const { data: customerDetail } = useQuery({
    queryKey: ["invoice-pdf-customer", invoiceCustomerId],
    queryFn: async () =>
      unwrap(await api.get(`/customers/${invoiceCustomerId}/`)),
    enabled: Boolean(invoiceCustomerId),
    staleTime: 60_000,
  });

  const sendReminder = useMutation({
    mutationFn: async () => api.post(`/sales/invoices/${id}/send-reminder/`),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["sales-invoice", id],
      });

      toast.success("Payment reminder queued.");
    },
  });

  if (isLoading) {
    return <div className="card-surface p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="card-surface p-6">Invoice not found.</div>;
  }

  const downloadInvoicePdf = () => {
    try {
      downloadSalesPdf({
        type: "INVOICE",
        number: invoice.invoice_number || "DRAFT",
        date: invoice.invoice_date,
        secondaryLabel: "Due Date",
        secondaryValue: invoice.due_date,
        paymentTerms: invoice.payment_terms,
        customerPo: invoice.customer_po_number,
        customer:
          customerDetail || {
            customer_name: invoice.customer_name || "Customer",
          },
        items: invoice.items || [],
        products: [],
        subtotal: invoice.subtotal,
        vatAmount: invoice.vat_amount,
        discountAmount: invoice.discount_amount,
        shippingAmount: invoice.shipping_amount,
        paidAmount: invoice.paid_amount,
        total: invoice.total_amount,
        currency: invoice.currency || "AED",
        notes: invoice.notes,
        status: invoice.payment_status || invoice.status,
      });

      toast.success("Invoice PDF downloaded.");
    } catch (error) {
      console.error("[Invoice Detail PDF] Failed:", error);
      toast.error("Unable to generate invoice PDF.");
    }
  };

  const editLocked = isInvoiceEditLocked(invoice.payment_status);

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={invoice.invoice_number}
        subtitle="Invoice details, balance, and payment status"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadInvoicePdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => sendReminder.mutate()}
              disabled={sendReminder.isPending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Reminder
            </Button>

            {!editLocked && (
              <Button
                asChild
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Link to={`/sales/invoices/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {editLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">This invoice is read-only.</p>
          <p className="mt-1 text-xs leading-5">
            {String(invoice.payment_status || "").replaceAll("_", " ")} invoices
            cannot be edited.
          </p>
        </div>
      )}

      <section className="card-surface p-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="mt-1 font-medium">{invoice.customer_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="mt-1 font-medium">{invoice.branch_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Issue Date</p>
            <div className="mt-1 font-medium">
              {invoice.invoice_date ? (
                <DateText value={invoice.invoice_date} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <div className="mt-1 font-medium">
              {invoice.due_date ? <DateText value={invoice.due_date} /> : "—"}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={invoice.payment_status} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Sales Order</p>
            <p className="mt-1 font-medium">
              {invoice.sales_order_number || "Standalone invoice"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Paid Amount</p>
            <div className="mt-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CurrencyText
                value={invoice.paid_amount}
                currency={invoice.currency || "AED"}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Balance Due</p>
            <div className="mt-1 text-lg font-semibold">
              <CurrencyText
                value={invoice.balance_due}
                currency={invoice.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">Invoice Items</h2>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3">Item</th>
                <th>Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">VAT</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {(invoice.items || []).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium">
                    {item.product_name || "—"}
                  </td>
                  <td>{item.description || "—"}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">
                    <CurrencyText
                      value={item.unit_price}
                      currency={invoice.currency || "AED"}
                    />
                  </td>
                  <td className="text-right">{item.vat_percentage}%</td>
                  <td className="text-right font-medium">
                    <CurrencyText
                      value={item.line_total}
                      currency={invoice.currency || "AED"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-6 max-w-sm space-y-3 rounded-xl border bg-slate-50 p-5 text-sm dark:border-white/10 dark:bg-white/[0.025]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyText
                value={invoice.subtotal}
                currency={invoice.currency || "AED"}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <CurrencyText
                value={invoice.vat_amount}
                currency={invoice.currency || "AED"}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <CurrencyText
                value={invoice.paid_amount}
                currency={invoice.currency || "AED"}
              />
            </div>

            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Amount Due</span>
              <CurrencyText
                value={invoice.balance_due}
                currency={invoice.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Payment Instructions</h2>

        <div className="mt-4 rounded-xl border p-4">
          <p className="font-medium">
            {invoice.bank_account_name || "No bank account selected"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {invoice.bank_account_iban ||
              "Bank instructions are not available."}
          </p>
        </div>

        {invoice.notes && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {invoice.notes}
          </p>
        )}
      </section>
    </div>
  );
}