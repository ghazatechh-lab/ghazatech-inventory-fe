import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Download, Edit } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: async () => unwrap(await api.get(`/sales/orders/${id}/`)),
  });

  const convert = useMutation({
    mutationFn: async () => api.post(`/sales/orders/${id}/convert-to-invoice/`),

    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });

      toast.success("Invoice created from sales order.");

      const invoice = unwrap(response);
      navigate(`/sales/invoices/${invoice.id}`);
    },
  });

  const confirm = useMutation({
    mutationFn: async () => api.post(`/sales/orders/${id}/confirm/`),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["sales-order", id],
      });
      toast.success("Sales order confirmed.");
    },
  });

  if (isLoading) {
    return <div className="card-surface p-6">Loading sales order...</div>;
  }

  if (!order) {
    return <div className="card-surface p-6">Sales order not found.</div>;
  }

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={order.order_number}
        subtitle="Sales order details, fulfillment, and invoice conversion"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>

            <Button asChild variant="outline">
              <Link to={`/sales/orders/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            {order.status === "DRAFT" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Order
              </Button>
            )}

            {!["CANCELLED", "FULFILLED"].includes(order.status) && (
              <Button
                type="button"
                onClick={() => convert.mutate()}
                disabled={convert.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            )}
          </div>
        }
      />

      <section className="card-surface p-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="mt-1 font-medium">{order.customer_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="mt-1 font-medium">{order.branch_name || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Order Date</p>
            <div className="mt-1 font-medium">
              {order.order_date ? <DateText value={order.order_date} /> : "—"}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Delivery Date</p>
            <div className="mt-1 font-medium">
              {order.delivery_date ? (
                <DateText value={order.delivery_date} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={order.status} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Source Quotation</p>
            <p className="mt-1 font-medium">
              {order.quotation_number || "Standalone order"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Delivery Method</p>
            <p className="mt-1 font-medium">
              {order.delivery_method_display || order.delivery_method || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <div className="mt-1 text-lg font-semibold">
              <CurrencyText
                value={order.total_amount}
                currency={order.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Shipping Address</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_240px]">
          <p className="text-sm text-muted-foreground">
            {order.shipping_address || "No shipping address"}
          </p>
          <p className="text-sm font-medium">{order.emirate || "—"}</p>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">Order Items</h2>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3">Item</th>
                <th>Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Fulfilled</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">VAT</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium">
                    {item.product_name || "—"}
                  </td>
                  <td>{item.description || "—"}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{item.fulfilled_quantity || 0}</td>
                  <td className="text-right">
                    <CurrencyText
                      value={item.unit_price}
                      currency={order.currency || "AED"}
                    />
                  </td>
                  <td className="text-right">{item.vat_percentage}%</td>
                  <td className="text-right font-medium">
                    <CurrencyText
                      value={item.line_total}
                      currency={order.currency || "AED"}
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
                value={order.subtotal}
                currency={order.currency || "AED"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <CurrencyText
                value={order.vat_amount}
                currency={order.currency || "AED"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <CurrencyText
                value={order.shipping_amount}
                currency={order.currency || "AED"}
              />
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <CurrencyText
                value={order.total_amount}
                currency={order.currency || "AED"}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
