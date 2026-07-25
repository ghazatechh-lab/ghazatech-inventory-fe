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

export default function InvoiceListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-invoices",
    "/sales/invoices/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-invoices-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/invoices/summary/", {
          params: branchParams,
        }),
      ),
  });

  const summary = summaryResponse || {};
  const payload = query.data || {
    results: [],
    count: 0,
  };
  const rows = payload.results || [];

  const exportInvoices = async () => {
    const response = await api.get("/sales/invoices/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "sales-invoices.csv";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "invoice_number",
        header: "Invoice #",
        sortKey: "invoice_number",
        sortType: "text",
        cell: (row) => (
          <Link
            to={`/sales/invoices/${row.id}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.invoice_number}
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
        key: "invoice_date",
        header: "Issue Date",
        sortKey: "invoice_date",
        sortType: "date",
        cell: (row) =>
          row.invoice_date ? <DateText value={row.invoice_date} /> : "—",
      },
      {
        key: "due_date",
        header: "Due Date",
        sortKey: "due_date",
        sortType: "date",
        cell: (row) => (row.due_date ? <DateText value={row.due_date} /> : "—"),
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
        key: "payment_status",
        header: "Status",
        sortKey: "payment_status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.payment_status} />,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Invoices"
        subtitle="Issued invoices and their payment status"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportInvoices}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link to="/sales/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding"
          value={<CurrencyText value={summary.outstanding || 0} />}
          subtitle={`${summary.outstanding_count || 0} invoice(s)`}
        />

        <MetricCard
          label="Overdue"
          tone="danger"
          value={<CurrencyText value={summary.overdue || 0} />}
          subtitle={`${summary.overdue_count || 0} overdue invoice(s)`}
        />

        <MetricCard
          label="Paid (MTD)"
          tone="success"
          value={<CurrencyText value={summary.paid_this_month || 0} />}
          subtitle={
            summary.paid_change
              ? `+${summary.paid_change}%`
              : "Month-to-date collections"
          }
        />

        <MetricCard
          label="Avg. Days to Pay"
          value={`${summary.avg_days_to_pay || 0} days`}
          subtitle="Average invoice settlement time"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Invoices</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Issued invoices and their payment status
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search invoice, customer, order, or status"
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
          emptyTitle="No invoices"
          emptyDescription="Create an invoice from a Sales Order or raise a standalone invoice."
        />
      </section>
    </div>
  );
}
