import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function GRNListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "grns",
    "/purchases/grn/",
    branchParams,
  );

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const columns = React.useMemo(
    () => [
      {
        key: "grn_number",
        header: "GRN No.",
        sortKey: "grn_number",
        sortType: "text",
        cell: (row) => (
          <Link
            to={`/purchases/grn/${row.id}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.grn_number}
          </Link>
        ),
      },
      {
        key: "po_number",
        header: "PO Ref",
        sortKey: "purchase_order__po_number",
        sortType: "text",
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "branch_name",
        header: "Branch",
        sortKey: "branch__branch_name",
        sortType: "text",
      },
      {
        key: "received_date",
        header: "Received Date",
        sortKey: "received_date",
        sortType: "date",
        cell: (row) =>
          row.received_date ? <DateText value={row.received_date} /> : "—",
      },
      {
        key: "accepted_quantity",
        header: "Accepted",
        sortType: "quantity",
        align: "right",
        cell: (row) => row.total_accepted_quantity || 0,
      },
      {
        key: "receipt_status",
        header: "Receipt",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.receipt_status} />,
      },
      {
        key: "status",
        header: "Status",
        sortType: "status",
        cell: (row) => (
          <StatusBadge status={row.is_confirmed ? "CONFIRMED" : "DRAFT"} />
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right",
        cell: (row) => (
          <Button asChild size="sm" variant="outline">
            <Link to={`/purchases/grn/${row.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Received Notes"
        subtitle="Confirm physical receipt, quality checks and stock updates"
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/purchases/grn/new">
              <Plus className="mr-2 h-4 w-4" />
              New GRN
            </Link>
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search GRN, PO or supplier"
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No GRNs"
        emptyDescription="Create a GRN when purchased goods arrive."
      />
    </div>
  );
}
