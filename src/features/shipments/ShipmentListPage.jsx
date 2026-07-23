import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";
export default function ShipmentListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "shipments",
    "/shipments/",
    { shipment_type: "PURCHASE" },
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const cols = React.useMemo(
    () => [
      {
        key: "shipment_number",
        header: "Shipment #",
        sortType: "text",
        cell: (r) => (
          <Link
            to={`/shipments/${r.id}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {r.shipment_number}
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
      { key: "courier", header: "Courier", sortType: "text" },
      { key: "tracking_number", header: "Tracking #", sortType: "text" },
      {
        key: "expected_date",
        header: "Expected",
        sortType: "date",
        cell: (r) =>
          r.expected_date ? <DateText value={r.expected_date} /> : "—",
      },
      {
        key: "item_count",
        header: "Items",
        sortType: "number",
        align: "right",
      },
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
            viewTo={`/shipments/${r.id}`}
            editTo={`/shipments/${r.id}/edit`}
            deleteUrl={`/shipments/${r.id}/`}
            queryKey="shipments"
            itemLabel={r.shipment_number}
          />
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Shipments"
        subtitle="Track inbound supplier shipments, couriers, expected dates and receiving status"
        actions={
          <Button asChild>
            <Link to="/shipments/new">
              <Plus className="mr-2 h-4 w-4" />
              Log Shipment
            </Link>
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search shipment, PO, supplier, courier or tracking"
      />
      <DataTable
        columns={cols}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No purchase shipments"
        emptyDescription="Log the first inbound shipment."
      />
    </div>
  );
}
