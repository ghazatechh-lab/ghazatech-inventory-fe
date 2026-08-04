import React from "react";
import { Download, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

export default function SalesOrderListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-orders",
    "/sales/orders/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-orders-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/orders/summary/", {
          params: branchParams,
        }),
      ),
  });

  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };
  const rows = payload.results || [];

  const exportOrders = async () => {
    const response = await api.get("/sales/orders/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sales-orders.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "order_number",
        header: "Order #",
        sortKey: "order_number",
        sortType: "text",
        cell: (row) => (
          <Link
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            to={`/sales/orders/${row.id}`}
          >
            {row.order_number}
          </Link>
        ),
      },
      {
        key: "customer_name",
        header: "Customer",
        sortKey: "customer__customer_name",
        sortType: "text",
      },
      {
        key: "order_date",
        header: "Order Date",
        sortKey: "order_date",
        sortType: "date",
        cell: (row) =>
          row.order_date ? <DateText value={row.order_date} /> : "—",
      },
      {
        key: "delivery_date",
        header: "Delivery Date",
        sortKey: "delivery_date",
        sortType: "date",
        cell: (row) =>
          row.delivery_date ? <DateText value={row.delivery_date} /> : "—",
      },
      {
        key: "total_amount",
        header: "Amount",
        sortKey: "total_amount",
        sortType: "currency",
        align: "right",
        cell: (row) => (
          <CurrencyText
            value={row.total_amount}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Sales Orders"
        subtitle="Confirmed orders moving toward fulfillment and invoicing"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportOrders}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link to="/sales/orders/new">
                <Plus className="mr-2 h-4 w-4" />
                New Sales Order
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open Orders"
          value={summary.open_orders || 0}
          subtitle={
            summary.open_today
              ? `+${summary.open_today} today`
              : "Current active orders"
          }
        />

        <MetricCard
          label="Awaiting Fulfillment"
          value={summary.awaiting_fulfillment || 0}
          subtitle="Confirmed but not fully delivered"
        />

        <MetricCard
          label="Order Value (MTD)"
          value={<CurrencyText value={summary.order_value_mtd || 0} />}
          subtitle={
            summary.order_value_change
              ? `${summary.order_value_change}%`
              : "Month-to-date order value"
          }
        />

        <MetricCard
          label="Fulfilled on Time"
          tone="success"
          value={`${summary.fulfilled_on_time || 0}%`}
          subtitle="Delivered by promised date"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Sales Orders</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed orders moving toward fulfillment and invoicing
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search order, customer, quotation, or status"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No sales orders"
          emptyDescription="Create a sales order or convert an accepted quotation."
        />
      </section>
    </div>
  );
}
