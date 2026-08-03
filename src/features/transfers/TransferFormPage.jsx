import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorMessage, unwrap } from "@/lib/api";
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
const list = (value) => (Array.isArray(value) ? value : value?.results || []);
const today = () => new Date().toISOString().slice(0, 10);
export default function TransferFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [items, setItems] = React.useState([
    {
      stock_key: "",
      product: "",
      variant: null,
      requested_quantity: 1,
      stock_classification: "REGULAR",
    },
  ]);
  const [transferDate, setTransferDate] = React.useState(today());
  const [notes, setNotes] = React.useState("");
  const { data: branchData } = useQuery({
    queryKey: ["branches-sel"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const { data: stockData, isFetching: isLoadingProducts } = useQuery({
    queryKey: ["transfer-source-stock", from],
    enabled: Boolean(from),
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: { branch: from, page_size: 500 },
        }),
      ),
  });
  const branches = list(branchData);
  const stockRows = list(stockData);
  const products = React.useMemo(
    () =>
      stockRows
        .map((row) => {
          // The stock overview endpoint returns grouped product/variant rows.
          // When a branch filter is supplied, branch_stocks contains only that
          // branch's stock record. Keep a fallback for older flat API responses.
          const branchStock = Array.isArray(row.branch_stocks)
            ? row.branch_stocks.find(
                (stock) => String(stock.branch_id) === String(from),
              ) || row.branch_stocks[0]
            : null;

          const productId = Number(row.product_id ?? row.product);
          const variantId = row.variant_id ?? row.variant ?? null;
          const availableRegular = Number(
            branchStock?.available_regular_quantity ??
              row.available_regular_quantity ??
              row.regular_quantity ??
              0,
          );

          const availableRestricted = Number(
            branchStock?.available_restricted_quantity ??
              row.available_restricted_quantity ??
              row.restricted_quantity ??
              0,
          );

          return {
            stock_key: `${productId}:${variantId || "base"}`,
            product: productId,
            variant: variantId ? Number(variantId) : null,
            sku: row.sku,
            product_name: row.product_name,
            variant_label: row.variant_label || "Base stock",
            available_regular_quantity: availableRegular,
            available_restricted_quantity: availableRestricted,
            average_unit_cost_excluding_vat: Number(
              branchStock?.average_unit_cost_excluding_vat ??
                row.average_unit_cost_excluding_vat ??
                0,
            ),
          };
        })
        .filter(
          (product) =>
            product.product &&
            (product.available_regular_quantity > 0 ||
              product.available_restricted_quantity > 0),
        ),
    [stockRows, from],
  );
  const mutation = useMutation({
    mutationFn: async (payload) =>
      unwrap(await api.post("/transfers/", payload)),

    onSuccess: async (createdTransfer) => {
      await queryClient.invalidateQueries({ queryKey: ["transfers"] });
      await queryClient.refetchQueries({
        queryKey: ["transfers"],
        type: "active",
      });
      toast.success("Transfer request created.");

      if (createdTransfer?.id) {
        navigate(`/transfers/${createdTransfer.id}`);
        return;
      }

      navigate("/transfers");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to create the transfer."));
    },
  });
  const updateItem = (index, patch) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const submit = (event) => {
    event.preventDefault();
    const validItems = items.filter(
      (item) => item.product && Number(item.requested_quantity) > 0,
    );
    if (!from || !to)
      return toast.error("Select source and destination branches.");
    if (!transferDate) return toast.error("Select the transfer date.");
    if (from === to)
      return toast.error("Source and destination must be different.");
    if (!validItems.length) {
      return toast.error("Add at least one product.");
    }

    const invalidItem = validItems.find((item) => {
      const product = products.find((row) => row.stock_key === item.stock_key);

      const available =
        item.stock_classification === "RESTRICTED"
          ? product?.available_restricted_quantity
          : product?.available_regular_quantity;

      return Number(item.requested_quantity) > Number(available || 0);
    });

    if (invalidItem) {
      return toast.error(
        "Requested quantity exceeds the selected regular or restricted stock.",
      );
    }

    mutation.mutate({
      from_branch: Number(from),
      to_branch: Number(to),
      transfer_date: transferDate,
      notes: notes.trim(),
      items: validItems.map((item) => ({
        product: Number(item.product),
        variant: item.variant ? Number(item.variant) : null,
        requested_quantity: Number(item.requested_quantity),
        stock_classification: item.stock_classification || "REGULAR",
        remarks: item.remarks || "",
      })),
    });
  };
  return (
    <div
      data-stock-module="stock-transfer-form"
      className="stock-module-page space-y-6"
    >
      <PageHeader
        title="Branch transfer"
        subtitle="Transfer stock between branches"
      />
      <form onSubmit={submit} className="space-y-6">
        <section className="card-surface p-5">
          <h2 className="font-semibold">Transfer from/to branches</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>From Branch *</Label>
              <Select
                value={from}
                onValueChange={(value) => {
                  setFrom(value);
                  setItems([
                    {
                      stock_key: "",
                      product: "",
                      variant: null,
                      requested_quantity: 1,
                      stock_classification: "REGULAR",
                    },
                  ]);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select source branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.branch_code} · {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Branch *</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select destination branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => String(b.id) !== String(from))
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.branch_code} · {b.branch_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transfer Date *</Label>
              <Input
                type="date"
                className="mt-2"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                required
              />
            </div>
          </div>
        </section>
        <section className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Transfer items</h2>
              <p className="text-sm text-muted-foreground">
                Select the product, then choose whether the quantity is regular
                or restricted. Internal transfers are VAT out of scope.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems((v) => [
                  ...v,
                  {
                    stock_key: "",
                    product: "",
                    variant: null,
                    requested_quantity: 1,
                    stock_classification: "REGULAR",
                  },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>
          <div className="divide-y">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 p-4 md:grid-cols-[1fr_190px_170px_44px]"
              >
                <Select
                  value={item.stock_key}
                  onValueChange={(value) => {
                    const selected = products.find(
                      (product) => product.stock_key === value,
                    );
                    updateItem(index, {
                      stock_key: value,
                      product: selected ? String(selected.product) : "",
                      variant: selected?.variant || null,
                      requested_quantity: 1,
                      stock_classification:
                        selected?.available_regular_quantity > 0
                          ? "REGULAR"
                          : "RESTRICTED",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {!from ? (
                      <SelectItem value="select-branch-first" disabled>
                        Select a source branch first
                      </SelectItem>
                    ) : isLoadingProducts ? (
                      <SelectItem value="loading-products" disabled>
                        Loading available products...
                      </SelectItem>
                    ) : products.length ? (
                      products.map((p) => (
                        <SelectItem key={p.stock_key} value={p.stock_key}>
                          {p.sku} · {p.product_name} · {p.variant_label} ·{" "}
                          Regular {p.available_regular_quantity} · Restricted{" "}
                          {p.available_restricted_quantity}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-products" disabled>
                        No products available in this branch
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={item.stock_classification || "REGULAR"}
                  onValueChange={(value) =>
                    updateItem(index, {
                      stock_classification: value,
                      requested_quantity: 1,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">
                      Regular (
                      {products.find(
                        (product) => product.stock_key === item.stock_key,
                      )?.available_regular_quantity || 0}
                      )
                    </SelectItem>
                    <SelectItem value="RESTRICTED">
                      Restricted (
                      {products.find(
                        (product) => product.stock_key === item.stock_key,
                      )?.available_restricted_quantity || 0}
                      )
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  max={
                    item.stock_classification === "RESTRICTED"
                      ? products.find(
                          (product) => product.stock_key === item.stock_key,
                        )?.available_restricted_quantity || undefined
                      : products.find(
                          (product) => product.stock_key === item.stock_key,
                        )?.available_regular_quantity || undefined
                  }
                  value={item.requested_quantity}
                  onChange={(e) =>
                    updateItem(index, { requested_quantity: e.target.value })
                  }
                />
                <div className="text-xs text-muted-foreground md:col-span-3">
                  Unit cost excluding VAT is fetched automatically:
                  <span className="ml-1 font-medium text-foreground">
                    AED{" "}
                    {Number(
                      products.find(
                        (product) => product.stock_key === item.stock_key,
                      )?.average_unit_cost_excluding_vat || 0,
                    ).toFixed(4)}
                  </span>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() =>
                    setItems((v) => v.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <Label>Notes</Label>
          <Textarea
            className="mt-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-5 flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Submitting..." : "Make transfer"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/transfers")}
            >
              Cancel
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
