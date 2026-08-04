import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  calculateTaxLine,
  canManageSalesVat,
  canManageRestrictedStock,
  canUseNonVatSale,
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
import { SalesVatLineControls } from "@/components/sales/SalesVatLineControls";

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
  stock_classification: "REGULAR",
  tax_inclusive: false,
});

export default function QuotationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canManageTax = canManageSalesVat(user);

  const canUseNonVat = canUseNonVatSale(user);

  const canManageRestricted = canManageRestrictedStock(user);

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
    discount_amount: 0,
    shipping_amount: 0,
    notes: "",
    status: "DRAFT",
    items: [emptyItem()],
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["quotation", id],

    queryFn: async () => unwrap(await api.get(`/sales/quotations/${id}/`)),

    enabled: isEdit,
    staleTime: 0,
  });

  const { data: branchesResponse } = useQuery({
    queryKey: ["quotation-branches"],

    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 100,
            is_active: true,
          },
        }),
      ),
  });

  const { data: customersResponse } = useQuery({
    queryKey: ["quotation-customers"],

    queryFn: async () =>
      unwrap(
        await api.get("/customers/", {
          params: {
            page_size: 200,
            is_active: true,
          },
        }),
      ),
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

  const { data: productsResponse } = useQuery({
    queryKey: ["quotation-products", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/quotations/form-options/", {
          params: { branch: form.branch || undefined },
        }),
      ),
    enabled: Boolean(form.branch),
  });

  const branches = normalizeList(branchesResponse);

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
            stock_classification: item.stock_classification || "REGULAR",
            tax_inclusive: Boolean(existing.tax_inclusive),
          }))
        : [emptyItem()],
    });
  }, [existing]);

  const selectedBranch = branches.find(
    (branch) => String(branch.id) === String(form.branch),
  );

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
      vat_percentage: number(product?.vat_percentage ?? product?.vat_rate ?? 5),
      tax_rate: number(product?.vat_rate ?? product?.vat_percentage ?? 5),
      tax_treatment: product?.tax_treatment || "STANDARD_VAT",
      tax_reason: "",
      stock_classification: "REGULAR",
      tax_inclusive: Boolean(product?.vat_inclusive),
    });
  };

  const validate = () => {
    const next = {};

    if (!form.branch) {
      next.branch = "Branch is required.";
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

        discount_amount: number(form.discount_amount),

        shipping_amount: number(form.shipping_amount),

        subtotal,
        vat_amount: vatAmount,
        total_amount: total,

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          description: item.description,

          quantity: number(item.quantity),

          unit_price: number(item.unit_price),

          vat_percentage: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_rate: number(item.tax_rate ?? item.vat_percentage ?? 5),
          tax_treatment: canManageTax ? item.tax_treatment : "STANDARD_VAT",
          tax_reason: canManageTax ? String(item.tax_reason || "").trim() : "",
          stock_classification: canManageRestricted
            ? item.stock_classification
            : "REGULAR",
          tax_inclusive: Boolean(item.tax_inclusive),
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

      <section className="card-surface p-5">
        <h2 className="font-semibold">Branch</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Sets the quote number series, trade licence, VAT details, and
          available stock.
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
                  {branch.location ||
                    branch.address ||
                    "Branch quotation series"}
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
        <h2 className="font-semibold">Quotation Details</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Who the quote is for and how long it is valid.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label>Customer *</Label>

            <Select
              value={form.customer}
              onValueChange={(value) => {
                updateForm("customer", value);
                setCustomerSearch("");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select existing customer" />
              </SelectTrigger>

              <SelectContent className="max-h-80 p-0">
                <div
                  className="sticky top-0 z-10 border-b bg-popover p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="Search customer name, code or contact"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        <div>
                          <div>{customer.customer_name}</div>
                          {(customer.customer_code ||
                            customer.contact_person) && (
                            <div className="text-xs text-muted-foreground">
                              {[customer.customer_code, customer.contact_person]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No customers match your search.
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>

            <InlineCustomerDialog
              onCreated={(customer) => {
                queryClient.invalidateQueries({
                  queryKey: ["quotation-customers"],
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
              {selectedBranch?.branch_name || "the selected branch"}.
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
          <div className="min-w-[1480px]">
            <div className="grid grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_90px_125px_430px_145px_42px] gap-3 border-b border-slate-200 px-1 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10">
              <span>Item</span>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span>VAT & Stock Classification</span>
              <span className="text-right">Line Total</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {calculatedItems.map((item, index) => {
                const filteredProducts = getFilteredProducts(index);

                return (
                  <div
                    key={item.id || index}
                    className="grid grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_90px_125px_430px_145px_42px] items-start gap-3 py-4"
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
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>

                      <SelectContent className="max-h-96 min-w-[390px] p-0">
                        <div
                          className="sticky top-0 z-10 border-b bg-popover p-2"
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <Input
                            autoFocus
                            value={productSearches[index] || ""}
                            onChange={(event) =>
                              setProductSearches((current) => ({
                                ...current,
                                [index]: event.target.value,
                              }))
                            }
                            onClick={(event) => event.stopPropagation()}
                            placeholder="Search product, SKU, brand or variant"
                          />
                        </div>

                        <div className="max-h-72 overflow-y-auto p-1">
                          <SelectItem value="__none__">
                            Select product
                          </SelectItem>

                          {item.product &&
                          !products.some(
                            (product) =>
                              String(product.product_id || product.id) ===
                                String(item.product) &&
                              String(product.variant_id || "") ===
                                String(item.variant || ""),
                          ) ? (
                            <SelectItem
                              value={`${item.product}:${item.variant || ""}`}
                            >
                              <div>
                                <p className="text-sm font-semibold">
                                  {item.product_name ||
                                    `Product ${item.product}`}
                                  {item.variant_name
                                    ? ` — ${item.variant_name}`
                                    : ""}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Existing quotation item
                                </p>
                              </div>
                            </SelectItem>
                          ) : null}

                          {filteredProducts.length ? (
                            filteredProducts.map((product) => (
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
                                      {product.available_stock ?? 0} available
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-300">
                                    AED {getProductPrice(product).toFixed(2)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                              No products match your search.
                            </div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>

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

                    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.025]">
                      <SalesVatLineControls
                        item={item}
                        canManageTax={canManageTax}
                        canUseNonVat={canUseNonVat}
                        canManageRestricted={canManageRestricted}
                        onChange={(patch) => updateItem(index, patch)}
                      />

                      {!canUseNonVat && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Standard VAT 5%
                        </p>
                      )}
                    </div>

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
                <Label className="text-muted-foreground">Discount</Label>

                <Input
                  type="number"
                  min="0"
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
