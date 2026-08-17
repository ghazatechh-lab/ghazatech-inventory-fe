import React from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  CreditCard,
  Download,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
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
  vat_treatment: "STANDARD_VAT",
  vat_percentage: 5,
  vat_reason: "",
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

  const [openProductIndex, setOpenProductIndex] = React.useState(null);
  const productInputRefs = React.useRef({});
  const [productMenuRect, setProductMenuRect] = React.useState(null);

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

  const { data: branchOptionsResponse } = useQuery({
    queryKey: ["pos-branch-options"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    enabled: open,
    staleTime: 60_000,
  });

  const branchOptions = React.useMemo(
    () => normalizeList(branchOptionsResponse),
    [branchOptionsResponse],
  );

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

    const unique = new Map();

    rawProducts.forEach((product) => {
      const productId = product.product_id || product.id;
      const variantId = product.variant_id || "";
      const key = `${productId}:${variantId}`;
      const stockRow = stockByKey.get(key) || {};

      const available = number(
        product.available_stock ??
          stockRow.available_stock ??
          stockRow.current_stock ??
          product.current_stock ??
          0,
      );

      const normalized = {
        ...product,
        product_id: productId,
        variant_id: variantId || null,
        available_stock: available,
      };

      if (!unique.has(key)) {
        unique.set(key, normalized);
        return;
      }

      const existing = unique.get(key);

      unique.set(key, {
        ...existing,
        ...normalized,
        available_stock: Math.max(number(existing.available_stock), available),
      });
    });

    return Array.from(unique.values());
  }, [rawProducts, stock]);

  const calculatedItems = form.items.map((item) => {
    const selectedAvailable = number(item.available_stock);
    const lineSubtotal = number(item.quantity) * number(item.unit_price);

    return {
      ...item,
      available_stock: selectedAvailable,
      has_enough_stock: selectedAvailable >= number(item.quantity),
      subtotal: lineSubtotal,
      vat_amount: 0,
      line_total: lineSubtotal,
    };
  });

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  const commonVatRate =
    form.vat_treatment === "STANDARD_VAT"
      ? number(form.vat_percentage || 5)
      : 0;

  const vatAmount = (subtotal * commonVatRate) / 100;

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

  const changeSaleBranch = (value) => {
    setOpenProductIndex(null);

    setForm((current) => ({
      ...current,
      branch: value,
      customer: "",
      cashier: "",
      items: [emptyItem()],
    }));

    setErrors((current) => ({
      ...current,
      branch: "",
      items: "",
    }));
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

          vat_percentage: commonVatRate,
          tax_rate: commonVatRate,
          tax_treatment: form.vat_treatment || "STANDARD_VAT",
          tax_reason: String(form.vat_reason || "").trim(),
          tax_inclusive: false,
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

  const updateProductMenuPosition = React.useCallback((index) => {
    const element = productInputRefs.current[index];

    if (!element) {
      setProductMenuRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();

    setProductMenuRect({
      left: rect.left,
      top: rect.bottom + 6,
      width: rect.width,
    });
  }, []);

  React.useEffect(() => {
    if (openProductIndex === null) {
      setProductMenuRect(null);
      return;
    }

    updateProductMenuPosition(openProductIndex);

    const handleReposition = () => updateProductMenuPosition(openProductIndex);

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [openProductIndex, updateProductMenuPosition]);

  React.useEffect(() => {
    if (openProductIndex === null) return undefined;

    const handlePointerDown = (event) => {
      const input = productInputRefs.current[openProductIndex];

      if (input?.contains(event.target)) return;

      if (event.target.closest?.("[data-pos-product-menu='true']")) {
        return;
      }

      setOpenProductIndex(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openProductIndex]);

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Direct Sale / POS"
        subtitle="Fast counter sales with branch stock, common VAT, and instant payment"
        actions={
          <div className="flex flex-wrap gap-2">
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

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-blue-600" />
              <h2 className="font-semibold">POS Transactions</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Recent direct sales for the active branch
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
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="mx-auto flex min-h-full max-w-[1450px] items-center justify-center">
            <div className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:max-h-[calc(100vh-3rem)]">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b bg-gradient-to-r from-blue-50/80 via-background to-background px-5 py-4 dark:from-blue-500/10 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-blue-600 p-2.5 text-white shadow-sm">
                    <ShoppingCart className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold">New Direct Sale</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add products, select payment, and complete the counter
                      sale.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={close}
                  disabled={saveMutation.isPending}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_350px] lg:p-6">
                  <div className="min-w-0 space-y-5">
                    <section className="rounded-2xl border bg-card p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Sale Details</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Walk-in customer is allowed. Cashier is required.
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          Receipt Auto
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <Label>Branch *</Label>

                          <Select
                            value={form.branch}
                            onValueChange={changeSaleBranch}
                            disabled={Boolean(branchId)}
                          >
                            <SelectTrigger className="mt-2 h-11">
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>

                            <SelectContent className="max-h-72">
                              {branchOptions.map((branch) => (
                                <SelectItem
                                  key={branch.id}
                                  value={String(branch.id)}
                                >
                                  {[branch.branch_code, branch.branch_name]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {branchId ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Using the active branch selected for this page.
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Select a branch to load its available POS
                              products.
                            </p>
                          )}

                          {errors.branch && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.branch}
                            </p>
                          )}
                        </div>

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
                            <SelectTrigger className="mt-2 h-11">
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
                            branchId={form.branch}
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
                            onValueChange={(value) =>
                              updateForm("cashier", value)
                            }
                          >
                            <SelectTrigger className="mt-2 h-11">
                              <SelectValue placeholder="Select cashier" />
                            </SelectTrigger>

                            <SelectContent className="max-h-72">
                              {cashiers.map((cashier) => (
                                <SelectItem
                                  key={cashier.id}
                                  value={String(cashier.id)}
                                >
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
                    </section>

                    <section className="relative overflow-visible rounded-2xl border bg-card shadow-sm">
                      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold">Sale Items</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Search by product, variant, SKU, or barcode.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
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
                      </div>

                      <div className="overflow-x-auto overflow-y-visible">
                        <div className="relative min-w-[860px] overflow-visible">
                          <div className="grid grid-cols-[minmax(380px,1fr)_90px_130px_130px_46px] items-center gap-3 border-b bg-muted/30 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>Product</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Unit Price</span>
                            <span className="text-right">Line Total</span>
                            <span />
                          </div>

                          {calculatedItems.map((item, index) => (
                            <div
                              key={index}
                              className="relative z-10 grid grid-cols-[minmax(380px,1fr)_90px_130px_130px_46px] items-start gap-3 border-b px-4 py-4 last:border-b-0 focus-within:z-[80]"
                            >
                              <div className="min-w-0 space-y-2">
                                <div className="relative">
                                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                  <Input
                                    ref={(node) => {
                                      productInputRefs.current[index] = node;
                                    }}
                                    value={item.query}
                                    onFocus={() => {
                                      setOpenProductIndex(index);
                                      requestAnimationFrame(() =>
                                        updateProductMenuPosition(index),
                                      );
                                    }}
                                    onChange={(event) => {
                                      searchProduct(index, event.target.value);
                                      setOpenProductIndex(index);
                                      requestAnimationFrame(() =>
                                        updateProductMenuPosition(index),
                                      );
                                    }}
                                    placeholder="Search product, variant, SKU or barcode"
                                    className="h-11 rounded-xl pl-9 pr-9"
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
                                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                      aria-label="Clear selected product"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {openProductIndex === index &&
                                    productMenuRect &&
                                    createPortal(
                                      <div
                                        data-pos-product-menu="true"
                                        className="fixed z-[99999] max-h-[360px] min-h-[80px] overflow-y-auto rounded-xl border bg-background p-1.5 shadow-2xl"
                                        style={{
                                          left: productMenuRect.left,
                                          top: productMenuRect.top,
                                          width: productMenuRect.width,
                                        }}
                                      >
                                        {!form.branch ? (
                                          <div className="px-3 py-7 text-center text-sm text-muted-foreground">
                                            Select a branch first to load
                                            products.
                                          </div>
                                        ) : !optionsResponse ? (
                                          <div className="px-3 py-7 text-center text-sm text-muted-foreground">
                                            Loading products...
                                          </div>
                                        ) : null}

                                        {form.branch &&
                                          products
                                            .filter((product) => {
                                              const term = String(
                                                item.query || "",
                                              )
                                                .trim()
                                                .toLowerCase();

                                              if (!term || item.product)
                                                return true;

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
                                                  onClick={() => {
                                                    selectProduct(
                                                      index,
                                                      optionValue,
                                                    );
                                                    setOpenProductIndex(null);
                                                  }}
                                                  className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-left transition ${
                                                    isSelected
                                                      ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30"
                                                      : "hover:bg-muted/60"
                                                  }`}
                                                >
                                                  <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold">
                                                      {product.product_name}
                                                      {product.variant_name
                                                        ? ` — ${product.variant_name}`
                                                        : ""}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                                      {[
                                                        product.sku || "No SKU",
                                                        product.barcode,
                                                        `${number(
                                                          product.available_stock,
                                                        )} available`,
                                                      ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                    </p>
                                                  </div>

                                                  <div className="shrink-0 text-right">
                                                    <p className="font-bold text-blue-600 dark:text-blue-300">
                                                      AED{" "}
                                                      {getProductPrice(
                                                        product,
                                                      ).toFixed(2)}
                                                    </p>
                                                  </div>
                                                </button>
                                              );
                                            })}

                                        {form.branch &&
                                          optionsResponse &&
                                          products.filter((product) => {
                                            const term = String(
                                              item.query || "",
                                            )
                                              .trim()
                                              .toLowerCase();

                                            if (!term || item.product)
                                              return true;

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
                                            <div className="px-3 py-7 text-center text-sm text-muted-foreground">
                                              No POS products were returned for
                                              this branch.
                                            </div>
                                          )}
                                      </div>,
                                      document.body,
                                    )}
                                </div>

                                {item.product && (
                                  <div
                                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                                      item.has_enough_stock
                                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                        : "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/10"
                                    }`}
                                  >
                                    <span
                                      className={
                                        item.has_enough_stock
                                          ? "font-medium text-emerald-700 dark:text-emerald-300"
                                          : "font-medium text-red-600 dark:text-red-300"
                                      }
                                    >
                                      {item.available_stock <= 0
                                        ? "Out of stock in selected branch"
                                        : item.has_enough_stock
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
                                className="h-11 text-right font-medium"
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
                                className="h-11 text-right"
                              />

                              <div className="flex h-11 items-center justify-end text-right font-semibold">
                                <CurrencyText value={item.line_total} />
                              </div>

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 hover:bg-red-50 dark:hover:bg-red-500/10"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    items:
                                      current.items.length > 1
                                        ? current.items.filter(
                                            (_, itemIndex) =>
                                              itemIndex !== index,
                                          )
                                        : [emptyItem()],
                                  }))
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {errors.items && (
                        <div className="border-t bg-red-50/70 px-4 py-3 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                          {errors.items}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border bg-card p-4 shadow-sm">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        rows={3}
                        value={form.notes}
                        onChange={(event) =>
                          updateForm("notes", event.target.value)
                        }
                        placeholder="Add a note for this sale"
                        className="mt-2 resize-none"
                      />
                    </section>
                  </div>

                  <aside className="min-w-0">
                    <div className="space-y-4 lg:sticky lg:top-0">
                      <section className="rounded-2xl border bg-card p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold">Payment</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ["CASH", "Cash", Banknote],
                            ["CARD", "Card", CreditCard],
                            ["SPLIT", "Split", ReceiptText],
                          ].map(([value, label, Icon]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updateForm("payment_method", value)
                              }
                              className={`flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition ${
                                form.payment_method === value
                                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20"
                                  : "hover:border-blue-300 hover:bg-muted/40"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>

                        {form.payment_method === "SPLIT" && (
                          <div className="mt-4 grid gap-3">
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
                                className="mt-2 h-10"
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
                                className="mt-2 h-10"
                              />
                            </div>
                          </div>
                        )}

                        {errors.payment_method && (
                          <p className="mt-2 text-xs text-red-500">
                            {errors.payment_method}
                          </p>
                        )}
                      </section>

                      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="border-b bg-muted/20 px-4 py-3">
                          <h3 className="font-semibold">Sale Summary</h3>
                        </div>

                        <div className="space-y-4 p-4">
                          <div>
                            <Label>Discount (AED)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.discount_amount}
                              onChange={(event) =>
                                updateForm(
                                  "discount_amount",
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-10"
                            />
                          </div>

                          <div>
                            <Label>VAT Treatment</Label>
                            <Select
                              value={form.vat_treatment}
                              onValueChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  vat_treatment: value,
                                  vat_percentage:
                                    value === "STANDARD_VAT" ? 5 : 0,
                                  vat_reason:
                                    value === "STANDARD_VAT"
                                      ? ""
                                      : current.vat_reason,
                                }))
                              }
                            >
                              <SelectTrigger className="mt-2 h-10">
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
                                  Exempt (0%)
                                </SelectItem>
                                <SelectItem value="OUT_OF_SCOPE">
                                  Out of Scope (0%)
                                </SelectItem>
                                <SelectItem value="REVERSE_CHARGE">
                                  Reverse Charge
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {form.vat_treatment !== "STANDARD_VAT" && (
                            <div>
                              <Label>VAT Reason / Reference</Label>
                              <Input
                                value={form.vat_reason}
                                onChange={(event) =>
                                  updateForm("vat_reason", event.target.value)
                                }
                                placeholder="Optional reference"
                                className="mt-2 h-10"
                              />
                            </div>
                          )}

                          <div className="space-y-3 border-t pt-4 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Subtotal
                              </span>
                              <CurrencyText value={subtotal} />
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Discount
                              </span>
                              <span>
                                − <CurrencyText value={form.discount_amount} />
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                VAT ({commonVatRate}%)
                              </span>
                              <CurrencyText value={vatAmount} />
                            </div>
                          </div>

                          <div className="rounded-xl bg-blue-600 p-4 text-white shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                              Total Payable
                            </p>
                            <div className="mt-1 text-2xl font-bold">
                              <CurrencyText value={total} />
                            </div>
                            <p className="mt-1 text-xs text-blue-100">
                              {calculatedItems.filter((item) => item.product)
                                .length || 0}{" "}
                              item line(s)
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-muted-foreground">
                  Stock is validated again before the sale is completed.
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={submit}
                    disabled={saveMutation.isPending}
                    className="min-w-36 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveMutation.isPending ? "Completing..." : "Complete Sale"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
