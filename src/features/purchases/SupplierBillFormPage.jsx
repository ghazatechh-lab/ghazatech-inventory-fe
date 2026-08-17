import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
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

const PAYMENT_TERM_OPTIONS = [
  { value: 0, label: "Due on Receipt" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 15, label: "15 Days" },
  { value: 30, label: "30 Days" },
  { value: 45, label: "45 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
];

const SUPPLIER_BILL_STATUS_OPTIONS = [
  {
    value: "DRAFT",
    label: "Draft",
    editable: true,
  },
  {
    value: "UNMATCHED",
    label: "Unmatched",
    editable: true,
  },
  {
    value: "UNPAID",
    label: "Unpaid",
    editable: false,
  },
  {
    value: "PARTIALLY_PAID",
    label: "Partially Paid",
    editable: false,
  },
  {
    value: "PAID",
    label: "Paid",
    editable: false,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    editable: true,
  },
];

const EDITABLE_STATUS_OPTIONS = SUPPLIER_BILL_STATUS_OPTIONS.filter(
  (option) => option.editable,
);

function getStatusLabel(status) {
  return (
    SUPPLIER_BILL_STATUS_OPTIONS.find(
      (option) => option.value === String(status || "").toUpperCase(),
    )?.label ||
    status ||
    "Draft"
  );
}

const STATUS_OPTIONS = [
  {
    value: "DRAFT",
    label: "Draft",
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

    received_quantity: 0,
    available_bill_quantity: 0,

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

function flattenApiError(value, prefix = "") {
  if (Array.isArray(value)) {
    return value
      .map((item, index) =>
        flattenApiError(
          item,
          prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`,
        ),
      )
      .filter(Boolean)
      .join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const label = key
          .replaceAll("_", " ")
          .replace(/^./, (character) => character.toUpperCase());

        return flattenApiError(item, prefix ? `${prefix} - ${label}` : label);
      })
      .filter(Boolean)
      .join(" ");
  }

  if (value === undefined || value === null || value === "") {
    return "";
  }

  return prefix ? `${prefix}: ${String(value)}` : String(value);
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
    const nestedErrors = normalized?.errors;

    return {
      general:
        flattenApiError(nestedErrors) ||
        normalized.detail ||
        normalized.message,
    };
  }

  const errors = {};

  Object.entries(normalized || {}).forEach(([field, message]) => {
    errors[field] = flattenApiError(message);
  });

  errors.general =
    flattenApiError(normalized) || "Supplier Bill validation failed.";

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
  const [purchaseOrderSearch, setPurchaseOrderSearch] = React.useState("");
  const [purchaseOrderSearchOpen, setPurchaseOrderSearchOpen] =
    React.useState(false);

  const [statusAction, setStatusAction] = React.useState("DRAFT");

  const optionsQuery = useQuery({
    queryKey: ["supplier-bill-form-options", form.branch, isEdit ? id : null],

    queryFn: async () => {
      const response = await api.get(`${SUPPLIER_BILL_ENDPOINT}form-options/`, {
        params: {
          branch: form.branch || branchId || undefined,
          bill_id: isEdit ? id : undefined,
        },
        skipGlobalErrorToast: true,
      });

      const normalized = normalizePayload(response);

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

  const optionPurchaseOrders = normalizeList(options.purchase_orders);

  const grns = React.useMemo(() => {
    const merged = new Map();

    normalizeList(options.grns).forEach((grn) => {
      if (grn?.id) {
        merged.set(String(grn.id), grn);
      }
    });

    const existing = existingQuery.data;

    if (isEdit && existing?.grn) {
      const existingGrnId = getId(existing.grn);

      if (existingGrnId && !merged.has(String(existingGrnId))) {
        merged.set(String(existingGrnId), {
          id: existingGrnId,
          grn_number: existing.grn_number,
          purchase_order_id: getId(existing.purchase_order),
          supplier_id: getId(existing.supplier),
          supplier_name: existing.supplier_name,
          branch_id: getId(existing.branch),
          branch_name: existing.branch_name,
          items: existing.items || [],
        });
      }
    }

    return Array.from(merged.values());
  }, [options.grns, existingQuery.data, isEdit]);

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

  const optionSuppliers = normalizeList(options.suppliers);

  const optionBranches = normalizeList(options.branches);

  const { data: fallbackSupplierResponse } = useQuery({
    queryKey: ["supplier-bill-suppliers", form.branch],
    queryFn: async () =>
      normalizePayload(
        await api.get("/suppliers/", {
          params: {
            branch: form.branch || branchId || undefined,
            page_size: 500,
            is_active: true,
            ordering: "supplier_name",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    staleTime: 30000,
    retry: false,
  });

  const { data: fallbackBranchResponse } = useQuery({
    queryKey: ["supplier-bill-branches"],
    queryFn: async () =>
      normalizePayload(
        await api.get("/branches/", {
          params: { page_size: 500, is_active: true, ordering: "branch_code" },
          skipGlobalErrorToast: true,
        }),
      ),
    staleTime: 300000,
    retry: false,
  });

  const purchaseOrders = React.useMemo(() => {
    const merged = new Map();
    [
      ...optionPurchaseOrders,
      ...(existingQuery.data?.purchase_order
        ? [
            {
              id: getId(existingQuery.data.purchase_order),
              po_number: existingQuery.data.po_number,
              supplier_id: getId(existingQuery.data.supplier),
              supplier_name: existingQuery.data.supplier_name,
              branch_id: getId(existingQuery.data.branch),
              branch_name: existingQuery.data.branch_name,
              status: "APPROVED",
            },
          ]
        : []),
    ]
      .filter((order) => {
        const orderStatus = String(order.status || "").toUpperCase();

        return (
          !orderStatus ||
          ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(orderStatus)
        );
      })
      .forEach((order) => {
        if (order?.id) merged.set(String(order.id), order);
      });
    return Array.from(merged.values());
  }, [optionPurchaseOrders, existingQuery.data]);

  const suppliers = React.useMemo(() => {
    const merged = new Map();
    [...optionSuppliers, ...normalizeList(fallbackSupplierResponse)].forEach(
      (supplier) => {
        if (supplier?.id) merged.set(String(supplier.id), supplier);
      },
    );
    return Array.from(merged.values());
  }, [optionSuppliers, fallbackSupplierResponse]);

  const branches = React.useMemo(() => {
    const merged = new Map();
    [...optionBranches, ...normalizeList(fallbackBranchResponse)].forEach(
      (branch) => {
        if (branch?.id) merged.set(String(branch.id), branch);
      },
    );
    return Array.from(merged.values());
  }, [optionBranches, fallbackBranchResponse]);

  const selectedPurchaseOrder = React.useMemo(
    () =>
      purchaseOrders.find(
        (item) => String(item.id) === String(form.purchase_order),
      ),
    [purchaseOrders, form.purchase_order],
  );

  const selectedSupplier = React.useMemo(
    () => suppliers.find((item) => String(item.id) === String(form.supplier)),
    [suppliers, form.supplier],
  );

  const filteredPurchaseOrders = React.useMemo(() => {
    const search = purchaseOrderSearch.trim().toLowerCase();
    if (!search) return purchaseOrders;
    return purchaseOrders.filter((item) =>
      [
        item.po_number,
        item.supplier_name,
        item.branch_name,
        item.branch_code,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [purchaseOrders, purchaseOrderSearch]);

  React.useEffect(() => {
    if (selectedPurchaseOrder) {
      setPurchaseOrderSearch(
        [selectedPurchaseOrder.po_number, selectedPurchaseOrder.supplier_name]
          .filter(Boolean)
          .join(" · "),
      );
    } else if (!form.purchase_order) {
      setPurchaseOrderSearch("");
    }
  }, [selectedPurchaseOrder, form.purchase_order]);

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

              grn_item:
                item.grn_item_id || item.grn_item
                  ? String(item.grn_item_id ?? getId(item.grn_item))
                  : "",

              product_name:
                item.product_name || item.product?.product_name || "",

              sku: item.sku || item.product?.sku || "",

              variant_name: item.variant_name || "",

              received_quantity: numberValue(item.received_quantity),

              available_bill_quantity: numberValue(
                item.available_bill_quantity ?? item.received_quantity,
              ),

              quantity: numberValue(item.bill_quantity ?? item.quantity),

              unit_price: numberValue(item.unit_cost ?? item.unit_price),

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

      status: ["DRAFT", "UNMATCHED"].includes(
        String(existing.status || "").toUpperCase(),
      )
        ? "DRAFT"
        : "DRAFT",

      match_status: existing.match_status || "PENDING",

      notes: existing.notes || "",

      items: existingItems,
    });

    const existingStatus = String(existing.status || "DRAFT").toUpperCase();

    setStatusAction(
      existing.approved_at
        ? existingStatus
        : EDITABLE_STATUS_OPTIONS.some(
              (option) => option.value === existingStatus,
            )
          ? existingStatus
          : "DRAFT",
    );

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

  async function applyPurchaseOrder(purchaseOrderId) {
    const selectedId = String(purchaseOrderId || "");

    if (!selectedId) {
      setPurchaseOrderSearch("");
      setPurchaseOrderSearchOpen(false);

      setForm((current) => ({
        ...current,
        purchase_order: "",
        grn: "",
        supplier: "",
        items: [createEmptyItem()],
      }));

      return;
    }

    let purchaseOrder = purchaseOrders.find(
      (item) => String(item.id) === selectedId,
    );

    if (!purchaseOrder) {
      setErrors((current) => ({
        ...current,
        purchase_order: "Selected Purchase Order was not found.",
      }));
      return;
    }

    const currentItems = normalizeList(purchaseOrder.items);
    const currentSupplierId =
      purchaseOrder.supplier_id ?? getId(purchaseOrder.supplier);

    if (!currentItems.length || !currentSupplierId) {
      try {
        const response = await api.get(`/purchases/orders/${selectedId}/`, {
          skipGlobalErrorToast: true,
        });

        purchaseOrder = {
          ...purchaseOrder,
          ...normalizePayload(response),
        };
      } catch (error) {
        toast.error("Unable to load Purchase Order details.");
        return;
      }
    }

    const supplierId =
      purchaseOrder.supplier_id ?? getId(purchaseOrder.supplier);

    const branchValue = purchaseOrder.branch_id ?? getId(purchaseOrder.branch);

    const supplierRecord = suppliers.find(
      (supplier) => String(supplier.id) === String(supplierId),
    );

    const paymentTermsDays = numberValue(
      purchaseOrder.payment_terms_days ??
        purchaseOrder.supplier_payment_terms_days ??
        supplierRecord?.payment_terms_days ??
        0,
    );

    setPurchaseOrderSearch(
      [
        purchaseOrder.po_number,
        purchaseOrder.supplier_name ||
          supplierRecord?.supplier_name ||
          supplierRecord?.name,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    setPurchaseOrderSearchOpen(false);

    setForm((current) => ({
      ...current,
      purchase_order: selectedId,
      grn: "",
      supplier: supplierId ? String(supplierId) : "",
      branch: branchValue ? String(branchValue) : current.branch,
      currency: purchaseOrder.currency || current.currency || "AED",
      payment_terms_days: paymentTermsDays,
      due_date: addDays(current.bill_date, paymentTermsDays),
      items: [createEmptyItem()],
    }));

    setErrors((current) => ({
      ...current,
      purchase_order: undefined,
      supplier: supplierId
        ? undefined
        : "Supplier is missing from the selected Purchase Order.",
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

    if (!grn) {
      updateField("grn", grnId);

      return;
    }

    const grnItems = normalizeList(grn.items);

    const linkedSupplierId = grn.supplier_id ?? getId(grn.supplier);
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

              received_quantity: numberValue(
                item.accepted_quantity ?? item.received_quantity,
              ),

              available_bill_quantity: numberValue(
                item.available_bill_quantity ??
                  item.accepted_quantity ??
                  item.received_quantity,
              ),

              quantity: numberValue(
                item.available_bill_quantity ??
                  item.accepted_quantity ??
                  item.received_quantity,
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
      nextErrors.grn = "Select an approved, confirmed GRN with QC passed.";
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
        nextErrors[`item_${index}_product`] =
          "Product must come from the selected GRN.";
      }

      if (!item.grn_item) {
        nextErrors[`item_${index}_product`] =
          "Select a confirmed GRN to load bill items.";
      }

      if (numberValue(item.quantity) <= 0) {
        nextErrors[`item_${index}_quantity`] =
          "Bill quantity must be greater than zero.";
      } else if (
        numberValue(item.quantity) > numberValue(item.available_bill_quantity)
      ) {
        nextErrors[`item_${index}_quantity`] =
          `Bill quantity cannot exceed ${numberValue(
            item.available_bill_quantity,
          )}.`;
      }

      if (numberValue(item.unit_price) < 0) {
        nextErrors[`item_${index}_unit_price`] =
          "Unit price cannot be negative.";
      }
    });

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  const approveMutation = useMutation({
    mutationFn: async (billId) =>
      unwrap(
        await api.post(
          `${SUPPLIER_BILL_ENDPOINT}${billId}/approve/`,
          {},
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async (approvedBill) => {
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

      toast.success("Supplier bill approved successfully.");

      navigate(
        approvedBill?.id
          ? `/purchases/supplier-bills/${approvedBill.id}/edit`
          : `/purchases/supplier-bills/${id}/edit`,
      );
    },

    onError: (error) => {
      const apiErrors = getApiErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(apiErrors.general || "Unable to approve supplier bill.");
    },
  });

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

        discount_amount: Number(totals.headerDiscount.toFixed(2)),

        status: statusAction === "APPROVE" ? "DRAFT" : statusAction,

        notes: form.notes,

        items: calculatedItems.map((item) => ({
          ...(item.id ? { id: item.id } : {}),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          grn_item: item.grn_item ? Number(item.grn_item) : null,

          received_quantity: numberValue(item.received_quantity),

          bill_quantity: numberValue(item.quantity),

          unit_cost: numberValue(item.unit_price),

          discount_amount: numberValue(item.discount_amount),

          vat_percentage: numberValue(item.vat_percentage),
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

      if (isEdit && statusAction === "APPROVE" && saved?.id) {
        toast.success("Supplier bill updated. Approving now...");
        approveMutation.mutate(saved.id);
        return;
      }

      toast.success(
        isEdit
          ? "Supplier bill updated successfully."
          : "Supplier bill created successfully.",
      );

      navigate(
        saved?.id
          ? `/purchases/supplier-bills/${saved.id}/edit`
          : "/purchases/supplier-bills",
      );
    },

    onError: (error) => {
      const apiErrors = getApiErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(apiErrors.general || "Unable to save supplier bill.");
    },
  });

  const isApproved = Boolean(existingQuery.data?.approved_at);

  const currentStatus = String(
    existingQuery.data?.status || form.status || "DRAFT",
  ).toUpperCase();

  const isSaving = saveMutation.isPending || approveMutation.isPending;

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
        subtitle={
          isEdit
            ? "Update the supplier invoice using its linked purchase order and GRN."
            : "Record a supplier invoice and match it against the purchase order and GRN."
        }
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
              disabled={isSaving || isLoading || isApproved}
              onClick={() => saveMutation.mutate()}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {approveMutation.isPending
                ? "Approving Bill..."
                : isEdit && statusAction === "APPROVE"
                  ? "Update & Approve"
                  : isEdit
                    ? `Update as ${getStatusLabel(statusAction)}`
                    : "Save Bill"}
            </Button>
          </div>
        }
      />

      {isEdit && !isApproved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Status changes are managed from this edit page.</span>
          </div>

          <span className="font-medium">
            Selected action:{" "}
            {statusAction === "APPROVE"
              ? "Approve Bill"
              : getStatusLabel(statusAction)}
          </span>
        </div>
      ) : null}

      {isApproved ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This Supplier Bill has already been approved. Current status:{" "}
          <strong>{getStatusLabel(currentStatus)}</strong>. Payment-derived
          statuses are updated through Supplier Payments.
        </div>
      ) : null}

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

                  due_date: addDays(billDate, current.payment_terms_days),
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

            <select
              id="payment_terms_days"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={String(form.payment_terms_days ?? 0)}
              onChange={(event) => {
                const days = Number(event.target.value || 0);

                setForm((current) => ({
                  ...current,
                  payment_terms_days: days,
                  due_date: addDays(current.bill_date, days),
                }));
              }}
            >
              {PAYMENT_TERM_OPTIONS.map((option) => (
                <option key={option.value} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <Label htmlFor="status_action">Status</Label>

            {isEdit ? (
              <>
                <select
                  id="status_action"
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={
                    isApproved
                      ? String(existingQuery.data?.status || "UNPAID")
                      : statusAction
                  }
                  disabled={isApproved || isSaving}
                  onChange={(event) => setStatusAction(event.target.value)}
                >
                  {EDITABLE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}

                  <option value="APPROVE">Approve Bill</option>

                  {isApproved ? (
                    <option
                      value={String(existingQuery.data?.status || "UNPAID")}
                    >
                      {getStatusLabel(existingQuery.data?.status)}
                    </option>
                  ) : null}
                </select>

                <p className="mt-1 text-xs text-muted-foreground">
                  Draft, Unmatched, and Cancelled can be selected manually.
                  Unpaid, Partially Paid, and Paid are calculated by the backend
                  from the payment balance.
                </p>
              </>
            ) : (
              <>
                <Input
                  id="status_action"
                  className="mt-2"
                  value="Draft"
                  readOnly
                  disabled
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  New Supplier Bills are created as Draft.
                </p>
              </>
            )}
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

                setPurchaseOrderSearch("");
                setPurchaseOrderSearchOpen(false);

                setForm((current) => ({
                  ...current,
                  branch: value,
                  purchase_order: "",
                  grn: "",
                  supplier: "",
                  items: [createEmptyItem()],
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

            <div className="relative mt-2">
              <Input
                id="purchase_order"
                value={purchaseOrderSearch}
                autoComplete="off"
                disabled={optionsQuery.isLoading}
                onFocus={() => setPurchaseOrderSearchOpen(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setPurchaseOrderSearch(value);
                  setPurchaseOrderSearchOpen(true);

                  const selectedLabel = selectedPurchaseOrder
                    ? [
                        selectedPurchaseOrder.po_number,
                        selectedPurchaseOrder.supplier_name,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "";

                  if (selectedPurchaseOrder && value !== selectedLabel) {
                    setForm((current) => ({
                      ...current,
                      purchase_order: "",
                      grn: "",
                      supplier: "",
                      items: [createEmptyItem()],
                    }));
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPurchaseOrderSearchOpen(false);
                  }
                }}
                placeholder="Search and select purchase order"
              />

              {purchaseOrderSearchOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-background p-1 shadow-xl dark:border-white/10">
                  {filteredPurchaseOrders.length ? (
                    filteredPurchaseOrders.map((purchaseOrder) => (
                      <button
                        key={purchaseOrder.id}
                        type="button"
                        className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          applyPurchaseOrder(String(purchaseOrder.id))
                        }
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {purchaseOrder.po_number || `PO ${purchaseOrder.id}`}
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          {[
                            purchaseOrder.supplier_name,
                            purchaseOrder.branch_code ||
                              purchaseOrder.branch_name,
                            purchaseOrder.status,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No Purchase Orders match your search.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <FieldError message={errors.purchase_order} />
          </div>

          <div>
            <Label htmlFor="grn">Approved & QC Passed GRN *</Label>

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
                    ? "Select approved QC-passed GRN"
                    : "No approved QC-passed GRN for this PO"}
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

            <Input
              id="supplier"
              className="mt-2"
              value={
                selectedSupplier?.supplier_name ||
                selectedSupplier?.name ||
                selectedPurchaseOrder?.supplier_name ||
                ""
              }
              readOnly
              disabled
              placeholder="Automatically selected from Purchase Order"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Supplier is selected automatically from the linked Purchase Order.
            </p>

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
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8 xl:items-start">
                <div className="xl:col-span-2">
                  <Label>Product *</Label>

                  <Input
                    className="mt-2"
                    value={item.product_name || item.product}
                    readOnly
                    disabled
                    placeholder="Loaded from confirmed GRN"
                  />

                  <FieldError message={errors[`item_${index}_product`]} />
                </div>

                <div>
                  <Label>Bill Quantity *</Label>

                  <Input
                    className="mt-2"
                    type="number"
                    min="1"
                    step="1"
                    max={numberValue(item.available_bill_quantity)}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, "quantity", event.target.value)
                    }
                  />

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Accepted: {numberValue(item.received_quantity)} · Available:{" "}
                    {numberValue(item.available_bill_quantity)}
                  </p>

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
                    readOnly
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
                    readOnly
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
                    readOnly
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
              <Label>Previously Paid</Label>

              <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
                <CurrencyText value={totals.paidAmount} />
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Updated only through Supplier Payments.
              </p>
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
          disabled={isSaving || isLoading || isApproved}
          onClick={() => saveMutation.mutate()}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          {approveMutation.isPending
            ? "Approving Supplier Bill..."
            : isEdit && statusAction === "APPROVE"
              ? "Update & Approve Supplier Bill"
              : isEdit
                ? `Update as ${getStatusLabel(statusAction)}`
                : "Create Supplier Bill"}
        </Button>
      </div>
    </div>
  );
}
