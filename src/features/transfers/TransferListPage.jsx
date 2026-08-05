import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCcw,
  Search,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}) {
  const toneMap = {
    default: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            toneMap[tone] || toneMap.default
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export default function TransferListPage() {
  const { branchId, branchParams } = useActiveBranchFilter();

  const { query, page, setPage, q, setQ } = useListQuery(
    "transfers",
    "/transfers/",
    branchParams,
  );

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(
    () => (Array.isArray(payload.results) ? payload.results : []),
    [payload.results],
  );

  const summary = React.useMemo(
    () => ({
      total: Number(payload.count || 0),
      pending: rows.filter((row) =>
        ["DRAFT", "REQUESTED", "APPROVED", "IN_TRANSIT", "DISPATCHED"].includes(
          String(row.status || "").toUpperCase(),
        ),
      ).length,
      completed: rows.filter((row) =>
        ["RECEIVED", "COMPLETED"].includes(
          String(row.status || "").toUpperCase(),
        ),
      ).length,
    }),
    [payload.count, rows],
  );

  const columns = React.useMemo(
    () => [
      {
        key: "transfer_number",
        header: "Transfer #",
        sortKey: "transfer_number",
        sortType: "text",

        cell: (row) => (
          <Link
            to={`/transfers/${row.id}`}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.transfer_number || "—"}
          </Link>
        ),
      },
      {
        key: "from_branch",
        header: "From Branch",
        sortKey: "from_branch__branch_name",
        sortType: "text",

        cell: (row) =>
          row.from_branch_code ||
          row.from_branch?.branch_code ||
          row.from_branch_name ||
          row.from_branch?.branch_name ||
          row.from_branch?.name ||
          "—",
      },
      {
        key: "route",
        header: "",
        sortable: false,

        cell: () => <ArrowRight className="h-4 w-4 text-muted-foreground" />,
      },
      {
        key: "to_branch",
        header: "To Branch",
        sortKey: "to_branch__branch_name",
        sortType: "text",

        cell: (row) =>
          row.to_branch_code ||
          row.to_branch?.branch_code ||
          row.to_branch_name ||
          row.to_branch?.branch_name ||
          row.to_branch?.name ||
          "—",
      },
      {
        key: "items",
        header: "Items",
        sortable: false,
        align: "right",

        cell: (row) => row.item_count ?? row.items?.length ?? 0,
      },
      {
        key: "total_quantity",
        header: "Qty",
        sortable: false,
        align: "right",

        cell: (row) =>
          row.total_quantity ??
          (row.items || []).reduce(
            (sum, item) =>
              sum + Number(item.requested_quantity || item.quantity || 0),
            0,
          ),
      },
      {
        key: "created_at",
        header: "Requested",
        sortKey: "created_at",
        sortType: "datetime",

        cell: (row) =>
          row.created_at ? <DateText value={row.created_at} /> : "—",
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
        sortable: false,

        cell: (row) => (
          <Button asChild size="sm" variant="outline">
            <Link to={`/transfers/${row.id}`}>View</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div
      data-stock-module="stock-transfers"
      className="stock-module-page stock-workspace mx-auto max-w-7xl space-y-5 pb-10"
    >
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{ color: "#bae6fd" }}
            >
              Inventory Logistics
            </p>

            <h1
              className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,.28)",
              }}
            >
              Branch Transfers
            </h1>

            <p
              className="mt-2 max-w-2xl text-sm leading-6"
              style={{ color: "#f1f5f9" }}
            >
              Create and track inventory movements between branches. The list
              follows the global branch filter.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100">
              <Warehouse className="h-4 w-4 text-emerald-300" />

              {branchId
                ? `Global branch filter active`
                : "All accessible branches"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${
                  query.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button
              asChild
              className="bg-white text-blue-950 hover:bg-slate-100"
            >
              <Link to="/transfers/new">
                <Plus className="mr-2 h-4 w-4" />
                New Transfer
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Transfers"
          value={summary.total}
          description="All transfers matching the active filter"
          icon={Boxes}
        />

        <MetricCard
          label="Open On This Page"
          value={summary.pending}
          description="Draft, requested, approved or in transit"
          icon={Clock3}
          tone="warning"
        />

        <MetricCard
          label="Completed On This Page"
          value={summary.completed}
          description="Received and completed transfers"
          icon={CheckCircle2}
          tone="success"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025] md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Transfer Register</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Search transfer number, route, branch or status.
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search transfers"
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
          emptyTitle="No stock transfers found"
          emptyDescription="Create a transfer to move inventory between branches."
        />
      </section>
    </div>
  );
}
