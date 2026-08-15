import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  MapPin,
  Package,
  Printer,
  RefreshCcw,
  Truck,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const DEFAULT_TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["DRAFT", "APPROVED", "CANCELLED"],
  APPROVED: [],
  PARTIALLY_RECEIVED: [],
  RECEIVED: [],
  CANCELLED: [],
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

const numberValue = (value) => Number(value || 0);

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function PODetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = React.useState("");

  const purchaseOrderQuery = useQuery({
    queryKey: ["purchase-order", id],

    queryFn: async () => unwrap(await api.get(`/purchases/orders/${id}/`)),

    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const purchaseOrder = purchaseOrderQuery.data;

  React.useEffect(() => {
    setSelectedStatus("");
  }, [purchaseOrder?.status]);

  const updateStatus = useMutation({
    mutationFn: async (status) =>
      api.post(
        `/purchases/orders/${id}/update-status/`,
        {
          status,
        },
        {
          skipGlobalErrorToast: true,
        },
      ),

    onSuccess: async (response) => {
      const payload = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["purchase-order", id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["purchase-orders"],
          exact: false,
        }),
      ]);

      await purchaseOrderQuery.refetch();

      setSelectedStatus("");

      toast.success(payload?.message || "Purchase-order status updated.");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      const responseData = error?.response?.data;

      toast.error(details.title || "Unable to update status", {
        description:
          responseData?.status ||
          responseData?.detail ||
          details.summary ||
          details.message,
      });
    },
  });

  if (purchaseOrderQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading purchase order...
      </div>
    );
  }

  if (purchaseOrderQuery.isError || !purchaseOrder) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/purchases/orders")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Purchase Orders
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          Unable to load this purchase order.
        </div>
      </div>
    );
  }

  const items = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

  const allowedStatuses = Array.isArray(purchaseOrder.allowed_statuses)
    ? purchaseOrder.allowed_statuses
    : DEFAULT_TRANSITIONS[purchaseOrder.status] || [];

  const lineDiscountTotal = items.reduce(
    (sum, item) => sum + numberValue(item.discount_amount),
    0,
  );

  const orderDiscount = numberValue(purchaseOrder.discount_amount);

  const subtotal = numberValue(purchaseOrder.subtotal);

  const vatAmount = numberValue(purchaseOrder.vat_amount);

  const shipping = numberValue(purchaseOrder.shipping_amount);

  const totalAmount = numberValue(purchaseOrder.total_amount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchaseOrder.po_number || "Purchase Order"}
        subtitle="Purchase-order details, products, receiving progress, and workflow status."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchases/orders")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => purchaseOrderQuery.refetch()}
              disabled={purchaseOrderQuery.isFetching}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            {![
              "APPROVED",
              "PARTIALLY_RECEIVED",
              "RECEIVED",
              "CANCELLED",
            ].includes(purchaseOrder.status) && (
              <Button asChild>
                <Link to={`/purchases/orders/${id}/edit`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Order</p>

                <h2 className="mt-1 text-2xl font-semibold">
                  {purchaseOrder.po_number}
                </h2>
              </div>

              <StatusBadge status={purchaseOrder.status} />
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={UserRound}
                label="Supplier"
                value={
                  purchaseOrder.supplier_name ||
                  purchaseOrder.supplier?.supplier_name
                }
              />

              <InfoItem
                icon={MapPin}
                label="Branch"
                value={
                  purchaseOrder.branch_code
                    ? `${purchaseOrder.branch_code} — ${purchaseOrder.branch_name || ""}`
                    : purchaseOrder.branch_name
                }
              />

              <InfoItem
                icon={CalendarDays}
                label="Order Date"
                value={formatDate(purchaseOrder.order_date)}
              />

              <InfoItem
                icon={Truck}
                label="Expected Delivery"
                value={formatDate(purchaseOrder.expected_delivery_date)}
              />

              <InfoItem
                icon={Package}
                label="Supplier Reference"
                value={purchaseOrder.supplier_reference || "—"}
              />

              <InfoItem
                icon={CheckCircle2}
                label="Payment Status"
                value={purchaseOrder.payment_status || "UNPAID"}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-semibold">Products</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {items.length} product line
                {items.length === 1 ? "" : "s"} in this purchase order.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      Product
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      Variant
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Ordered
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Received
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Remaining
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Unit Cost
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Discount
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      VAT
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => {
                    const productName =
                      item.product_name ||
                      item.product?.product_name ||
                      item.product?.name ||
                      "Product";

                    const sku = item.sku || item.product?.sku || "—";

                    const remaining =
                      item.remaining_quantity ??
                      Math.max(
                        0,
                        numberValue(item.quantity) -
                          numberValue(item.received_quantity),
                      );

                    return (
                      <tr
                        key={item.id || `${item.product}-${item.variant}`}
                        className="border-b"
                      >
                        <td className="px-4 py-4">
                          <div className="purchase-module-page purchase-workspace flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>

                            <div>
                              <p className="font-medium">{productName}</p>

                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                SKU: {sku}
                              </p>

                              {item.description && (
                                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {item.variant_name ||
                            item.variant?.display_name ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {numberValue(item.quantity)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {numberValue(item.received_quantity)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {numberValue(remaining)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <CurrencyText value={item.unit_price} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <CurrencyText value={item.discount_amount} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <CurrencyText value={item.vat_amount} />
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          <CurrencyText value={item.line_total} />
                        </td>
                      </tr>
                    );
                  })}

                  {!items.length && (
                    <tr>
                      <td colSpan="9" className="p-12 text-center">
                        <Package className="mx-auto h-9 w-9 text-muted-foreground" />

                        <p className="mt-3 font-medium">No products found</p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          This purchase order has no nested item records in the
                          API response.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {purchaseOrder.notes && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Notes</h2>

              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {purchaseOrder.notes}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          {purchaseOrder.status === "PENDING_APPROVAL" ? (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Approval Status</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Current status:{" "}
                <strong>
                  {STATUS_LABELS[purchaseOrder.status] || purchaseOrder.status}
                </strong>
              </p>

              {allowedStatuses.length ? (
                <>
                  <select
                    className="mt-4 h-10 w-full rounded-md border bg-background px-3"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                  >
                    <option value="">Select action</option>

                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status] || status}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    className="mt-3 w-full"
                    disabled={!selectedStatus || updateStatus.isPending}
                    onClick={() => updateStatus.mutate(selectedStatus)}
                  >
                    {updateStatus.isPending ? "Updating..." : "Update Status"}
                  </Button>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Order Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Gross subtotal</span>

                <CurrencyText value={subtotal} />
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Line discounts</span>

                <CurrencyText value={-lineDiscountTotal} />
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Order discount</span>

                <CurrencyText value={-orderDiscount} />
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">VAT</span>

                <CurrencyText value={vatAmount} />
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Shipping</span>

                <CurrencyText value={shipping} />
              </div>

              <div className="flex justify-between gap-4 border-t pt-4 text-base font-semibold">
                <span>Total</span>

                <CurrencyText value={totalAmount} />
              </div>
            </div>
          </section>

          {["APPROVED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status) ? (
            <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-500/20 dark:from-blue-500/10 dark:via-background dark:to-indigo-500/10">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Shipment Required
                    </h2>

                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                      This purchase order is approved. Log the incoming shipment
                      before creating the GRN.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="mt-5 h-11 w-full bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Link
                    to={`/shipments/new?purchase_order=${purchaseOrder.id}`}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Log Shipment
                  </Link>
                </Button>

                <p className="mt-3 text-center text-[11px] text-slate-500">
                  Next: Shipment → GRN → Stock Receipt
                </p>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
