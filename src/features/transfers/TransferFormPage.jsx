import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChevronDown,
  CalendarDays,
  FileText,
  Plus,
  Search,
  Trash2,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorMessage, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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

const createEmptyItem = () => ({
  stock_key: "",
  product: "",
  variant: null,
  requested_quantity: 1,
  remarks: "",
});

function SearchableProductSelect({
  value,
  products,
  disabled = false,
  placeholder = "Select product",
  searchPlaceholder = "Search product or SKU",
  getValue = (product) => String(product.id),
  getLabel = (product) => `${product.product_name} — ${product.sku}`,
  onChange,
}) {
  const wrapperRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedProduct = React.useMemo(
    () => products.find((product) => getValue(product) === String(value || "")),
    [products, value, getValue],
  );

  const filteredProducts = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [
        product.product_name,
        product.sku,
        product.barcode,
        product.category_name,
        product.brand_name,
        product.variant_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  React.useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
            setSearch("");
          }
        }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">
          {selectedProduct ? getLabel(selectedProduct) : placeholder}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open ? (
        <div className="relative z-20 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="border-b bg-popover p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredProducts.length ? (
              filteredProducts.map((product) => {
                const optionValue = getValue(product);

                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => {
                      onChange(optionValue);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    {getLabel(product)}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching products
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormSection({ title, description, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold">{title}</h2>

          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

export default function TransferFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { branchId: activeBranchId } = useActiveBranchFilter();

  const from = activeBranchId ? String(activeBranchId) : "";

  const [to, setTo] = React.useState("");
  const [items, setItems] = React.useState([createEmptyItem()]);
  const [transferDate, setTransferDate] = React.useState(today());
  const [notes, setNotes] = React.useState("");

  const { data: branchData } = useQuery({
    queryKey: ["branches-sel"],

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

  const branches = list(branchData);

  const sourceBranch = React.useMemo(
    () => branches.find((branch) => String(branch.id) === String(from)),
    [branches, from],
  );

  const { data: stockData, isFetching } = useQuery({
    queryKey: ["transfer-source-stock", from],

    enabled: Boolean(from),

    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: {
            branch: from,
            page_size: 500,
          },
        }),
      ),
  });

  const stockRows = list(stockData);

  const products = React.useMemo(
    () =>
      stockRows
        .map((row) => {
          const branchStock = Array.isArray(row.branch_stocks)
            ? row.branch_stocks.find(
                (stock) =>
                  String(
                    stock.branch_id || stock.branch?.id || stock.branch,
                  ) === String(from),
              ) || row.branch_stocks[0]
            : null;

          const productId = Number(row.product_id ?? row.product);

          const variantId = row.variant_id ?? row.variant ?? null;

          return {
            stock_key: `${productId}:${variantId || "base"}`,
            product: productId,
            variant: variantId ? Number(variantId) : null,
            sku: row.sku || row.product_sku || "",
            product_name: row.product_name || "Product",
            variant_label: row.variant_label || "Base stock",
            available_quantity: Number(
              branchStock?.available_stock ??
                branchStock?.total_available_quantity ??
                row.available_stock ??
                row.total_available ??
                row.total_available_qty ??
                0,
            ),
            average_unit_cost_excluding_vat: Number(
              branchStock?.average_unit_cost_excluding_vat ??
                row.average_unit_cost_excluding_vat ??
                0,
            ),
          };
        })
        .filter((product) => product.product && product.available_quantity > 0),
    [stockRows, from],
  );

  const mutation = useMutation({
    mutationFn: async (payload) =>
      unwrap(await api.post("/transfers/", payload)),

    onSuccess: async (createdTransfer) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["transfers"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["stock-overview"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["stock-movements"],
        }),
      ]);

      toast.success("Transfer request created.");

      navigate(
        createdTransfer?.id ? `/transfers/${createdTransfer.id}` : "/transfers",
      );
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to create the transfer."));
    },
  });

  const updateItem = (index, patch) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const removeItem = (index) => {
    setItems((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);

      return next.length ? next : [createEmptyItem()];
    });
  };

  const submit = (event) => {
    event.preventDefault();

    if (!from) {
      toast.error("Select an active branch from the global branch filter.");
      return;
    }

    if (!to) {
      toast.error("Select the destination branch.");
      return;
    }

    if (!transferDate) {
      toast.error("Select the transfer date.");
      return;
    }

    if (from === to) {
      toast.error("Source and destination must be different.");
      return;
    }

    const validItems = items.filter(
      (item) => item.product && Number(item.requested_quantity) > 0,
    );

    if (!validItems.length) {
      toast.error("Add at least one product.");
      return;
    }

    const duplicateKeys = validItems
      .map((item) => item.stock_key)
      .filter((key, index, array) => array.indexOf(key) !== index);

    if (duplicateKeys.length) {
      toast.error(
        "The same product and variant cannot be added more than once.",
      );
      return;
    }

    const invalidItem = validItems.find((item) => {
      const product = products.find((row) => row.stock_key === item.stock_key);

      const available = product?.available_quantity;

      return (
        !product || Number(item.requested_quantity) > Number(available || 0)
      );
    });

    if (invalidItem) {
      toast.error("Requested quantity exceeds available stock.");
      return;
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
        remarks: item.remarks?.trim() || "",
      })),
    });
  };

  return (
    <div
      data-stock-module="stock-transfer-form"
      className="stock-module-page stock-workspace mx-auto max-w-6xl space-y-5 pb-10"
    >
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{ color: "#bae6fd" }}
            >
              Inventory Logistics
            </p>

            <h1
              className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,.28)",
              }}
            >
              New Branch Transfer
            </h1>

            <p
              className="mt-2 max-w-2xl text-sm leading-6"
              style={{ color: "#f1f5f9" }}
            >
              Move available inventory from the globally selected source branch
              to another branch.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/transfers")}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transfers
          </Button>
        </div>
      </section>

      {!from ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          Select a branch from the global branch filter before creating a
          transfer.
        </section>
      ) : null}

      <form onSubmit={submit} className="space-y-5">
        <FormSection
          title="Transfer route"
          description="The source branch comes from the global branch filter."
          icon={Warehouse}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Source Branch</Label>

              <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
                {sourceBranch
                  ? `${sourceBranch.branch_code || ""}${
                      sourceBranch.branch_code ? " · " : ""
                    }${sourceBranch.branch_name || sourceBranch.name || ""}`
                  : from
                    ? `Branch ${from}`
                    : "No global branch selected"}
              </div>
            </div>

            <div>
              <Label>Destination Branch *</Label>

              <Select value={to} onValueChange={setTo} disabled={!from}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select destination branch" />
                </SelectTrigger>

                <SelectContent>
                  {branches
                    .filter((branch) => String(branch.id) !== String(from))
                    .map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.branch_code} ·{" "}
                        {branch.branch_name || branch.name}
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

          {from && to ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
              <Warehouse className="h-4 w-4" />
              {sourceBranch?.branch_name || `Branch ${from}`}
              <ArrowRight className="h-4 w-4" />
              {branches.find((branch) => String(branch.id) === String(to))
                ?.branch_name || `Branch ${to}`}
            </div>
          ) : null}
        </FormSection>

        <FormSection
          title="Transfer items"
          description="Only products with available stock in the source branch are shown."
          icon={Boxes}
        >
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!from}
              onClick={() =>
                setItems((current) => [...current, createEmptyItem()])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const selectedProduct = products.find(
                (product) => product.stock_key === item.stock_key,
              );

              const available = selectedProduct?.available_quantity || 0;

              return (
                <div
                  key={index}
                  className="relative rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px_44px]">
                    <div>
                      <Label>Product *</Label>

                      <SearchableProductSelect
                        value={item.stock_key}
                        products={products}
                        disabled={!from || isFetching}
                        placeholder={
                          isFetching
                            ? "Loading available products..."
                            : "Select product"
                        }
                        searchPlaceholder="Search product, SKU or variant"
                        getValue={(product) => product.stock_key}
                        getLabel={(product) =>
                          `${product.sku || "No SKU"} · ${product.product_name} · ${product.variant_label}`
                        }
                        onChange={(value) => {
                          const selected = products.find(
                            (product) => product.stock_key === value,
                          );

                          updateItem(index, {
                            stock_key: value,
                            product: selected ? String(selected.product) : "",
                            variant: selected?.variant || null,
                            requested_quantity: 1,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <Label>Quantity *</Label>

                      <Input
                        type="number"
                        min="1"
                        max={available || undefined}
                        className="mt-2"
                        value={item.requested_quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            requested_quantity: event.target.value,
                          })
                        }
                      />

                      <p className="mt-1 text-xs text-muted-foreground">
                        Available: {available}
                      </p>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => removeItem(index)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Item Remarks</Label>

                      <Input
                        className="mt-2"
                        value={item.remarks || ""}
                        onChange={(event) =>
                          updateItem(index, {
                            remarks: event.target.value,
                          })
                        }
                        placeholder="Optional item remarks"
                      />
                    </div>

                    <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        Unit cost excluding VAT
                      </p>

                      <p className="mt-1 font-semibold">
                        AED{" "}
                        {Number(
                          selectedProduct?.average_unit_cost_excluding_vat || 0,
                        ).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </FormSection>

        <FormSection
          title="Transfer notes"
          description="Optional internal remarks for this transfer."
          icon={FileText}
        >
          <Textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Transfer instructions or notes"
          />
        </FormSection>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => navigate("/transfers")}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={mutation.isPending || !from}
            className="min-w-40 bg-blue-600 text-white hover:bg-blue-700"
          >
            {mutation.isPending ? "Submitting..." : "Create Transfer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
