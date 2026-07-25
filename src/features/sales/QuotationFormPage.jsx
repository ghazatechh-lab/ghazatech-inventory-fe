import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
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

const emptyItem = () => ({
  product: "",
  variant: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  vat_percentage: 5,
});

export default function QuotationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [errors, setErrors] = React.useState({});

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
        await api.get("/products/", {
          params: {
            page_size: 500,
            branch: form.branch || undefined,
            is_active: true,
          },
        }),
      ),
  });

  const branches = normalizeList(branchesResponse);

  const customers = normalizeList(customersResponse);

  const salespeople = normalizeList(usersResponse);

  const products = normalizeList(productsResponse);

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
          }))
        : [emptyItem()],
    });
  }, [existing]);

  const selectedBranch = branches.find(
    (branch) => String(branch.id) === String(form.branch),
  );

  const calculatedItems = form.items.map((item) => {
    const subtotal = number(item.quantity) * number(item.unit_price);

    const vat = (subtotal * number(item.vat_percentage)) / 100;

    return {
      ...item,
      subtotal,
      vat_amount: vat,
      line_total: subtotal + vat,
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

  const selectProduct = (index, productId) => {
    const product = products.find(
      (item) => String(item.id) === String(productId),
    );

    updateItem(index, {
      product: productId,

      variant: "",

      description: product?.description || product?.product_name || "",

      unit_price: number(
        product?.selling_price ||
          product?.sale_price ||
          product?.unit_price ||
          0,
      ),
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

        quote_number: form.quote_number || undefined,

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

          vat_percentage: number(item.vat_percentage),
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
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
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
              onValueChange={(value) => updateForm("customer", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select existing customer" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link
              to="/customers/new"
              className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add new customer
            </Link>

            {errors.customer && (
              <p className="mt-1 text-xs text-red-500">{errors.customer}</p>
            )}
          </div>

          <div>
            <Label>Quote #</Label>

            <Input
              value={form.quote_number}
              onChange={(event) =>
                updateForm("quote_number", event.target.value)
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
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(210px,1fr)_minmax(220px,1fr)_85px_120px_100px_140px_40px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Item</span>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span>VAT</span>
              <span className="text-right">Line Total</span>
              <span />
            </div>

            <div className="space-y-2">
              {calculatedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-[minmax(210px,1fr)_minmax(220px,1fr)_85px_120px_100px_140px_40px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
                >
                  <Select
                    value={item.product || "__none__"}
                    onValueChange={(value) =>
                      selectProduct(index, value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      <SelectItem value="__none__">Select product</SelectItem>

                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.product_name}
                          {product.sku ? ` · ${product.sku}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
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
