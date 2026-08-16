import React from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  description: "",
  quantity: 1,
  unit_price: 0,
  vat_percentage: 5,
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

function CustomerSearchPicker({
  customers,
  filteredCustomers,
  value,
  search,
  onSearchChange,
  onSelect,
}) {
  const [open, setOpen] = React.useState(false);
  const searchRef = React.useRef(null);

  const selectedCustomer = React.useMemo(
    () => customers.find((customer) => String(customer.id) === String(value)),
    [customers, value],
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
          onSearchChange("");
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
          className="mt-2 h-10 w-full justify-between px-3 font-normal"
        >
          <div className="min-w-0 text-left">
            <div className="truncate text-sm">
              {selectedCustomer?.customer_name || "Search or select customer"}
            </div>
            {selectedCustomer && (
              <div className="truncate text-[11px] text-muted-foreground">
                {[
                  selectedCustomer.customer_code,
                  selectedCustomer.phone || selectedCustomer.phone_number,
                  selectedCustomer.email,
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
        className="w-[var(--radix-popover-trigger-width)] min-w-[360px] max-w-[min(520px,calc(100vw-2rem))] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusSearch();
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={searchRef}
            value={search}
            onValueChange={onSearchChange}
            placeholder="Search name, phone, email or customer code..."
          />
          <CommandList className="max-h-[320px]">
            {!filteredCustomers.length && (
              <CommandEmpty>No customers match your search.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredCustomers.map((customer) => {
                const isSelected = String(customer.id) === String(value);

                return (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.customer_name || ""} ${customer.customer_code || ""} ${customer.phone || customer.phone_number || ""} ${customer.email || ""}`}
                    onSelect={() => {
                      onSelect(String(customer.id));
                      onSearchChange("");
                      setOpen(false);
                    }}
                    className="my-1 cursor-pointer py-2.5"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {customer.customer_name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[
                          customer.customer_code,
                          customer.phone || customer.phone_number,
                          customer.email,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Customer"}
                      </div>
                    </div>
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

export default function SalesOrderFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get("quotation");
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branchId } = useActiveBranchFilter();

  const [errors, setErrors] = React.useState({});
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [form, setForm] = React.useState({
    quotation: quotationId || "",
    branch: branchId ? String(branchId) : "",
    customer: "",
    salesperson: "",
    order_number: "",
    order_date: today(),
    delivery_date: addDays(today(), 7),
    delivery_method: "OWN_FLEET",
    shipping_address: "",
    emirate: "",
    currency: "AED",
    shipping_amount: 0,
    discount_amount: 0,
    notes: "",
    status: "DRAFT",
    items: [emptyItem()],
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: async () => unwrap(await api.get(`/sales/orders/${id}/`)),
    enabled: isEdit,
    staleTime: 0,
  });

  const { data: sourceQuotation } = useQuery({
    queryKey: ["sales-order-source-quotation", quotationId],
    queryFn: async () =>
      unwrap(await api.get(`/sales/quotations/${quotationId}/`)),
    enabled: !isEdit && Boolean(quotationId),
    staleTime: 0,
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-order-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/orders/form-options/", {
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
  const quotations = normalizeList(options.quotations);

  const filteredCustomers = React.useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [customer.customer_name, customer.phone, customer.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [customers, customerSearch]);

  React.useEffect(() => {
    const source = existing || sourceQuotation;
    if (!source) return;

    const fromQuotation = !existing && Boolean(sourceQuotation);

    setForm({
      quotation: fromQuotation
        ? String(source.id)
        : source.quotation
          ? String(source.quotation?.id || source.quotation)
          : "",

      branch: String(source.branch?.id || source.branch || ""),
      customer: String(source.customer?.id || source.customer || ""),
      salesperson: source.salesperson
        ? String(source.salesperson?.id || source.salesperson)
        : "",
      order_number: existing?.order_number || "",
      order_date: existing?.order_date || today(),
      delivery_date: existing?.delivery_date || addDays(today(), 7),
      delivery_method: existing?.delivery_method || "OWN_FLEET",
      shipping_address:
        existing?.shipping_address ||
        source.customer_shipping_address ||
        source.customer_billing_address ||
        "",
      emirate: existing?.emirate || "",
      currency: source.currency || "AED",
      shipping_amount: number(source.shipping_amount),
      discount_amount: number(source.discount_amount),
      notes: source.notes || "",
      status: existing?.status || "DRAFT",
      items: source.items?.length
        ? source.items.map((item) => ({
            id: existing ? item.id : undefined,
            product: item.product
              ? String(item.product?.id || item.product)
              : "",
            variant: item.variant
              ? String(item.variant?.id || item.variant)
              : "",
            description: item.description || "",
            quantity: number(item.quantity),
            unit_price: number(item.unit_price),
            vat_percentage: number(item.vat_percentage),
            available_stock: number(item.available_stock),
          }))
        : [emptyItem()],
    });
  }, [existing, sourceQuotation]);

  const stockMap = React.useMemo(() => {
    const map = new Map();
    normalizeList(options.stock).forEach((row) => {
      map.set(
        `${row.product_id}:${row.variant_id || ""}`,
        number(row.available_stock),
      );
    });
    return map;
  }, [options.stock]);

  const calculatedItems = form.items.map((item) => {
    const availableStock =
      stockMap.get(`${item.product}:${item.variant || ""}`) ??
      stockMap.get(`${item.product}:`) ??
      number(item.available_stock);

    const subtotal = number(item.quantity) * number(item.unit_price);

    const vatAmount = (subtotal * number(item.vat_percentage)) / 100;

    return {
      ...item,
      available_stock: availableStock,
      subtotal,
      vat_amount: vatAmount,
      line_total: subtotal + vatAmount,
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

  const total =
    subtotal +
    vatAmount +
    number(form.shipping_amount) -
    number(form.discount_amount);

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
        itemIndex === index ? { ...item, ...patch } : item,
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
      description: product?.description || product?.product_name || "",
      unit_price: getProductPrice(product),
      vat_percentage: number(product?.vat_percentage ?? product?.vat_rate ?? 5),
      available_stock: number(product?.available_stock),
    });
  };

  const selectQuotation = (value) => {
    const quotation = quotations.find(
      (item) => String(item.id) === String(value),
    );

    if (!quotation) {
      updateForm("quotation", "");
      return;
    }

    navigate(`/sales/orders/new?quotation=${quotation.id}`);
  };

  const validate = () => {
    const next = {};

    if (!form.branch) next.branch = "Branch is required.";
    if (!form.customer) next.customer = "Customer is required.";
    if (!form.order_date) next.order_date = "Order date is required.";
    if (!form.delivery_date) next.delivery_date = "Delivery date is required.";

    if (
      form.order_date &&
      form.delivery_date &&
      form.delivery_date < form.order_date
    ) {
      next.delivery_date = "Delivery date cannot be before the order date.";
    }

    if (!form.shipping_address) {
      next.shipping_address = "Shipping address is required.";
    }

    if (!form.items.length) {
      next.items = "Add at least one order item.";
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

    if (calculatedItems.some((item) => !item.has_enough_stock)) {
      next.items = "One or more products do not have enough available stock.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        order_number: form.order_number || undefined,
        quotation: form.quotation ? Number(form.quotation) : null,
        branch: Number(form.branch),
        customer: Number(form.customer),
        salesperson: form.salesperson ? Number(form.salesperson) : null,
        shipping_amount: number(form.shipping_amount),
        discount_amount: number(form.discount_amount),
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        items: calculatedItems.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          product: Number(item.product),
          variant: item.variant ? Number(item.variant) : null,
          description: item.description,
          quantity: number(item.quantity),
          unit_price: number(item.unit_price),
          vat_percentage: number(item.vat_percentage),
        })),
      };

      return isEdit
        ? api.patch(`/sales/orders/${id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/sales/orders/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-orders"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sales-orders-summary"],
        }),
      ]);

      toast.success("Sales order saved.");

      const saved = unwrap(response);
      navigate(saved?.id ? `/sales/orders/${saved.id}` : "/sales/orders");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save sales order", {
        description:
          details.summary ||
          details.message ||
          "Please review the sales order details.",
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  if (isEdit && existingLoading) {
    return <div className="card-surface p-6">Loading sales order...</div>;
  }

  const sourceNumber =
    sourceQuotation?.quote_number || existing?.quotation_number || "";

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={isEdit ? "Edit Sales Order" : "New Sales Order"}
        subtitle="Create from an accepted quotation or start a fresh order"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/sales/orders">Cancel</Link>
            </Button>

            <Button
              type="button"
              onClick={submit}
              disabled={saveMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Sales Order
            </Button>
          </div>
        }
      />

      <section className="card-surface p-5">
        <h2 className="font-semibold">Source</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Convert an accepted quotation, or start a fresh order.
        </p>

        {sourceNumber ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <span className="text-muted-foreground">Converting from</span>
              <Link
                to={`/sales/quotations/${form.quotation}`}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-300"
              >
                {sourceNumber}
                {sourceQuotation?.customer_name
                  ? ` — ${sourceQuotation.customer_name}`
                  : ""}
              </Link>
              <CurrencyText
                value={sourceQuotation?.total_amount || total}
                currency={form.currency}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                navigate("/sales/orders/new");
                setForm((current) => ({
                  ...current,
                  quotation: "",
                  customer: "",
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
            <Label>Accepted Quotation</Label>
            <Select
              value={form.quotation || "__blank__"}
              onValueChange={(value) =>
                value === "__blank__"
                  ? updateForm("quotation", "")
                  : selectQuotation(value)
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Start blank or select quotation" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__blank__">Start blank order</SelectItem>
                {quotations.map((quotation) => (
                  <SelectItem key={quotation.id} value={String(quotation.id)}>
                    {quotation.quote_number} · {quotation.customer_name}
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
          Sets the order number series, fulfilling warehouse, and stock
          availability.
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
                  {branch.location || branch.address || "Branch order series"}
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
        <h2 className="font-semibold">Order Details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Who the order is for and when it ships.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label>Customer *</Label>

            <CustomerSearchPicker
              customers={customers}
              filteredCustomers={filteredCustomers}
              value={form.customer}
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              onSelect={(value) => updateForm("customer", value)}
            />

            <InlineCustomerDialog
              branchId={form.branch}
              onCreated={(customer) => {
                queryClient.invalidateQueries({
                  queryKey: ["sales-order-form-options"],
                });
                updateForm("customer", String(customer.id));
                setCustomerSearch("");
              }}
            />

            {errors.customer && (
              <p className="mt-1 text-xs text-red-500">{errors.customer}</p>
            )}
          </div>

          <div>
            <Label>Order #</Label>
            <Input
              value={form.order_number}
              onChange={(event) =>
                updateForm("order_number", event.target.value)
              }
              placeholder="Auto-generated"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Salesperson</Label>
            <Select
              value={form.salesperson || "__none__"}
              onValueChange={(value) =>
                updateForm("salesperson", value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select salesperson" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__none__">Not assigned</SelectItem>
                {salespeople.map((person) => (
                  <SelectItem key={person.id} value={String(person.id)}>
                    {person.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Order Date *</Label>
            <Input
              type="date"
              value={form.order_date}
              onChange={(event) => updateForm("order_date", event.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Delivery Date *</Label>
            <Input
              type="date"
              value={form.delivery_date}
              onChange={(event) =>
                updateForm("delivery_date", event.target.value)
              }
              className="mt-2"
            />
            {errors.delivery_date && (
              <p className="mt-1 text-xs text-red-500">
                {errors.delivery_date}
              </p>
            )}
          </div>

          <div>
            <Label>Delivery Method</Label>
            <Select
              value={form.delivery_method}
              onValueChange={(value) => updateForm("delivery_method", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWN_FLEET">Own Fleet Delivery</SelectItem>
                <SelectItem value="COURIER">Courier</SelectItem>
                <SelectItem value="CUSTOMER_PICKUP">Customer Pickup</SelectItem>
                <SelectItem value="THIRD_PARTY">
                  Third-Party Transport
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Shipping Address</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Where the order is delivered.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_260px]">
          <div>
            <Label>Address *</Label>
            <Input
              value={form.shipping_address}
              onChange={(event) =>
                updateForm("shipping_address", event.target.value)
              }
              placeholder="Warehouse, street, area, and city"
              className="mt-2"
            />
            {errors.shipping_address && (
              <p className="mt-1 text-xs text-red-500">
                {errors.shipping_address}
              </p>
            )}
          </div>

          <div>
            <Label>Emirate</Label>
            <Select
              value={form.emirate || "__none__"}
              onValueChange={(value) =>
                updateForm("emirate", value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select emirate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {[
                  "Abu Dhabi",
                  "Dubai",
                  "Sharjah",
                  "Ajman",
                  "Umm Al Quwain",
                  "Ras Al Khaimah",
                  "Fujairah",
                ].map((emirate) => (
                  <SelectItem key={emirate} value={emirate}>
                    {emirate}
                  </SelectItem>
                ))}
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
              Confirmed order lines checked against branch stock.
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
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[minmax(200px,1fr)_minmax(220px,1fr)_80px_110px_120px_90px_140px_40px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Item</span>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span>Stock</span>
              <span className="text-right">Unit Price</span>
              <span>VAT</span>
              <span className="text-right">Line Total</span>
              <span />
            </div>

            <div className="space-y-2">
              {calculatedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-[minmax(200px,1fr)_minmax(220px,1fr)_80px_110px_120px_90px_140px_40px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
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
                    className="text-right"
                  />

                  <div
                    className={
                      item.has_enough_stock
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-xs font-medium text-red-500"
                    }
                  >
                    {item.has_enough_stock
                      ? "In stock"
                      : `Low stock — ${item.available_stock} left`}
                  </div>

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

                  <Select
                    value={String(item.vat_percentage)}
                    onValueChange={(value) =>
                      updateItem(index, {
                        vat_percentage: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="text-right font-semibold">
                    <CurrencyText
                      value={item.line_total}
                      currency={form.currency}
                    />
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
                    <X className="h-4 w-4 text-red-400" />
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
                <Label className="text-muted-foreground">Shipping</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shipping_amount}
                  onChange={(event) =>
                    updateForm("shipping_amount", event.target.value)
                  }
                  className="h-8 w-32 text-right"
                />
              </div>

              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <CurrencyText value={total} currency={form.currency} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <Label>Internal Notes</Label>
        <Textarea
          rows={4}
          value={form.notes}
          onChange={(event) => updateForm("notes", event.target.value)}
          placeholder="Packing, delivery, or fulfillment instructions"
          className="mt-2"
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button asChild variant="ghost">
          <Link to="/sales/orders">Cancel</Link>
        </Button>

        <Button
          type="button"
          onClick={submit}
          disabled={saveMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Sales Order
        </Button>
      </div>
    </div>
  );
}
