import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, Edit, Send } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotation", id],

    queryFn: async () => unwrap(await api.get(`/sales/quotations/${id}/`)),
  });

  const convert = useMutation({
    mutationFn: async () =>
      api.post(`/sales/quotations/${id}/convert-to-order/`),

    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["quotations"],
      });

      toast.success("Quotation converted to sales order.");

      const order = unwrap(response);

      navigate(`/sales/orders/${order.id}`);
    },
  });

  if (isLoading) {
    return <div className="card-surface p-6">Loading quotation...</div>;
  }

  if (!quotation) {
    return <div className="card-surface p-6">Quotation not found.</div>;
  }

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={quotation.quote_number}
        subtitle="Quotation details and customer pricing"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>

            <Button asChild variant="outline">
              <Link to={`/sales/quotations/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            {!["CONVERTED", "REJECTED", "EXPIRED"].includes(
              quotation.status,
            ) && (
              <Button
                type="button"
                onClick={() => convert.mutate()}
                disabled={convert.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Convert to Sales Order
              </Button>
            )}
          </div>
        }
      />

      <section className="card-surface p-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>

            <p className="mt-1 font-medium">{quotation.customer_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Branch</p>

            <p className="mt-1 font-medium">{quotation.branch_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Quote Date</p>

            <div className="mt-1 font-medium">
              {quotation.quote_date ? (
                <DateText value={quotation.quote_date} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Valid Until</p>

            <div className="mt-1 font-medium">
              {quotation.valid_until ? (
                <DateText value={quotation.valid_until} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Status</p>

            <div className="mt-1">
              <StatusBadge status={quotation.status} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Payment Terms</p>

            <p className="mt-1 font-medium">{quotation.payment_terms || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Delivery Terms</p>

            <p className="mt-1 font-medium">
              {quotation.delivery_terms || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Total</p>

            <div className="mt-1 text-lg font-semibold">
              <CurrencyText
                value={quotation.total_amount}
                currency={quotation.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">Quotation Items</h2>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[760px] text-sm">
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
              {(quotation.items || []).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium">
                    {item.product_name || "—"}
                  </td>

                  <td>{item.description || "—"}</td>

                  <td className="text-right">{item.quantity}</td>

                  <td className="text-right">
                    <CurrencyText
                      value={item.unit_price}
                      currency={quotation.currency || "AED"}
                    />
                  </td>

                  <td className="text-right">{item.vat_percentage}%</td>

                  <td className="text-right font-medium">
                    <CurrencyText
                      value={item.line_total}
                      currency={quotation.currency || "AED"}
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
                value={quotation.subtotal}
                currency={quotation.currency || "AED"}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>

              <CurrencyText
                value={quotation.vat_amount}
                currency={quotation.currency || "AED"}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>

              <CurrencyText
                value={quotation.discount_amount}
                currency={quotation.currency || "AED"}
              />
            </div>

            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>

              <CurrencyText
                value={quotation.total_amount}
                currency={quotation.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>

      {quotation.notes && (
        <section className="card-surface p-5">
          <h2 className="font-semibold">Notes</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {quotation.notes}
          </p>
        </section>
      )}
    </div>
  );
}
