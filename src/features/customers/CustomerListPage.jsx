import React from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Pencil, Plus, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

export default function CustomerListPage() {
  const { branchId, branchParams } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "customers",
    "/customers/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["customers-summary", branchId],
    queryFn: async () =>
      unwrap(await api.get("/customers/summary/", { params: branchParams })),
    retry: false,
  });

  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };

  const exportRows = async () => {
    const response = await api.get("/customers/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "customers.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "customer_name",
        header: "Customer",
        cell: (row) => (
          <Link
            to={`/customers/${row.id}`}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.customer_name || `Customer ${row.id}`}
          </Link>
        ),
      },
      {
        key: "phone",
        header: "Contact",
        cell: (row) => (
          <div>
            <p>{row.phone || "—"}</p>
            {row.email ? (
              <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "order_count",
        header: "Orders",
        cell: (row) => row.order_count ?? 0,
      },
      {
        key: "balance_due",
        header: "Balance Due",
        align: "right",
        cell: (row) => (
          <CurrencyText
            value={row.balance_due || 0}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "last_order_date",
        header: "Last Order",
        cell: (row) =>
          row.last_order_date ? <DateText value={row.last_order_date} /> : "",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge
            status={row.status || (row.is_active ? "ACTIVE" : "INACTIVE")}
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        sortable: false,
        cell: (row) => (
          <div className="flex justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/customers/${row.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>

            <Button asChild size="sm" variant="outline">
              <Link to={`/customers/${row.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="customer-module-page customer-workspace w-full space-y-5 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] text-white shadow-sm dark:border-white/10">
        <div className="flex flex-col gap-6 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-300 shadow-inner backdrop-blur">
              <Users className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                Sales & Customer Management
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Customers
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                Manage customer records, balances, contact details, sales
                history, and account activity from one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={exportRows}
              className="border-amber-300 bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              asChild
              className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <Link to="/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                New Customer
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Customers"
          value={summary.total_customers || 0}
        />
        <MetricCard
          label="Active This Month"
          value={summary.active_this_month || 0}
        />
        <MetricCard
          label="Total Receivables"
          value={<CurrencyText value={summary.total_receivables || 0} />}
        />
        <MetricCard
          label="New Leads to Convert"
          value={summary.new_leads || 0}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Customers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer records, balances, and contact details
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search customer, phone, email"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No customers found"
          emptyDescription="Create a customer to start managing sales, balances, and account activity."
        />
      </section>
    </div>
  );
}
