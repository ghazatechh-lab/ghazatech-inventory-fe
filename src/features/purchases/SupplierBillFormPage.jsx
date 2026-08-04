import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyText } from "@/components/common/CurrencyText";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const SUPPLIER_BILL_ENDPOINT = "/purchases/supplier-bills/";

const CURRENCY_OPTIONS = ["AED", "USD", "EUR", "GBP", "INR", "SAR"];

const STATUS_OPTIONS = [
  {
    value: "DRAFT",
    label: "Draft",
  },
  {
    value: "PENDING_APPROVAL",
    label: "Pending Approval",
  },
  {
    value: "APPROVED",
    label: "Approved",
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  date.setDate(date.getDate() + Number(days || 0));

  return date.toISOString().slice(0, 10);
}

function numberValue(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePayload(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (
      Object.prototype.hasOwnProperty.call(current, "id") ||
      Array.isArray(current.results)
    ) {
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
  const normalized = normalizePayload(value);

  if (Array.isArray(normalized)) {
    return normalized;
  }

  if (Array.isArray(normalized?.results)) {
    return normalized.results;
  }

  if (Array.isArray(normalized?.data)) {
    return normalized.data;
  }

  return [];
}

function getId(value) {
  if (value && typeof value === "object") {
    return value.id || "";
  }

  return value || "";
}

function createEmptyItem() {
  return {
    id: undefined,

    product: "",
    variant: "",
    grn_item: "",

    product_name: "",
    sku: "",
    variant_name: "",

    description: "",

    quantity: 1,
    unit_price: 0,
    discount_amount: 0,
    vat_percentage: 5,

    subtotal: 0,
    vat_amount: 0,
    line_total: 0,
  };
}

function calculateItem(item) {
  const quantity = numberValue(item.quantity);

  const unitPrice = numberValue(item.unit_price);

  const discountAmount = numberValue(item.discount_amount);

  const vatPercentage = numberValue(item.vat_percentage);

  const gross = quantity * unitPrice;

  const subtotal = Math.max(0, gross - discountAmount);

  const vatAmount = subtotal * (vatPercentage / 100);

  const lineTotal = subtotal + vatAmount;

  return {
    ...item,

    quantity,
    unit_price: unitPrice,
    discount_amount: discountAmount,
    vat_percentage: vatPercentage,

    subtotal,
    vat_amount: vatAmount,
    line_total: lineTotal,
  };
}

function createInitialForm(branchId) {
  return {
    bill_number: "",

    supplier_invoice_number: "",

    purchase_order: "",
    grn: "",
    supplier: "",

    branch: branchId ? String(branchId) : "",

    bill_date: today(),
    due_date: "",

    payment_terms_days: 0,

    currency: "AED",

    subtotal: 0,
    discount_amount: 0,
    vat_amount: 0,
    total_amount: 0,

    paid_amount: 0,
    balance_due: 0,

    status: "DRAFT",
    match_status: "PENDING",

    notes: "",

    items: [createEmptyItem()],
  };
}

function getApiErrors(error) {
  const body = error?.response?.data;

  if (!body) {
    return {
      general: error?.message || "Unable to save supplier bill.",
    };
  }

  const normalized = normalizePayload(body);

  if (typeof normalized === "string") {
    return {
      general: normalized,
    };
  }

  if (normalized?.detail || normalized?.message) {
    return {
      general: normalized.detail || normalized.message,
    };
  }

  const errors = {};

  Object.entries(normalized || {}).forEach(([field, message]) => {
    if (Array.isArray(message)) {
      errors[field] = message.join(" ");
    } else if (typeof message === "object" && message !== null) {
      errors[field] = JSON.stringify(message);
    } else {
      errors[field] = String(message);
    }
  });

  return errors;
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

export default function SupplierBillFormPage() {
  const { id } = useParams();

  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const [initialized, setInitialized] = React.useState(false);

  console.log("Supplier Bill form-options query key:");
  const optionsQuery = useQuery({
    queryKey: ["supplier-bill-form-options"],

    queryFn: async () => {
      const response = await api.get(`${SUPPLIER_BILL_ENDPOINT}form-options/`, {
        skipGlobalErrorToast: true,
      });

      console.log("Supplier Bill form-options raw response:", response);

      const normalized = normalizePayload(response);

      console.log("Supplier Bill form-options normalized:", normalized);
      console.log(
        "Supplier Bill purchase orders:",
        normalizeList(normalized?.purchase_orders),
      );
      console.log("Supplier Bill GRNs:", normalizeList(normalized?.grns));

      return normalized;
    },

    staleTime: 0,
    retry: false,
  });

  const existingQuery = useQuery({
    queryKey: ["supplier-bill", id],

    queryFn: async () => {
      const response = await api.get(`${SUPPLIER_BILL_ENDPOINT}${id}/`, {
        skipGlobalErrorToast: true,
      });

      return normalizePayload(response);
    },

    enabled: isEdit,

    staleTime: 0,
    retry: false,
  });

  const options = optionsQuery.data || {};

  const purchaseOrders = normalizeList(options.purchase_orders);

  const grns = normalizeList(options.grns);

  const availableGrns = React.useMemo(() => {
    if (!form.purchase_order) {
      return [];
    }

    return grns.filter((grn) => {
      const purchaseOrderId =
        grn.purchase_order_id ?? getId(grn.purchase_order);

      return String(purchaseOrderId) === String(form.purchase_order);
    });
  }, [grns, form.purchase_order]);

  const suppliers = normalizeList(options.suppliers);

  const branches = normalizeList(options.branches);

  React.useEffect(() => {
    if (isEdit || initialized) {
      return;
    }

    setForm(createInitialForm(branchId));

    setInitialized(true);
  }, [branchId, initialized, isEdit]);

  React.useEffect(() => {
    const existing = existingQuery.data;

    if (!isEdit || !existing) {
      return;
    }

    const existingItems =
      Array.isArray(existing.items) && existing.items.length
        ? existing.items.map((item) =>
            calculateItem({
              id: item.id,

              product: String(item.product_id ?? getId(item.product)),

              variant:
                (item.variant_id ?? getId(item.variant))
                  ? String(item.variant_id ?? getId(item.variant))
                  : "",

              grn_item: item.grn_item ? String(getId(item.grn_item)) : "",

              product_name:
                item.product_name || item.product?.product_name || "",

              sku: item.sku || item.product?.sku || "",

              variant_name: item.variant_name || "",

              description: item.description || "",

              quantity: numberValue(item.quantity),

              unit_price: numberValue(item.unit_price),

              discount_amount: numberValue(item.discount_amount),

              vat_percentage: numberValue(item.vat_percentage),
            }),
          )
        : [createEmptyItem()];

    setForm({
      bill_number: existing.bill_number || "",

      supplier_invoice_number: existing.supplier_invoice_number || "",

      purchase_order: existing.purchase_order
        ? String(getId(existing.purchase_order))
        : "",

      grn: existing.grn ? String(getId(existing.grn)) : "",

      supplier: existing.supplier ? String(getId(existing.supplier)) : "",

      branch: existing.branch ? String(getId(existing.branch)) : "",

      bill_date: existing.bill_date || today(),

      due_date: existing.due_date || "",

      payment_terms_days: numberValue(existing.payment_terms_days),

      currency: existing.currency || "AED",

      subtotal: numberValue(existing.subtotal),

      discount_amount: numberValue(existing.discount_amount),

      vat_amount: numberValue(existing.vat_amount),

      total_amount: numberValue(existing.total_amount),

      paid_amount: numberValue(existing.paid_amount),

      balance_due: numberValue(existing.balance_due),

      status: existing.status || "DRAFT",

      match_status: existing.match_status || "PENDING",

      notes: existing.notes || "",

      items: existingItems,
    });

    setInitialized(true);
  }, [existingQuery.data, isEdit]);

  const calculatedItems = React.useMemo(
    () => form.items.map(calculateItem),
    [form.items],
  );

  const totals = React.useMemo(() => {
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + numberValue(item.subtotal),
      0,
    );

    const itemDiscount = calculatedItems.reduce(
      (sum, item) => sum + numberValue(item.discount_amount),
      0,
    );

    const vatAmount = calculatedItems.reduce(
      (sum, item) => sum + numberValue(item.vat_amount),
      0,
    );

    const headerDiscount = numberValue(form.discount_amount);

    const totalAmount = Math.max(0, subtotal + vatAmount - headerDiscount);

    const paidAmount = numberValue(form.paid_amount);

    const balanceDue = Math.max(0, totalAmount - paidAmount);

    return {
      subtotal,
      itemDiscount,
      vatAmount,
      headerDiscount,
      totalAmount,
      paidAmount,
      balanceDue,
    };
  }, [calculatedItems, form.discount_amount, form.paid_amount]);

  React.useEffect(() => {
    setForm((current) => {
      const currentItems = current.items.map(calculateItem);

      return {
        ...current,

        items: currentItems,

        subtotal: totals.subtotal,

        vat_amount: totals.vatAmount,

        total_amount: totals.totalAmount,

        balance_due: totals.balanceDue,
      };
    });
  }, [
    totals.subtotal,
    totals.vatAmount,
    totals.totalAmount,
    totals.balanceDue,
  ]);

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
          ? calculateItem({
              ...item,
              [field]: value,
            })
          : item,
      ),
    }));

    setErrors((current) => ({
      ...current,
      items: undefined,
      general: undefined,
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,

      items: [...current.items, createEmptyItem()],
    }));
  }

  function removeItem(index) {
    setForm((current) => {
      const nextItems = current.items.filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return {
        ...current,

        items: nextItems.length ? nextItems : [createEmptyItem()],
      };
    });
  }

  function applyPurchaseOrder(purchaseOrderId) {
    const selectedId = String(purchaseOrderId || "");

    console.log("Selected Purchase Order ID:", selectedId);

    if (!selectedId) {
      setForm((current) => ({
        ...current,
        purchase_order: "",
        grn: "",
      }));
      return;
    }

    const purchaseOrder = purchaseOrders.find(
      (item) => String(item.id) === selectedId,
    );

    console.log("Selected Purchase Order record:", purchaseOrder);

    if (!purchaseOrder) {
      updateField("purchase_order", selectedId);
      return;
    }

    const poItems = normalizeList(purchaseOrder.items);
    const supplierId =
      purchaseOrder.supplier_id ?? getId(purchaseOrder.supplier);
    const branchId = purchaseOrder.branch_id ?? getId(purchaseOrder.branch);
    const paymentTermsDays = numberValue(purchaseOrder.payment_terms_days);

    setForm((current) => ({
      ...current,
      purchase_order: selectedId,
      grn: "",
      supplier: supplierId ? String(supplierId) : current.supplier,
      branch: branchId ? String(branchId) : current.branch,
      currency: purchaseOrder.currency || current.currency || "AED",
      payment_terms_days: paymentTermsDays,
      due_date: addDays(current.bill_date, paymentTermsDays),
      items: poItems.length
        ? poItems.map((item) =>
            calculateItem({
              product: String(item.product_id ?? getId(item.product)),
              variant:
                (item.variant_id ?? getId(item.variant))
                  ? String(item.variant_id ?? getId(item.variant))
                  : "",
              grn_item: "",
              product_name:
                item.product_name || item.product?.product_name || "",
              sku: item.sku || item.product?.sku || "",
              variant_name: item.variant_name || "",
              description: item.description || item.product_name || "",
              quantity: numberValue(item.quantity),
              unit_price: numberValue(item.unit_price),
              discount_amount: numberValue(item.discount_amount),
              vat_percentage: numberValue(item.vat_percentage ?? 5),
            }),
          )
        : [createEmptyItem()],
    }));

    setErrors((current) => ({
      ...current,
      purchase_order: undefined,
      supplier: undefined,
      branch: undefined,
      items: undefined,
      general: undefined,
    }));
  }

  function applyGrn(grnId) {
    if (!grnId) {
      updateField("grn", "");

      return;
    }

    const grn = availableGrns.find((item) => String(item.id) === String(grnId));

    console.log("Selected GRN record:", grn);

    if (!grn) {
      updateField("grn", grnId);

      return;
    }

    const grnItems = normalizeList(grn.items);

    setForm((current) => ({
      ...current,

      grn: String(grn.id),

      purchase_order: String(
        grn.purchase_order_id ??
          getId(grn.purchase_order) ??
          current.purchase_order,
      ),

      supplier: String(
        grn.supplier_id ?? getId(grn.supplier) ?? current.supplier,
      ),

      branch: String(grn.branch_id ?? getId(grn.branch) ?? current.branch),

      items: grnItems.length
        ? grnItems.map((item) =>
            calculateItem({
              product: String(item.product_id ?? getId(item.product)),

              variant:
                (item.variant_id ?? getId(item.variant))
                  ? String(item.variant_id ?? getId(item.variant))
                  : "",

              grn_item: String(item.id),

              product_name:
                item.product_name || item.product?.product_name || "",

              sku: item.sku || item.product?.sku || "",

              variant_name: item.variant_name || "",

              description: item.description || item.product_name || "",

              quantity: numberValue(
                item.accepted_quantity ?? item.received_quantity,
              ),

              unit_price: numberValue(item.unit_price ?? item.unit_cost),

              discount_amount: 0,

              vat_percentage: numberValue(item.vat_percentage ?? 5),
            }),
          )
        : current.items,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.purchase_order) {
      nextErrors.purchase_order = "Select a Purchase Order.";
    }

    if (!form.grn) {
      nextErrors.grn = "Select a confirmed GRN.";
    }

    if (!form.branch) {
      nextErrors.branch = "Select a branch.";
    }

    if (!form.supplier) {
      nextErrors.supplier = "Select a supplier.";
    }

    if (!form.supplier_invoice_number.trim()) {
      nextErrors.supplier_invoice_number =
        "Supplier invoice number is required.";
    }

    if (!form.bill_date) {
      nextErrors.bill_date = "Bill date is required.";
    }

    if (!form.due_date) {
      nextErrors.due_date = "Due date is required.";
    }

    if (form.due_date && form.bill_date && form.due_date < form.bill_date) {
      nextErrors.due_date = "Due date cannot be before the bill date.";
    }

    const validItems = calculatedItems.filter(
      (item) => item.product && numberValue(item.quantity) > 0,
    );

    if (!validItems.length) {
      nextErrors.items = "Add at least one valid bill item.";
    }

    calculatedItems.forEach((item, index) => {
      if (!item.product) {
        nextErrors[`item_${index}_product`] = "Select a product.";
      }

      if (numberValue(item.quantity) <= 0) {
        nextErrors[`item_${index}_quantity`] =
          "Quantity must be greater than zero.";
      }

      if (numberValue(item.unit_price) < 0) {
        nextErrors[`item_${index}_unit_price`] =
          "Unit price cannot be negative.";
      }
    });

    if (totals.paidAmount > totals.totalAmount) {
      nextErrors.paid_amount = "Paid amount cannot exceed the bill total.";
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
        supplier_invoice_number: form.supplier_invoice_number.trim(),

        purchase_order: form.purchase_order
          ? Number(form.purchase_order)
          : null,

        grn: form.grn ? Number(form.grn) : null,

        supplier: Number(form.supplier),

        branch: Number(form.branch),

        bill_date: form.bill_date,

        due_date: form.due_date,

        payment_terms_days: numberValue(form.payment_terms_days),

        currency: form.currency,

        subtotal: Number(totals.subtotal.toFixed(2)),

        discount_amount: Number(totals.headerDiscount.toFixed(2)),

        vat_amount: Number(totals.vatAmount.toFixed(2)),

        total_amount: Number(totals.totalAmount.toFixed(2)),

        paid_amount: Number(totals.paidAmount.toFixed(2)),

        balance_due: Number(totals.balanceDue.toFixed(2)),

        status: form.status,

        notes: form.notes,

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          grn_item: item.grn_item ? Number(item.grn_item) : null,

          description: item.description || item.product_name || "",

          quantity: numberValue(item.quantity),

          unit_price: numberValue(item.unit_price),

          discount_amount: numberValue(item.discount_amount),

          vat_percentage: numberValue(item.vat_percentage),

          subtotal: Number(item.subtotal.toFixed(2)),

          vat_amount: Number(item.vat_amount.toFixed(2)),

          line_total: Number(item.line_total.toFixed(2)),
        })),
      };

      const formData = new FormData();

      formData.append("payload", JSON.stringify(payload));

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      if (isEdit) {
        return api.put(`${SUPPLIER_BILL_ENDPOINT}${id}/`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },

          skipGlobalErrorToast: true,
        });
      }

      return api.post(SUPPLIER_BILL_ENDPOINT, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async (response) => {
      const saved = normalizePayload(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bill"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
      ]);

      toast.success(
        isEdit
          ? "Supplier bill updated successfully."
          : "Supplier bill created successfully.",
      );

      navigate(
        saved?.id
          ? `/purchases/supplier-bills/${saved.id}`
          : "/purchases/supplier-bills",
      );
    },

    onError: (error) => {
      console.error("Supplier Bill save error:", error);
      console.error("Supplier Bill save response:", error?.response?.data);

      const apiErrors = getApiErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(apiErrors.general || "Unable to save supplier bill.");
    },
  });

  const isLoading = existingQuery.isLoading || optionsQuery.isLoading;

  if (isEdit && existingQuery.isError) {
    return (
      <div className="space-y-5">
        <Button
          variant="outline"
          onClick={() => navigate("/purchases/supplier-bills")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load the supplier bill.
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title={isEdit ? "Edit Supplier Bill" : "New Supplier Bill"}
        subtitle="Record a supplier invoice and match it against the purchase order and GRN."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchases/supplier-bills")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saveMutation.isPending || isLoading}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {isEdit ? "Update Bill" : "Save Bill"}
            </Button>
          </div>
        }
      />

      {errors.general ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.general}
        </div>
      ) : null}

      {optionsQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Unable to load supplier bill options. Confirm that the backend
          endpoint exists:
          <code className="ml-1 font-mono">
            /api/purchases/supplier-bills/form-options/
          </code>
        </div>
      ) : null}

      <Section
        title="Bill Information"
        description="Enter the supplier invoice and document dates."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Bill Number</Label>

            <Input
              className="mt-2"
              value={form.bill_number || "Automatically generated"}
              disabled
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Generated by the backend.
            </p>
          </div>

          <div>
            <Label htmlFor="supplier_invoice_number">
              Supplier Invoice Number *
            </Label>

            <Input
              id="supplier_invoice_number"
              className="mt-2"
              value={form.supplier_invoice_number}
              onChange={(event) =>
                updateField("supplier_invoice_number", event.target.value)
              }
              placeholder="Supplier invoice reference"
            />

            <FieldError message={errors.supplier_invoice_number} />
          </div>

          <div>
            <Label htmlFor="bill_date">Bill Date *</Label>

            <Input
              id="bill_date"
              className="mt-2"
              type="date"
              value={form.bill_date}
              onChange={(event) => {
                const billDate = event.target.value;

                setForm((current) => ({
                  ...current,

                  bill_date: billDate,

                  due_date: current.payment_terms_days
                    ? addDays(billDate, current.payment_terms_days)
                    : current.due_date,
                }));
              }}
            />

            <FieldError message={errors.bill_date} />
          </div>

          <div>
            <Label htmlFor="due_date">Due Date *</Label>

            <Input
              id="due_date"
              className="mt-2"
              type="date"
              value={form.due_date}
              onChange={(event) => updateField("due_date", event.target.value)}
            />

            <FieldError message={errors.due_date} />
          </div>

          <div>
            <Label htmlFor="payment_terms_days">Payment Terms</Label>

            <Input
              id="payment_terms_days"
              className="mt-2"
              type="number"
              min="0"
              value={form.payment_terms_days}
              onChange={(event) => {
                const days = event.target.value;

                setForm((current) => ({
                  ...current,

                  payment_terms_days: days,

                  due_date: addDays(current.bill_date, days),
                }));
              }}
            />
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>

            <select
              id="currency"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>

            <select
              id="status"
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
        </div>
      </Section>

      <Section
        title="Purchase Matching"
        description="Select a purchase order or confirmed GRN to load supplier and item information."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="branch">Branch *</Label>

            <select
              id="branch"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.branch}
              onChange={(event) => {
                const value = event.target.value;

                setForm((current) => ({
                  ...current,

                  branch: value,

                  purchase_order: "",

                  grn: "",
                }));
              }}
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
            <Label htmlFor="purchase_order">Purchase Order *</Label>

            <select
              id="purchase_order"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.purchase_order}
              onChange={(event) => applyPurchaseOrder(event.target.value)}
            >
              <option value="">
                {optionsQuery.isLoading
                  ? "Loading purchase orders..."
                  : purchaseOrders.length
                    ? "Select purchase order"
                    : "No approved purchase orders available"}
              </option>

              {purchaseOrders.map((purchaseOrder) => (
                <option key={purchaseOrder.id} value={String(purchaseOrder.id)}>
                  {purchaseOrder.po_number || `PO ${purchaseOrder.id}`}
                  {purchaseOrder.supplier_name
                    ? ` — ${purchaseOrder.supplier_name}`
                    : ""}
                </option>
              ))}
            </select>

            <FieldError message={errors.purchase_order} />
          </div>

          <div>
            <Label htmlFor="grn">Confirmed GRN *</Label>

            <select
              id="grn"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.grn}
              disabled={!form.purchase_order || optionsQuery.isLoading}
              onChange={(event) => applyGrn(event.target.value)}
            >
              <option value="">
                {!form.purchase_order
                  ? "Select Purchase Order first"
                  : availableGrns.length
                    ? "Select confirmed GRN"
                    : "No confirmed GRN for this PO"}
              </option>

              {availableGrns.map((grn) => (
                <option key={grn.id} value={String(grn.id)}>
                  {grn.grn_number || `GRN ${grn.id}`}
                  {grn.po_number ? ` — ${grn.po_number}` : ""}
                </option>
              ))}
            </select>

            <FieldError message={errors.grn} />
          </div>

          <div>
            <Label htmlFor="supplier">Supplier *</Label>

            <select
              id="supplier"
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
        </div>
      </Section>

      <Section
        title="Bill Items"
        description="Verify invoice quantities, prices, discounts, and VAT."
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {calculatedItems.length} item
              {calculatedItems.length === 1 ? "" : "s"}
            </p>

            <FieldError message={errors.items} />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {calculatedItems.map((item, index) => (
            <div
              key={item.id || `item-${index}`}
              className="rounded-xl border p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">Item {index + 1}</h3>

                  {item.product_name ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.product_name}
                      {item.sku ? ` • ${item.sku}` : ""}
                    </p>
                  ) : null}
                </div>

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
                  <Label>Product *</Label>

                  <Input
                    className="mt-2"
                    value={item.product_name || item.product}
                    disabled={Boolean(item.product_name)}
                    onChange={(event) =>
                      updateItem(index, "product", event.target.value)
                    }
                    placeholder="Product ID"
                  />

                  <FieldError message={errors[`item_${index}_product`]} />
                </div>

                <div>
                  <Label>Quantity *</Label>

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

                  <FieldError message={errors[`item_${index}_quantity`]} />
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

                  <FieldError message={errors[`item_${index}_unit_price`]} />
                </div>

                <div>
                  <Label>Discount</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount_amount}
                    onChange={(event) =>
                      updateItem(index, "discount_amount", event.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>VAT %</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.vat_percentage}
                    onChange={(event) =>
                      updateItem(index, "vat_percentage", event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-4">
                  <Label>Description</Label>

                  <Input
                    className="mt-2"
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, "description", event.target.value)
                    }
                    placeholder="Item description"
                  />
                </div>

                <div>
                  <Label>VAT Amount</Label>

                  <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
                    <CurrencyText value={item.vat_amount} />
                  </div>
                </div>

                <div>
                  <Label>Line Total</Label>

                  <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                    <CurrencyText value={item.line_total} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Attachments"
          description="Upload supplier invoice copies and supporting documents."
        >
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center hover:bg-muted/30">
            <Paperclip className="h-7 w-7 text-muted-foreground" />

            <p className="mt-3 text-sm font-medium">
              Select invoice attachments
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, JPEG, or PNG. Maximum 10 MB per file.
            </p>

            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                setFiles(Array.from(event.target.files || []))
              }
            />
          </label>

          {files.length ? (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {Math.ceil(file.size / 1024)} KB
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <FieldError message={errors.attachments} />
        </Section>

        <Section
          title="Bill Summary"
          description="Review the calculated supplier invoice totals."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items Subtotal</span>

              <span className="font-medium">
                <CurrencyText value={totals.subtotal} />
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Item Discounts</span>

              <span className="font-medium">
                <CurrencyText value={totals.itemDiscount} />
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="header_discount">Additional Discount</Label>

                <Input
                  id="header_discount"
                  className="w-40 text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(event) =>
                    updateField("discount_amount", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">VAT Amount</span>

              <span className="font-medium">
                <CurrencyText value={totals.vatAmount} />
              </span>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Amount</span>

                <span className="text-xl font-bold">
                  <CurrencyText value={totals.totalAmount} />
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="paid_amount">Previously Paid</Label>

              <Input
                id="paid_amount"
                className="mt-2"
                type="number"
                min="0"
                step="0.01"
                value={form.paid_amount}
                onChange={(event) =>
                  updateField("paid_amount", event.target.value)
                }
              />

              <FieldError message={errors.paid_amount} />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Balance Due</span>

                <span className="text-lg font-bold">
                  <CurrencyText value={totals.balanceDue} />
                </span>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Notes">
        <Label htmlFor="notes">Internal Notes</Label>

        <Textarea
          id="notes"
          className="mt-2 min-h-28"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Additional supplier bill notes"
        />
      </Section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link to="/purchases/supplier-bills">Cancel</Link>
        </Button>

        <Button
          type="button"
          disabled={saveMutation.isPending || isLoading}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          {isEdit ? "Update Supplier Bill" : "Create Supplier Bill"}
        </Button>
      </div>
    </div>
  );
}
