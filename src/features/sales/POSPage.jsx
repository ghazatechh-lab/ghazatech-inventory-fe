import React from "react";
import { Download, Plus, Save, Search, Trash2, X } from "lucide-react";
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
import { CurrencyText } from "@/components/common/CurrencyText";
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

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyItem = () => ({
  product: "",
  variant: "",
  query: "",
  quantity: 1,
  unit_price: 0,
  vat_percentage: 5,
  available_stock: 0,
});

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  customer: "",
  cashier: "",
  receipt_number: "",
  payment_method: "CASH",
  cash_amount: 0,
  card_amount: 0,
  discount_amount: 0,
  notes: "",
  status: "PAID",
  items: [emptyItem()],
});

export default function POSPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState(() => createForm(branchId));

  const { query, q, setQ, page, setPage } = useListQuery(
    "pos-sales",
    "/sales/pos/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["pos-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/pos/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["pos-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/pos/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),
    enabled: open,
  });

  const summary = summaryResponse || {};

  const options = optionsResponse || {};

  const customers = normalizeList(options.customers);

  const cashiers = normalizeList(options.cashiers);

  const products = normalizeList(options.products);

  const stock = normalizeList(options.stock);

  const stockMap = React.useMemo(() => {
    const map = new Map();

    stock.forEach((row) => {
      map.set(
        `${row.product_id}:${row.variant_id || ""}`,
        number(row.available_stock),
      );
    });

    return map;
  }, [stock]);

  const calculatedItems = form.items.map((item) => {
    const availableStock =
      stockMap.get(`${item.product}:${item.variant || ""}`) ??
      stockMap.get(`${item.product}:`) ??
      number(item.available_stock);

    const subtotal = number(item.quantity) * number(item.unit_price);

    const vat = (subtotal * number(item.vat_percentage)) / 100;

    return {
      ...item,
      available_stock: availableStock,
      subtotal,
      vat_amount: vat,
      line_total: subtotal + vat,
      has_enough_stock: availableStock >= number(item.quantity),
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

  const total = Math.max(
    0,
    subtotal + vatAmount - number(form.discount_amount),
  );

  React.useEffect(() => {
    if (form.payment_method === "CASH") {
      setForm((current) => ({
        ...current,
        cash_amount: total,
        card_amount: 0,
      }));
    }

    if (form.payment_method === "CARD") {
      setForm((current) => ({
        ...current,
        cash_amount: 0,
        card_amount: total,
      }));
    }
  }, [form.payment_method, total]);

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

  const selectProduct = (index, productId) => {
    const product = products.find(
      (item) => String(item.id) === String(productId),
    );

    updateItem(index, {
      product: productId,
      variant: "",
      query: product?.product_name || "",
      unit_price: number(
        product?.selling_price ||
          product?.sale_price ||
          product?.unit_price ||
          0,
      ),
    });
  };

  const searchProduct = (index, queryValue) => {
    updateItem(index, {
      query: queryValue,
    });

    const normalized = String(queryValue).trim().toLowerCase();

    if (!normalized) return;

    const match = products.find(
      (product) =>
        String(product.barcode || "").toLowerCase() === normalized ||
        String(product.sku || "").toLowerCase() === normalized,
    );

    if (match) {
      selectProduct(index, String(match.id));
    }
  };

  const openNew = () => {
    setErrors({});
    setForm(createForm(branchId));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setErrors({});
    setForm(createForm(branchId));
  };

  const validate = () => {
    const next = {};

    if (!form.branch) {
      next.branch = "Branch is required.";
    }

    if (!form.cashier) {
      next.cashier = "Cashier is required.";
    }

    if (!form.items.length) {
      next.items = "Add at least one product.";
    }

    if (
      form.items.some(
        (item) =>
          !item.product ||
          number(item.quantity) <= 0 ||
          number(item.unit_price) < 0,
      )
    ) {
      next.items =
        "Each line needs a product, positive quantity, and valid unit price.";
    }

    if (calculatedItems.some((item) => !item.has_enough_stock)) {
      next.items = "One or more products do not have enough stock.";
    }

    if (
      form.payment_method === "SPLIT" &&
      number(form.cash_amount) + number(form.card_amount) !== total
    ) {
      next.payment_method = "Cash and card amounts must equal the sale total.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branch: Number(form.branch),

        customer: form.customer ? Number(form.customer) : null,

        cashier: Number(form.cashier),

        receipt_number: form.receipt_number || undefined,

        payment_method: form.payment_method,

        cash_amount: number(form.cash_amount),

        card_amount: number(form.card_amount),

        discount_amount: number(form.discount_amount),

        subtotal,
        vat_amount: vatAmount,
        total_amount: total,

        notes: form.notes,

        status: "PAID",

        items: calculatedItems.map((item) => ({
          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          quantity: number(item.quantity),

          unit_price: number(item.unit_price),

          vat_percentage: number(item.vat_percentage),
        })),
      };

      return api.post("/sales/pos/", payload, {
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["pos-sales"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["pos-summary"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["stock"],
        }),
      ]);

      toast.success("Sale completed successfully.");

      close();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to complete sale", {
        description:
          details.summary ||
          details.message ||
          "Please review the sale details.",
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  const exportSales = async () => {
    const response = await api.get("/sales/pos/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "pos-sales.csv";

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
        key: "receipt_number",
        header: "Receipt #",
        sortKey: "receipt_number",
        sortType: "text",
      },
      {
        key: "cashier_name",
        header: "Cashier",
        sortKey: "cashier__username",
        sortType: "text",
      },
      {
        key: "sale_datetime",
        header: "Time",
        sortKey: "sale_datetime",
        sortType: "date",
        cell: (row) =>
          row.sale_datetime
            ? new Date(row.sale_datetime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
      },
      {
        key: "item_count",
        header: "Items",
        sortKey: "item_count",
        sortType: "number",
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
        title="Direct Sale / POS"
        subtitle="Walk-in and counter sales processed without a quotation"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportSales}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              type="button"
              onClick={openNew}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's Sales"
          value={<CurrencyText value={summary.todays_sales || 0} />}
          subtitle={`${summary.transactions || 0} transaction(s)`}
        />

        <MetricCard
          label="Avg. Basket Size"
          value={<CurrencyText value={summary.avg_basket_size || 0} />}
          subtitle="Average sale value"
        />

        <MetricCard
          label="Cash vs Card"
          value={`${summary.cash_percentage || 0}% / ${summary.card_percentage || 0}%`}
          subtitle="Payment mix today"
        />

        <MetricCard
          label="Returns Today"
          value={summary.returns_today || 0}
          subtitle="POS-related returns"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Direct Sale / POS</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Walk-in and counter sales processed without a prior quotation
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search receipt, cashier, customer, or status"
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
          emptyTitle="No POS sales"
          emptyDescription="Complete the first direct sale."
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">New Sale</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Receipt number will be generated automatically · draft
                </p>
              </div>

              <Button type="button" size="icon" variant="ghost" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Customer</Label>

                  <Select
                    value={form.customer || "__walkin__"}
                    onValueChange={(value) =>
                      updateForm(
                        "customer",
                        value === "__walkin__" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      <SelectItem value="__walkin__">
                        Walk-in Customer
                      </SelectItem>

                      {customers.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={String(customer.id)}
                        >
                          {customer.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cashier *</Label>

                  <Select
                    value={form.cashier}
                    onValueChange={(value) => updateForm("cashier", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select cashier" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {cashiers.map((cashier) => (
                        <SelectItem key={cashier.id} value={String(cashier.id)}>
                          {cashier.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors.cashier && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.cashier}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Items</Label>

                <div className="mt-2 overflow-hidden rounded-xl border">
                  <div className="grid grid-cols-[minmax(220px,1fr)_70px_100px_110px_40px] gap-3 border-b bg-slate-50 px-3 py-3 text-[10px] uppercase tracking-wider text-muted-foreground dark:bg-white/[0.025]">
                    <span>Product</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Line Total</span>
                    <span />
                  </div>

                  {calculatedItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(220px,1fr)_70px_100px_110px_40px] items-center gap-3 border-b px-3 py-3 last:border-b-0"
                    >
                      <div className="space-y-1">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                          <Input
                            value={item.query}
                            onChange={(event) =>
                              searchProduct(index, event.target.value)
                            }
                            placeholder="Search product or scan barcode"
                            className="pl-9"
                            list={`pos-products-${index}`}
                          />

                          <datalist id={`pos-products-${index}`}>
                            {products.map((product) => (
                              <option
                                key={product.id}
                                value={product.product_name}
                              >
                                {product.sku || product.barcode || ""}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        {item.product && (
                          <Select
                            value={String(item.product)}
                            onValueChange={(value) =>
                              selectProduct(index, value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="max-h-72">
                              {products.map((product) => (
                                <SelectItem
                                  key={product.id}
                                  value={String(product.id)}
                                >
                                  {product.product_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <p
                          className={
                            item.has_enough_stock
                              ? "text-xs text-emerald-600"
                              : "text-xs text-red-500"
                          }
                        >
                          {item.product
                            ? item.has_enough_stock
                              ? `${item.available_stock} in stock`
                              : `Only ${item.available_stock} available`
                            : ""}
                        </p>
                      </div>

                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity: event.target.value,
                          })
                        }
                        className="text-right"
                      />

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(event) =>
                          updateItem(index, {
                            unit_price: event.target.value,
                          })
                        }
                        className="text-right"
                      />

                      <div className="text-right font-semibold">
                        <CurrencyText value={item.line_total} />
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            items: current.items.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: [...current.items, emptyItem()],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>

                {errors.items && (
                  <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Payment Method</Label>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      ["CASH", "Cash"],
                      ["CARD", "Card"],
                      ["SPLIT", "Split"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateForm("payment_method", value)}
                        className={
                          form.payment_method === value
                            ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                            : "rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Discount (AED)</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_amount}
                    onChange={(event) =>
                      updateForm("discount_amount", event.target.value)
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              {form.payment_method === "SPLIT" && (
                <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
                  <div>
                    <Label>Cash Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cash_amount}
                      onChange={(event) =>
                        updateForm("cash_amount", event.target.value)
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Card Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.card_amount}
                      onChange={(event) =>
                        updateForm("card_amount", event.target.value)
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {errors.payment_method && (
                <p className="text-xs text-red-500">{errors.payment_method}</p>
              )}

              <div>
                <Label>Notes (Optional)</Label>

                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Add a note for this sale"
                  className="mt-2"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-5 dark:bg-white/[0.025]">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <CurrencyText value={subtotal} />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>
                      − <CurrencyText value={form.discount_amount} />
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <CurrencyText value={vatAmount} />
                  </div>

                  <div className="flex justify-between border-t pt-3 text-base font-semibold">
                    <span>Total</span>
                    <CurrencyText value={total} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={saveMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
