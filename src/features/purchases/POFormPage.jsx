import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Plus, Save, Send, Trash2 } from "lucide-react";
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
import { CurrencyText } from "@/components/common/CurrencyText";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyItem = () => ({
  product: "",
  variant: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_amount: 0,
});

const getVariants = (product) =>
  (product?.variants || []).filter(
    (variant) => variant.is_active !== false && !variant.is_base,
  );

const getSupplierMeta = (supplier) => {
  if (!supplier) return "";

  const parts = [supplier.contact_person, supplier.email].filter(Boolean);

  return parts.join(" · ");
};

function ApprovalStep({ number, title, detail, complete = false }) {
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
        {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export default function POFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState({
    po_number: "",
    supplier: "",
    branch: branchId ? String(branchId) : "",
    order_date: today(),
    expected_delivery_date: "",
    currency: "AED",
    supplier_reference: "",
    shipping_amount: 0,
    other_charges: 0,
    discount_amount: 0,
    notes: "",
    terms_conditions: "",
    status: "DRAFT",
    items: [emptyItem()],
  });

  const [errors, setErrors] = React.useState({});
  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [supplierSearchOpen, setSupplierSearchOpen] = React.useState(false);
  const [productSearches, setProductSearches] = React.useState({});
  const [productSearchOpen, setProductSearchOpen] = React.useState({});

  React.useEffect(() => {
    if (!edit && branchId) {
      setForm((current) => ({
        ...current,
        branch: String(branchId),
      }));
    }
  }, [branchId, edit]);

  const { data: supplierResponse } = useQuery({
    queryKey: ["supplier-options", "purchase-order-form", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/suppliers/", {
          params: {
            page_size: 500,
            is_active: true,
            ordering: "supplier_name",
            branch: form.branch || undefined,
          },
        }),
      ),
  });

  const { data: branchResponse } = useQuery({
    queryKey: ["branch-options", "purchase-order-form"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 500,
            is_active: true,
            ordering: "branch_code",
          },
        }),
      ),
  });

  const { data: productResponse } = useQuery({
    queryKey: ["product-options", "purchase-order-form", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page_size: 500,
            is_active: true,
            branch: form.branch || undefined,
            ordering: "product_name",
          },
        }),
      ),
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => unwrap(await api.get(`/purchases/orders/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });

  const suppliers = React.useMemo(
    () => normalizeList(supplierResponse),
    [supplierResponse],
  );

  const filteredSuppliers = React.useMemo(() => {
    const search = supplierSearch.trim().toLowerCase();

    if (!search) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.supplier_name,
        supplier.contact_person,
        supplier.email,
        supplier.phone,
        supplier.phone_number,
        supplier.supplier_code,
        supplier.tax_registration_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [suppliers, supplierSearch]);

  const allBranches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const branches = React.useMemo(
    () =>
      branchId
        ? allBranches.filter((branch) => String(branch.id) === String(branchId))
        : allBranches,
    [allBranches, branchId],
  );

  const products = React.useMemo(
    () => normalizeList(productResponse),
    [productResponse],
  );

  const selectedSupplier = React.useMemo(
    () =>
      suppliers.find(
        (supplier) => String(supplier.id) === String(form.supplier),
      ),
    [suppliers, form.supplier],
  );

  React.useEffect(() => {
    if (!selectedSupplier) {
      return;
    }

    setSupplierSearch(selectedSupplier.supplier_name || "");
  }, [selectedSupplier]);

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      po_number: existing.po_number || "",
      supplier: String(existing.supplier?.id || existing.supplier || ""),
      branch: String(existing.branch?.id || existing.branch || ""),
      order_date: existing.order_date || today(),
      expected_delivery_date: existing.expected_delivery_date || "",
      currency: existing.currency || "AED",
      supplier_reference: existing.supplier_reference || "",
      shipping_amount: existing.shipping_amount || 0,
      other_charges: existing.other_charges || 0,
      discount_amount: existing.discount_amount || 0,
      notes: existing.notes || "",
      terms_conditions: existing.terms_conditions || "",
      status: existing.status || "DRAFT",
      items:
        (existing.items || []).length > 0
          ? existing.items.map((item) => ({
              id: item.id,
              product: String(item.product?.id || item.product || ""),
              variant: item.variant
                ? String(item.variant?.id || item.variant)
                : "",
              description: item.description || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              discount_amount: item.discount_amount || 0,
            }))
          : [emptyItem()],
    });
  }, [existing]);

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

  const getProductSearchValue = (index, item) => {
    if (Object.prototype.hasOwnProperty.call(productSearches, index)) {
      return productSearches[index];
    }

    const selected = products.find(
      (candidate) => String(candidate.id) === String(item.product),
    );

    if (!selected) return "";

    return [selected.product_name, selected.sku].filter(Boolean).join(" · ");
  };

  const getFilteredProducts = (index, item) => {
    const selected = products.find(
      (candidate) => String(candidate.id) === String(item.product),
    );
    const selectedLabel = selected
      ? [selected.product_name, selected.sku].filter(Boolean).join(" · ")
      : "";

    const search = getProductSearchValue(index, item).trim().toLowerCase();

    if (!search || search === selectedLabel.toLowerCase()) {
      return products;
    }

    return products.filter((candidate) =>
      [
        candidate.product_name,
        candidate.sku,
        candidate.barcode,
        candidate.brand_name,
        candidate.category_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  };

  const calculations = React.useMemo(
    () =>
      form.items.map((item) => {
        const gross = money(item.quantity) * money(item.unit_price);

        const discount = money(item.discount_amount);
        const taxable = Math.max(0, gross - discount);

        const vat = (taxable * 5) / 100;

        return {
          gross,
          discount,
          vat,
          total: taxable + vat,
        };
      }),
    [form.items],
  );

  const subtotal = calculations.reduce((sum, item) => sum + item.gross, 0);

  const lineDiscounts = calculations.reduce(
    (sum, item) => sum + item.discount,
    0,
  );

  const vat = calculations.reduce((sum, item) => sum + item.vat, 0);

  const total =
    subtotal -
    lineDiscounts -
    money(form.discount_amount) +
    vat +
    money(form.shipping_amount) +
    money(form.other_charges);

  const validate = () => {
    const next = {};

    if (!form.supplier) next.supplier = "Supplier is required.";
    if (!form.branch) next.branch = "Branch is required.";
    if (!form.order_date) next.order_date = "Order date is required.";
    if (!form.expected_delivery_date) {
      next.expected_delivery_date = "Expected delivery is required.";
    }

    if (
      !form.items.length ||
      form.items.some(
        (item) =>
          !item.product ||
          money(item.quantity) <= 0 ||
          money(item.unit_price) < 0,
      )
    ) {
      next.items = "Add at least one valid item with quantity and unit cost.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async ({ targetStatus }) => {
      const body = {
        ...form,
        po_number: form.po_number || undefined,
        supplier: Number(form.supplier),
        branch: Number(form.branch),
        status: targetStatus,
        shipping_amount: money(form.shipping_amount),
        other_charges: money(form.other_charges),
        discount_amount: money(form.discount_amount),
        items: form.items.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          product: Number(item.product),
          variant: item.variant ? Number(item.variant) : null,
          description: item.description || "",
          quantity: Number(item.quantity || 0),
          tax_treatment: "STANDARD_VAT",
          tax_reason: "",
          unit_price: money(item.unit_price),
          discount_amount: money(item.discount_amount),
          vat_percentage: 5,
        })),
      };

      return edit
        ? api.patch(`/purchases/orders/${id}/`, body, {
            skipGlobalErrorToast: true,
          })
        : api.post("/purchases/orders/", body, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["purchase-orders"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["purchase-orders-summary"],
        }),
      ]);

      toast.success(
        saved.status === "PENDING_APPROVAL"
          ? "Purchase order submitted for approval."
          : "Purchase order saved as draft.",
      );

      navigate(`/purchases/orders/${saved.id || id}`);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      const next = {};

      (details.errors || []).forEach(({ field, message }) => {
        const root = field?.split(/[.[]/)[0];
        if (root) next[root] = message;
      });

      setErrors((current) => ({
        ...current,
        ...next,
      }));

      toast.error(details.title || "Unable to save purchase order", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const canAddAnotherItem = form.items.every(
    (item) =>
      Boolean(item.product) &&
      money(item.quantity) > 0 &&
      money(item.unit_price) >= 0,
  );

  const addLineItem = () => {
    if (!canAddAnotherItem) {
      toast.error(
        "Complete the current line item before adding another product.",
      );
      return;
    }

    setForm((current) => ({
      ...current,
      items: [...current.items, emptyItem()],
    }));
  };

  const submit = (targetStatus) => {
    if (!validate()) return;
    save.mutate({ targetStatus });
  };

  if (edit && existingLoading) {
    return <div className="card-surface p-6">Loading purchase order...</div>;
  }

  const orderLabel = form.po_number || "Auto-generated";
  const orderStatus = form.status === "DRAFT" ? "Draft" : form.status;

  return (
    <div className="purchase-module-page purchase-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={edit ? "Edit Purchase Order" : "New Purchase Order"}
        subtitle="Raise an order against a supplier and track it through to delivery"
        actions={
          <span className="rounded-md bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            {orderLabel} · {orderStatus}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Order details
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Who this order goes to and when it is needed by
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Label htmlFor="supplier_search">
                  Supplier <span className="text-red-500">*</span>
                </Label>

                <Input
                  id="supplier_search"
                  className="mt-2"
                  value={supplierSearch}
                  autoComplete="off"
                  onFocus={() => setSupplierSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;

                    setSupplierSearch(value);
                    setSupplierSearchOpen(true);

                    if (
                      selectedSupplier &&
                      value !== selectedSupplier.supplier_name
                    ) {
                      updateForm("supplier", "");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSupplierSearchOpen(false);
                    }
                  }}
                  placeholder="Search and select supplier"
                />

                {supplierSearchOpen ? (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-background p-1 shadow-xl dark:border-white/10">
                    {filteredSuppliers.length ? (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            updateForm("supplier", String(supplier.id));
                            setSupplierSearch(
                              supplier.supplier_name || supplier.name || "",
                            );
                            setSupplierSearchOpen(false);
                          }}
                        >
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {supplier.supplier_name || supplier.name}
                          </span>

                          {(supplier.supplier_code ||
                            supplier.contact_person ||
                            supplier.email) && (
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              {[
                                supplier.supplier_code,
                                supplier.contact_person,
                                supplier.email,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No suppliers match your search.
                      </div>
                    )}
                  </div>
                ) : null}

                {errors.supplier && (
                  <p className="mt-1 text-xs text-red-500">{errors.supplier}</p>
                )}
              </div>

              <div>
                <Label>
                  Order date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.order_date}
                  onChange={(event) =>
                    updateForm("order_date", event.target.value)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>
                  Expected delivery <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  min={form.order_date}
                  value={form.expected_delivery_date}
                  onChange={(event) =>
                    updateForm("expected_delivery_date", event.target.value)
                  }
                  className="mt-2"
                />
                {errors.expected_delivery_date && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.expected_delivery_date}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <Label>Branch</Label>
                <Select
                  value={form.branch}
                  onValueChange={(value) => updateForm("branch", value)}
                  disabled={Boolean(branchId)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.branch_code || branch.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {["AED", "USD", "EUR", "INR"].map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reference</Label>
                <Input
                  value={form.supplier_reference}
                  onChange={(event) =>
                    updateForm("supplier_reference", event.target.value)
                  }
                  placeholder="Quotation or reference"
                  className="mt-2"
                />
              </div>
            </div>

            {selectedSupplier && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {selectedSupplier.supplier_name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {getSupplierMeta(selectedSupplier) ||
                      "Supplier contact details not available"}
                  </p>
                </div>

                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  Net {selectedSupplier.payment_terms_days || 0} · Credit used{" "}
                  <CurrencyText
                    value={selectedSupplier.outstanding_balance || 0}
                  />{" "}
                  / <CurrencyText value={selectedSupplier.credit_limit || 0} />
                </p>
              </div>
            )}
          </section>

          <section className="card-surface overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Line items
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Items on this order with quantity and unit cost
              </p>
            </div>

            <div className="p-5">
              <div className="hidden grid-cols-[minmax(250px,1fr)_80px_110px_110px_36px] gap-3 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const product = products.find(
                    (candidate) =>
                      String(candidate.id) === String(item.product),
                  );

                  const variants = getVariants(product);
                  const filteredProducts = getFilteredProducts(index, item);

                  return (
                    <div
                      key={item.id || index}
                      className="relative rounded-xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_90px_120px_120px_36px]">
                        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                          <div className="relative z-30">
                            <Input
                              value={getProductSearchValue(index, item)}
                              autoComplete="off"
                              onFocus={() =>
                                setProductSearchOpen((current) => ({
                                  ...current,
                                  [index]: true,
                                }))
                              }
                              onChange={(event) => {
                                const value = event.target.value;

                                setProductSearches((current) => ({
                                  ...current,
                                  [index]: value,
                                }));
                                setProductSearchOpen((current) => ({
                                  ...current,
                                  [index]: true,
                                }));

                                if (item.product) {
                                  updateItem(index, {
                                    product: "",
                                    variant: "",
                                    unit_price: 0,
                                  });
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  setProductSearchOpen((current) => ({
                                    ...current,
                                    [index]: false,
                                  }));
                                }
                              }}
                              placeholder="Search and select product"
                            />

                            {productSearchOpen[index] ? (
                              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-background p-1 shadow-xl dark:border-white/10">
                                {filteredProducts.length ? (
                                  filteredProducts.map((productOption) => (
                                    <button
                                      key={productOption.id}
                                      type="button"
                                      className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() => {
                                        const firstVariant =
                                          productOption?.variants?.[0];
                                        const label = [
                                          productOption.product_name,
                                          productOption.sku,
                                        ]
                                          .filter(Boolean)
                                          .join(" · ");

                                        updateItem(index, {
                                          product: String(productOption.id),
                                          variant: "",
                                          unit_price:
                                            firstVariant?.purchase_price || 0,
                                        });
                                        setProductSearches((current) => ({
                                          ...current,
                                          [index]: label,
                                        }));
                                        setProductSearchOpen((current) => ({
                                          ...current,
                                          [index]: false,
                                        }));
                                      }}
                                    >
                                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {productOption.product_name}
                                      </span>
                                      {productOption.sku ? (
                                        <span className="mt-0.5 text-xs text-muted-foreground">
                                          {productOption.sku}
                                        </span>
                                      ) : null}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    No products match your search.
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>

                          <Select
                            value={item.variant || "__base__"}
                            onValueChange={(value) => {
                              if (value === "__base__") {
                                updateItem(index, { variant: "" });
                                return;
                              }

                              const selectedVariant = variants.find(
                                (variant) => String(variant.id) === value,
                              );

                              updateItem(index, {
                                variant: value,
                                unit_price:
                                  selectedVariant?.purchase_price ||
                                  item.unit_price,
                              });
                            }}
                            disabled={!variants.length}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  variants.length ? "Variant" : "Base product"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__base__">
                                Base product
                              </SelectItem>
                              {variants.map((variant) => (
                                <SelectItem
                                  key={variant.id}
                                  value={String(variant.id)}
                                >
                                  {variant.display_name ||
                                    variant.variant_name ||
                                    Object.values(
                                      variant.attributes || {},
                                    ).join(" / ") ||
                                    "Variant"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, {
                              quantity: event.target.value,
                            })
                          }
                          className="text-right"
                          aria-label="Quantity"
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
                          aria-label="Unit cost"
                        />

                        <div className="flex h-10 items-center justify-end rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium dark:border-white/10 dark:bg-white/[0.025]">
                          <CurrencyText
                            value={calculations[index]?.total || 0}
                            currency={form.currency}
                          />
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={form.items.length === 1}
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
                    </div>
                  );
                })}
              </div>

              {errors.items && (
                <p className="mt-3 text-xs text-red-500">{errors.items}</p>
              )}

              <button
                type="button"
                disabled={!canAddAnotherItem}
                onClick={addLineItem}
                className="mt-4 flex w-full items-center rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-blue-600 transition hover:border-blue-400 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-blue-400 dark:hover:bg-blue-500/5"
                title={
                  canAddAnotherItem
                    ? "Add another line item"
                    : "Complete the current line item first"
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add line item
              </button>

              <div className="mt-6 ml-auto max-w-xs space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <CurrencyText value={subtotal} currency={form.currency} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT (5%)</span>
                  <CurrencyText value={vat} currency={form.currency} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <CurrencyText
                    value={form.shipping_amount}
                    currency={form.currency}
                  />
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold dark:border-white/10">
                  <span>Total</span>
                  <CurrencyText value={total} currency={form.currency} />
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/purchases/orders")}
              disabled={save.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => submit("DRAFT")}
              disabled={save.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>

            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => submit("PENDING_APPROVAL")}
              disabled={save.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Order summary</h2>
            <p className="mt-1 text-xs text-slate-500">
              {orderLabel} · {form.items.length} item
              {form.items.length === 1 ? "" : "s"}
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Supplier</span>
                <span className="text-right font-medium">
                  {selectedSupplier?.supplier_name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-medium">{form.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <CurrencyText value={subtotal} currency={form.currency} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT</span>
                <CurrencyText value={vat} currency={form.currency} />
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold dark:border-white/10">
                <span>Total amount</span>
                <CurrencyText value={total} currency={form.currency} />
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-white/10">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-white/10">
                  <Circle className="h-2 w-2 fill-current" />
                  {orderStatus}
                </span>
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Approval flow</h2>
            <p className="mt-1 text-xs text-slate-500">
              Runs automatically once sent
            </p>

            <div className="mt-5">
              <ApprovalStep
                number="1"
                title="Draft created"
                detail="You · just now"
                complete
              />
              <ApprovalStep
                number="2"
                title="Pending approval"
                detail="Assigned approver"
              />
              <ApprovalStep
                number="3"
                title="Sent to supplier"
                detail="Auto-emailed on approval"
              />
              <ApprovalStep
                number="4"
                title="Receipt tracking"
                detail="Open → Partial → Fully received"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
