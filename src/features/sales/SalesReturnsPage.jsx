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

const reasons = [
  ["DAMAGED", "Damaged / Defective"],
  ["WRONG_ITEM", "Wrong Item Shipped"],
  ["CUSTOMER_REQUEST", "Customer Changed Mind"],
  ["QUALITY_ISSUE", "Quality Issue"],
  ["OTHER", "Other"],
];

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  sales_order: "",
  invoice: "",
  customer: "",
  return_date: today(),
  reason: "DAMAGED",
  resolution: "CREDIT_NOTE",
  status: "DRAFT",
  notes: "",
  items: [],
});

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-returns",
    "/sales/returns/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-returns-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/returns/summary/", { params: branchParams }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-return-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/returns/form-options/", {
          params: { branch: form.branch || undefined },
        }),
      ),
    enabled: open,
  });

  const { data: orderDetail } = useQuery({
    queryKey: ["sales-return-order", form.sales_order],
    queryFn: async () =>
      unwrap(
        await api.get(`/sales/returns/order-options/${form.sales_order}/`),
      ),
    enabled: open && Boolean(form.sales_order),
    staleTime: 0,
  });

  const summary = summaryResponse || {};
  const options = optionsResponse || {};
  const orders = normalizeList(options.sales_orders);
  const payload = query.data || { results: [], count: 0 };

  React.useEffect(() => {
    if (!orderDetail) return;

    setForm((current) => ({
      ...current,
      branch: orderDetail.branch_id
        ? String(orderDetail.branch_id)
        : current.branch,
      customer: orderDetail.customer_id ? String(orderDetail.customer_id) : "",
      invoice: orderDetail.invoice_id ? String(orderDetail.invoice_id) : "",
      items: (orderDetail.items || []).map((item) => ({
        sales_order_item: item.id,
        product: item.product_id,
        variant: item.variant_id || null,
        description: item.description || item.product_name,
        ordered_quantity: number(item.ordered_quantity),
        already_returned_quantity: number(item.already_returned_quantity),
        available_quantity: number(item.available_quantity),
        returned_quantity: number(item.available_quantity),
        unit_price: number(item.unit_price),
        condition: "SELLABLE",
        selected: number(item.available_quantity) > 0,
      })),
    }));
  }, [orderDetail]);

  const selectedItems = form.items.filter(
    (item) => item.selected && number(item.returned_quantity) > 0,
  );

  const subtotal = selectedItems.reduce(
    (sum, item) =>
      sum + number(item.returned_quantity) * number(item.unit_price),
    0,
  );
  const vatAmount = subtotal * 0.05;
  const total = subtotal + vatAmount;

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setErrors((current) => ({ ...current, items: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.sales_order) next.sales_order = "Sales Order is required.";
    if (!selectedItems.length) next.items = "Select at least one item.";
    if (
      selectedItems.some(
        (item) =>
          number(item.returned_quantity) <= 0 ||
          number(item.returned_quantity) > number(item.available_quantity),
      )
    ) {
      next.items = "Return quantity must be within the remaining quantity.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (status) =>
      api.post(
        "/sales/returns/",
        {
          branch: form.branch ? Number(form.branch) : null,
          sales_order: Number(form.sales_order),
          invoice: form.invoice ? Number(form.invoice) : null,
          customer: form.customer ? Number(form.customer) : null,
          return_date: form.return_date,
          reason: form.reason,
          resolution: form.resolution,
          status,
          notes: form.notes,
          subtotal,
          vat_amount: vatAmount,
          total_amount: total,
          items: selectedItems.map((item) => ({
            sales_order_item: item.sales_order_item,
            product: item.product,
            variant: item.variant,
            ordered_quantity: item.ordered_quantity,
            returned_quantity: number(item.returned_quantity),
            condition: item.condition,
            unit_price: item.unit_price,
          })),
        },
        { skipGlobalErrorToast: true },
      ),

    onSuccess: async (_response, status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales-returns"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-returns-summary"] }),
      ]);
      toast.success(
        status === "DRAFT" ? "Return saved as draft." : "Return submitted.",
      );
      setOpen(false);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save return", {
        description: details.summary || details.message,
      });
    },
  });

  const submit = (status) => {
    if (!validate()) return;
    mutation.mutate(status);
  };

  const exportRows = async () => {
    const response = await api.get("/sales/returns/export/", {
      params: branchParams,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sales-returns.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "return_number", header: "Return #" },
    { key: "customer_name", header: "Customer" },
    { key: "order_number", header: "Related Order" },
    {
      key: "return_date",
      header: "Date",
      cell: (row) => <DateText value={row.return_date} />,
    },
    {
      key: "total_amount",
      header: "Amount",
      align: "right",
      cell: (row) => <CurrencyText value={row.total_amount} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Sales Returns"
        subtitle="Goods returned by customers pending inspection or refund"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setForm(createForm(branchId));
                setOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Returns" value={summary.open_returns || 0} />
        <MetricCard
          label="Value (MTD)"
          value={<CurrencyText value={summary.value_mtd || 0} />}
        />
        <MetricCard label="Restocked" value={summary.restocked || 0} />
        <MetricCard
          label="Avg. Resolution"
          value={`${summary.avg_resolution_days || 0} days`}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Sales Returns</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Goods returned by customers pending inspection or refund
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search return, customer, order"
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
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-3xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">New Return</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Return number will be generated automatically · draft
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Related Order *</Label>
                  <Select
                    value={form.sales_order}
                    onValueChange={(value) => updateForm("sales_order", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={String(order.id)}>
                          {order.order_number} — {order.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Return Date *</Label>
                  <Input
                    type="date"
                    value={form.return_date}
                    onChange={(event) =>
                      updateForm("return_date", event.target.value)
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              {orderDetail && (
                <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1 font-semibold">
                      {orderDetail.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Order Total
                    </p>
                    <CurrencyText value={orderDetail.order_total} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Related Invoice
                    </p>
                    <p className="mt-1 font-semibold">
                      {orderDetail.invoice_number || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Already Returned
                    </p>
                    <CurrencyText
                      value={orderDetail.already_returned_value || 0}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Reason</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reasons.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("reason", value)}
                      className={
                        form.reason === value
                          ? "rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm text-blue-600"
                          : "rounded-full border px-4 py-2 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Items to Return</Label>
                <div className="mt-2 overflow-hidden rounded-xl border">
                  <div className="grid grid-cols-[42px_minmax(210px,1fr)_100px_100px_120px_120px] gap-3 border-b bg-slate-50 px-3 py-3 text-[10px] uppercase text-muted-foreground">
                    <span />
                    <span>Item</span>
                    <span className="text-right">Ordered Qty</span>
                    <span className="text-right">Qty Returned</span>
                    <span>Condition</span>
                    <span className="text-right">Line Total</span>
                  </div>

                  {form.items.map((item, index) => (
                    <div
                      key={item.sales_order_item || index}
                      className="grid grid-cols-[42px_minmax(210px,1fr)_100px_100px_120px_120px] items-center gap-3 border-b px-3 py-3 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(event) =>
                          updateItem(index, { selected: event.target.checked })
                        }
                      />
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          AED {item.unit_price} / unit
                        </p>
                      </div>
                      <div className="text-right">{item.ordered_quantity}</div>
                      <Input
                        type="number"
                        min="0"
                        max={item.available_quantity}
                        value={item.returned_quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            returned_quantity: event.target.value,
                          })
                        }
                        disabled={!item.selected}
                        className="text-right"
                      />
                      <Select
                        value={item.condition}
                        onValueChange={(value) =>
                          updateItem(index, { condition: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SELLABLE">Sellable</SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                          <SelectItem value="DEFECTIVE">Defective</SelectItem>
                          <SelectItem value="SCRAP">Scrap</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-right font-semibold">
                        <CurrencyText
                          value={
                            number(item.returned_quantity) *
                            number(item.unit_price)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {errors.items && (
                  <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Resolution</Label>
                  <Select
                    value={form.resolution}
                    onValueChange={(value) => updateForm("resolution", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT_NOTE">
                        Issue Credit Note
                      </SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                      <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
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
                      <SelectItem value="PENDING_APPROVAL">
                        Pending Approval
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  className="mt-2"
                  placeholder="Add a note about the condition or reason for return"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal Returned</span>
                    <CurrencyText value={subtotal} />
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <CurrencyText value={vatAmount} />
                  </div>
                  <div className="flex justify-between border-t pt-3 text-base font-semibold">
                    <span>Total Return Value</span>
                    <CurrencyText value={total} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-5 py-4">
              <Button variant="outline" onClick={() => submit("DRAFT")}>
                Save as Draft
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => submit("PENDING_APPROVAL")}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit Return
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
