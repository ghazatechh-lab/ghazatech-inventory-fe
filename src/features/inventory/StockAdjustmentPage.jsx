import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { MinusCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
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
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

export default function StockAdjustmentPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [pendingAdjustment, setPendingAdjustment] = React.useState(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      branch: "",
      product: "",
      variant: "",
      stock_classification: "REGULAR",
      adjustment_type: "DEDUCT",
      quantity: 1,
      reason: "",
      remarks: "",
    },
  });

  const selectedBranchId = watch("branch");
  const selectedProductId = watch("product");
  const selectedVariantId = watch("variant");
  const selectedClassification = watch("stock_classification");

  const { data: branchResponse } = useQuery({
    queryKey: ["adjustment-branches"],

    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 500,
          },
        }),
      ),
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

  const {
    data: stockResponse,
    isLoading: stockLoading,
    isFetching: stockFetching,
  } = useQuery({
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

    enabled: Boolean(
      selectedBranchId &&
      selectedProductId &&
      (selectedVariantId ||
        !normalizeList(productResponse).find(
          (product) => String(product.id) === String(selectedProductId),
        )?.has_variants),
    ),

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
  const selectedStock = stockResponse || null;

  const regularQuantity = Number(selectedStock?.regular_quantity || 0);

  const restrictedQuantity = Number(selectedStock?.restricted_quantity || 0);

  const availableRegularQuantity = Number(
    selectedStock?.available_regular_quantity || 0,
  );

  const availableRestrictedQuantity = Number(
    selectedStock?.available_restricted_quantity || 0,
  );

  const restrictedAllowed = selectedStock?.restricted_allowed !== false;

  const selectedAvailableQuantity =
    selectedClassification === "RESTRICTED"
      ? availableRestrictedQuantity
      : availableRegularQuantity;

  const adjustmentPayload = adjustmentQuery.data || {
    results: [],
    count: 0,
  };

  const adjustments = normalizeList(adjustmentPayload);

  const selectedProduct = products.find(
    (product) => String(product.id) === String(selectedProductId),
  );

  const variants = (selectedProduct?.variants || []).filter(
    (variant) => variant.is_active && !variant.is_base,
  );

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

  const createMutation = useMutation({
    mutationFn: async (payload) => api.post("/inventory/adjustments/", payload),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["stock-adjustments"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["stock-overview"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["stock-movements"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["low-stock"],
        }),
      ]);

      toast.success("Stock adjusted successfully.");

      reset({
        branch: branchId ? String(branchId) : "",
        product: "",
        variant: "",
        stock_classification: "REGULAR",
        adjustment_type: "DEDUCT",
        quantity: 1,
        reason: "",
        remarks: "",
      });
    },

    onError: (error) => {
      if (!error?.__apiErrorShown) {
        toast.error("Unable to adjust stock.");
      }
    },
  });

  const submit = async (values) => {
    if (
      values.adjustment_type === "DEDUCT" &&
      Number(values.quantity) > Number(selectedAvailableQuantity)
    ) {
      toast.error(
        `Only ${selectedAvailableQuantity} ${
          values.stock_classification === "RESTRICTED"
            ? "restricted"
            : "regular"
        } units are available.`,
      );
      return;
    }

    const payload = {
      branch: Number(values.branch),

      product: Number(values.product),

      variant: values.variant ? Number(values.variant) : null,

      stock_classification: values.stock_classification,

      adjustment_type: values.adjustment_type,

      quantity: Number(values.quantity),

      reason: values.reason.trim(),

      remarks: values.remarks?.trim() || "",
    };

    setPendingAdjustment(payload);

    setConfirmOpen(true);
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjustment) {
      return;
    }

    setConfirmOpen(false);

    await createMutation.mutateAsync(pendingAdjustment);

    setPendingAdjustment(null);
  };

  const saving = isSubmitting || createMutation.isPending;

  const adjustmentColumns = [
    {
      key: "created_at",
      header: "Date & time",
      sortKey: "created_at",
      cell: (item) =>
        new Date(item.adjusted_at || item.created_at).toLocaleString(),
    },
    {
      key: "product_name",
      header: "Product",
      sortKey: "product__product_name",
      cell: (item) => (
        <div>
          <div className="font-medium text-white">{item.product_name}</div>

          <div className="text-xs text-slate-500">
            {item.variant_label !== "Base product"
              ? item.variant_label
              : item.sku}
          </div>
        </div>
      ),
    },
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (item) => item.branch_code || item.branch_name,
    },
    {
      key: "stock_classification",
      header: "Stock type",
      sortKey: "stock_classification",
      cell: (item) =>
        item.stock_classification === "RESTRICTED" ? "Restricted" : "Regular",
    },
    {
      key: "adjustment_type",
      header: "Type",
      sortKey: "adjustment_type",
      cell: (item) => (
        <span
          className={
            item.adjustment_type === "ADD" ? "text-emerald-400" : "text-red-400"
          }
        >
          {item.adjustment_type === "ADD" ? "Increase" : "Decrease"}
        </span>
      ),
    },
    {
      key: "signed_quantity",
      header: "Qty",
      sortKey: "quantity",
      align: "right",
      cell: (item) => (
        <span className="font-mono font-semibold text-white">
          {item.signed_quantity > 0 ? "+" : ""}
          {item.signed_quantity}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      sortKey: "reason",
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      cell: (item) => (
        <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
          {item.status}
        </span>
      ),
    },
    {
      key: "approved_by_name",
      header: "Updated by",
      sortKey: "approved_by__username",
      cell: (item) => item.approved_by_name || "System",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock adjustments"
        subtitle="Manually increase or decrease stock to match the physical count"
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit(submit)}
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70"
        >
          <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
            <h2 className="font-semibold text-white">New adjustment</h2>

            <p className="mt-1 text-xs text-slate-500">
              Example: system stock is 100 but physical stock is 98, so deduct
              2.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <Label>
                Branch
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Controller
                name="branch"
                control={control}
                rules={{
                  required: "Branch is required.",
                }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2 h-11">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>

                    <SelectContent>
                      {visibleBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.branch_code || branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {errors.branch && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.branch.message}
                </p>
              )}
            </div>

            <div>
              <Label>
                Product
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Controller
                name="product"
                control={control}
                rules={{
                  required: "Product is required.",
                }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2 h-11">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.product_name} · {product.sku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {errors.product && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.product.message}
                </p>
              )}
            </div>

            {selectedProduct?.has_variants && (
              <div>
                <Label>
                  Attribute
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <Controller
                  name="variant"
                  control={control}
                  rules={{
                    required: "Select an attribute combination.",
                  }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-2 h-11">
                        <SelectValue placeholder="Select attribute" />
                      </SelectTrigger>

                      <SelectContent>
                        {variants.map((variant) => (
                          <SelectItem
                            key={variant.id}
                            value={String(variant.id)}
                          >
                            {variant.display_name ||
                              Object.values(variant.attributes || {}).join(
                                " / ",
                              )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.variant && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.variant.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>
                Stock type
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Controller
                name="stock_classification"
                control={control}
                rules={{
                  required: "Stock type is required.",
                }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2 h-11">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="REGULAR">
                        Regular stock — {availableRegularQuantity} available
                      </SelectItem>

                      {restrictedAllowed && (
                        <SelectItem value="RESTRICTED">
                          Restricted stock — {availableRestrictedQuantity}{" "}
                          available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />

              <div className="mt-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.025]">
                {stockLoading || stockFetching ? (
                  <span className="text-muted-foreground">
                    Loading available stock...
                  </span>
                ) : selectedClassification === "RESTRICTED" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Restricted stock
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {availableRestrictedQuantity} available
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Regular stock</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {availableRegularQuantity} available
                    </span>
                  </div>
                )}

                {!stockLoading && !stockFetching && selectedStock && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Physical quantity:{" "}
                    {selectedClassification === "RESTRICTED"
                      ? restrictedQuantity
                      : regularQuantity}
                  </p>
                )}
              </div>

              {selectedProductId &&
                (!selectedProduct?.has_variants || selectedVariantId) &&
                !stockLoading &&
                !selectedStock?.stock_id && (
                  <p className="mt-1 text-xs text-amber-500">
                    No stock record exists for this branch, product, and
                    attribute. Increase will create the stock balance.
                  </p>
                )}
            </div>

            <div>
              <Label>Adjustment type</Label>

              <Controller
                name="adjustment_type"
                control={control}
                render={({ field }) => (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange("ADD")}
                      className={`rounded-xl border p-4 text-left transition ${
                        field.value === "ADD"
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <PlusCircle className="h-5 w-5 text-emerald-400" />

                      <div className="mt-2 text-sm font-medium text-white">
                        Increase
                      </div>
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
                      <MinusCircle className="h-5 w-5 text-red-400" />

                      <div className="mt-2 text-sm font-medium text-white">
                        Decrease
                      </div>
                    </button>
                  </div>
                )}
              />
            </div>

            <div>
              <Label>
                Quantity
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Input
                type="number"
                min="1"
                max={
                  watch("adjustment_type") === "DEDUCT"
                    ? selectedAvailableQuantity || undefined
                    : undefined
                }
                {...register("quantity", {
                  required: "Quantity is required.",

                  valueAsNumber: true,

                  min: {
                    value: 1,
                    message: "Quantity must be at least 1.",
                  },
                })}
                className="mt-2 h-11"
              />

              {errors.quantity && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div>
              <Label>
                Reason
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Input
                {...register("reason", {
                  required: "Reason is required.",
                })}
                placeholder="Physical count correction"
                className="mt-2 h-11"
              />

              {errors.reason && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.reason.message}
                </p>
              )}
            </div>

            <div>
              <Label>Remarks</Label>

              <Textarea
                {...register("remarks")}
                rows={3}
                placeholder="Optional notes"
                className="mt-2"
              />
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.02] p-5">
            <Button
              type="submit"
              disabled={
                saving ||
                !selectedBranchId ||
                !selectedProductId ||
                (selectedProduct?.has_variants && !selectedVariantId)
              }
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Applying..." : "Apply adjustment"}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4">
            <h2 className="font-semibold text-white">Recent adjustments</h2>

            <p className="mt-1 text-xs text-slate-500">
              Sort by date, product, branch, quantity, status or user.
            </p>
          </div>

          <DataTable
            columns={adjustmentColumns}
            data={adjustments}
            isLoading={adjustmentQuery.isLoading}
            page={adjustmentPage}
            pageSize={12}
            total={adjustmentPayload.count || 0}
            onPageChange={setAdjustmentPage}
            emptyTitle="No adjustments found"
            emptyDescription="Stock adjustments will appear here."
          />
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/10 bg-slate-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm stock adjustment</DialogTitle>

            <DialogDescription>
              This action changes real stock immediately and records your user
              account, date, time, previous stock and new stock in Stock
              Movements.
            </DialogDescription>
          </DialogHeader>

          {pendingAdjustment && (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Stock type</span>

                <span className="font-medium text-white">
                  {pendingAdjustment.stock_classification === "RESTRICTED"
                    ? "Restricted"
                    : "Regular"}
                </span>
              </div>

              <div className="mt-3 flex justify-between text-sm">
                <span className="text-slate-400">Type</span>

                <span
                  className={
                    pendingAdjustment.adjustment_type === "ADD"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {pendingAdjustment.adjustment_type === "ADD"
                    ? "Increase"
                    : "Decrease"}
                </span>
              </div>

              <div className="mt-3 flex justify-between text-sm">
                <span className="text-slate-400">Quantity</span>

                <span className="font-mono font-semibold text-white">
                  {pendingAdjustment.adjustment_type === "ADD" ? "+" : "-"}
                  {pendingAdjustment.quantity}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span className="text-slate-400">Reason</span>

                <span className="text-right text-white">
                  {pendingAdjustment.reason}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={confirmAdjustment}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Applying..." : "Confirm adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
