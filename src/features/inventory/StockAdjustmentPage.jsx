import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
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

const normalizeList = (value) =>
  Array.isArray(value)
    ? value
    : value?.results || value?.data?.results || value?.data || [];

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
    formState: { errors },
  } = useForm({
    defaultValues: {
      branch: "",
      product: "",
      variant: "",
      actual_quantity_counted: "",
      reason: "",
      remarks: "",
    },
  });
  const branchId = watch("branch");
  const productId = watch("product");
  const variantId = watch("variant");
  const actual = watch("actual_quantity_counted");

  const { data: branchResponse } = useQuery({
    queryKey: ["adjustment-branches"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const { data: productResponse } = useQuery({
    queryKey: ["adjustment-products"],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const { data: stockResponse } = useQuery({
    queryKey: ["adjustment-current-stock", branchId, productId, variantId],
    enabled: Boolean(branchId && productId),
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: { branch: branchId, product: productId, page_size: 500 },
        }),
      ),
  });
  const {
    query: adjustmentQuery,
    page,
    setPage,
  } = useListQuery("stock-adjustments", "/inventory/adjustments/");
  const branches = normalizeList(branchResponse);
  const products = normalizeList(productResponse);
  const selectedProduct = products.find(
    (item) => String(item.id) === String(productId),
  );
  const variants = (selectedProduct?.variants || []).filter(
    (item) => item.is_active && !item.is_base,
  );
  const stockRows = normalizeList(stockResponse);
  const selectedStock =
    stockRows.find(
      (item) => String(item.variant_id || "") === String(variantId || ""),
    ) || stockRows[0];
  const currentQuantity = Number(
    selectedStock?.total_current ?? selectedStock?.current_stock ?? 0,
  );
  const difference =
    actual === "" || actual === undefined
      ? null
      : Number(actual) - currentQuantity;

  React.useEffect(() => {
    setValue("variant", "");
    setValue("actual_quantity_counted", "");
  }, [productId, branchId, setValue]);

  const mutation = useMutation({
    mutationFn: (payload) => api.post("/inventory/adjustments/", payload),
    onSuccess: async () => {
      await Promise.all(
        [
          "stock-adjustments",
          "stock-overview",
          "stock-movements",
          "low-stock",
        ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
      toast.success("Stock adjusted successfully.");
      reset();
      setPendingAdjustment(null);
    },
  });

  const submit = (values) => {
    const payload = {
      branch: Number(values.branch),
      product: Number(values.product),
      variant: values.variant ? Number(values.variant) : null,
      actual_quantity_counted: Number(values.actual_quantity_counted),
      reason: values.reason.trim(),
      remarks: values.remarks?.trim() || "",
    };
    setPendingAdjustment({
      ...payload,
      current_quantity: currentQuantity,
      difference,
    });
    setConfirmOpen(true);
  };

  const columns = [
    {
      key: "created_at",
      header: "Date & time",
      sortKey: "created_at",
      sortType: "datetime",
      cell: (row) =>
        new Date(row.adjusted_at || row.created_at).toLocaleString(),
    },
    {
      key: "product_name",
      header: "Product",
      sortKey: "product__product_name",
      cell: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.product_name}</div>
          <div className="text-xs text-muted-foreground">{row.sku}</div>
        </div>
      ),
    },
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (row) => row.branch_code || row.branch_name,
    },
    {
      key: "current_quantity",
      header: "System Qty",
      sortKey: "current_quantity",
      sortType: "quantity",
      align: "right",
    },
    {
      key: "actual_quantity_counted",
      header: "Actual Qty",
      sortKey: "actual_quantity_counted",
      sortType: "quantity",
      align: "right",
    },
    {
      key: "signed_quantity",
      header: "Difference",
      sortKey: "quantity",
      sortType: "quantity",
      align: "right",
      cell: (row) => (
        <span
          className={
            row.signed_quantity >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          {row.signed_quantity > 0 ? "+" : ""}
          {row.signed_quantity}
        </span>
      ),
    },
    { key: "reason", header: "Reason", sortKey: "reason" },
    { key: "status", header: "Status", sortKey: "status", sortType: "status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock adjustments"
        subtitle="Enter the system quantity and the actual physical count"
      />
      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit(submit)}
          className="card-surface space-y-5 p-5"
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold">New physical count</h2>
          </div>
          <div>
            <Label>Branch *</Label>
            <Controller
              name="branch"
              control={control}
              rules={{ required: "Branch is required." }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.branch_code || item.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branch && (
              <p className="mt-1 text-sm text-red-500">
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.product_name} · {item.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {selectedProduct?.has_variants && (
            <div>
              <Label>Variant *</Label>
              <Controller
                name="variant"
                control={control}
                rules={{ required: "Variant is required." }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.display_name ||
                            Object.values(item.attributes || {}).join(" / ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Quantity</Label>
              <Input
                className="mt-2 bg-muted"
                value={currentQuantity}
                readOnly
              />
            </div>
            <div>
              <Label>Actual Quantity Counted *</Label>
              <Input
                className="mt-2"
                type="number"
                min="0"
                {...register("actual_quantity_counted", {
                  required: "Actual count is required.",
                  min: { value: 0, message: "Cannot be negative." },
                })}
              />
            </div>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <span className="text-sm text-muted-foreground">
              Calculated difference
            </span>
            <div
              className={`mt-1 text-2xl font-semibold ${difference > 0 ? "text-emerald-600" : difference < 0 ? "text-red-600" : "text-foreground"}`}
            >
              {difference === null
                ? "—"
                : `${difference > 0 ? "+" : ""}${difference}`}
            </div>
          </div>
          <div>
            <Label>Reason *</Label>
            <Input
              className="mt-2"
              {...register("reason", { required: "Reason is required." })}
              placeholder="Physical stock count"
            />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea className="mt-2" {...register("remarks")} />
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={mutation.isPending || difference === 0}
          >
            {mutation.isPending ? "Applying..." : "Submit adjustment"}
          </Button>
        </form>
        <DataTable
          columns={columns}
          data={normalizeList(adjustmentQuery.data)}
          isLoading={adjustmentQuery.isLoading}
          page={page}
          pageSize={12}
          total={adjustmentQuery.data?.count || 0}
          onPageChange={setPage}
          emptyTitle="No adjustments found"
        />
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm stock adjustment</DialogTitle>
            <DialogDescription>
              The stock will change from{" "}
              {pendingAdjustment?.current_quantity ?? 0} to{" "}
              {pendingAdjustment?.actual_quantity_counted ?? 0}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            Difference:{" "}
            <strong
              className={
                pendingAdjustment?.difference >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }
            >
              {pendingAdjustment?.difference > 0 ? "+" : ""}
              {pendingAdjustment?.difference}
            </strong>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                mutation.mutate(pendingAdjustment);
              }}
              disabled={mutation.isPending}
            >
              Confirm adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
