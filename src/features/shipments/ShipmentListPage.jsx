import React from "react";
import { Link } from "react-router-dom";
import { Info, Plus } from "lucide-react";

import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function ShipmentListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, page, setPage } = useListQuery("shipments", "/shipments/", {
    shipment_type: "PURCHASE",
    ...branchParams,
  });

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const columns = React.useMemo(
    () => [
      {
        key: "shipment_number",
        header: "Shipment",
        sortKey: "shipment_number",
        sortType: "text",
        cell: (row) => (
          <span className="font-numeric font-semibold text-slate-950 dark:text-white">
            {row.shipment_number || "—"}
          </span>
        ),
      },
      {
        key: "po_number",
        header: "PO Ref",
        sortKey: "purchase_order__po_number",
        sortType: "text",
        cell: (row) => row.po_number || "—",
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
        cell: (row) => row.supplier_name || "—",
      },
      {
        key: "courier",
        header: "Carrier",
        sortKey: "courier",
        sortType: "text",
        cell: (row) => row.courier || row.shipment_method || "—",
      },
      {
        key: "tracking_number",
        header: "Tracking No.",
        sortKey: "tracking_number",
        sortType: "text",
        cell: (row) => row.tracking_number || "—",
      },
      {
        key: "expected_date",
        header: "ETA",
        sortKey: "expected_date",
        sortType: "date",
        cell: (row) =>
          row.expected_date ? <DateText value={row.expected_date} /> : "—",
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        statusOrder: [
          "DRAFT",
          "PENDING",
          "IN_TRANSIT",
          "CUSTOMS_HOLD",
          "DELIVERED",
          "RECEIVED",
          "COMPLETED",
          "CANCELLED",
        ],
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right",
        cell: (row) => (
          <Button asChild size="sm" variant="outline" className="min-w-20">
            <Link to={`/shipments/${row.id}`}>Track</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Shipments"
        subtitle="Inbound freight tracking from supplier to warehouse"
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/shipments/new">
              <Plus className="mr-2 h-4 w-4" />
              Log Shipment
            </Link>
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />

        <p>
          Tracks carrier, tracking number, linked PO, freight cost, customs
          status and ETA. Accepted quantities can be recorded against the
          receiving branch when the shipment arrives.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No shipments"
        emptyDescription="Log the first inbound supplier shipment."
      />
    </div>
  );
}
