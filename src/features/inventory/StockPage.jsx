import React from "react";

import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";

export default function StockPage() {
  const { query, page, setPage, q, setQ } = useListQuery(
    "stock-overview",
    "/inventory/stock/",
  );

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const branches = React.useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      (row.branch_stocks || []).forEach((branchStock) => {
        map.set(String(branchStock.branch_id), branchStock);
      });
    });

    return Array.from(map.values()).sort((first, second) =>
      String(first.branch_code || first.branch_name || "").localeCompare(
        String(second.branch_code || second.branch_name || ""),
      ),
    );
  }, [rows]);

  const columns = React.useMemo(
    () => [
      {
        key: "product_name",
        header: "Product",
        sortKey: "product_name",
        cell: (row) => (
          <div>
            <div className="font-medium text-white">{row.product_name}</div>

            <div className="text-xs text-slate-500">
              {row.sku}

              {row.variant_label !== "Base product"
                ? ` · ${row.variant_label}`
                : ""}
            </div>
          </div>
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
            <span className="font-mono">{stock?.available_stock ?? 0}</span>
          );
        },
      })),

      {
        key: "total_available",
        header: "Total",
        sortKey: "total_available",
        align: "right",
        cell: (row) => (
          <strong className="font-mono text-white">
            {row.total_available}
          </strong>
        ),
      },

      {
        key: "status",
        header: "Status",
        sortKey: "status",
        cell: (row) => (
          <span
            className={
              row.status === "ok"
                ? "text-emerald-400"
                : row.status === "low"
                  ? "text-amber-400"
                  : "text-red-400"
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
    [branches],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        subtitle="Current stock across all branches"
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search product, SKU or branch"
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No stock found"
        emptyDescription="No branch stock records available."
      />
    </div>
  );
}
