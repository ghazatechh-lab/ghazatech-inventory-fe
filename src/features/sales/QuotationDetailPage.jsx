import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, Edit } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getItemProductName = (item) =>
  item?.product_name ||
  item?.product?.product_name ||
  item?.product?.name ||
  item?.product?.display_name ||
  (item?.product_id ? `Product ${item.product_id}` : "—");

const getItemVariantName = (item) =>
  item?.variant_name ||
  item?.variant?.display_name ||
  item?.variant?.variant_name ||
  item?.variant?.name ||
  "";

const getItemVatPercentage = (item) =>
  numberValue(item?.vat_percentage ?? item?.tax_rate ?? 0);

const getItemLineTotal = (item) => {
  const direct = item?.line_total ?? item?.total_amount ?? item?.total;

  if (direct !== null && direct !== undefined && direct !== "") {
    return numberValue(direct);
  }

  const quantity = numberValue(item?.quantity);
  const unitPrice = numberValue(item?.unit_price);
  const rate = getItemVatPercentage(item);
  const subtotal = quantity * unitPrice;

  return subtotal + (subtotal * rate) / 100;
};

const getQuotationItems = (quotation) => {
  const candidates = [
    quotation?.items,
    quotation?.quotation_items,
    quotation?.lines,
    quotation?.line_items,
    quotation?.data?.items,
  ];

  for (const candidate of candidates) {
    const list = normalizeList(candidate);
    if (list.length) return list;
  }

  return [];
};

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => unwrap(await api.get(`/sales/quotations/${id}/`)),
    staleTime: 0,
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

  const items = getQuotationItems(quotation);

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
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"} in this quotation
          </p>
        </div>

        <div className="overflow-x-auto p-5">
          {items.length ? (
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3">Item</th>
                  <th>Variant / SKU</th>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const variantName = getItemVariantName(item);
                  const sku =
                    item?.sku || item?.variant?.sku || item?.product?.sku || "";

                  return (
                    <tr
                      key={item.id || `${item.product_id || "item"}-${index}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-3 font-medium">
                        {getItemProductName(item)}
                      </td>

                      <td>
                        {[variantName, sku].filter(Boolean).join(" · ") || "—"}
                      </td>

                      <td>{item.description || "—"}</td>

                      <td className="text-right">{item.quantity}</td>

                      <td className="text-right">
                        <CurrencyText
                          value={item.unit_price}
                          currency={quotation.currency || "AED"}
                        />
                      </td>

                      <td className="text-right">
                        {getItemVatPercentage(item)}%
                      </td>

                      <td className="text-right font-medium">
                        <CurrencyText
                          value={getItemLineTotal(item)}
                          currency={quotation.currency || "AED"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No quotation items were returned by the API.
            </div>
          )}

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
