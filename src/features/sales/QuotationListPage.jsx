import React from "react";
import { Link } from "react-router-dom";
import { Download, Plus } from "lucide-react";
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

export default function QuotationListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "quotations",
    "/sales/quotations/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["quotations-summary", branchParams],

    queryFn: async () =>
      unwrap(
        await api.get("/sales/quotations/summary/", {
          params: branchParams,
        }),
      ),
  });

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = payload.results || [];

  const summary = summaryResponse || {};

  const exportQuotations = async () => {
    const response = await api.get("/sales/quotations/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "quotations.csv";

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "quote_number",
        header: "Quote #",
        sortKey: "quote_number",
        sortType: "text",

        cell: (row) => (
          <Link
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            to={`/sales/quotations/${row.id}`}
          >
            {row.quote_number}
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
        key: "quote_date",
        header: "Date",
        sortKey: "quote_date",
        sortType: "date",

        cell: (row) =>
          row.quote_date ? <DateText value={row.quote_date} /> : "—",
      },
      {
        key: "valid_until",
        header: "Valid Until",
        sortKey: "valid_until",
        sortType: "date",

        cell: (row) =>
          row.valid_until ? <DateText value={row.valid_until} /> : "—",
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
        title="Quotations"
        subtitle="Create, send, and convert customer quotations"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportQuotations}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link to="/sales/quotations/new">
                <Plus className="mr-2 h-4 w-4" />
                New Quotation
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open Quotations"
          value={summary.open_quotations || 0}
          subtitle={
            summary.open_change
              ? `${summary.open_change} this week`
              : "Current open quotations"
          }
        />

        <MetricCard
          label="Value Pending"
          value={<CurrencyText value={summary.value_pending || 0} />}
          subtitle="Awaiting customer reply"
        />

        <MetricCard
          label="Accepted This Month"
          tone="success"
          value={summary.accepted_this_month || 0}
          subtitle={
            summary.acceptance_change
              ? `${summary.acceptance_change}%`
              : "Accepted quotations"
          }
        />

        <MetricCard
          label="Avg. Turnaround"
          value={`${summary.avg_turnaround_days || 0} days`}
          subtitle="Average response time"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Quotations</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              All quotations sent to customers, awaiting acceptance or
              conversion
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search quotation, customer, or status"
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
          emptyTitle="No quotations"
          emptyDescription="Create the first quotation for a customer."
        />
      </section>
    </div>
  );
}
