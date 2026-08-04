import React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Edit, Mail } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => unwrap(await api.get(`/sales/invoices/${id}/`)),
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

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={invoice.invoice_number}
        subtitle="Invoice details, balance, and payment status"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
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

            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link to={`/sales/invoices/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

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
