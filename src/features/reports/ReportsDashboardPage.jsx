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
import { LoadingState } from "@/components/common/States";
import { CurrencyText } from "@/components/common/CurrencyText";
import { MetricCard } from "@/components/sales/MetricCard";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const downloadCsv = (filename, rows) => {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ReportsDashboardPage() {
  const { branchParams } = useActiveBranchFilter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-dashboard", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/reports/dashboard/", {
          params: branchParams,
        }),
      ),
  });

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <div className="reports-module-page reports-workspace">
        <div className="card-surface p-6">
          <h2 className="font-semibold">Unable to load reports</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The reports API could not be loaded.
          </p>
          <Button className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const trend = data?.trend || [];

  const exportOverview = () => {
    downloadCsv("reports-overview.csv", [
      ["Metric", "Amount"],
      ["Sales this month", kpi.sales_month || 0],
      ["Purchases this month", kpi.purchases_month || 0],
      ["Accounts receivable", kpi.receivables || 0],
      ["Accounts payable", kpi.payables || 0],
      ["Inventory value", kpi.inventory_value || 0],
      [],
      ["Month", "Sales", "Purchases"],
      ...trend.map((row) => [row.month, row.sales, row.purchases]),
    ]);
  };

  return (
    <div className="reports-module-page reports-workspace space-y-5">
      <PageHeader
        title="Reports Overview"
        subtitle="Current business performance for the active branch filter"
        actions={
          <Button type="button" variant="outline" onClick={exportOverview}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Sales This Month"
          value={<CurrencyText value={kpi.sales_month || 0} />}
        />
        <MetricCard
          label="Purchases This Month"
          value={<CurrencyText value={kpi.purchases_month || 0} />}
        />
        <MetricCard
          label="Receivables"
          value={<CurrencyText value={kpi.receivables || 0} />}
        />
        <MetricCard
          label="Payables"
          value={<CurrencyText value={kpi.payables || 0} />}
        />
        <MetricCard
          label="Inventory Value"
          value={<CurrencyText value={kpi.inventory_value || 0} />}
        />
      </div>

      <section className="card-surface p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Sales vs Purchases</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Actual totals for the latest six months.
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip
                formatter={(value) => [`AED ${Number(value || 0).toFixed(2)}`]}
              />
              <Bar dataKey="sales" name="Sales" radius={[5, 5, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
