import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";
export default function GRNListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "grns",
    "/purchases/grn/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const cols = React.useMemo(
    () => [
      {
        key: "grn_number",
        header: "GRN #",
        sortType: "text",
        cell: (r) => (
          <Link
            to={`/purchases/grn/${r.id}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {r.grn_number}
          </Link>
        ),
      },
      {
        key: "po_number",
        header: "Purchase order",
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
        key: "received_date",
        header: "Received date",
        sortType: "date",
        cell: (r) => <DateText value={r.received_date} />,
      },
      { key: "warehouse_location", header: "Warehouse", sortType: "text" },
      {
        key: "status",
        header: "Status",
        sortType: "status",
        cell: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        cell: (r) => (
          <ListingRowActions
            viewTo={`/purchases/grn/${r.id}`}
            editTo={`/purchases/grn/${r.id}/edit`}
            deleteUrl={`/purchases/grn/${r.id}/`}
            queryKey="grns"
            itemLabel={r.grn_number}
          />
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Received Notes"
        subtitle="Receive purchase orders, record quality checks and update inventory"
        actions={
          <Button asChild>
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
        columns={cols}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No GRNs"
        emptyDescription="Create a GRN when goods arrive."
      />
    </div>
  );
}
