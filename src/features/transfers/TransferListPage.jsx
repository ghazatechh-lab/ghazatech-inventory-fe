import React from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";

export default function TransferListPage() {
  const { query, page, setPage, q, setQ } = useListQuery(
    "transfers",
    "/transfers/",
  );

  const data = query.data || {
    results: [],
    count: 0,
  };

  const columns = [
    {
      key: "transfer_number",
      header: "Transfer #",
      sortKey: "transfer_number",
      cell: (row) => (
        <Link
          to={`/transfers/${row.id}`}
          className="font-numeric text-blue-400 hover:text-blue-300"
        >
          {row.transfer_number}
        </Link>
      ),
    },
    {
      key: "from",
      header: "From",
      sortKey: "from_branch__branch_name",
      cell: (row) =>
        row.from_branch?.branch_code ||
        row.from_branch?.name ||
        row.from_branch?.branch_name ||
        "—",
    },
    {
      key: "arrow",
      header: "",
      sortable: false,
      cell: () => <ArrowRight className="h-3.5 w-3.5 text-slate-500" />,
    },
    {
      key: "to",
      header: "To",
      sortKey: "to_branch__branch_name",
      cell: (row) =>
        row.to_branch?.branch_code ||
        row.to_branch?.name ||
        row.to_branch?.branch_name ||
        "—",
    },
    {
      key: "created_at",
      header: "Requested",
      sortKey: "created_at",
      cell: (row) => <DateText value={row.created_at} />,
    },
    {
      key: "dispatch_date",
      header: "Dispatched",
      sortKey: "dispatch_date",
      cell: (row) =>
        row.dispatch_date ? <DateText value={row.dispatch_date} /> : "—",
    },
    {
      key: "receive_date",
      header: "Received",
      sortKey: "receive_date",
      cell: (row) =>
        row.receive_date ? <DateText value={row.receive_date} /> : "—",
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        subtitle="Move stock between branches"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/transfers/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New transfer
            </Link>
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search transfer number or branch"
      />

      <DataTable
        columns={columns}
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={data.count || 0}
        onPageChange={setPage}
        emptyTitle="No stock transfers found"
        emptyDescription="Stock transfers will appear here."
      />
    </div>
  );
}
