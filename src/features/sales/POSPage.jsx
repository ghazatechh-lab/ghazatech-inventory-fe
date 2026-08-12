import React from "react";
import {
  Download,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calculateTaxLine, canUseNonVatSale } from "@/lib/taxAccess";
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
import InlineCustomerDialog from "./InlineCustomerDialog";
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

const getProductPrice = (product) =>
  number(
    product?.retail_price ??
      product?.selling_price ??
      product?.sale_price ??
      product?.unit_price ??
      product?.price ??
      product?.variant?.retail_price ??
      0,
  );

const emptyItem = () => ({
  product: "",
  variant: "",
  query: "",
  quantity: 1,
  unit_price: 0,
  vat_percentage: 5,
  tax_rate: 5,
  tax_treatment: "STANDARD_VAT",
  tax_reason: "",
  tax_inclusive: false,
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
  const { user } = useAuth();

  const canUseNonVat = canUseNonVatSale(user);

  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState(() => createForm(branchId));

  const [openProductIndex, setOpenProductIndex] = React.useState(null);

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
    enabled: Boolean(open && form.branch),
    staleTime: 0,
  });

  const summary = summaryResponse || {};

  const options = optionsResponse || {};

  const customers = normalizeList(options.customers);

  const cashiers = normalizeList(options.cashiers);

  const rawProducts = normalizeList(options.products);

  const stock = normalizeList(options.stock);

  const products = React.useMemo(() => {
    const stockByKey = new Map(
      stock.map((row) => [
        `${row.product_id || row.id}:${row.variant_id || ""}`,
        row,
      ]),
    );

    return rawProducts
      .map((product) => {
        const key = `${
          product.product_id || product.id
        }:${product.variant_id || ""}`;

        const stockRow = stockByKey.get(key) || {};

        const available = number(
          product.available_stock ?? stockRow.available_stock ?? 0,
        );

        return {
          ...product,
          available_stock: available,
        };
      })
      .filter((product) => number(product.available_stock) > 0);
  }, [rawProducts, stock]);

  const calculatedItems = form.items.map((item) => {
    const values = calculateTaxLine({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      treatment: item.tax_treatment || "STANDARD_VAT",
      taxRate: item.tax_rate ?? item.vat_percentage ?? 5,
      inclusive: Boolean(item.tax_inclusive),
    });

    const selectedAvailable = number(item.available_stock);

    return {
      ...item,
      available_stock: selectedAvailable,
      has_enough_stock: selectedAvailable >= number(item.quantity),
      subtotal: values.taxable,
      vat_amount: values.tax,
      line_total: values.total,
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
    if (!branchId) return;

    setForm((current) => {
      const nextBranch = String(branchId);

      if (current.branch === nextBranch) {
        return current;
      }

      return {
        ...current,
        branch: nextBranch,
        items: current.items.map(() => emptyItem()),
      };
    });
  }, [branchId]);

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

  const selectProduct = (index, optionValue) => {
    const [productId, variantId = ""] = String(optionValue || "").split(":");
    const product = products.find(
      (item) =>
        String(item.product_id || item.id) === String(productId) &&
        String(item.variant_id || "") === String(variantId),
    );

    updateItem(index, {
      product: productId,
      variant: variantId,
      query: [product?.product_name, product?.variant_name]
        .filter(Boolean)
        .join(" — "),
      unit_price: getProductPrice(product),
      vat_percentage: number(product?.vat_percentage ?? product?.vat_rate ?? 5),
      tax_rate: number(product?.vat_rate ?? product?.vat_percentage ?? 5),
      tax_treatment: product?.tax_treatment || "STANDARD_VAT",
      tax_reason: "",
      tax_inclusive: Boolean(product?.vat_inclusive),
      available_stock: number(product?.available_stock ?? 0),
    });

    setOpenProductIndex(null);
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
      selectProduct(
        index,
        `${match.product_id || match.id}:${match.variant_id || ""}`,
      );
    }
  };

  const openNew = () => {
    setErrors({});
    setOpenProductIndex(null);
    setForm(createForm(branchId));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setOpenProductIndex(null);
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

        payment_method: form.payment_method,

        cash_amount: number(form.cash_amount),

        card_amount: number(form.card_amount),

        discount_amount: number(form.discount_amount),

        notes: form.notes,

        status: "PAID",

        items: calculatedItems.map((item) => ({
          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          quantity: number(item.quantity),

          unit_price: number(item.unit_price),

          vat_percentage: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_rate: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_treatment: item.tax_treatment || "STANDARD_VAT",
          tax_reason: "",
          tax_inclusive: Boolean(item.tax_inclusive),
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
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5">
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
          <div className="flex h-full w-full max-w-5xl flex-col bg-background shadow-2xl">
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
                  <InlineCustomerDialog
                    onCreated={(customer) => {
                      queryClient.invalidateQueries({
                        queryKey: ["pos-form-options"],
                      });
                      updateForm("customer", String(customer.id));
                    }}
                  />
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

                <div className="relative mt-2 overflow-visible rounded-xl border">
                  <div
                    className={`grid gap-3 border-b bg-slate-50 px-3 py-3 text-[10px] uppercase tracking-wider text-muted-foreground dark:bg-white/[0.025] ${"grid-cols-[minmax(320px,1fr)_80px_120px_120px_44px]"}`}
                  >
                    <span>Product</span>

                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit price</span>
                    <span className="text-right">Line total</span>
                    <span />
                  </div>

                  {calculatedItems.map((item, index) => (
                    <div
                      key={index}
                      className={`relative grid items-center gap-3 border-b px-3 py-3 last:border-b-0 ${"grid-cols-[minmax(320px,1fr)_80px_120px_120px_44px]"}`}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                          <Input
                            value={item.query}
                            onFocus={() => setOpenProductIndex(index)}
                            onChange={(event) => {
                              searchProduct(index, event.target.value);
                              setOpenProductIndex(index);
                            }}
                            placeholder="Search by product, SKU, or barcode"
                            className="h-11 rounded-xl border-slate-200 bg-background pl-9 pr-9 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10"
                          />

                          {item.query && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, {
                                  product: "",
                                  variant: "",
                                  query: "",
                                  unit_price: 0,
                                  available_stock: 0,
                                });
                                setOpenProductIndex(index);
                              }}
                              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10"
                              aria-label="Clear selected product"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {openProductIndex === index && (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-background p-1.5 shadow-2xl dark:border-white/10">
                              {!optionsResponse && (
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  Loading products...
                                </div>
                              )}

                              {products
                                .filter((product) => {
                                  const term = String(item.query || "")
                                    .trim()
                                    .toLowerCase();

                                  if (!term || item.product) return true;

                                  return [
                                    product.product_name,
                                    product.variant_name,
                                    product.sku,
                                    product.barcode,
                                  ].some((value) =>
                                    String(value || "")
                                      .toLowerCase()
                                      .includes(term),
                                  );
                                })
                                .map((product) => {
                                  const optionValue = `${
                                    product.product_id || product.id
                                  }:${product.variant_id || ""}`;
                                  const isSelected =
                                    optionValue ===
                                    `${item.product}:${item.variant || ""}`;

                                  return (
                                    <button
                                      key={optionValue}
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        selectProduct(index, optionValue)
                                      }
                                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                          ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30"
                                          : "hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {product.product_name}
                                          {product.variant_name
                                            ? ` — ${product.variant_name}`
                                            : ""}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                          {product.sku ||
                                            product.barcode ||
                                            "No SKU"}
                                          {product.barcode && product.sku
                                            ? ` · ${product.barcode}`
                                            : ""}
                                          {` · ${number(product.available_stock)} available`}
                                        </p>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-300">
                                          AED{" "}
                                          {getProductPrice(product).toFixed(2)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                          Select
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}

                              {products.filter((product) => {
                                const term = String(item.query || "")
                                  .trim()
                                  .toLowerCase();
                                if (!term || item.product) return true;
                                return [
                                  product.product_name,
                                  product.variant_name,
                                  product.sku,
                                  product.barcode,
                                ].some((value) =>
                                  String(value || "")
                                    .toLowerCase()
                                    .includes(term),
                                );
                              }).length === 0 && (
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  No products with available stock were found
                                  for the selected branch.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {canUseNonVat && (
                          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                            <Select
                              value={item.tax_treatment || "STANDARD_VAT"}
                              onValueChange={(value) =>
                                updateItem(index, {
                                  tax_treatment: value,
                                  tax_rate: value === "STANDARD_VAT" ? 5 : 0,
                                  vat_percentage:
                                    value === "STANDARD_VAT" ? 5 : 0,
                                  tax_reason:
                                    value === "STANDARD_VAT"
                                      ? ""
                                      : item.tax_reason,
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectItem value="STANDARD_VAT">
                                  Standard VAT (5%)
                                </SelectItem>
                                <SelectItem value="ZERO_RATED">
                                  Zero Rated (0%)
                                </SelectItem>
                                <SelectItem value="EXEMPT">
                                  Exempt / Non-VAT
                                </SelectItem>
                                <SelectItem value="OUT_OF_SCOPE">
                                  Out of Scope / Non-VAT
                                </SelectItem>
                                <SelectItem value="REVERSE_CHARGE">
                                  Reverse Charge
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {item.tax_treatment !== "STANDARD_VAT" && (
                              <Input
                                value={item.tax_reason || ""}
                                onChange={(event) =>
                                  updateItem(index, {
                                    tax_reason: event.target.value,
                                  })
                                }
                                placeholder="Reason / legal reference"
                                className="h-9 text-xs"
                              />
                            )}
                          </div>
                        )}

                        {item.product && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.035]">
                            <span
                              className={
                                item.has_enough_stock
                                  ? "font-medium text-emerald-600"
                                  : "font-medium text-red-500"
                              }
                            >
                              {item.has_enough_stock
                                ? `${item.available_stock} available in selected branch`
                                : `Only ${item.available_stock} available`}
                            </span>
                            <span className="font-semibold text-blue-600 dark:text-blue-300">
                              AED {number(item.unit_price).toFixed(2)}
                            </span>
                          </div>
                        )}
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
