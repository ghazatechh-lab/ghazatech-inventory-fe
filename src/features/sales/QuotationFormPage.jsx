import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Download, Plus, Save, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calculateTaxLine } from "@/lib/taxAccess";
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
import { cn } from "@/lib/utils";
import { downloadSalesPdf, findSalesCustomer } from "@/lib/salesPdf";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

const decimalValue = (value, decimalPlaces = 2) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  // Backend DecimalFields use max_digits=14. Keep submitted values
  // comfortably within that precision and round floating-point output.
  const maximum = 999999999999.99;
  const minimum = -maximum;
  const bounded = Math.min(maximum, Math.max(minimum, parsed));

  return Number(bounded.toFixed(decimalPlaces));
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

const getEntityId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") {
    return String(value.id ?? value.product_id ?? value.variant_id ?? "");
  }
  return String(value);
};

const getQuotationItemProductName = (item) =>
  item?.product_name ||
  item?.product?.product_name ||
  item?.product?.name ||
  item?.product?.display_name ||
  "";

const getQuotationItemVariantName = (item) =>
  item?.variant_name ||
  item?.variant?.display_name ||
  item?.variant?.variant_name ||
  item?.variant?.name ||
  "";

const emptyItem = () => ({
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
});

const VAT_CATEGORIES = [
  { value: "STANDARD_VAT", label: "Standard VAT (5%)", rate: 5 },
  { value: "ZERO_RATED", label: "Zero Rated (0%)", rate: 0 },
  { value: "EXEMPT", label: "Exempt (0%)", rate: 0 },
  { value: "OUT_OF_SCOPE", label: "Non-VAT / Out of Scope (0%)", rate: 0 },
];

const getVatCategory = (value) =>
  VAT_CATEGORIES.find((category) => category.value === value) || VAT_CATEGORIES[0];

