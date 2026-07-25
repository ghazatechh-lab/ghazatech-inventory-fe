import React from "react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getResults = (value) => {
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

export default function StockPage() {
  const { branchId, branchParams } = useActiveBranchFilter();

  const {
    query,
    page,
    setPage,
    q,
    setQ,
    ordering,
    setOrdering,
    setFilter,
    getFilter,
  } = useListQuery("stock-overview", "/inventory/stock/", branchParams);

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const category = getFilter("category");

  const minPrice = getFilter("min_price");

  const maxPrice = getFilter("max_price");

  const { data: categoryResponse } = useQuery({
    queryKey: ["categories", "stock-filter"],

    queryFn: async () =>
      unwrap(
        await api.get("/categories/", {
          params: {
            page_size: 500,
            is_active: true,
            ordering: "name",
          },
        }),
      ),
  });

  const categories = React.useMemo(
    () => getResults(categoryResponse),
    [categoryResponse],
  );

  const branches = React.useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      (row.branch_stocks || []).forEach((branchStock) => {
        if (branchId && String(branchStock.branch_id) !== String(branchId)) {
          return;
        }

        map.set(String(branchStock.branch_id), branchStock);
      });
    });

    return Array.from(map.values()).sort((first, second) =>
      String(first.branch_code || first.branch_name || "").localeCompare(
        String(second.branch_code || second.branch_name || ""),
      ),
    );
  }, [rows, branchId]);

  const getDisplayedTotal = React.useCallback(
    (row) => {
      if (!branchId) {
        return row.total_available ?? 0;
      }

      const selectedStock = (row.branch_stocks || []).find(
        (stock) => String(stock.branch_id) === String(branchId),
      );

      return selectedStock?.available_stock ?? 0;
    },
    [branchId],
  );

  const columns = React.useMemo(
    () => [
      {
        key: "product_name",
        header: "Product",
        sortKey: "product_name",
        sortType: "text",

        cell: (row) => (
          <div>
            <div className="font-medium text-foreground">
              {row.product_name}
            </div>

            <div className="text-xs text-muted-foreground">
              {row.sku}

              {row.variant_label !== "Base product"
                ? ` · ${row.variant_label}`
                : ""}
            </div>
          </div>
        ),
      },

      {
        key: "category_name",
        header: "Category",
        sortKey: "category_name",
        sortType: "text",

        cell: (row) => row.category_name || row.category?.name || "—",
      },

      {
        key: "retail_price",
        header: "Retail Price",
        sortKey: "retail_price",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <span className="font-numeric">
            AED {Number(row.retail_price || 0).toFixed(2)}
          </span>
        ),
      },

      ...branches.map((branch) => ({
        key: `branch_${branch.branch_id}`,

        header: branch.branch_code || branch.branch_name,

        sortable: false,
        align: "right",

        cell: (row) => {
          const stock = (row.branch_stocks || []).find(
            (item) => String(item.branch_id) === String(branch.branch_id),
          );

          return (
            <span className="font-numeric">{stock?.available_stock ?? 0}</span>
          );
        },
      })),

      {
        key: "total_available",

        header: branchId ? "Branch Total" : "Total",

        sortKey: "total_available",

        sortType: "quantity",
        align: "right",

        cell: (row) => (
          <strong className="font-numeric text-foreground">
            {getDisplayedTotal(row)}
          </strong>
        ),
      },

      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",

        statusOrder: ["out", "low", "ok"],

        cell: (row) => (
          <span
            className={
              row.status === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : row.status === "low"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
            }
          >
            {row.status === "ok"
              ? "In stock"
              : row.status === "low"
                ? "Low stock"
                : "Out of stock"}
          </span>
        ),
      },
    ],
    [branches, branchId, getDisplayedTotal],
  );

  const clearFilters = React.useCallback(() => {
    setQ("");
    setFilter("category", "");
    setFilter("min_price", "");
    setFilter("max_price", "");
    setOrdering("");
  }, [setQ, setFilter, setOrdering]);

  const hasFilters = Boolean(q || category || minPrice || maxPrice || ordering);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        subtitle={
          branchId
            ? "Current inventory summary for the selected branch"
            : "Current inventory summary across every branch"
        }
      />

      <div className="card-surface grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search product, SKU or branch"
          />
        </div>

        <Select
          value={category || "all"}
          onValueChange={(value) =>
            setFilter("category", value === "all" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>

            {categories.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min="0"
          step="0.01"
          value={minPrice}
          onChange={(event) => setFilter("min_price", event.target.value)}
          placeholder="Minimum price"
        />

        <Input
          type="number"
          min="0"
          step="0.01"
          value={maxPrice}
          onChange={(event) => setFilter("max_price", event.target.value)}
          placeholder="Maximum price"
        />

        <Select
          value={ordering || "default"}
          onValueChange={(value) =>
            setOrdering(value === "default" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort products" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="default">Product name</SelectItem>

            <SelectItem value="-total_available">Highest quantity</SelectItem>

            <SelectItem value="total_available">Lowest quantity</SelectItem>

            <SelectItem value="-retail_price">Highest price</SelectItem>

            <SelectItem value="retail_price">Lowest price</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No stock found"
        emptyDescription="No branch stock records match the selected filters."
      />
    </div>
  );
}
