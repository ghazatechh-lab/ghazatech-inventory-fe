import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  FileText,
  PackageCheck,
  Pencil,
  ReceiptText,
  WalletCards,
  HandCoins,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

const value = (...items) => {
  for (const item of items) {
    if (item !== undefined && item !== null && String(item).trim()) {
      return item;
    }
  }

  return "—";
};

function MetricCard({ label, amount, currency, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <CurrencyText
            value={amount}
            currency={currency}
            className="mt-1 block text-xl font-bold"
          />
        </div>
      </div>
    </div>
  );
}

export default function SupplierBillDetailPage() {
  const { id } = useParams();

  const billQuery = useQuery({
    queryKey: ["supplier-bill", id],
    queryFn: async () =>
      unwrap(
        await api.get(`/purchases/supplier-bills/${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
  });

  if (billQuery.isLoading) {
    return (
      <div className="purchase-module-page purchase-workspace">
        <div className="card-surface p-10 text-center text-muted-foreground">
          Loading supplier bill...
        </div>
      </div>
    );
  }

  if (billQuery.isError || !billQuery.data) {
    return (
      <div className="purchase-module-page purchase-workspace space-y-4">
        <Button asChild variant="outline">
          <Link to="/purchases/supplier-bills">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Supplier Bills
          </Link>
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load this supplier bill.
        </div>
      </div>
    );
  }

  const bill = billQuery.data;
  const currency = bill.currency || "AED";
  const items = normalizeList(bill.items);
  const attachments = normalizeList(bill.attachments);
  const allocations = normalizeList(
    bill.payment_allocations || bill.allocations,
  );
  const billStatus = String(bill.status || "").toUpperCase();
  const canRecordPayment =
    Boolean(bill.approved_at) &&
    numberValue(bill.balance_due) > 0 &&
    !["PAID", "CANCELLED"].includes(billStatus);

  return (
    <div className="purchase-module-page purchase-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={bill.bill_number || `Supplier Bill ${id}`}
        subtitle="Supplier invoice, received items, payments and outstanding balance"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/purchases/supplier-bills">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>

            {canRecordPayment ? (
              <Button asChild>
                <Link
                  to={`/purchases/supplier-payments/new?bill=${bill.id}&supplier=${bill.supplier?.id || bill.supplier || ""}&branch=${bill.branch?.id || bill.branch || ""}`}
                >
                  <HandCoins className="mr-2 h-4 w-4" />
                  Record Supplier Payment
                </Link>
              </Button>
            ) : null}

            {!bill.approved_at ? (
              <Button asChild variant="outline">
                <Link to={`/purchases/supplier-bills/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Bill / Change Status
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Bill total"
          amount={bill.total_amount}
          currency={currency}
          icon={ReceiptText}
        />

        <MetricCard
          label="Paid amount"
          amount={bill.paid_amount}
          currency={currency}
          icon={Banknote}
        />

        <MetricCard
          label="Balance due"
          amount={bill.balance_due}
          currency={currency}
          icon={WalletCards}
        />

        <MetricCard
          label="VAT amount"
          amount={bill.vat_amount}
          currency={currency}
          icon={FileText}
        />
      </section>

      <section className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Bill information</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Supplier, source documents and payment status
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={bill.status || "DRAFT"} />
            <StatusBadge status={bill.match_status || "UNMATCHED"} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <Link
              to={`/suppliers/${bill.supplier}`}
              className="mt-1 block font-medium text-blue-600 hover:underline"
            >
              {value(bill.supplier_name, bill.supplier_code)}
            </Link>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Supplier invoice</p>
            <p className="mt-1 font-medium">
              {value(bill.supplier_invoice_number)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="mt-1 font-medium">
              {value(bill.branch_name, bill.branch_code)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Bill date</p>
            <div className="mt-1 font-medium">
              {bill.bill_date ? <DateText value={bill.bill_date} /> : "—"}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <div className="mt-1 font-medium">
              {bill.due_date ? <DateText value={bill.due_date} /> : "—"}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Purchase order</p>
            {bill.purchase_order ? (
              <Link
                to={`/purchases/orders/${bill.purchase_order}`}
                className="mt-1 block font-medium text-blue-600 hover:underline"
              >
                {value(bill.po_number)}
              </Link>
            ) : (
              <p className="mt-1 font-medium">—</p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground">GRN</p>
            {bill.grn ? (
              <Link
                to={`/purchases/grn/${bill.grn}`}
                className="mt-1 block font-medium text-blue-600 hover:underline"
              >
                {value(bill.grn_number)}
              </Link>
            ) : (
              <p className="mt-1 font-medium">—</p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Approved by</p>
            <p className="mt-1 font-medium">{value(bill.approved_by_name)}</p>
            {bill.approved_at ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <DateText value={bill.approved_at} />
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Bill items</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} line item{items.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto p-5">
          {items.length ? (
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3">Product</th>
                  <th>Variant / SKU</th>
                  <th className="text-right">Received</th>
                  <th className="text-right">Billed</th>
                  <th className="text-right">Unit cost</th>
                  <th className="text-right">Discount</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Line total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-3 font-medium">
                      {value(item.product_name)}
                    </td>

                    <td>
                      {[item.variant_name, item.sku]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>

                    <td className="text-right">
                      {numberValue(item.received_quantity)}
                    </td>

                    <td className="text-right">
                      {numberValue(item.bill_quantity ?? item.quantity)}
                    </td>

                    <td className="text-right">
                      <CurrencyText
                        value={item.unit_cost ?? item.unit_price}
                        currency={currency}
                      />
                    </td>

                    <td className="text-right">
                      <CurrencyText
                        value={item.discount_amount}
                        currency={currency}
                      />
                    </td>

                    <td className="text-right">
                      {numberValue(item.vat_percentage)}%
                    </td>

                    <td className="text-right font-medium">
                      <CurrencyText
                        value={item.line_total}
                        currency={currency}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No bill items were returned by the API.
            </div>
          )}

          <div className="ml-auto mt-6 max-w-sm space-y-3 rounded-xl border bg-muted/25 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyText value={bill.subtotal} currency={currency} />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <CurrencyText value={bill.discount_amount} currency={currency} />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <CurrencyText value={bill.vat_amount} currency={currency} />
            </div>

            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <CurrencyText value={bill.total_amount} currency={currency} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Payment allocations</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Payments applied against this supplier bill
              </p>
            </div>
          </div>

          <div className="mt-5">
            {allocations.length ? (
              <div className="space-y-2">
                {allocations.map((allocation) => (
                  <Link
                    key={allocation.id}
                    to={`/purchases/supplier-payments/${allocation.payment}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {value(
                          allocation.payment_number,
                          `Payment ${allocation.payment}`,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {allocation.payment_date ? (
                          <DateText value={allocation.payment_date} />
                        ) : (
                          "—"
                        )}
                        {" · "}
                        {String(
                          allocation.payment_method || "Payment",
                        ).replaceAll("_", " ")}
                      </p>
                    </div>

                    <CurrencyText
                      value={allocation.amount}
                      currency={currency}
                      className="font-semibold"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No payments have been allocated to this bill.
              </div>
            )}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Attachments</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Supplier invoice and supporting files
              </p>
            </div>
          </div>

          <div className="mt-5">
            {attachments.length ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url || attachment.file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border p-3 transition hover:bg-muted/30"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {value(
                          attachment.original_name,
                          attachment.file_name,
                          "Bill attachment",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Open attachment
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No attachments uploaded.
              </div>
            )}
          </div>
        </section>
      </div>

      {bill.notes ? (
        <section className="card-surface p-5">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {bill.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
