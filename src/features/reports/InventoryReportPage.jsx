import React from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { CurrencyText } from "@/components/common/CurrencyText";
import { MetricCard } from "@/components/sales/MetricCard";
import { LoadingState } from "@/components/common/States";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const downloadCsv = (rows) => {
  const content = [
    [
      "Branch",
      "Product",
      "Variant",
      "SKU",
      "Current Stock",
      "Reserved",
      "Available",
      "Damaged",
      "Reorder Level",
      "Average Cost",
      "Stock Value",
      "Low Stock",
    ],
    ...rows.map((row) => [
      row.branch,
      row.product,
      row.variant,
      row.sku,
      row.current_stock,
      row.reserved_stock,
      row.available_stock,
      row.damaged_stock,
      row.reorder_level,
      row.average_unit_cost,
      row.value,
      row.low_stock ? "Yes" : "No",
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "inventory-report.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function InventoryReportPage() {
  const { branchParams } = useActiveBranchFilter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory-report", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/reports/inventory/", {
          params: branchParams,
        }),
      ),
  });

  if (isLoading) return <LoadingState />;

  const summary = data?.summary || {};
  const valuationByBranch = data?.valuation_by_branch || [];
  const rows = data?.rows || [];

  return (
    <div className="reports-module-page reports-workspace space-y-5">
      <PageHeader
        title="Inventory Reports"
        subtitle="Stock quantity, valuation, damaged stock, and reorder visibility"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadCsv(rows)}
            disabled={!rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Stock Lines" value={summary.stock_lines || 0} />
        <MetricCard label="Units in Stock" value={summary.total_units || 0} />
        <MetricCard
          label="Inventory Value"
          value={<CurrencyText value={summary.inventory_value || 0} />}
        />
        <MetricCard
          label="Low Stock Items"
          value={summary.low_stock_items || 0}
        />
      </div>

      {valuationByBranch.length > 0 && (
        <section className="card-surface p-5">
          <h2 className="font-semibold">Inventory Value by Branch</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valuationByBranch}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="branch" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(value) => [
                    `AED ${Number(value || 0).toFixed(2)}`,
                    "Inventory Value",
                  ]}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {isError ? (
        <section className="card-surface p-6">
          <p className="text-sm text-muted-foreground">
            Unable to load the inventory report.
          </p>
          <Button className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </section>
      ) : (
        <DataTable
          columns={[
            { key: "branch", header: "Branch" },
            {
              key: "product",
              header: "Product",
              cell: (row) => (
                <div>
                  <p className="font-medium">{row.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {[row.variant, row.sku].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "available_stock",
              header: "Available",
              align: "right",
            },
            {
              key: "reserved_stock",
              header: "Reserved",
              align: "right",
            },
            {
              key: "damaged_stock",
              header: "Damaged",
              align: "right",
            },
            {
              key: "average_unit_cost",
              header: "Avg Cost",
              align: "right",
              cell: (row) => <CurrencyText value={row.average_unit_cost} />,
            },
            {
              key: "value",
              header: "Value",
              align: "right",
              cell: (row) => <CurrencyText value={row.value} />,
            },
            {
              key: "low_stock",
              header: "Stock State",
              cell: (row) => (
                <span
                  className={
                    row.low_stock
                      ? "font-medium text-amber-600"
                      : "text-emerald-600"
                  }
                >
                  {row.low_stock ? "Low Stock" : "Healthy"}
                </span>
              ),
            },
          ]}
          data={rows}
          total={rows.length}
          page={1}
        />
      )}
    </div>
  );
}
