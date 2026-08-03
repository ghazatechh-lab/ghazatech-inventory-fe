import React from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  calculateTaxLine,
  canSellRestrictedStock,
  canUseNonVatSale,
  isAdmin,
} from "@/lib/taxAccess";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => Number(number(value).toFixed(2));

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
  sales_order_item: "",
  product: "",
  variant: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  vat_percentage: 5,
  tax_rate: 5,
  tax_treatment: "STANDARD_VAT",
  tax_reason: "",
  stock_classification: "REGULAR",
  tax_inclusive: false,
  available_regular_quantity: 0,
  available_restricted_quantity: 0,
});

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const salesOrderId = searchParams.get("sales_order");

  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canSellRestricted = isAdmin(user) || canSellRestrictedStock(user);

  const canUseNonVat = canUseNonVatSale(user);

  const { branchId } = useActiveBranchFilter();

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState({
    sales_order: salesOrderId || "",
    branch: branchId ? String(branchId) : "",
    customer: "",
    salesperson: "",
    invoice_number: "",
    invoice_date: today(),
    due_date: addDays(today(), 30),
    customer_po_number: "",
    payment_terms: "NET_30",
    currency: "AED",
    bank_account: "",
    send_payment_reminders: false,
    discount_amount: 0,
    shipping_amount: 0,
    paid_amount: 0,
    notes: "",
    sale_type: salesOrderId ? "ORDER" : "STANDALONE",
    items: [emptyItem()],
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => unwrap(await api.get(`/sales/invoices/${id}/`)),
    enabled: isEdit,
    staleTime: 0,
  });

  const { data: sourceOrder } = useQuery({
    queryKey: ["invoice-source-order", salesOrderId],
    queryFn: async () =>
      unwrap(await api.get(`/sales/orders/${salesOrderId}/`)),
    enabled: !isEdit && Boolean(salesOrderId),
    staleTime: 0,
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-invoice-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/invoices/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),
  });

  const options = optionsResponse || {};

  const branches = normalizeList(options.branches);

  const customers = normalizeList(options.customers);

  const salespeople = normalizeList(options.salespeople);

  const products = normalizeList(options.products);

  const salesOrders = normalizeList(options.sales_orders);

  const bankAccounts = normalizeList(options.bank_accounts);

  const findProductOption = React.useCallback(
    (productId, variantId) =>
      products.find(
        (option) =>
          String(option.product_id || option.id) === String(productId || "") &&
          String(option.variant_id || "") === String(variantId || ""),
      ),
    [products],
  );

  React.useEffect(() => {
    const source = existing || sourceOrder;

    if (!source) return;

    const fromOrder = !existing && Boolean(sourceOrder);

    setForm({
      sales_order: fromOrder
        ? String(source.id)
        : source.sales_order
          ? String(source.sales_order?.id || source.sales_order)
          : "",

      branch: String(source.branch?.id || source.branch || ""),

      customer: String(source.customer?.id || source.customer || ""),

      salesperson: source.salesperson
        ? String(source.salesperson?.id || source.salesperson)
        : "",

      invoice_number: existing?.invoice_number || "",

      invoice_date: existing?.invoice_date || today(),

      due_date: existing?.due_date || addDays(today(), 30),

      customer_po_number: existing?.customer_po_number || "",

      payment_terms: existing?.payment_terms || "NET_30",

      currency: source.currency || "AED",

      bank_account: existing?.bank_account
        ? String(existing.bank_account?.id || existing.bank_account)
        : "",

      send_payment_reminders: Boolean(existing?.send_payment_reminders),

      discount_amount: number(source.discount_amount),

      shipping_amount: number(source.shipping_amount),

      paid_amount: number(existing?.paid_amount),

      notes: existing?.notes || "",

      sale_type: fromOrder ? "ORDER" : existing?.sale_type || "STANDALONE",

      items: source.items?.length
        ? source.items.map((item) => ({
            id: existing ? item.id : undefined,

            sales_order_item: fromOrder
              ? String(item.id)
              : item.sales_order_item
                ? String(item.sales_order_item?.id || item.sales_order_item)
                : "",

            product: item.product
              ? String(item.product?.id || item.product)
              : "",

            variant: item.variant
              ? String(item.variant?.id || item.variant)
              : "",

            description: item.description || "",

            quantity: number(item.quantity),

            unit_price: number(item.unit_price),

            vat_percentage: number(item.vat_percentage ?? item.tax_rate ?? 5),
            tax_rate: number(item.tax_rate ?? item.vat_percentage ?? 5),
            tax_treatment: item.tax_treatment || "STANDARD_VAT",
            tax_reason: item.tax_reason || "",
            stock_classification: item.stock_classification || "REGULAR",
            tax_inclusive: Boolean(
              existing?.tax_inclusive || sourceOrder?.tax_inclusive,
            ),
          }))
        : [emptyItem()],
    });
  }, [existing, sourceOrder]);

  React.useEffect(() => {
    if (canSellRestricted) return;

    setForm((current) => ({
      ...current,
      items: current.items.map((item) => ({
        ...item,
        stock_classification: "REGULAR",
      })),
    }));
  }, [canSellRestricted]);

  React.useEffect(() => {
    if (!products.length) return;

    setForm((current) => {
      let changed = false;

      const items = current.items.map((item) => {
        const option = findProductOption(item.product, item.variant);

        if (!option) {
          return item;
        }

        const regular = number(
          option.available_regular_quantity ??
            option.regular_quantity ??
            option.available_stock ??
            0,
        );

        const restricted = number(
          option.available_restricted_quantity ??
            option.restricted_quantity ??
            0,
        );

        if (
          number(item.available_regular_quantity) === regular &&
          number(item.available_restricted_quantity) === restricted
        ) {
          return item;
        }

        changed = true;

        return {
          ...item,
          available_regular_quantity: regular,
          available_restricted_quantity: restricted,
        };
      });

      return changed
        ? {
            ...current,
            items,
          }
        : current;
    });
  }, [products, findProductOption]);

  React.useEffect(() => {
    const termDays = {
      DUE_ON_RECEIPT: 0,
      NET_7: 7,
      NET_15: 15,
      NET_30: 30,
      NET_45: 45,
      NET_60: 60,
    };

    if (form.invoice_date && termDays[form.payment_terms] !== undefined) {
      setForm((current) => ({
        ...current,
        due_date: addDays(
          current.invoice_date,
          termDays[current.payment_terms],
        ),
      }));
    }
  }, [form.invoice_date, form.payment_terms]);

  const calculatedItems = form.items.map((item) => {
    const values = calculateTaxLine({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      treatment: item.tax_treatment || "STANDARD_VAT",
      taxRate: item.tax_rate ?? item.vat_percentage ?? 5,
      inclusive: Boolean(item.tax_inclusive),
    });

    return {
      ...item,
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

  const total =
    subtotal +
    vatAmount +
    number(form.shipping_amount) -
    number(form.discount_amount);

  const amountDue = Math.max(0, total - number(form.paid_amount));

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
    const product = findProductOption(productId, variantId);

    updateItem(index, {
      product: productId,
      variant: variantId,
      description: product?.description || product?.product_name || "",
      unit_price: getProductPrice(product),
      vat_percentage: number(product?.vat_percentage ?? product?.vat_rate ?? 5),
      tax_rate: number(product?.vat_rate ?? product?.vat_percentage ?? 5),
      tax_treatment: product?.tax_treatment || "STANDARD_VAT",
      tax_reason: "",
      stock_classification: "REGULAR",
      tax_inclusive: Boolean(product?.vat_inclusive),
      available_regular_quantity: number(
        product?.available_regular_quantity ??
          product?.regular_quantity ??
          product?.available_stock ??
          0,
      ),
      available_restricted_quantity: number(
        product?.available_restricted_quantity ??
          product?.restricted_quantity ??
          0,
      ),
    });
  };

  const selectSalesOrder = (value) => {
    const order = salesOrders.find((item) => String(item.id) === String(value));

    if (!order) {
      updateForm("sales_order", "");
      return;
    }

    navigate(`/sales/invoices/new?sales_order=${order.id}`);
  };

  const validate = () => {
    const next = {};

    if (!form.branch) {
      next.branch = "Branch is required.";
    }

    if (!form.customer) {
      next.customer = "Customer is required.";
    }

    if (!form.invoice_date) {
      next.invoice_date = "Issue date is required.";
    }

    if (!form.due_date) {
      next.due_date = "Due date is required.";
    }

    if (
      form.invoice_date &&
      form.due_date &&
      form.due_date < form.invoice_date
    ) {
      next.due_date = "Due date cannot be before the issue date.";
    }

    if (!form.items.length) {
      next.items = "Add at least one invoice item.";
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
        "Every line requires a product, positive quantity, and valid unit price.";
    }

    if (number(form.paid_amount) > total) {
      next.paid_amount = "Amount already paid cannot exceed the invoice total.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,

        sales_order: form.sales_order ? Number(form.sales_order) : null,

        branch: Number(form.branch),

        customer: Number(form.customer),

        salesperson: form.salesperson ? Number(form.salesperson) : null,

        bank_account: form.bank_account ? Number(form.bank_account) : null,

        discount_amount: money(form.discount_amount),

        shipping_amount: money(form.shipping_amount),

        paid_amount: money(form.paid_amount),

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          sales_order_item: item.sales_order_item
            ? Number(item.sales_order_item)
            : null,

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          description: item.description,

          quantity: Number(number(item.quantity).toFixed(2)),

          unit_price: money(item.unit_price),

          vat_percentage: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_rate: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_treatment: item.tax_treatment || "STANDARD_VAT",
          tax_reason: String(item.tax_reason || "").trim(),
          stock_classification:
            canSellRestricted && item.stock_classification === "RESTRICTED"
              ? "RESTRICTED"
              : "REGULAR",
          tax_inclusive: Boolean(item.tax_inclusive),
        })),
      };

      return isEdit
        ? api.patch(`/sales/invoices/${id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/sales/invoices/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-invoices"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["sales-invoices-summary"],
        }),
      ]);

      toast.success("Invoice saved.");

      const saved = unwrap(response);

      navigate(saved?.id ? `/sales/invoices/${saved.id}` : "/sales/invoices");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save invoice", {
        description:
          details.summary ||
          details.message ||
          "Please review the invoice details.",
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  if (isEdit && existingLoading) {
    return <div className="card-surface p-6">Loading invoice...</div>;
  }

  const sourceOrderNumber =
    sourceOrder?.order_number || existing?.sales_order_number || "";

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={isEdit ? "Edit Invoice" : "New Invoice"}
        subtitle="Bill against a confirmed Sales Order or raise a standalone invoice"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/sales/invoices">Cancel</Link>
            </Button>

            <Button
              type="button"
              onClick={submit}
              disabled={saveMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Invoice
            </Button>
          </div>
        }
      />

      <section className="card-surface p-5">
        <h2 className="font-semibold">Source</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Bill against a confirmed Sales Order, or raise a standalone invoice.
        </p>

        {sourceOrderNumber ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <span className="text-muted-foreground">Billing from</span>

              <Link
                to={`/sales/orders/${form.sales_order}`}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-300"
              >
                {sourceOrderNumber}
                {sourceOrder?.customer_name
                  ? ` — ${sourceOrder.customer_name}`
                  : ""}
              </Link>

              <CurrencyText
                value={sourceOrder?.total_amount || total}
                currency={form.currency}
              />

              {sourceOrder?.delivery_date && (
                <span className="text-xs text-muted-foreground">
                  delivered {sourceOrder.delivery_date}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                navigate("/sales/invoices/new");

                setForm((current) => ({
                  ...current,
                  sales_order: "",
                  customer: "",
                  sale_type: "STANDALONE",
                  items: [emptyItem()],
                }));
              }}
              className="text-xs text-blue-600 hover:underline dark:text-blue-300"
            >
              Start blank instead
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <Label>Confirmed Sales Order</Label>

            <Select
              value={form.sales_order || "__blank__"}
              onValueChange={(value) =>
                value === "__blank__"
                  ? updateForm("sales_order", "")
                  : selectSalesOrder(value)
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Start blank or select Sales Order" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                <SelectItem value="__blank__">
                  Start standalone invoice
                </SelectItem>

                {salesOrders.map((order) => (
                  <SelectItem key={order.id} value={String(order.id)}>
                    {order.order_number}
                    {" · "}
                    {order.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Branch</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Sets the invoice number series and trade licence/TRN printed on the
          invoice.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {branches.map((branch) => {
            const selected = String(form.branch) === String(branch.id);

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => updateForm("branch", String(branch.id))}
                className={
                  selected
                    ? "rounded-xl border border-blue-500 bg-blue-50 p-4 text-left ring-1 ring-blue-500 dark:bg-blue-500/10"
                    : "rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 dark:border-white/10"
                }
              >
                <p className="font-medium">{branch.branch_name}</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {branch.trn
                    ? `TRN ${branch.trn}`
                    : branch.location || "Branch invoice series"}
                </p>
              </button>
            );
          })}
        </div>

        {errors.branch && (
          <p className="mt-2 text-xs text-red-500">{errors.branch}</p>
        )}
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Invoice Details</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Who is being billed and when payment is due.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label>Customer *</Label>

            <Select
              value={form.customer}
              onValueChange={(value) => updateForm("customer", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineCustomerDialog
              onCreated={(customer) => {
                queryClient.invalidateQueries({
                  queryKey: ["sales-invoice-form-options"],
                });
                updateForm("customer", String(customer.id));
              }}
            />
          </div>

          <div>
            <Label>Invoice #</Label>

            <Input
              value={form.invoice_number || "Auto-generated"}
              readOnly
              placeholder="Auto-generated"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Customer PO # (Optional)</Label>

            <Input
              value={form.customer_po_number}
              onChange={(event) =>
                updateForm("customer_po_number", event.target.value)
              }
              placeholder="Customer purchase order reference"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Issue Date *</Label>

            <Input
              type="date"
              value={form.invoice_date}
              onChange={(event) =>
                updateForm("invoice_date", event.target.value)
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label>Due Date *</Label>

            <Input
              type="date"
              value={form.due_date}
              onChange={(event) => updateForm("due_date", event.target.value)}
              className="mt-2"
            />

            {errors.due_date && (
              <p className="mt-1 text-xs text-red-500">{errors.due_date}</p>
            )}
          </div>

          <div>
            <Label>Payment Terms</Label>

            <Select
              value={form.payment_terms}
              onValueChange={(value) => updateForm("payment_terms", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="DUE_ON_RECEIPT">Due on receipt</SelectItem>
                <SelectItem value="NET_7">Net 7</SelectItem>
                <SelectItem value="NET_15">Net 15</SelectItem>
                <SelectItem value="NET_30">Net 30</SelectItem>
                <SelectItem value="NET_45">Net 45</SelectItem>
                <SelectItem value="NET_60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="font-semibold">Items</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Carried over from the linked Sales Order — adjust quantities for
              partial billing.
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
            Add Line Item
          </Button>
        </div>

        <div className="overflow-x-auto p-5">
          <div
            className={
              canUseNonVat && canSellRestricted
                ? "min-w-[1320px]"
                : canUseNonVat || canSellRestricted
                  ? "min-w-[1160px]"
                  : "min-w-[980px]"
            }
          >
            <div
              className={`grid items-center gap-3 border-b border-slate-200 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10 ${
                canUseNonVat && canSellRestricted
                  ? "grid-cols-[minmax(240px,1.35fr)_minmax(190px,1fr)_minmax(220px,1.15fr)_170px_90px_125px_120px_44px]"
                  : canUseNonVat
                    ? "grid-cols-[minmax(250px,1.4fr)_minmax(200px,1fr)_minmax(240px,1.2fr)_90px_125px_120px_44px]"
                    : canSellRestricted
                      ? "grid-cols-[minmax(250px,1.4fr)_minmax(250px,1.25fr)_170px_90px_125px_120px_44px]"
                      : "grid-cols-[minmax(280px,1.45fr)_minmax(280px,1.3fr)_90px_125px_120px_44px]"
              }`}
            >
              <span>Item</span>

              {canUseNonVat && <span>Tax treatment</span>}

              <span>Description</span>

              {canSellRestricted && <span>Stock type</span>}

              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {calculatedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`grid items-start gap-3 py-4 ${
                    canUseNonVat && canSellRestricted
                      ? "grid-cols-[minmax(240px,1.35fr)_minmax(190px,1fr)_minmax(220px,1.15fr)_170px_90px_125px_120px_44px]"
                      : canUseNonVat
                        ? "grid-cols-[minmax(250px,1.4fr)_minmax(200px,1fr)_minmax(240px,1.2fr)_90px_125px_120px_44px]"
                        : canSellRestricted
                          ? "grid-cols-[minmax(250px,1.4fr)_minmax(250px,1.25fr)_170px_90px_125px_120px_44px]"
                          : "grid-cols-[minmax(280px,1.45fr)_minmax(280px,1.3fr)_90px_125px_120px_44px]"
                  }`}
                >
                  <Select
                    value={
                      item.product
                        ? `${item.product}:${item.variant || ""}`
                        : "__none__"
                    }
                    onValueChange={(value) =>
                      selectProduct(index, value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>

                    <SelectContent className="max-h-80 min-w-[360px] rounded-xl p-1">
                      <SelectItem value="__none__">Select product</SelectItem>

                      {products.map((product) => (
                        <SelectItem
                          key={`${product.product_id || product.id}:${product.variant_id || ""}`}
                          value={`${product.product_id || product.id}:${product.variant_id || ""}`}
                          className="my-1 cursor-pointer rounded-lg py-2.5"
                        >
                          <div className="flex w-full min-w-0 items-center justify-between gap-4">
                            <div className="min-w-0 text-left">
                              <p className="truncate text-sm font-semibold">
                                {product.product_name}
                                {product.variant_name
                                  ? ` — ${product.variant_name}`
                                  : ""}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {product.sku || "No SKU"} ·{" "}
                                {canSellRestricted
                                  ? `Regular ${number(
                                      product.available_regular_quantity ??
                                        product.available_stock,
                                    )} · Restricted ${number(
                                      product.available_restricted_quantity,
                                    )}`
                                  : `${number(
                                      product.available_regular_quantity ??
                                        product.available_stock,
                                    )} available`}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-300">
                              AED {getProductPrice(product).toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {canUseNonVat && (
                    <div className="space-y-2">
                      <Select
                        value={item.tax_treatment || "STANDARD_VAT"}
                        onValueChange={(value) =>
                          updateItem(index, {
                            tax_treatment: value,
                            tax_rate: value === "STANDARD_VAT" ? 5 : 0,
                            vat_percentage: value === "STANDARD_VAT" ? 5 : 0,
                            tax_reason:
                              value === "STANDARD_VAT" ? "" : item.tax_reason,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
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

                  <Input
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, {
                        description: event.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />

                  {canSellRestricted && (
                    <div className="space-y-1.5">
                      <Select
                        value={item.stock_classification || "REGULAR"}
                        onValueChange={(value) =>
                          updateItem(index, {
                            stock_classification: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="REGULAR">
                            Regular · {number(item.available_regular_quantity)}{" "}
                            available
                          </SelectItem>

                          <SelectItem
                            value="RESTRICTED"
                            disabled={
                              number(item.available_restricted_quantity) <= 0
                            }
                          >
                            Restricted ·{" "}
                            {number(item.available_restricted_quantity)}{" "}
                            available
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <p className="px-1 text-[10px] leading-4 text-muted-foreground">
                        {item.stock_classification === "RESTRICTED"
                          ? `${number(
                              item.available_restricted_quantity,
                            )} restricted available`
                          : `${number(
                              item.available_regular_quantity,
                            )} regular available`}
                      </p>
                    </div>
                  )}

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
                    className="h-10 text-right"
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
                    className="h-10 text-right"
                  />

                  <div className="flex h-10 items-center justify-end whitespace-nowrap font-semibold">
                    <CurrencyText
                      value={item.line_total}
                      currency={form.currency}
                    />
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10"
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

            {errors.items && (
              <p className="mt-3 text-sm text-red-500">{errors.items}</p>
            )}

            <div className="ml-auto mt-7 max-w-sm space-y-3 rounded-xl border bg-slate-50 p-5 text-sm dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>

                <CurrencyText value={subtotal} currency={form.currency} />
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>

                <CurrencyText value={vatAmount} currency={form.currency} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-muted-foreground">
                  Amount Already Paid
                </Label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(event) =>
                    updateForm("paid_amount", event.target.value)
                  }
                  className="h-8 w-32 text-right"
                />
              </div>

              {errors.paid_amount && (
                <p className="text-xs text-red-500">{errors.paid_amount}</p>
              )}

              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Amount Due</span>

                <CurrencyText value={amountDue} currency={form.currency} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Payment Instructions</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Bank details printed on the invoice for the customer to pay against.
        </p>

        <div className="mt-4 rounded-xl border p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-center">
            <div>
              <p className="font-medium">
                {bankAccounts.find(
                  (account) => String(account.id) === String(form.bank_account),
                )?.bank_name || "Select Bank Account"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {bankAccounts.find(
                  (account) => String(account.id) === String(form.bank_account),
                )?.iban || "Bank and IBAN details will appear here"}
              </p>
            </div>

            <Select
              value={form.bank_account || "__none__"}
              onValueChange={(value) =>
                updateForm("bank_account", value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__none__">No bank account</SelectItem>

                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.send_payment_reminders}
            onClick={() =>
              updateForm("send_payment_reminders", !form.send_payment_reminders)
            }
            className={
              form.send_payment_reminders
                ? "relative h-6 w-11 rounded-full bg-blue-600"
                : "relative h-6 w-11 rounded-full bg-slate-300 dark:bg-white/20"
            }
          >
            <span
              className={
                form.send_payment_reminders
                  ? "absolute left-6 top-1 h-4 w-4 rounded-full bg-white transition"
                  : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition"
              }
            />
          </button>

          <span>
            <span className="block text-sm font-medium">
              Send payment reminders automatically
            </span>
            <span className="block text-xs text-muted-foreground">
              Reminder email at 3 days before, on, and 3 days after the due
              date.
            </span>
          </span>
        </label>

        <div className="mt-4">
          <Label>Notes to Customer</Label>

          <Textarea
            rows={4}
            value={form.notes}
            onChange={(event) => updateForm("notes", event.target.value)}
            placeholder="e.g. Thank you for your business. Late payments subject to agreed terms."
            className="mt-2"
          />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button asChild variant="ghost">
          <Link to="/sales/invoices">Cancel</Link>
        </Button>

        <Button
          type="button"
          onClick={submit}
          disabled={saveMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Invoice
        </Button>
      </div>
    </div>
  );
}