function ProductSearchPicker({
  products,
  allProducts,
  item,
  search,
  onSearchChange,
  onSelect,
}) {
  const [open, setOpen] = React.useState(false);
  const searchRef = React.useRef(null);

  const selectedValue = item.product
    ? `${item.product}:${item.variant || ""}`
    : "";

  const selectedProduct = React.useMemo(
    () =>
      allProducts.find(
        (product) =>
          String(product.product_id || product.id) === String(item.product) &&
          String(product.variant_id || "") === String(item.variant || ""),
      ),
    [allProducts, item.product, item.variant],
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
        if (nextOpen) focusSearch();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between px-3 font-normal"
        >
          <div className="min-w-0 text-left">
            <div className="truncate text-sm font-semibold">
              {selectedProduct?.product_name ||
                item.product_name ||
                "Select product"}
              {(selectedProduct?.variant_name || item.variant_name) && (
                <span className="font-normal text-muted-foreground">
                  {` — ${selectedProduct?.variant_name || item.variant_name}`}
                </span>
              )}
            </div>

            {(selectedProduct || item.product) && (
              <div className="truncate text-[11px] text-muted-foreground">
                {selectedProduct?.sku || "Existing item"}
                {selectedProduct
                  ? ` · ${selectedProduct.available_stock ?? 0} available`
                  : ""}
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
            placeholder="Type product name, SKU, brand or model..."
          />

          <CommandList className="max-h-[340px]">
            {!products.length ? (
              <CommandEmpty>No products match your search.</CommandEmpty>
            ) : null}

            <CommandGroup>
              {item.product && !selectedProduct ? (
                <CommandItem
                  value={`existing-${selectedValue}`}
                  onSelect={() => {
                    setOpen(false);
                    onSearchChange("");
                  }}
                >
                  <Check className="h-4 w-4" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {item.product_name || `Product ${item.product}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Existing quotation item
                    </div>
                  </div>
                </CommandItem>
              ) : null}

              {products.map((product) => {
                const value = `${product.product_id || product.id}:${product.variant_id || ""}`;
                const isSelected = value === selectedValue;

                return (
                  <CommandItem
                    key={value}
                    value={`${product.product_name || ""} ${product.variant_name || ""} ${product.sku || ""} ${product.brand_name || ""}`}
                    onSelect={() => {
                      onSelect(value);
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
                        {product.product_name}
                        {product.variant_name ? ` — ${product.variant_name}` : ""}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {product.sku || "No SKU"} · {product.available_stock ?? 0} available
                      </div>
                    </div>

                    <span className="shrink-0 pl-3 text-xs font-semibold text-blue-600 dark:text-blue-300">
                      AED {getProductPrice(product).toFixed(2)}
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
              {selectedCustomer?.customer_name || "Select existing customer"}
            </div>
            {selectedCustomer && (
              <div className="truncate text-[11px] text-muted-foreground">
                {[
                  selectedCustomer.customer_code,
                  selectedCustomer.contact_person,
                  selectedCustomer.phone || selectedCustomer.phone_number,
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
            placeholder="Type customer name, code, phone, contact or TRN..."
          />

          <CommandList className="max-h-[320px]">
            {!filteredCustomers.length ? (
              <CommandEmpty>No customers match your search.</CommandEmpty>
            ) : null}

            <CommandGroup>
              {filteredCustomers.map((customer) => {
                const isSelected = String(customer.id) === String(value);

                return (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.customer_name || ""} ${customer.customer_code || ""} ${customer.contact_person || ""} ${customer.phone || customer.phone_number || ""} ${customer.email || ""} ${customer.trn_number || ""}`}
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
                          customer.contact_person,
                          customer.phone || customer.phone_number,
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

export default function QuotationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { branchId } = useActiveBranchFilter();

  const [errors, setErrors] = React.useState({});
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [productSearches, setProductSearches] = React.useState({});

  const [form, setForm] = React.useState({
    branch: branchId ? String(branchId) : "",

    customer: "",
    salesperson: "",
    quote_number: "",
    quote_date: today(),
    valid_until: addDays(today(), 14),
    currency: "AED",
    payment_terms: "50% advance, balance on delivery",
    delivery_terms: "",
    vat_category: "STANDARD_VAT",
    vat_reason: "",
    discount_amount: 0,
    shipping_amount: 0,
    notes: "",
    status: "DRAFT",
    items: [emptyItem()],
  });


  // New quotations always use the branch selected in the global top bar.
  // There is intentionally no branch selector inside the quotation form.
  React.useEffect(() => {
    if (isEdit) return;

    const nextBranch = branchId ? String(branchId) : "";

    setForm((current) => {
      if (current.branch === nextBranch) return current;

      return {
        ...current,
        branch: nextBranch,
        customer: "",
        items: [emptyItem()],
      };
    });

    setCustomerSearch("");
    setProductSearches({});
  }, [branchId, isEdit]);

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["quotation", id],

    queryFn: async () => unwrap(await api.get(`/sales/quotations/${id}/`)),

    enabled: isEdit,
    staleTime: 0,
  });

  const { data: customersResponse } = useQuery({
    queryKey: ["quotation-customers", form.branch],

    queryFn: async () =>
      unwrap(
        await api.get("/customers/", {
          params: {
            page_size: 200,
            is_active: true,
            branch: form.branch,
          },
        }),
      ),
    enabled: Boolean(form.branch),
  });

  const { data: usersResponse } = useQuery({
    queryKey: ["quotation-salespeople"],

    queryFn: async () =>
      unwrap(
        await api.get("/accounts/users/", {
          params: {
            page_size: 200,
            is_active: true,
          },
        }),
      ),
  });

  const {
    data: productsResponse,
    isFetching: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["quotation-products", form.branch],
    queryFn: async () => {
      console.group("[Quotation] Product options");
      console.log("Selected top-bar branch:", branchId);
      console.log("Quotation branch sent to API:", form.branch);

      try {
        const response = await api.get("/sales/quotations/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        });

        const payload = unwrap(response);
        const optionProducts = normalizeList(
          payload?.products || payload,
        );

        console.log("Form-options raw response:", payload);
        console.log("Form-options products:", optionProducts);
        console.log("Form-options product count:", optionProducts.length);

        // Temporary safety fallback. This also makes the UI usable if an old
        // backend is still calculating stock from removed regular/restricted
        // quantity fields.
        if (!optionProducts.length) {
          console.warn(
            "Quotation form-options returned no products. Falling back to /products/.",
          );

          const fallbackResponse = await api.get("/products/", {
            params: {
              page_size: 500,
              is_active: true,
              branch: form.branch || undefined,
              ordering: "product_name",
            },
          });

          const fallbackPayload = unwrap(fallbackResponse);
          const fallbackProducts = normalizeList(fallbackPayload);

          console.log("Fallback /products/ raw response:", fallbackPayload);
          console.log("Fallback products:", fallbackProducts);
          console.log("Fallback product count:", fallbackProducts.length);
          console.groupEnd();

          return {
            ...(payload && typeof payload === "object" ? payload : {}),
            products: fallbackProducts,
          };
        }

        console.groupEnd();
        return payload;
      } catch (error) {
        console.error("Failed to load quotation products:", error);
        console.error("API response:", error?.response?.data);
        console.error("HTTP status:", error?.response?.status);
        console.groupEnd();
        throw error;
      }
    },
    enabled: Boolean(form.branch),
    staleTime: 0,
  });

  const customers = React.useMemo(
    () => normalizeList(customersResponse),
    [customersResponse],
  );

  const filteredCustomers = React.useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.customer_name,
        customer.customer_code,
        customer.contact_person,
        customer.email,
        customer.phone,
        customer.phone_number,
        customer.trn_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [customers, customerSearch]);

  const salespeople = normalizeList(
    productsResponse?.salespeople || usersResponse,
  );

  const products = React.useMemo(
    () => normalizeList(productsResponse?.products || productsResponse),
    [productsResponse],
  );

  React.useEffect(() => {
    console.log("[Quotation] branchId:", branchId);
    console.log("[Quotation] form.branch:", form.branch);
    console.log("[Quotation] products loading:", productsLoading);
    console.log("[Quotation] normalized products:", products);
    console.log("[Quotation] normalized product count:", products.length);

    if (productsError) {
      console.error("[Quotation] products query error:", productsError);
      console.error(
        "[Quotation] products query response:",
        productsError?.response?.data,
      );
    }
  }, [branchId, form.branch, products, productsLoading, productsError]);

  const getFilteredProducts = React.useCallback(
    (index) => {
      const search = String(productSearches[index] || "")
        .trim()
        .toLowerCase();

      if (!search) {
        return products;
      }

      return products.filter((product) =>
        [
          product.product_name,
          product.variant_name,
          product.sku,
          product.brand_name,
          product.category_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search)),
      );
    },
    [products, productSearches],
  );

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      branch: String(existing.branch?.id || existing.branch || ""),

      customer: String(existing.customer?.id || existing.customer || ""),

      salesperson: existing.salesperson
        ? String(existing.salesperson?.id || existing.salesperson)
        : "",

      quote_number: existing.quote_number || "",

      quote_date: existing.quote_date || today(),

      valid_until: existing.valid_until || "",

      currency: existing.currency || "AED",

      payment_terms: existing.payment_terms || "",

      delivery_terms: existing.delivery_terms || "",

      vat_category:
        existing.items?.[0]?.tax_treatment ||
        existing.items?.[0]?.vat_treatment ||
        "STANDARD_VAT",

      vat_reason: existing.items?.[0]?.tax_reason || "",

      discount_amount: number(existing.discount_amount),

      shipping_amount: number(existing.shipping_amount),

      notes: existing.notes || "",

      status: existing.status || "DRAFT",

      items: existing.items?.length
        ? existing.items.map((item) => ({
            id: item.id,

            product: getEntityId(item.product_id ?? item.product),

            variant: getEntityId(item.variant_id ?? item.variant),

            product_name: getQuotationItemProductName(item),

            variant_name: getQuotationItemVariantName(item),

            description:
              item.description || getQuotationItemProductName(item) || "",

            quantity: number(item.quantity),

            unit_price: number(item.unit_price),

            vat_percentage: number(item.vat_percentage ?? item.tax_rate ?? 5),
            tax_rate: number(item.tax_rate ?? item.vat_percentage ?? 5),
            tax_treatment: item.tax_treatment || "STANDARD_VAT",
            tax_reason: item.tax_reason || "",
            tax_inclusive: Boolean(existing.tax_inclusive),
          }))
        : [emptyItem()],
    });
  }, [existing]);

  const selectedVatCategory = getVatCategory(form.vat_category);

  const calculatedItems = form.items.map((item) => {
    const values = calculateTaxLine({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      treatment: selectedVatCategory.value,
      taxRate: selectedVatCategory.rate,
      inclusive: false,
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
    setProductSearches((current) => ({
      ...current,
      [index]: "",
    }));

    const [productId, variantId = ""] = String(optionValue || "").split(":");
    const product = products.find(
      (item) =>
        String(item.product_id || item.id) === productId &&
        String(item.variant_id || "") === variantId,
    );
    updateItem(index, {
      product: productId,
      variant: variantId,

      product_name: product?.product_name || "",
      variant_name: product?.variant_name || "",

      description: product?.description || product?.product_name || "",

      unit_price: getProductPrice(product),
      // VAT is selected once for the full quotation in the totals section.
      vat_percentage: selectedVatCategory.rate,
      tax_rate: selectedVatCategory.rate,
      tax_treatment: selectedVatCategory.value,
      tax_reason: form.vat_reason || "",
      tax_inclusive: false,
    });
  };

  const handleAddLineItem = () => {
    const incompleteIndex = form.items.findIndex(
      (item) =>
        !item.product ||
        number(item.quantity) <= 0 ||
        number(item.unit_price) < 0,
    );

    if (incompleteIndex !== -1) {
      const lineNumber = incompleteIndex + 1;

      setErrors((current) => ({
        ...current,
        items: `Complete line item ${lineNumber} before adding another item.`,
      }));

      toast.error(`Complete line item ${lineNumber} first`, {
        description:
          "Select a product and enter a valid quantity and unit price before adding another line.",
      });

      return;
    }

    setErrors((current) => ({
      ...current,
      items: "",
    }));

    setForm((current) => ({
      ...current,
      items: [...current.items, emptyItem()],
    }));
  };

  const validate = () => {
    const next = {};

    if (!form.branch) {
      next.branch = "Select a branch from the top bar before creating a quotation.";
    }

    if (!form.customer) {
      next.customer = "Customer is required.";
    }

    if (!form.quote_date) {
      next.quote_date = "Quote date is required.";
    }

    if (!form.valid_until) {
      next.valid_until = "Valid-until date is required.";
    }

    if (
      form.valid_until &&
      form.quote_date &&
      form.valid_until < form.quote_date
    ) {
      next.valid_until = "Valid-until date cannot be before the quote date.";
    }

    if (!form.items.length) {
      next.items = "Add at least one line item.";
    }

    if (form.vat_category !== "STANDARD_VAT" && !String(form.vat_reason || "").trim()) {
      next.vat_reason =
        "A legal reason / supporting reference is required for 0% or Non-VAT quotations.";
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
        "Every line needs a product, positive quantity, and valid unit price.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ status }) => {
      const payload = {
        ...form,

        status,

        branch: Number(form.branch),

        customer: Number(form.customer),

        salesperson: form.salesperson ? Number(form.salesperson) : null,

        discount_amount: decimalValue(form.discount_amount),

        shipping_amount: decimalValue(form.shipping_amount),

        subtotal: decimalValue(subtotal),
        vat_amount: decimalValue(vatAmount),
        total_amount: decimalValue(total),

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          description: item.description,

          quantity: decimalValue(item.quantity, 2),

          unit_price: decimalValue(item.unit_price, 2),

          vat_percentage: decimalValue(selectedVatCategory.rate, 2),
          tax_rate: decimalValue(selectedVatCategory.rate, 2),
          subtotal: decimalValue(item.subtotal),
          vat_amount: decimalValue(item.vat_amount),
          line_total: decimalValue(item.line_total),
          tax_treatment: selectedVatCategory.value,
          tax_reason:
            selectedVatCategory.value === "STANDARD_VAT"
              ? ""
              : String(form.vat_reason || "").trim(),
          tax_inclusive: false,
        })),
      };

      return isEdit
        ? api.patch(`/sales/quotations/${id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/sales/quotations/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["quotations"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["quotations-summary"],
        }),
      ]);

      toast.success(
        variables.status === "DRAFT"
          ? "Quotation saved as draft."
          : "Quotation sent to customer.",
      );

      const saved = unwrap(response);

      navigate(
        saved?.id ? `/sales/quotations/${saved.id}` : "/sales/quotations",
      );
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save quotation", {
        description:
          details.summary ||
          details.message ||
          "Please review the quotation fields.",
      });
    },
  });

  const selectedCustomerForPdf = React.useMemo(
    () => findSalesCustomer(customers, form.customer),
    [customers, form.customer],
  );

  const downloadQuotationPdf = () => {
    if (!form.customer) {
      toast.error("Select a customer before downloading the quotation PDF.");
      return;
    }

    if (!calculatedItems.length || !calculatedItems.some((item) => item.product)) {
      toast.error("Add at least one quotation item before downloading PDF.");
      return;
    }

    try {
      downloadSalesPdf({
        type: "QUOTATION",
        number: form.quote_number || existing?.quote_number || "DRAFT",
        date: form.quote_date,
        secondaryLabel: "Valid Until",
        secondaryValue: form.valid_until,
        paymentTerms: form.payment_terms,
        customer: selectedCustomerForPdf,
        items: calculatedItems,
        products,
        subtotal,
        vatAmount,
        discountAmount: form.discount_amount,
        shippingAmount: form.shipping_amount,
        total,
        currency: form.currency,
        notes: form.notes,
        deliveryTerms: form.delivery_terms,
        status: form.status,
      });

      toast.success("Quotation PDF downloaded.");
    } catch (error) {
      console.error("[Quotation PDF] Failed:", error);
      toast.error("Unable to generate quotation PDF.");
    }
  };

  const submit = (status) => {
    if (!validate()) return;

    saveMutation.mutate({
      status,
    });
  };

  if (isEdit && existingLoading) {
    return <div className="card-surface p-6">Loading quotation...</div>;
  }

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={isEdit ? "Edit Quotation" : "New Quotation"}
        subtitle="Prepare customer pricing, validity, items, tax, and terms"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/sales/quotations">Cancel</Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={downloadQuotationPdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <Button
              type="button"
              onClick={() => submit("DRAFT")}
              disabled={saveMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Quotation
            </Button>
          </div>
        }
      />

      {!isEdit && !form.branch && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Select a branch from the top bar before creating a quotation.
        </section>
      )}

      <section className="card-surface p-5">
        <h2 className="font-semibold">Quotation Details</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Who the quote is for and how long it is valid.
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
              onSelect={(value) => {
                updateForm("customer", value);
                setCustomerSearch("");
              }}
            />

            <InlineCustomerDialog
              onCreated={(customer) => {
                queryClient.invalidateQueries({
                  queryKey: ["quotation-customers", form.branch],
                });
                updateForm("customer", String(customer.id));
              }}
            />

            {errors.customer && (
              <p className="mt-1 text-xs text-red-500">{errors.customer}</p>
            )}
          </div>

          <div>
            <Label>Quote #</Label>

            <Input
              value={form.quote_number || "Auto-generated"}
              readOnly
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
                    {person.full_name ||
                      person.name ||
                      person.username ||
                      person.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quote Date *</Label>

            <Input
              type="date"
              value={form.quote_date}
              onChange={(event) => updateForm("quote_date", event.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Valid Until *</Label>

            <Input
              type="date"
              value={form.valid_until}
              onChange={(event) =>
                updateForm("valid_until", event.target.value)
              }
              className="mt-2"
            />

            {errors.valid_until && (
              <p className="mt-1 text-xs text-red-500">{errors.valid_until}</p>
            )}
          </div>

          <div>
            <Label>Currency</Label>

            <Select
              value={form.currency}
              onValueChange={(value) => updateForm("currency", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="AED">AED — UAE Dirham</SelectItem>

                <SelectItem value="USD">USD — US Dollar</SelectItem>

                <SelectItem value="EUR">EUR — Euro</SelectItem>
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
              Products and services being quoted from{" "}
              the active branch selected in the top bar.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLineItem}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[minmax(240px,1.35fr)_minmax(220px,1fr)_80px_110px_120px_42px] gap-3 border-b border-slate-200 px-1 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10">
              <span>Item</span>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
                <span className="text-right">Line Total</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {calculatedItems.map((item, index) => {
                const filteredProducts = getFilteredProducts(index);

                return (
                  <div
                    key={item.id || index}
                    className="grid grid-cols-[minmax(240px,1.35fr)_minmax(220px,1fr)_80px_110px_120px_42px] items-start gap-3 py-4"
                  >
                    <ProductSearchPicker
                      products={filteredProducts}
                      allProducts={products}
                      item={item}
                      search={productSearches[index] || ""}
                      onSearchChange={(value) =>
                        setProductSearches((current) => ({
                          ...current,
                          [index]: value,
                        }))
                      }
                      onSelect={(value) => selectProduct(index, value)}
                    />

                    <Input
                      className="h-10"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Item description"
                    />

                    <Input
                      type="number"
                      min="0.01"
                      max="999999999999.99"
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
                      max="999999999999.99"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(event) =>
                        updateItem(index, {
                          unit_price: event.target.value,
                        })
                      }
                      className="h-10 text-right"
                    />

                    <div className="flex min-h-10 items-center justify-end px-2 text-right font-semibold">
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
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          items: current.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }));

                        setProductSearches((current) => {
                          const next = { ...current };
                          delete next[index];
                          return next;
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {errors.items && (
              <p className="mt-3 text-sm text-red-500">{errors.items}</p>
            )}

            <div className="ml-auto mt-7 max-w-md space-y-3 rounded-xl border bg-slate-50 p-5 text-sm dark:border-white/10 dark:bg-white/[0.025]">
              <div>
                <Label>VAT Category</Label>
                <Select
                  value={form.vat_category || "STANDARD_VAT"}
                  onValueChange={(value) => {
                    updateForm("vat_category", value);
                    if (value === "STANDARD_VAT") {
                      updateForm("vat_reason", "");
                    }
                  }}
                >
                  <SelectTrigger className="mt-2 h-9">
                    <SelectValue placeholder="Select VAT category" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.vat_category !== "STANDARD_VAT" && (
                <div>
                  <Label>VAT Reason / Supporting Reference *</Label>
                  <Input
                    className="mt-2 h-9"
                    value={form.vat_reason || ""}
                    onChange={(event) => updateForm("vat_reason", event.target.value)}
                    placeholder="Enter legal reason or supporting reference"
                  />
                  {errors.vat_reason && (
                    <p className="mt-1 text-xs text-red-500">{errors.vat_reason}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Subtotal</span>

                <CurrencyText value={subtotal} currency={form.currency} />
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  VAT ({selectedVatCategory.rate}%)
                </span>

                <CurrencyText value={vatAmount} currency={form.currency} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-muted-foreground">Discount</Label>

                <Input
                  type="number"
                  min="0"
                  max="999999999999.99"
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(event) =>
                    updateForm("discount_amount", event.target.value)
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
        <h2 className="font-semibold">Terms & Notes</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          These details are shown to the customer on the quotation PDF.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                <SelectItem value="100% advance">100% advance</SelectItem>

                <SelectItem value="50% advance, balance on delivery">
                  50% advance, balance on delivery
                </SelectItem>

                <SelectItem value="Net 15">Net 15</SelectItem>

                <SelectItem value="Net 30">Net 30</SelectItem>

                <SelectItem value="Due on delivery">Due on delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Delivery Terms</Label>

            <Input
              value={form.delivery_terms}
              onChange={(event) =>
                updateForm("delivery_terms", event.target.value)
              }
              placeholder="e.g. 5–7 working days from confirmation"
              className="mt-2"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Notes</Label>

            <Textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Any additional notes for the customer..."
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Status</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Save as draft or send the quotation to the customer now.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updateForm("status", "DRAFT")}
            className={
              form.status === "DRAFT"
                ? "rounded-xl border border-blue-500 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700 ring-1 ring-blue-500 dark:bg-blue-500/10 dark:text-blue-300"
                : "rounded-xl border border-slate-200 px-5 py-4 text-sm font-medium dark:border-white/10"
            }
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => updateForm("status", "SENT")}
            className={
              form.status === "SENT"
                ? "rounded-xl border border-blue-500 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700 ring-1 ring-blue-500 dark:bg-blue-500/10 dark:text-blue-300"
                : "rounded-xl border border-slate-200 px-5 py-4 text-sm font-medium dark:border-white/10"
            }
          >
            Send to Customer Now
          </button>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button asChild variant="ghost">
          <Link to="/sales/quotations">Cancel</Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => submit("DRAFT")}
          disabled={saveMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>

        <Button
          type="button"
          onClick={() => submit(form.status === "SENT" ? "SENT" : "DRAFT")}
          disabled={saveMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {form.status === "SENT" ? (
            <Send className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          {form.status === "SENT" ? "Send Quotation" : "Save Quotation"}
        </Button>
      </div>
    </div>
  );
}