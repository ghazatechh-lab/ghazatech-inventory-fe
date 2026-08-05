import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  FilterX,
  PackageCheck,
  RefreshCcw,
  Search,
  TriangleAlert,
  Warehouse,
} from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const statusLabel = {
  ok: "In stock",
  low: "Low stock",
  out: "Out of stock",
};

const statusClass = {
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  low: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  out: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const getBranchId = (stock) =>
  String(stock.branch_id ?? stock.branch?.id ?? stock.branch ?? "");

const getBranchLabel = (stock) =>
  stock.branch_name ||
  stock.branch?.branch_name ||
  stock.branch_code ||
  stock.branch?.branch_code ||
  `Branch ${getBranchId(stock)}`;

const getAvailableStock = (stock) =>
  numberValue(stock.available_stock ?? stock.current_stock ?? stock.quantity);

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}) {
  const toneMap = {
    default: {
      value: "text-slate-950 dark:text-white",
      icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
      glow: "from-blue-500/10",
    },
    success: {
      value: "text-emerald-600 dark:text-emerald-400",
      icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      glow: "from-emerald-500/10",
    },
    warning: {
      value: "text-amber-600 dark:text-amber-400",
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
      glow: "from-amber-500/10",
    },
    danger: {
      value: "text-red-600 dark:text-red-400",
      icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
      glow: "from-red-500/10",
    },
  };

  const style = toneMap[tone] || toneMap.default;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/70">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.glow} to-transparent opacity-70`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <div
            className={`mt-3 text-3xl font-extrabold tracking-tight ${style.value}`}
          >
            {value}
          </div>

          {description ? (
            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function StockPage() {
  const { branchId: activeBranchId, branchParams } = useActiveBranchFilter();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [sortBy, setSortBy] = React.useState("name");

  const { data: branchResponse } = useQuery({
    queryKey: ["branches", "stock-overview-filter"],

    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 500,
            ordering: "branch_code",
            is_active: true,
          },
          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 30_000,
    retry: false,
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const { data: categoryResponse } = useQuery({
    queryKey: ["categories", "stock-overview-filter"],

    queryFn: async () =>
      unwrap(
        await api.get("/categories/", {
          params: {
            page_size: 500,
            is_active: true,
          },
          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 30_000,
    retry: false,
  });

  const categories = React.useMemo(
    () => normalizeList(categoryResponse),
    [categoryResponse],
  );

  const stockParams = React.useMemo(
    () => ({
      ...branchParams,
      page_size: 1000,
    }),
    [branchParams],
  );

  const {
    data: stockResponse,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["stock-overview", stockParams],

    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: stockParams,
          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const sourceRows = React.useMemo(
    () => normalizeList(stockResponse),
    [stockResponse],
  );

  const branchScopedRows = React.useMemo(() => {
    if (!activeBranchId) {
      return sourceRows;
    }

    return sourceRows
      .map((row) => {
        const branchStocks = (row.branch_stocks || []).filter(
          (stock) => getBranchId(stock) === String(activeBranchId),
        );

        const branchTotal = branchStocks.reduce(
          (sum, stock) => sum + getAvailableStock(stock),
          0,
        );

        const averageCost = numberValue(
          row.average_unit_cost ?? row.avg_cost ?? row.purchase_price,
        );

        const recoverableVat = branchStocks.reduce(
          (sum, stock) =>
            sum +
            numberValue(stock.recoverable_input_vat ?? stock.recoverable_vat),
          0,
        );

        const inventoryValue = branchStocks.reduce(
          (sum, stock) =>
            sum +
            numberValue(
              stock.inventory_value ??
                stock.stock_value ??
                getAvailableStock(stock) * averageCost,
            ),
          0,
        );

        return {
          ...row,
          branch_stocks: branchStocks,
          total_available: branchTotal,
          total_available_qty: branchTotal,
          total_inventory_value: inventoryValue || branchTotal * averageCost,
          inventory_value_excluding_vat:
            numberValue(row.inventory_value_excluding_vat) || inventoryValue,
          recoverable_input_vat: recoverableVat,
        };
      })
      .filter((row) => (row.branch_stocks || []).length > 0);
  }, [sourceRows, activeBranchId]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minPrice === "" ? null : numberValue(minPrice);
    const maximum = maxPrice === "" ? null : numberValue(maxPrice);

    const rows = branchScopedRows.filter((row) => {
      const searchSource = [
        row.product_name,
        row.sku,
        row.product_sku,
        row.variant_label,
        row.category_name,
        ...(row.branch_stocks || []).flatMap((stock) => [
          getBranchLabel(stock),
          stock.branch_code,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const rowCategory = String(
        row.category_id ?? row.category?.id ?? row.category ?? "",
      );

      const price = numberValue(
        row.retail_price ?? row.selling_price ?? row.price,
      );

      return (
        (!query || searchSource.includes(query)) &&
        (category === ALL || rowCategory === String(category)) &&
        (minimum === null || price >= minimum) &&
        (maximum === null || price <= maximum)
      );
    });

    return [...rows].sort((first, second) => {
      const firstTotal = numberValue(
        first.total_available ?? first.total_available_qty,
      );

      const secondTotal = numberValue(
        second.total_available ?? second.total_available_qty,
      );

      const firstPrice = numberValue(
        first.retail_price ?? first.selling_price ?? first.price,
      );

      const secondPrice = numberValue(
        second.retail_price ?? second.selling_price ?? second.price,
      );

      if (sortBy === "quantity_desc") {
        return secondTotal - firstTotal;
      }

      if (sortBy === "quantity_asc") {
        return firstTotal - secondTotal;
      }

      if (sortBy === "price_desc") {
        return secondPrice - firstPrice;
      }

      if (sortBy === "price_asc") {
        return firstPrice - secondPrice;
      }

      if (sortBy === "category") {
        return String(first.category_name || "").localeCompare(
          String(second.category_name || ""),
        );
      }

      return String(first.product_name || "").localeCompare(
        String(second.product_name || ""),
      );
    });
  }, [branchScopedRows, search, category, minPrice, maxPrice, sortBy]);

  const summary = React.useMemo(() => {
    const branchIds = new Set();

    let totalQuantity = 0;
    let lowStockCount = 0;
    let inventoryValue = 0;
    let recoverableVat = 0;

    filteredRows.forEach((row) => {
      const rowTotal = numberValue(
        row.total_available ??
          row.total_available_qty ??
          (row.branch_stocks || []).reduce(
            (sum, stock) => sum + getAvailableStock(stock),
            0,
          ),
      );

      totalQuantity += rowTotal;

      const reorderLevel = numberValue(row.reorder_level);

      if (rowTotal > 0 && rowTotal <= reorderLevel) {
        lowStockCount += 1;
      }

      inventoryValue += numberValue(
        row.total_inventory_value ?? row.inventory_value ?? row.stock_value,
      );

      recoverableVat += numberValue(
        row.recoverable_input_vat ?? row.recoverable_vat,
      );

      (row.branch_stocks || []).forEach((stock) => {
        const id = getBranchId(stock);

        if (id) {
          branchIds.add(id);
        }
      });
    });

    return {
      productCount: filteredRows.length,
      totalQuantity,
      branchCount: branchIds.size,
      lowStockCount,
      inventoryValue,
      recoverableVat,
    };
  }, [filteredRows]);

  const selectedBranchLabel = activeBranchId
    ? branches.find((branch) => String(branch.id) === String(activeBranchId))
        ?.branch_name ||
      branches.find((branch) => String(branch.id) === String(activeBranchId))
        ?.branch_code ||
      `Branch ${activeBranchId}`
    : "All branches";

  const clearFilters = () => {
    setSearch("");
    setCategory(ALL);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
  };

  const hasFilters =
    Boolean(search) ||
    category !== ALL ||
    minPrice !== "" ||
    maxPrice !== "" ||
    sortBy !== "name";

  return (
    <div
      data-stock-module="stock-overview"
      className="stock-module-page stock-workspace mx-auto max-w-7xl space-y-5 pb-10"
    >
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-56 rounded-full bg-amber-300/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.22em] !text-sky-200"
              style={{ color: "#bae6fd" }}
            >
              Inventory Management
            </p>

            <h1
              className="mt-2 text-3xl font-extrabold tracking-tight !text-white sm:text-4xl"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                opacity: 1,
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.28)",
              }}
            >
              Stock Overview
            </h1>

            <p
              className="mt-2 max-w-2xl text-sm leading-6 !text-slate-100"
              style={{ color: "#f1f5f9" }}
            >
              Live inventory availability, valuation and product distribution
              for{" "}
              <strong
                className="font-semibold !text-white"
                style={{
                  color: "#ffffff",
                  WebkitTextFillColor: "#ffffff",
                }}
              >
                {selectedBranchLabel}
              </strong>
              .
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100 backdrop-blur">
              <PackageCheck className="h-4 w-4 text-emerald-300" />
              Unified available-stock visibility
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={() => refetch()}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />

            {isFetching ? "Refreshing..." : "Refresh Stock"}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Products"
          value={summary.productCount}
          description="Products matching the active filters"
          icon={Boxes}
        />

        <SummaryCard
          label="Available Quantity"
          value={summary.totalQuantity}
          description="Available stock after reservations and damages"
          icon={PackageCheck}
          tone="success"
        />

        <SummaryCard
          label={activeBranchId ? "Selected Branch" : "Branches"}
          value={activeBranchId ? 1 : summary.branchCount}
          description={
            activeBranchId
              ? selectedBranchLabel
              : "Branches represented in this result"
          }
          icon={Warehouse}
        />

        <SummaryCard
          label="Low Stock Products"
          value={summary.lowStockCount}
          description="Products at or below reorder level"
          icon={TriangleAlert}
          tone="warning"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Inventory Carrying Value"
          value={currency(summary.inventoryValue)}
          description="Excludes recoverable input VAT and includes capitalized non-recoverable VAT."
          icon={Warehouse}
        />

        <SummaryCard
          label="Recoverable Input VAT"
          value={currency(summary.recoverableVat)}
          description="Tracked separately from the inventory carrying value."
          icon={PackageCheck}
          tone="success"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025]">
          <h2 className="font-semibold text-slate-950 dark:text-white">
            Stock Filters
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Filter inventory by product, category, price and stock priority.
            Branch scope is controlled from the global branch selector.
          </p>
        </div>

        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <Label>Search</Label>

              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, variant or branch"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>

                  {categories.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name || item.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Minimum Price</Label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="AED 0"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Maximum Price</Label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Any price"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Sort By</Label>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="name">Product name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="quantity_desc">
                    Highest quantity
                  </SelectItem>
                  <SelectItem value="quantity_asc">Lowest quantity</SelectItem>
                  <SelectItem value="price_desc">Highest price</SelectItem>
                  <SelectItem value="price_asc">Lowest price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasFilters ? (
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={clearFilters}>
                <FilterX className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025]">
          <div>
            <h2 className="font-semibold">Branch inventory</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {selectedBranchLabel} · {filteredRows.length} product records
            </p>
          </div>

          <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium">
            Available quantity: {summary.totalQuantity}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Product
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Retail Price
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Avg Cost
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stock Value
                </th>
                <th className="min-w-[420px] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Branch Inventory
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-muted-foreground"
                  >
                    Loading stock overview...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-red-500"
                  >
                    Unable to load stock overview.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <Boxes className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 font-medium">No stock records found</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Change the selected branch or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const branchStocks = [...(row.branch_stocks || [])].sort(
                    (first, second) =>
                      getBranchLabel(first).localeCompare(
                        getBranchLabel(second),
                      ),
                  );

                  const total = numberValue(
                    row.total_available ??
                      row.total_available_qty ??
                      branchStocks.reduce(
                        (sum, stock) => sum + getAvailableStock(stock),
                        0,
                      ),
                  );

                  const price = numberValue(
                    row.retail_price ?? row.selling_price ?? row.price,
                  );

                  const reorderLevel = numberValue(row.reorder_level);

                  const status =
                    total <= 0 ? "out" : total <= reorderLevel ? "low" : "ok";

                  return (
                    <tr
                      key={`${row.product_id || row.id}-${row.variant_id || "base"}`}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">{row.product_name}</p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.sku || row.product_sku || "—"}

                          {row.variant_label &&
                          row.variant_label !== "Base product"
                            ? ` · ${row.variant_label}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {row.category_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        {currency(price)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="font-medium">
                          {currency(row.average_unit_cost)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {row.vat_treatment || "OUT_OF_SCOPE"} ·{" "}
                          {numberValue(row.vat_percentage)}%
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="font-semibold">
                          {currency(row.total_inventory_value)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          VAT excl.{" "}
                          {currency(row.inventory_value_excluding_vat)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {branchStocks.length ? (
                            branchStocks.map((stock) => (
                              <div
                                key={`${getBranchId(stock)}-${row.variant_id || "base"}`}
                                className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
                              >
                                <Warehouse className="h-4 w-4 text-blue-600 dark:text-blue-400" />

                                <span className="text-sm font-medium">
                                  {getBranchLabel(stock)}
                                </span>

                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                  {getAvailableStock(stock)} Qty
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No branch stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-lg font-bold">{total}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusClass[status]
                          }`}
                        >
                          {statusLabel[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        <Warehouse className="mr-2 inline h-4 w-4" />
        Available stock equals current stock minus reserved and damaged
        quantities.
      </section>
    </div>
  );
}
