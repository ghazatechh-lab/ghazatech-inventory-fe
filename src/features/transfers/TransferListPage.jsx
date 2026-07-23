import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes, CheckCircle2, Clock3, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";

export default function TransferListPage() {
  const { query, page, setPage, q, setQ } = useListQuery(
    "transfers",
    "/transfers/",
  );

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const summary = React.useMemo(
    () => ({
      total: payload.count || 0,

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
            className="font-numeric text-blue-600 hover:underline dark:text-blue-400"
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
        statusOrder: [
          "DRAFT",
          "REQUESTED",
          "APPROVED",
          "DISPATCHED",
          "IN_TRANSIT",
          "RECEIVED",
          "COMPLETED",
          "CANCELLED",
        ],
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Transfers"
        subtitle="Create and track inventory movements between branches"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/transfers/new">
              <Plus className="mr-2 h-4 w-4" />
              New transfer
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface flex items-center gap-3 p-4">
          <Boxes className="h-5 w-5 text-blue-500" />

          <div>
            <p className="text-xs text-muted-foreground">Total transfers</p>

            <p className="text-xl font-semibold">{summary.total}</p>
          </div>
        </div>

        <div className="card-surface flex items-center gap-3 p-4">
          <Clock3 className="h-5 w-5 text-amber-500" />

          <div>
            <p className="text-xs text-muted-foreground">Open on this page</p>

            <p className="text-xl font-semibold">{summary.pending}</p>
          </div>
        </div>

        <div className="card-surface flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />

          <div>
            <p className="text-xs text-muted-foreground">
              Completed on this page
            </p>

            <p className="text-xl font-semibold">{summary.completed}</p>
          </div>
        </div>
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search transfer number, branch or status"
      />

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
    </div>
  );
}
