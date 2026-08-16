import React from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  Download,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calculateTaxLine, canUseNonVatSale } from "@/lib/taxAccess";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { downloadSalesPdf, findSalesCustomer } from "@/lib/salesPdf";
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
  tax_inclusive: false,
  available_stock: 0,
});

function ProductSearchPicker({ products, value, onSelect, getPrice }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef(null);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = React.useMemo(() => {
    if (!normalizedSearch) return products;

    return products.filter((product) =>
      [
        product.product_name,
        product.variant_name,
        product.sku,
        product.barcode,
      ].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    );
  }, [products, normalizedSearch]);

  const selectedProduct = React.useMemo(
    () =>
      products.find(
        (product) =>
          `${product.product_id || product.id}:${product.variant_id || ""}` ===
          String(value || ""),
      ),
    [products, value],
  );

  const focusSearch = React.useCallback(() => {
    window.setTimeout(() => {
      searchRef.current?.focus();
      searchRef.current?.select?.();
    }, 0);
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSearch("");
          focusSearch();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between px-3 font-normal"
        >
          <div className="min-w-0 text-left">
            <div className="truncate text-sm">
              {selectedProduct
                ? [selectedProduct.product_name, selectedProduct.variant_name]
                    .filter(Boolean)
                    .join(" — ")
                : "Search or select product"}
            </div>
            {selectedProduct && (
              <div className="truncate text-[11px] text-muted-foreground">
                {[
                  selectedProduct.sku || "No SKU",
                  selectedProduct.barcode,
                  `${number(selectedProduct.available_stock)} available`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[420px] max-w-[min(620px,calc(100vw-2rem))] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusSearch();
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={searchRef}
            value={search}
            onValueChange={setSearch}
            placeholder="Search product, variant, SKU or barcode..."
          />

          <CommandList className="max-h-[340px]">
            {!filteredProducts.length && (
              <CommandEmpty>No matching products found.</CommandEmpty>
            )}

            <CommandGroup>
              {filteredProducts.map((product) => {
                const optionValue = `${
                  product.product_id || product.id
                }:${product.variant_id || ""}`;

                const selected = String(value || "") === optionValue;

                return (
                  <CommandItem
                    key={optionValue}
                    value={`${product.product_name || ""} ${product.variant_name || ""} ${product.sku || ""} ${product.barcode || ""}`}
                    onSelect={() => {
                      onSelect(optionValue);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="my-1 cursor-pointer py-2.5"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {product.product_name}
                        {product.variant_name
                          ? ` — ${product.variant_name}`
                          : ""}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[
                          product.sku || "No SKU",
                          product.barcode,
                          `${number(product.available_stock)} available`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>

                    <span className="ml-3 shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-300">
                      AED {getPrice(product).toFixed(2)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const isInvoiceEditLocked = (paymentStatus) =>
  ["PAID", "VOID"].includes(String(paymentStatus || "").toUpperCase());

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const salesOrderId = searchParams.get("sales_order");

  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canUseNonVat = canUseNonVatSale(user);

  const { branchId } = useActiveBranchFilter();

  const [errors, setErrors] = React.useState({});
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = React.useState(false);

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
    vat_treatment: "STANDARD_VAT",
    vat_percentage: 5,
    vat_reason: "",
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

  React.useEffect(() => {
    if (!isEdit || !existing) return;

    if (isInvoiceEditLocked(existing.payment_status)) {
      toast.error(
        `${String(existing.payment_status || "").replaceAll("_", " ")} invoices cannot be edited.`,
      );
      navigate(`/sales/invoices/${id}`, { replace: true });
    }
  }, [existing, id, isEdit, navigate]);

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

  const customers = normalizeList(options.customers);

  const filteredCustomers = React.useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.customer_name,
        customer.phone,
        customer.email,
        customer.customer_code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [customers, customerSearch]);

  const selectedCustomer = React.useMemo(
    () =>
      customers.find(
        (customer) => String(customer.id) === String(form.customer || ""),
      ) || null,
    [customers, form.customer],
  );

  const salespeople = normalizeList(options.salespeople);

  const products = React.useMemo(() => {
    const source = normalizeList(options.products);
    const unique = new Map();

    source.forEach((product) => {
      const productId = product.product_id || product.id;
      const variantId = product.variant_id || "";
      const key = `${productId}:${variantId}`;

      if (!unique.has(key)) {
        unique.set(key, {
          ...product,
          product_id: productId,
          option_key: key,
        });
        return;
      }

      // If duplicate API rows exist for the same product/variant,
      // keep one option and retain the highest available stock value.
      const existing = unique.get(key);

      unique.set(key, {
        ...existing,
        available_stock: Math.max(
          Number(existing.available_stock || 0),
          Number(product.available_stock || 0),
        ),
        current_stock: Math.max(
          Number(existing.current_stock || 0),
          Number(product.current_stock || 0),
        ),
      });
    });

    return Array.from(unique.values());
  }, [options.products]);

  const salesOrders = normalizeList(options.sales_orders);

  const bankAccounts = normalizeList(options.bank_accounts);

  /*
   * New standalone invoices always follow the global top-bar branch.
   * Existing invoices keep their saved branch, and invoices created from
   * a Sales Order inherit the Sales Order branch.
   */
  React.useEffect(() => {
    if (isEdit || salesOrderId) return;

    const nextBranch =
      branchId === null || branchId === undefined || branchId === ""
        ? ""
        : String(branchId);

    setForm((current) => {
      if (String(current.branch || "") === nextBranch) {
        return current;
      }

      console.log("[Invoice Form] Applying top-bar branch:", {
        previousBranch: current.branch,
        branchId,
        nextBranch,
      });

      return {
        ...current,
        branch: nextBranch,
        sales_order: "",
        customer: "",
        bank_account: "",
        items: [emptyItem()],
      };
    });

    setErrors((current) => ({
      ...current,
      branch: "",
      customer: "",
      items: "",
    }));
  }, [branchId, isEdit, salesOrderId]);

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

      vat_treatment: source.items?.[0]?.tax_treatment || "STANDARD_VAT",

      vat_percentage: number(
        source.items?.[0]?.tax_rate ?? source.items?.[0]?.vat_percentage ?? 5,
      ),

      vat_reason: source.items?.[0]?.tax_reason || "",

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
            tax_inclusive: Boolean(
              existing?.tax_inclusive || sourceOrder?.tax_inclusive,
            ),
          }))
        : [emptyItem()],
    });
  }, [existing, sourceOrder]);

  React.useEffect(() => {
    if (!products.length) return;

    setForm((current) => {
      let changed = false;

      const items = current.items.map((item) => {
        const option = findProductOption(item.product, item.variant);

        if (!option) {
          return item;
        }

        const available = number(option.available_stock ?? 0);

        if (number(item.available_stock) === available) {
          return item;
        }

        changed = true;

        return {
          ...item,
          available_stock: available,
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
    const lineSubtotal = number(item.quantity) * number(item.unit_price);

    return {
      ...item,
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
      tax_inclusive: Boolean(product?.vat_inclusive),
      available_stock: number(product?.available_stock ?? 0),
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
      next.branch = "Select a specific branch from the top bar before saving.";
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
      if (isEdit && isInvoiceEditLocked(existing?.payment_status)) {
        throw new Error(
          `${String(existing?.payment_status || "").replaceAll("_", " ")} invoices cannot be edited.`,
        );
      }

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

          vat_percentage: commonVatRate,
          tax_rate: commonVatRate,
          tax_treatment: form.vat_treatment || "STANDARD_VAT",
          tax_reason: String(form.vat_reason || "").trim(),
          tax_inclusive: false,
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

  const selectedCustomerForPdf = React.useMemo(
    () => findSalesCustomer(customers, form.customer),
    [customers, form.customer],
  );

  const downloadInvoicePdf = () => {
    if (!form.customer) {
      toast.error("Select a customer before downloading the invoice PDF.");
      return;
    }

    if (
      !calculatedItems.length ||
      !calculatedItems.some((item) => item.product)
    ) {
      toast.error("Add at least one invoice item before downloading PDF.");
      return;
    }

    try {
      downloadSalesPdf({
        type: "INVOICE",
        number: form.invoice_number || existing?.invoice_number || "DRAFT",
        date: form.invoice_date,
        secondaryLabel: "Due Date",
        secondaryValue: form.due_date,
        paymentTerms: form.payment_terms,
        customerPo: form.customer_po_number,
        customer: selectedCustomerForPdf,
        items: calculatedItems,
        products,
        subtotal,
        vatAmount,
        discountAmount: form.discount_amount,
        shippingAmount: form.shipping_amount,
        paidAmount: form.paid_amount,
        total,
        currency: form.currency,
        notes: form.notes,
        status: existing?.status || "DRAFT",
      });

      toast.success("Invoice PDF downloaded.");
    } catch (error) {
      console.error("[Invoice PDF] Failed:", error);
      toast.error("Unable to generate invoice PDF.");
    }
  };

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
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5 pb-10">
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
              variant="outline"
              onClick={downloadInvoicePdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
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

      {errors.branch && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {errors.branch}
        </div>
      )}

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
        <h2 className="font-semibold">Invoice Details</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Who is being billed and when payment is due.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <Label>Customer *</Label>

              <InlineCustomerDialog
                branchId={form.branch}
                onCreated={async (customer) => {
                  updateForm("customer", String(customer.id));
                  setCustomerSearch(customer.customer_name || "");
                  setCustomerDropdownOpen(false);

                  await queryClient.invalidateQueries({
                    queryKey: ["sales-invoice-form-options"],
                  });
                }}
              />
            </div>

            <div className="relative mt-2">
              <Input
                value={
                  customerDropdownOpen
                    ? customerSearch
                    : selectedCustomer?.customer_name || customerSearch
                }
                placeholder="Search customer by name, phone, email..."
                autoComplete="off"
                onFocus={() => {
                  setCustomerSearch(selectedCustomer?.customer_name || "");
                  setCustomerDropdownOpen(true);
                }}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  setCustomerDropdownOpen(true);

                  if (form.customer) {
                    updateForm("customer", "");
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setCustomerDropdownOpen(false);

                    if (selectedCustomer) {
                      setCustomerSearch(selectedCustomer.customer_name || "");
                    }
                  }, 150);
                }}
              />

              {customerDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl border bg-background p-1 shadow-xl">
                  {filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updateForm("customer", String(customer.id));
                          setCustomerSearch(customer.customer_name || "");
                          setCustomerDropdownOpen(false);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {customer.customer_name}
                          </span>

                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {[customer.phone, customer.email]
                              .filter(Boolean)
                              .join(" · ") || "No phone or email"}
                          </span>
                        </span>

                        {customer.customer_code && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {customer.customer_code}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No customers found. Use Add Customer to create one.
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.customer && (
              <p className="mt-1 text-xs text-red-500">{errors.customer}</p>
            )}
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
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(280px,1.45fr)_minmax(280px,1.3fr)_90px_125px_120px_44px] items-center gap-3 border-b border-slate-200 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10">
              <span>Item</span>

              <span>Description</span>

              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {calculatedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-[minmax(280px,1.45fr)_minmax(280px,1.3fr)_90px_125px_120px_44px] items-start gap-3 py-4"
                >
                  <ProductSearchPicker
                    products={products}
                    value={
                      item.product
                        ? `${item.product}:${item.variant || ""}`
                        : ""
                    }
                    onSelect={(value) => selectProduct(index, value)}
                    getPrice={getProductPrice}
                  />

                  <Input
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, {
                        description: event.target.value,
                      })
                    }
                    className="h-10 w-full"
                  />

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

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-muted-foreground">VAT</Label>
                  <Select
                    value={form.vat_treatment}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        vat_treatment: value,
                        vat_percentage: value === "STANDARD_VAT" ? 5 : 0,
                        vat_reason:
                          value === "STANDARD_VAT" ? "" : current.vat_reason,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD_VAT">
                        Standard VAT (5%)
                      </SelectItem>
                      {canUseNonVat && (
                        <>
                          <SelectItem value="ZERO_RATED">
                            Zero Rated (0%)
                          </SelectItem>
                          <SelectItem value="EXEMPT">Exempt (0%)</SelectItem>
                          <SelectItem value="OUT_OF_SCOPE">
                            Out of Scope (0%)
                          </SelectItem>
                          <SelectItem value="REVERSE_CHARGE">
                            Reverse Charge
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {form.vat_treatment !== "STANDARD_VAT" && (
                  <Input
                    value={form.vat_reason}
                    onChange={(event) =>
                      updateForm("vat_reason", event.target.value)
                    }
                    placeholder="VAT reason / legal reference"
                    className="h-8"
                  />
                )}

                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">
                    VAT ({commonVatRate}%)
                  </span>
                  <CurrencyText value={vatAmount} currency={form.currency} />
                </div>
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

        <Button type="button" variant="outline" onClick={downloadInvoicePdf}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
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
