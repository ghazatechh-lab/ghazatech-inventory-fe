import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Clock3, MinusCircle, Pencil, PlusCircle, Save, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const emptyAdjustment = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  product: "",
  variant: "",
  stock_classification: "REGULAR",
  adjustment_type: "DEDUCT",
  quantity: 1,
  reason: "",
  remarks: "",
});

const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
};

const getSignedQuantity = (adjustment) => {
  if (Number.isFinite(Number(adjustment?.signed_quantity))) {
    return Number(adjustment.signed_quantity);
  }

  const quantity = Number(adjustment?.quantity || 0);
  return adjustment?.adjustment_type === "DEDUCT" ? -quantity : quantity;
};

function AdjustmentFields({
  values,
  update,
  branches,
  products,
  variants,
  stock,
  restrictedAllowed,
  disabled = false,
  errors = {},
}) {
  const classification = values.stock_classification || "REGULAR";
  const regularAvailable = Number(stock?.available_regular_quantity || 0);
  const restrictedAvailable = Number(stock?.available_restricted_quantity || 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Branch *</Label>
        <Select
          value={values.branch}
          disabled={disabled}
          onValueChange={(value) => update("branch", value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={String(branch.id)}>
                {branch.branch_name || branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branch && (
          <p className="mt-1 text-xs text-red-500">{errors.branch}</p>
        )}
      </div>

      <div>
        <Label>Product *</Label>
        <Select
          value={values.product}
          disabled={disabled || !values.branch}
          onValueChange={(value) => update("product", value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {products.map((product) => (
              <SelectItem key={product.id} value={String(product.id)}>
                {product.product_name} — {product.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.product && (
          <p className="mt-1 text-xs text-red-500">{errors.product}</p>
        )}
      </div>

      <div>
        <Label>Variant</Label>
        <Select
          value={values.variant || "__base__"}
          disabled={disabled || !values.product || !variants.length}
          onValueChange={(value) =>
            update("variant", value === "__base__" ? "" : value)
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue
              placeholder={variants.length ? "Select variant" : "Base product"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__base__">Base product</SelectItem>
            {variants.map((variant) => (
              <SelectItem key={variant.id} value={String(variant.id)}>
                {variant.variant_name ||
                  variant.name ||
                  variant.attributes_display ||
                  `Variant ${variant.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.variant && (
          <p className="mt-1 text-xs text-red-500">{errors.variant}</p>
        )}
      </div>

      <div>
        <Label>Stock Type *</Label>
        <Select
          value={classification}
          disabled={disabled || !values.product}
          onValueChange={(value) => update("stock_classification", value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REGULAR">
              Regular — available {regularAvailable}
            </SelectItem>
            <SelectItem value="RESTRICTED" disabled={!restrictedAllowed}>
              Restricted — available {restrictedAvailable}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2">
        <Label>Adjustment Type *</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => update("adjustment_type", "ADD")}
            className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition ${
              values.adjustment_type === "ADD"
                ? "border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                : "hover:border-emerald-300"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <PlusCircle className="h-5 w-5 text-emerald-500" />
              Increase Stock
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Add the entered quantity to inventory.
            </span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => update("adjustment_type", "DEDUCT")}
            className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition ${
              values.adjustment_type === "DEDUCT"
                ? "border-red-500/40 bg-red-500/10 ring-1 ring-red-500/20"
                : "hover:border-rose-300"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <MinusCircle className="h-5 w-5 text-rose-500" />
              Decrease Stock
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Remove the entered quantity from available inventory.
            </span>
          </button>
        </div>
      </div>

      <div>
        <Label>Quantity *</Label>
        <Input
          type="number"
          min="1"
          step="1"
          className="mt-2"
          disabled={disabled}
          value={values.quantity}
          onChange={(event) => update("quantity", event.target.value)}
        />
        {errors.quantity && (
          <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>
        )}
      </div>

      <div>
        <Label>Reason *</Label>
        <Input
          className="mt-2"
          disabled={disabled}
          value={values.reason}
          onChange={(event) => update("reason", event.target.value)}
          placeholder="Stock count correction"
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <Label>Remarks</Label>
        <Textarea
          className="mt-2 min-h-24"
          disabled={disabled}
          value={values.remarks}
          onChange={(event) => update("remarks", event.target.value)}
          placeholder="Optional supporting details"
        />
      </div>
    </div>
  );
}

export default function StockAdjustmentPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingAdjustment, setPendingAdjustment] = React.useState(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingAdjustment, setEditingAdjustment] = React.useState(null);
  const [editForm, setEditForm] = React.useState(() =>
    emptyAdjustment(branchId),
  );
  const [editErrors, setEditErrors] = React.useState({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: emptyAdjustment(branchId),
  });

  const selectedBranchId = watch("branch");
  const selectedProductId = watch("product");
  const selectedVariantId = watch("variant");
  const selectedClassification = watch("stock_classification");

  const { data: branchResponse } = useQuery({
    queryKey: ["adjustment-branches"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });

  const { data: productResponse } = useQuery({
    queryKey: ["adjustment-products", selectedBranchId],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page_size: 500,
            is_active: true,
            branch: selectedBranchId || undefined,
          },
        }),
      ),
    enabled: Boolean(selectedBranchId),
  });

  const { data: stockResponse } = useQuery({
    queryKey: [
      "stock-adjustment-options",
      selectedBranchId,
      selectedProductId,
      selectedVariantId,
    ],
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/adjustment-options/", {
          params: {
            branch: selectedBranchId,
            product: selectedProductId,
            variant: selectedVariantId || undefined,
          },
        }),
      ),
    enabled: Boolean(selectedBranchId && selectedProductId),
    staleTime: 0,
  });

  const { data: editProductsResponse } = useQuery({
    queryKey: ["adjustment-edit-products", editForm.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page_size: 500,
            is_active: true,
            branch: editForm.branch || undefined,
          },
        }),
      ),
    enabled: editOpen && Boolean(editForm.branch),
  });

  const { data: editStockResponse } = useQuery({
    queryKey: [
      "stock-adjustment-edit-options",
      editForm.branch,
      editForm.product,
      editForm.variant,
    ],
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/adjustment-options/", {
          params: {
            branch: editForm.branch,
            product: editForm.product,
            variant: editForm.variant || undefined,
          },
        }),
      ),
    enabled: editOpen && Boolean(editForm.branch && editForm.product),
    staleTime: 0,
  });

  const {
    query: adjustmentQuery,
    page: adjustmentPage,
    setPage: setAdjustmentPage,
  } = useListQuery(
    "stock-adjustments",
    "/inventory/adjustments/",
    branchParams,
  );

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const visibleBranches = React.useMemo(
    () =>
      branchId
        ? branches.filter((branch) => String(branch.id) === String(branchId))
        : branches,
    [branches, branchId],
  );

  const products = normalizeList(productResponse);
  const editProducts = normalizeList(editProductsResponse);

  const selectedProduct = products.find(
    (product) => String(product.id) === String(selectedProductId),
  );
  const editSelectedProduct = editProducts.find(
    (product) => String(product.id) === String(editForm.product),
  );

  const variants = (selectedProduct?.variants || []).filter(
    (variant) => variant.is_active !== false && !variant.is_base,
  );
  const editVariants = (editSelectedProduct?.variants || []).filter(
    (variant) => variant.is_active !== false && !variant.is_base,
  );

  const selectedStock = stockResponse || null;
  const editStock = editStockResponse || null;

  const restrictedAllowed = selectedStock?.restricted_allowed !== false;
  const editRestrictedAllowed = editStock?.restricted_allowed !== false;

  const adjustmentPayload = adjustmentQuery.data || {
    results: [],
    count: 0,
  };
  const adjustments = normalizeList(adjustmentPayload);

  React.useEffect(() => {
    setValue("product", "");
    setValue("variant", "");
  }, [selectedBranchId, setValue]);

  React.useEffect(() => {
    setValue("variant", "");
  }, [selectedProductId, setValue]);

  React.useEffect(() => {
    if (selectedClassification === "RESTRICTED" && !restrictedAllowed) {
      setValue("stock_classification", "REGULAR");
    }
  }, [restrictedAllowed, selectedClassification, setValue]);

  React.useEffect(() => {
    if (branchId) {
      setValue("branch", String(branchId));
    }
  }, [branchId, setValue]);

  const refreshInventory = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["stock-adjustments"],
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: ["stock-overview"],
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: ["stock-movements"],
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: ["low-stock"],
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: ["stock-adjustment-options"],
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: ["stock-adjustment-edit-options"],
        exact: false,
      }),
    ]);

    await adjustmentQuery.refetch();
  };

  const createMutation = useMutation({
    mutationFn: async (payload) =>
      api.post("/inventory/adjustments/", payload, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async () => {
      await refreshInventory();
      toast.success("Stock adjusted successfully.");
      reset(emptyAdjustment(branchId));
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to adjust stock", {
        description:
          details.summary ||
          details.message ||
          "Review the stock quantity and adjustment fields.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload) =>
      api.patch(`/inventory/adjustments/${editingAdjustment.id}/`, payload, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async () => {
      await refreshInventory();
      toast.success("Stock adjustment updated and inventory recalculated.");
      setEditOpen(false);
      setEditingAdjustment(null);
      setEditForm(emptyAdjustment(branchId));
      setEditErrors({});
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update stock adjustment", {
        description:
          details.summary ||
          details.message ||
          "The edited values could not be applied to inventory.",
      });
    },
  });

  const validateValues = (values, stock, isEdit = false) => {
    const next = {};

    if (!values.branch) next.branch = "Branch is required.";
    if (!values.product) next.product = "Product is required.";

    const selected = isEdit
      ? editProducts.find(
          (product) => String(product.id) === String(values.product),
        )
      : products.find(
          (product) => String(product.id) === String(values.product),
        );

    if (selected?.has_variants && !values.variant) {
      next.variant = "Select a product variant.";
    }

    if (Number(values.quantity || 0) <= 0) {
      next.quantity = "Quantity must be greater than zero.";
    }

    if (!String(values.reason || "").trim()) {
      next.reason = "Reason is required.";
    }

    if (values.adjustment_type === "DEDUCT" && stock) {
      const available =
        values.stock_classification === "RESTRICTED"
          ? Number(stock.available_restricted_quantity || 0)
          : Number(stock.available_regular_quantity || 0);

      /*
       * During edit, the API first reverses the original adjustment.
       * Add the original deduction back when validating the same stock target.
       */
      const originalSigned = isEdit ? getSignedQuantity(editingAdjustment) : 0;

      const sameTarget =
        isEdit &&
        String(editingAdjustment?.branch) === String(values.branch) &&
        String(editingAdjustment?.product) === String(values.product) &&
        String(editingAdjustment?.variant || "") ===
          String(values.variant || "") &&
        String(editingAdjustment?.stock_classification || "REGULAR") ===
          String(values.stock_classification);

      const reversibleAmount =
        sameTarget && originalSigned < 0 ? Math.abs(originalSigned) : 0;

      if (Number(values.quantity) > available + reversibleAmount) {
        next.quantity = `Only ${available + reversibleAmount} units will be available after reversing the original adjustment.`;
      }
    }

    return next;
  };

  const submit = (values) => {
    const next = validateValues(values, selectedStock, false);

    if (Object.keys(next).length) {
      Object.entries(next).forEach(([field, message]) => {
        toast.error(message);
        if (field in values) {
          setValue(field, values[field], { shouldValidate: true });
        }
      });
      return;
    }

    setPendingAdjustment({
      branch: Number(values.branch),
      product: Number(values.product),
      variant: values.variant ? Number(values.variant) : null,
      stock_classification: values.stock_classification,
      adjustment_type: values.adjustment_type,
      quantity: Number(values.quantity),
      reason: values.reason.trim(),
      remarks: values.remarks?.trim() || "",
    });

    setConfirmOpen(true);
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjustment) return;

    setConfirmOpen(false);
    await createMutation.mutateAsync(pendingAdjustment);
    setPendingAdjustment(null);
  };

  const openEdit = (adjustment) => {
    setEditingAdjustment(adjustment);
    setEditErrors({});
    setEditForm({
      branch: String(adjustment.branch || ""),
      product: String(adjustment.product || ""),
      variant: adjustment.variant ? String(adjustment.variant) : "",
      stock_classification: adjustment.stock_classification || "REGULAR",
      adjustment_type: adjustment.adjustment_type || "DEDUCT",
      quantity: Number(adjustment.quantity || 1),
      reason: adjustment.reason || "",
      remarks: adjustment.remarks || "",
    });
    setEditOpen(true);
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "branch") {
        next.product = "";
        next.variant = "";
      }

      if (field === "product") {
        next.variant = "";
      }

      return next;
    });

    setEditErrors((current) => ({ ...current, [field]: "" }));
  };

  const saveEdit = () => {
    if (!editingAdjustment) return;

    const next = validateValues(editForm, editStock, true);
    setEditErrors(next);

    if (Object.keys(next).length) {
      toast.error("Complete the required adjustment fields.");
      return;
    }

    updateMutation.mutate({
      branch: Number(editForm.branch),
      product: Number(editForm.product),
      variant: editForm.variant ? Number(editForm.variant) : null,
      stock_classification: editForm.stock_classification,
      adjustment_type: editForm.adjustment_type,
      quantity: Number(editForm.quantity),
      reason: editForm.reason.trim(),
      remarks: editForm.remarks.trim(),
    });
  };

  const adjustmentColumns = [
    {
      key: "adjustment_date",
      header: "Date",
      sortKey: "created_at",
      cell: (item) => formatDate(item.adjusted_at || item.created_at),
    },
    {
      key: "adjustment_time",
      header: "Time",
      sortKey: "created_at",
      cell: (item) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
          {formatTime(item.adjusted_at || item.created_at)}
        </span>
      ),
    },
    {
      key: "product_name",
      header: "Product",
      sortKey: "product__product_name",
      cell: (item) => (
        <div>
          <div className="font-medium text-foreground">
            {item.product_name || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.variant_label && item.variant_label !== "Base product"
              ? item.variant_label
              : item.sku || "Base product"}
          </div>
        </div>
      ),
    },
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (item) => item.branch_code || item.branch_name || "—",
    },
    {
      key: "stock_classification",
      header: "Stock Type",
      cell: (item) =>
        item.stock_classification === "RESTRICTED" ? "Restricted" : "Regular",
    },
    {
      key: "adjustment_type",
      header: "Type",
      cell: (item) => (
        <span
          className={
            item.adjustment_type === "ADD"
              ? "font-medium text-emerald-600"
              : "font-medium text-rose-600"
          }
        >
          {item.adjustment_type === "ADD" ? "Increase" : "Decrease"}
        </span>
      ),
    },
    {
      key: "signed_quantity",
      header: "Qty",
      align: "right",
      cell: (item) => {
        const value = getSignedQuantity(item);

        return (
          <span className="font-mono font-semibold">
            {value > 0 ? "+" : ""}
            {value}
          </span>
        );
      },
    },
    {
      key: "reason",
      header: "Reason",
      cell: (item) => item.reason || "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {item.status || "APPROVED"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (item) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openEdit(item)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div
      data-stock-module="stock-adjustments"
      className="stock-module-page space-y-6"
    >
      <PageHeader
        title="Stock adjustments"
        subtitle="Manually increase or decrease stock to match the physical count"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit(submit)}
          className="stock-operation-form overflow-hidden rounded-2xl border bg-card shadow-sm"
        >
          <div className="border-b bg-muted/30 px-5 py-4">
            <h2 className="font-semibold text-foreground">New adjustment</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Example: system stock is 100 but physical stock is 98, so deduct
              2.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="space-y-5">
              <div>
                <Label>Branch *</Label>
                <Controller
                  name="branch"
                  control={control}
                  rules={{ required: "Branch is required." }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={Boolean(branchId)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleBranches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.branch_name || branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.branch && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.branch.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Product *</Label>
                <Controller
                  name="product"
                  control={control}
                  rules={{ required: "Product is required." }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedBranchId}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
                            {product.product_name} — {product.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.product.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Variant</Label>
                <Controller
                  name="variant"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || "__base__"}
                      onValueChange={(value) =>
                        field.onChange(value === "__base__" ? "" : value)
                      }
                      disabled={!selectedProductId || !variants.length}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue
                          placeholder={
                            variants.length ? "Select variant" : "Base product"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__base__">Base product</SelectItem>
                        {variants.map((variant) => (
                          <SelectItem
                            key={variant.id}
                            value={String(variant.id)}
                          >
                            {variant.variant_name ||
                              variant.name ||
                              variant.attributes_display ||
                              `Variant ${variant.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Stock Type *</Label>
                <Controller
                  name="stock_classification"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedProductId}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">
                          Regular — available{" "}
                          {Number(
                            selectedStock?.available_regular_quantity || 0,
                          )}
                        </SelectItem>
                        <SelectItem
                          value="RESTRICTED"
                          disabled={!restrictedAllowed}
                        >
                          Restricted — available{" "}
                          {Number(
                            selectedStock?.available_restricted_quantity || 0,
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  className="mt-2"
                  {...register("quantity", {
                    required: "Quantity is required.",
                    min: {
                      value: 1,
                      message: "Quantity must be greater than zero.",
                    },
                  })}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Reason *</Label>
                <Input
                  className="mt-2"
                  placeholder="Stock count correction"
                  {...register("reason", {
                    required: "Reason is required.",
                  })}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.reason.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Adjustment Type *</Label>
              <Controller
                name="adjustment_type"
                control={control}
                render={({ field }) => (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("ADD")}
                      className={`rounded-xl border p-4 text-left transition ${
                        field.value === "ADD"
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <PlusCircle className="h-5 w-5 text-emerald-500" />
                        Increase Stock
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => field.onChange("DEDUCT")}
                      className={`rounded-xl border p-4 text-left transition ${
                        field.value === "DEDUCT"
                          ? "border-red-500/40 bg-red-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <MinusCircle className="h-5 w-5 text-rose-500" />
                        Decrease Stock
                      </span>
                    </button>
                  </div>
                )}
              />
            </div>

            <div>
              <Label>Remarks</Label>
              <Textarea
                className="mt-2 min-h-24"
                placeholder="Optional supporting details"
                {...register("remarks")}
              />
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.02] p-5">
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Applying..." : "Review Adjustment"}
            </Button>
          </div>
        </form>

        <section className="stock-adjustment-history min-w-0 self-start overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="relative z-10 border-b bg-card px-5 py-4">
            <h2 className="font-semibold text-foreground">
              Recent adjustments
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sort by date, time, product, branch, quantity, status or user.
            </p>
          </div>

          <div className="relative z-0 min-w-0 overflow-x-auto bg-card pt-1">
            <DataTable
              columns={adjustmentColumns}
              data={adjustments}
              isLoading={adjustmentQuery.isLoading}
              page={adjustmentPage}
              pageSize={12}
              total={Number(adjustmentPayload.count ?? adjustments.length ?? 0)}
              onPageChange={setAdjustmentPage}
              emptyTitle="No adjustments found"
              emptyDescription="Stock adjustments will appear here."
            />
          </div>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/10 bg-slate-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Stock Adjustment</DialogTitle>
            <DialogDescription>
              This changes real inventory immediately and records a stock
              movement.
            </DialogDescription>
          </DialogHeader>

          {pendingAdjustment && (
            <div className="space-y-3 rounded-xl border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock type</span>
                <strong>
                  {pendingAdjustment.stock_classification === "RESTRICTED"
                    ? "Restricted"
                    : "Regular"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <strong>
                  {pendingAdjustment.adjustment_type === "ADD"
                    ? "Increase"
                    : "Decrease"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <strong className="font-mono">
                  {pendingAdjustment.adjustment_type === "ADD" ? "+" : "-"}
                  {pendingAdjustment.quantity}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Reason</span>
                <strong className="text-right">
                  {pendingAdjustment.reason}
                </strong>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmAdjustment}
              disabled={createMutation.isPending}
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!updateMutation.isPending) setEditOpen(open);
        }}
      >
        <DialogContent className="max-h-[94vh] overflow-y-auto border-white/10 bg-slate-950 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit stock adjustment</DialogTitle>
            <DialogDescription>
              Edit all adjustment fields. Saving reverses the original stock
              effect and applies the updated values safely.
            </DialogDescription>
          </DialogHeader>

          <AdjustmentFields
            values={editForm}
            update={updateEditField}
            branches={visibleBranches.length ? visibleBranches : branches}
            products={editProducts}
            variants={editVariants}
            stock={editStock}
            restrictedAllowed={editRestrictedAllowed}
            errors={editErrors}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => {
                setEditOpen(false);
                setEditingAdjustment(null);
                setEditErrors({});
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateMutation.isPending}
              onClick={saveEdit}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Updating..." : "Update Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
