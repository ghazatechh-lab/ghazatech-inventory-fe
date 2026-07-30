import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyText } from "@/components/common/CurrencyText";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const ENDPOINT = "/purchases/vendor-credits/";

const REASON_OPTIONS = [
  {
    value: "RETURN",
    label: "Supplier Return",
  },
  {
    value: "DAMAGED_GOODS",
    label: "Damaged Goods",
  },
  {
    value: "OVERBILLING",
    label: "Overbilling",
  },
  {
    value: "PRICE_ADJUSTMENT",
    label: "Price Adjustment",
  },
  {
    value: "FREIGHT_ADJUSTMENT",
    label: "Freight Adjustment",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const STATUS_OPTIONS = [
  {
    value: "DRAFT",
    label: "Draft",
  },
  {
    value: "OPEN",
    label: "Open",
  },
  {
    value: "PARTIALLY_APPLIED",
    label: "Partially Applied",
  },
  {
    value: "APPLIED",
    label: "Applied",
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResponse(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (current.id !== undefined || Array.isArray(current.results)) {
      break;
    }

    if (current.data !== undefined && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  return current;
}

function normalizeList(value) {
  const current = normalizeResponse(value);

  if (Array.isArray(current)) {
    return current;
  }

  if (Array.isArray(current?.results)) {
    return current.results;
  }

  if (Array.isArray(current?.data)) {
    return current.data;
  }

  return [];
}

function createEmptyLine() {
  return {
    id: undefined,
    description: "",
    gl_account: "",
    quantity: 1,
    unit_price: 0,
    tax_percentage: 0,
  };
}

function createInitialForm(branchId) {
  return {
    credit_number: "",
    supplier: "",
    supplier_return: "",
    purchase_order: "",
    supplier_bill: "",
    branch: branchId ? String(branchId) : "",
    credit_date: today(),
    currency: "AED",
    reference_number: "",
    reason: "RETURN",
    status: "DRAFT",
    notes: "",
    internal_memo: "",
    items: [createEmptyLine()],
    applications: [],
  };
}

function calculateLine(item) {
  const quantity = numberValue(item.quantity);

  const unitPrice = numberValue(item.unit_price);

  const taxPercentage = numberValue(item.tax_percentage);

  const subtotal = quantity * unitPrice;

  const taxAmount = subtotal * (taxPercentage / 100);

  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    tax_percentage: taxPercentage,
    subtotal,
    tax_amount: taxAmount,
    line_total: subtotal + taxAmount,
  };
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h2 className="font-semibold">{title}</h2>

        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function extractErrors(error) {
  const body = normalizeResponse(error?.response?.data);

  if (!body) {
    return {
      general: error?.message || "Unable to save vendor credit.",
    };
  }

  if (typeof body === "string") {
    return {
      general: body,
    };
  }

  if (body.detail || body.message) {
    return {
      general: body.detail || body.message,
    };
  }

  const result = {};

  Object.entries(body).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      result[field] = value.join(" ");
    } else if (value && typeof value === "object") {
      result[field] = JSON.stringify(value);
    } else {
      result[field] = String(value);
    }
  });

  return result;
}

export default function VendorCreditFormPage() {
  const { id } = useParams();

  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const [errors, setErrors] = React.useState({});

  const optionsQuery = useQuery({
    queryKey: ["vendor-credit-form-options", form.branch, form.supplier],

    queryFn: async () =>
      normalizeResponse(
        await api.get(`${ENDPOINT}form-options/`, {
          params: {
            branch: form.branch || undefined,

            supplier: form.supplier || undefined,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 0,
    retry: false,
  });

  const existingQuery = useQuery({
    queryKey: ["vendor-credit", id],

    queryFn: async () =>
      normalizeResponse(
        await api.get(`${ENDPOINT}${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),

    enabled: isEdit,

    staleTime: 0,
    retry: false,
  });

  const options = optionsQuery.data || {};

  const suppliers = normalizeList(options.suppliers);

  const branches = normalizeList(options.branches);

  const supplierReturns = normalizeList(options.supplier_returns);

  const purchaseOrders = normalizeList(options.purchase_orders);

  const supplierBills = normalizeList(options.supplier_bills);

  React.useEffect(() => {
    if (isEdit || !branchId) {
      return;
    }

    setForm((current) => ({
      ...current,
      branch: current.branch || String(branchId),
    }));
  }, [branchId, isEdit]);

  React.useEffect(() => {
    const existing = existingQuery.data;

    if (!isEdit || !existing) {
      return;
    }

    setForm({
      credit_number: existing.credit_number || "",

      supplier: existing.supplier
        ? String(existing.supplier.id || existing.supplier)
        : "",

      supplier_return: existing.supplier_return
        ? String(existing.supplier_return.id || existing.supplier_return)
        : "",

      purchase_order: existing.purchase_order
        ? String(existing.purchase_order.id || existing.purchase_order)
        : "",

      supplier_bill: existing.supplier_bill
        ? String(existing.supplier_bill.id || existing.supplier_bill)
        : "",

      branch: existing.branch
        ? String(existing.branch.id || existing.branch)
        : "",

      credit_date: existing.credit_date || today(),

      currency: existing.currency || "AED",

      reference_number: existing.reference_number || "",

      reason: existing.reason || "RETURN",

      status: existing.status || "DRAFT",

      notes: existing.notes || "",

      internal_memo: existing.internal_memo || "",

      items:
        Array.isArray(existing.items) && existing.items.length
          ? existing.items.map((item) => ({
              id: item.id,
              description: item.description || "",
              gl_account: item.gl_account
                ? String(item.gl_account.id || item.gl_account)
                : "",
              quantity: numberValue(item.quantity),
              unit_price: numberValue(item.unit_price),
              tax_percentage: numberValue(item.tax_percentage),
            }))
          : [createEmptyLine()],

      applications: Array.isArray(existing.applications)
        ? existing.applications
        : [],
    });
  }, [existingQuery.data, isEdit]);

  const calculatedItems = React.useMemo(
    () => form.items.map(calculateLine),
    [form.items],
  );

  const subtotal = calculatedItems.reduce(
    (total, item) => total + item.subtotal,
    0,
  );

  const taxAmount = calculatedItems.reduce(
    (total, item) => total + item.tax_amount,
    0,
  );

  const totalAmount = calculatedItems.reduce(
    (total, item) => total + item.line_total,
    0,
  );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
      general: undefined,
    }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,

      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyLine()],
    }));
  }

  function removeItem(index) {
    setForm((current) => {
      const nextItems = current.items.filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return {
        ...current,
        items: nextItems.length ? nextItems : [createEmptyLine()],
      };
    });
  }

  function selectSupplierReturn(value) {
    const selected = supplierReturns.find(
      (item) => String(item.id) === String(value),
    );

    if (!selected) {
      updateField("supplier_return", "");

      return;
    }

    setForm((current) => ({
      ...current,

      supplier_return: String(selected.id),

      supplier: selected.supplier_id
        ? String(selected.supplier_id)
        : current.supplier,

      branch: selected.branch_id ? String(selected.branch_id) : current.branch,

      purchase_order: selected.purchase_order_id
        ? String(selected.purchase_order_id)
        : current.purchase_order,

      reference_number: selected.return_number || current.reference_number,

      reason: "RETURN",

      items:
        Array.isArray(selected.items) && selected.items.length
          ? selected.items.map((item) => ({
              description:
                item.product_name || item.description || "Returned item",

              gl_account: "",

              quantity: numberValue(item.quantity),

              unit_price: numberValue(item.unit_price),

              tax_percentage: 0,
            }))
          : current.items,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.branch) {
      nextErrors.branch = "Select a branch.";
    }

    if (!form.supplier) {
      nextErrors.supplier = "Select a supplier.";
    }

    if (!form.credit_date) {
      nextErrors.credit_date = "Credit date is required.";
    }

    if (!form.reason) {
      nextErrors.reason = "Select a reason.";
    }

    if (!calculatedItems.length) {
      nextErrors.items = "Add at least one credit item.";
    }

    const invalidItem = calculatedItems.some(
      (item) =>
        !item.description.trim() ||
        numberValue(item.quantity) <= 0 ||
        numberValue(item.unit_price) < 0,
    );

    if (invalidItem) {
      nextErrors.items =
        "Every item requires a description, positive quantity, and valid unit price.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Please correct the highlighted fields.");
      }

      const payload = {
        supplier: Number(form.supplier),

        supplier_return: form.supplier_return
          ? Number(form.supplier_return)
          : null,

        purchase_order: form.purchase_order
          ? Number(form.purchase_order)
          : null,

        supplier_bill: form.supplier_bill ? Number(form.supplier_bill) : null,

        branch: Number(form.branch),

        credit_date: form.credit_date,

        currency: form.currency,

        reference_number: form.reference_number.trim(),

        reason: form.reason,

        status: form.status,

        notes: form.notes,

        internal_memo: form.internal_memo,

        subtotal: Number(subtotal.toFixed(2)),

        tax_amount: Number(taxAmount.toFixed(2)),

        total_amount: Number(totalAmount.toFixed(2)),

        remaining_amount: Number(totalAmount.toFixed(2)),

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          description: item.description.trim(),

          gl_account: item.gl_account ? Number(item.gl_account) : null,

          quantity: numberValue(item.quantity),

          unit_price: numberValue(item.unit_price),

          tax_percentage: numberValue(item.tax_percentage),

          subtotal: Number(item.subtotal.toFixed(2)),

          tax_amount: Number(item.tax_amount.toFixed(2)),

          line_total: Number(item.line_total.toFixed(2)),
        })),

        applications: [],
      };

      if (isEdit) {
        return api.put(`${ENDPOINT}${id}/`, payload, {
          skipGlobalErrorToast: true,
        });
      }

      return api.post(ENDPOINT, payload, {
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async (response) => {
      const saved = normalizeResponse(response);

      await queryClient.invalidateQueries({
        queryKey: ["vendor-credits"],
      });

      toast.success(
        isEdit
          ? "Vendor credit updated successfully."
          : "Vendor credit created successfully.",
      );

      navigate(
        saved?.id
          ? `/purchases/vendor-credits/${saved.id}`
          : "/purchases/vendor-credits",
      );
    },

    onError: (error) => {
      const apiErrors = extractErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(apiErrors.general || "Unable to save vendor credit.");
    },
  });

  if (isEdit && existingQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading vendor credit...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={isEdit ? "Edit Vendor Credit" : "New Vendor Credit"}
        subtitle="Record a supplier credit and its related line items."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchases/vendor-credits")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {isEdit ? "Update Credit" : "Create Credit"}
            </Button>
          </div>
        }
      />

      {errors.general ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.general}
        </div>
      ) : null}

      <Section
        title="Credit Information"
        description="Enter the vendor, related document, date, reason, and status."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Credit Number</Label>

            <Input
              className="mt-2"
              value={form.credit_number || "Automatically generated"}
              disabled
            />
          </div>

          <div>
            <Label>Branch *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.branch}
              onChange={(event) => updateField("branch", event.target.value)}
            >
              <option value="">Select branch</option>

              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.branch_code ? `${branch.branch_code} — ` : ""}
                  {branch.branch_name || branch.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.branch} />
          </div>

          <div>
            <Label>Supplier *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.supplier}
              onChange={(event) => updateField("supplier", event.target.value)}
            >
              <option value="">Select supplier</option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={String(supplier.id)}>
                  {supplier.supplier_name || supplier.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.supplier} />
          </div>

          <div>
            <Label>Supplier Return</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.supplier_return}
              onChange={(event) => selectSupplierReturn(event.target.value)}
            >
              <option value="">Select return</option>

              {supplierReturns.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.return_number || `Return ${item.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Purchase Order</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.purchase_order}
              onChange={(event) =>
                updateField("purchase_order", event.target.value)
              }
            >
              <option value="">Select PO</option>

              {purchaseOrders.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.po_number || `PO ${item.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Supplier Bill</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.supplier_bill}
              onChange={(event) =>
                updateField("supplier_bill", event.target.value)
              }
            >
              <option value="">Select bill</option>

              {supplierBills.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.bill_number || `Bill ${item.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Credit Date *</Label>

            <Input
              className="mt-2"
              type="date"
              value={form.credit_date}
              onChange={(event) =>
                updateField("credit_date", event.target.value)
              }
            />

            <FieldError message={errors.credit_date} />
          </div>

          <div>
            <Label>Reason *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <FieldError message={errors.reason} />
          </div>

          <div>
            <Label>Status</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Reference Number</Label>

            <Input
              className="mt-2"
              value={form.reference_number}
              onChange={(event) =>
                updateField("reference_number", event.target.value)
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="Credit Items"
        description="Add one or more vendor credit lines."
      >
        <div className="mb-4 flex items-center justify-between">
          <FieldError message={errors.items} />

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {calculatedItems.map((item, index) => (
            <div key={item.id || index} className="rounded-xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-medium">Item {index + 1}</p>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div className="xl:col-span-2">
                  <Label>Description *</Label>

                  <Input
                    className="mt-2"
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, "description", event.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Quantity</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, "quantity", event.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Unit Price</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(event) =>
                      updateItem(index, "unit_price", event.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Tax %</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.tax_percentage}
                    onChange={(event) =>
                      updateItem(index, "tax_percentage", event.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Line Total</Label>

                  <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 font-semibold">
                    <CurrencyText value={item.line_total} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Notes">
          <Label>Notes</Label>

          <Textarea
            className="mt-2 min-h-28"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </Section>

        <Section title="Credit Summary">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>

              <CurrencyText value={subtotal} />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>

              <CurrencyText value={taxAmount} />
            </div>

            <div className="flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total Credit</span>

              <CurrencyText value={totalAmount} />
            </div>
          </div>
        </Section>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link to="/purchases/vendor-credits">Cancel</Link>
        </Button>

        <Button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          {isEdit ? "Update Vendor Credit" : "Create Vendor Credit"}
        </Button>
      </div>
    </div>
  );
}
