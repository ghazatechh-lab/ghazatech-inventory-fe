import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FilterX, Search, Warehouse } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { canViewRestrictedStock } from "@/lib/taxAccess";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
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

const getBranchLabel = (stock) =>
  stock.branch_name || stock.branch_code || `Branch ${stock.branch_id}`;

const getAvailableStock = (stock) =>
  numberValue(stock.available_stock ?? stock.current_stock ?? stock.quantity);

export default function StockPage() {
  const { user } = useAuth();
  const showRestricted = canViewRestrictedStock(user);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [sortBy, setSortBy] = React.useState("name");

  const { data: categoryResponse } = useQuery({
    queryKey: ["categories", "stock-overview-filter"],
    queryFn: async () =>
      unwrap(
        await api.get("/categories/", {
          params: {
            page_size: 500,
            is_active: true,
          },
        }),
      ),
  });

  const categories = React.useMemo(
    () => normalizeList(categoryResponse),
    [categoryResponse],
  );

  const {
    data: stockResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-overview", "all-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: {
            page_size: 1000,
          },
        }),
      ),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const sourceRows = React.useMemo(
    () => normalizeList(stockResponse),
    [stockResponse],
  );

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minPrice === "" ? null : numberValue(minPrice);
    const maximum = maxPrice === "" ? null : numberValue(maxPrice);

    const rows = sourceRows.filter((row) => {
      const searchSource = [
        row.product_name,
        row.sku,
        row.product_sku,
        row.variant_label,
        row.category_name,
        ...(row.branch_stocks || []).flatMap((stock) => [
          stock.branch_name,
          stock.branch_code,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const rowCategory = String(row.category_id ?? row.category ?? "");

      const price = numberValue(
        row.retail_price ?? row.selling_price ?? row.price,
      );

      const matchesSearch = !query || searchSource.includes(query);

      const matchesCategory =
        category === ALL || rowCategory === String(category);

      const matchesMinimum = minimum === null || price >= minimum;

      const matchesMaximum = maximum === null || price <= maximum;

      return (
        matchesSearch && matchesCategory && matchesMinimum && matchesMaximum
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
  }, [sourceRows, search, category, minPrice, maxPrice, sortBy]);

  const summary = React.useMemo(() => {
    const productCount = filteredRows.length;

    const totalQuantity = filteredRows.reduce(
      (total, row) =>
        total + numberValue(row.total_available ?? row.total_available_qty),
      0,
    );

    const branchIds = new Set();

    filteredRows.forEach((row) => {
      (row.branch_stocks || []).forEach((stock) => {
        if (stock.branch_id !== undefined) {
          branchIds.add(String(stock.branch_id));
        }
      });
    });

    const lowStockCount = filteredRows.filter(
      (row) => row.status === "low",
    ).length;

    return {
      productCount,
      totalQuantity,
      branchCount: branchIds.size,
      lowStockCount,
    };
  }, [filteredRows]);

  const clearFilters = () => {
    setSearch("");
    setCategory(ALL);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
  };

  const hasFilters =
    search ||
    category !== ALL ||
    minPrice !== "" ||
    maxPrice !== "" ||
    sortBy !== "name";

  return (
    <div
      data-stock-module="stock-overview"
      className="stock-module-page space-y-6"
    >
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        {showRestricted
          ? "Full stock view: regular, restricted and total balances."
          : "Operational stock view: regular balances only."}
      </div>
      <PageHeader
        title="Stock Overview"
        subtitle="Current inventory summary across all branches"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Products
          </p>
          <p className="mt-2 text-2xl font-bold">{summary.productCount}</p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Available Quantity
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.totalQuantity}
          </p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Branches
          </p>
          <p className="mt-2 text-2xl font-bold">{summary.branchCount}</p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Low Stock Products
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.lowStockCount}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Inventory Carrying Value
          </p>
          <p className="mt-2 text-2xl font-bold">
            {currency(summary.inventoryValue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Excludes recoverable input VAT; includes capitalized non-recoverable
            VAT.
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Recoverable Input VAT
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currency(summary.recoverableVat)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracked separately from inventory value.
          </p>
        </div>
      </section>

      <section className="card-surface grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
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
              <SelectItem value="quantity_desc">Highest quantity</SelectItem>
              <SelectItem value="quantity_asc">Lowest quantity</SelectItem>
              <SelectItem value="price_desc">Highest price</SelectItem>
              <SelectItem value="price_asc">Lowest price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <div className="md:col-span-2 xl:col-span-6">
            <Button type="button" variant="outline" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
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
                      Change the selected filters or add stock records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const branches = [...(row.branch_stocks || [])].sort(
                    (first, second) =>
                      getBranchLabel(first).localeCompare(
                        getBranchLabel(second),
                      ),
                  );

                  const total = numberValue(
                    row.total_available ??
                      row.total_available_qty ??
                      branches.reduce(
                        (sum, item) => sum + getAvailableStock(item),
                        0,
                      ),
                  );

                  const price = numberValue(
                    row.retail_price ?? row.selling_price ?? row.price,
                  );

                  const status =
                    row.status ||
                    (total <= 0
                      ? "out"
                      : total <= numberValue(row.reorder_level)
                        ? "low"
                        : "ok");

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
                          {branches.length ? (
                            branches.map((stock) => (
                              <div
                                key={`${stock.branch_id}-${row.variant_id || "base"}`}
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
                            statusClass[status] || statusClass.out
                          }`}
                        >
                          {statusLabel[status] || "Out of stock"}
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
