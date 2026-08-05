import React from "react";
import { Link } from "react-router-dom";
import { Download, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

export default function QuotationListPage() {
  const queryClient = useQueryClient();
  const { branchParams } = useActiveBranchFilter();
  const [quotationToDelete, setQuotationToDelete] = React.useState(null);

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

  const deleteMutation = useMutation({
    mutationFn: async (quotation) =>
      api.delete(`/sales/quotations/${quotation.id}/`, {
        skipGlobalErrorToast: true,
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["quotations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["quotations-summary"],
        }),
      ]);

      toast.success("Quotation deleted successfully.");
      setQuotationToDelete(null);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to delete quotation", {
        description:
          details.summary ||
          details.message ||
          "The quotation may already be converted or protected by another record.",
      });
    },
  });

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
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (row) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setQuotationToDelete(row);
              }}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
              title="Delete quotation"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        ),
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

      {quotationToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background shadow-2xl">
            <div className="border-b px-6 py-5">
              <h2 className="text-lg font-semibold">Delete Quotation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm">
                Delete quotation{" "}
                <span className="font-semibold">
                  {quotationToDelete.quote_number}
                </span>
                {quotationToDelete.customer_name
                  ? ` for ${quotationToDelete.customer_name}`
                  : ""}
                ?
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => setQuotationToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(quotationToDelete)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Quotation"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
