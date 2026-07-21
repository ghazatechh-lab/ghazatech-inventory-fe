import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { MinusCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
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

export default function StockAdjustmentPage() {
  const queryClient = useQueryClient();
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
      adjustment_type: "DEDUCT",
      quantity: 1,
      reason: "",
      remarks: "",
    },
  });

  const selectedProductId = watch("product");

  const { data: branchResponse } = useQuery({
    queryKey: ["adjustment-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
  });

  const { data: productResponse } = useQuery({
    queryKey: ["adjustment-products"],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page_size: 500,
            is_active: true,
          },
        }),
      ),
  });

  const { data: adjustmentResponse, isLoading: adjustmentsLoading } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/adjustments/", {
          params: {
            page_size: 100,
            ordering: "-created_at",
          },
        }),
      ),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const branches = normalizeList(branchResponse);
  const products = normalizeList(productResponse);
  const adjustments = normalizeList(adjustmentResponse);

  const selectedProduct = products.find(
    (product) => String(product.id) === String(selectedProductId),
  );

  const variants = (selectedProduct?.variants || []).filter(
    (variant) => variant.is_active && !variant.is_base,
  );

  React.useEffect(() => {
    setValue("variant", "");
  }, [selectedProductId, setValue]);

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
      ]);

      toast.success("Stock adjusted successfully.");

      reset({
        branch: "",
        product: "",
        variant: "",
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
    const payload = {
      branch: Number(values.branch),
      product: Number(values.product),
      variant: values.variant ? Number(values.variant) : null,
      adjustment_type: values.adjustment_type,
      quantity: Number(values.quantity),
      reason: values.reason.trim(),
      remarks: values.remarks?.trim() || "",
    };

    setPendingAdjustment(payload);
    setConfirmOpen(true);
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjustment) return;
    setConfirmOpen(false);
    await createMutation.mutateAsync(pendingAdjustment);
    setPendingAdjustment(null);
  };

  const saving = isSubmitting || createMutation.isPending;

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
                      {branches.map((branch) => (
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
                  Attribute combination
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
                        <SelectValue placeholder="Select attributes" />
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
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Applying..." : "Apply adjustment"}
            </Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
            <h2 className="font-semibold text-white">Recent adjustments</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-white/10">
                <tr>
                  {[
                    "Date",
                    "Product",
                    "Branch",
                    "Type",
                    "Qty",
                    "Reason",
                    "Status",
                    "Updated by",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {adjustmentsLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-14 text-center text-sm text-slate-400"
                    >
                      Loading adjustments...
                    </td>
                  </tr>
                ) : adjustments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-14 text-center text-sm text-slate-400"
                    >
                      No adjustments found.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-white">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.variant_label !== "Base product"
                            ? item.variant_label
                            : item.sku}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                        {item.branch_code || item.branch_name}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.adjustment_type === "ADD"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {item.adjustment_type === "ADD"
                            ? "Increase"
                            : "Decrease"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-mono font-semibold text-white">
                        {item.signed_quantity > 0 ? "+" : ""}
                        {item.signed_quantity}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-300">
                        {item.reason}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          {item.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-400">
                        <div>{item.approved_by_name || "System"}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {new Date(
                            item.adjusted_at || item.created_at,
                          ).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
