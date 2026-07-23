import React from "react";

import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";

export default function StockMovementsPage() {
  const { query, page, setPage, q, setQ } = useListQuery(
    "stock-movements",
    "/inventory/movements/",
  );

  const data = query.data || {
    results: [],
    count: 0,
  };

  const columns = [
    {
      key: "created_at",
      header: "Date & time",
      sortKey: "created_at",
      sortType: "datetime",
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString() : "—",
    },
    {
      key: "movement_number",
      header: "Movement #",
      sortKey: "movement_number",
    },
    {
      key: "product_name",
      header: "Product",
      sortKey: "product__product_name",
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
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (row) => row.branch_code || row.branch_name,
    },
    {
      key: "movement_type_display",
      header: "Type",
      sortKey: "movement_type",
      sortType: "status",
    },
    {
      key: "quantity",
      header: "Change",
      sortKey: "quantity",
      sortType: "quantity",
      align: "right",
      cell: (row) => (
        <span
          className={
            row.quantity >= 0
              ? "font-mono text-emerald-400"
              : "font-mono text-red-400"
          }
        >
          {row.quantity > 0 ? "+" : ""}
          {row.quantity}
        </span>
      ),
    },
    {
      key: "previous_stock",
      header: "Previous",
      sortKey: "previous_stock",
      align: "right",
    },
    {
      key: "new_stock",
      header: "New stock",
      sortKey: "new_stock",
      sortType: "quantity",
      align: "right",
    },
    {
      key: "performed_by_name",
      header: "Updated by",
      sortKey: "performed_by__username",
      cell: (row) => row.performed_by_name || "System",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock movements"
        subtitle="History of every transaction that changed stock"
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search movement, product, SKU or branch"
      />

      <DataTable
        columns={columns}
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={data.count || 0}
        onPageChange={setPage}
        emptyTitle="No movements found"
        emptyDescription="Stock movements will appear here."
      />
    </div>
  );
}
