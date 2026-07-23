import React from "react";

import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";

const normalizePayload = (value) => {
  if (Array.isArray(value)) {
    return {
      results: value,
      count: value.length,
    };
  }

  if (Array.isArray(value?.results)) {
    return {
      results: value.results,
      count: value.count ?? value.results.length,
    };
  }

  if (Array.isArray(value?.data?.results)) {
    return {
      results: value.data.results,
      count: value.data.count ?? value.data.results.length,
    };
  }

  if (Array.isArray(value?.data)) {
    return {
      results: value.data,
      count: value.data.length,
    };
  }

  return {
    results: [],
    count: 0,
  };
};

export default function LowStockPage() {
  const { query, page, setPage, q, setQ } = useListQuery(
    "low-stock",
    "/inventory/low-stock/",
  );

  const payload = normalizePayload(query.data);

  const rows = payload.results.filter(
    (item) => Number(item.available_stock) < 10,
  );

  const columns = [
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
      key: "sku",
      header: "SKU",
      sortKey: "product__sku",
      sortType: "text",
    },
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (row) => row.branch_code || row.branch_name,
    },
    {
      key: "current_stock",
      header: "Current",
      sortKey: "current_stock",
      align: "right",
    },
    {
      key: "reserved_stock",
      header: "Reserved",
      sortKey: "reserved_stock",
      align: "right",
    },
    {
      key: "damaged_stock",
      header: "Damaged",
      sortKey: "damaged_stock",
      align: "right",
    },
    {
      key: "available_stock",
      header: "Available",
      sortKey: "available_stock",
      align: "right",
      cell: (row) => (
        <strong
          className={
            Number(row.available_stock) <= 0 ? "text-red-400" : "text-amber-400"
          }
        >
          {row.available_stock}
        </strong>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      cell: (row) => (
        <span
          className={
            Number(row.available_stock) <= 0 ? "text-red-400" : "text-amber-400"
          }
        >
          {Number(row.available_stock) <= 0 ? "Out of stock" : "Low stock"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low stock items"
        subtitle="Items with available quantity below 10"
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
        total={payload.count || rows.length}
        onPageChange={setPage}
        emptyTitle="No low stock items"
        emptyDescription="All items have at least 10 available."
      />
    </div>
  );
}
