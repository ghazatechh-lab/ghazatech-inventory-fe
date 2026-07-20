import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Plus } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function ShipmentListPage() {
  const { query, page, setPage } = useListQuery("shipments", "/shipments/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="Deliveries to customers"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/shipments/new">
              <Plus className="w-4 h-4 mr-1.5" /> New shipment
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={[
          {
            key: "shipment_number",
            header: "Shipment #",
            cell: (r) => (
              <Link
                to={`/shipments/${r.id}`}
                className="font-numeric text-blue-400"
              >
                {r.shipment_number}
              </Link>
            ),
          },
          {
            key: "invoice",
            header: "Invoice",
            cell: (r) => (
              <span className="font-numeric">{r.invoice.number}</span>
            ),
          },
          { key: "customer", header: "Customer", cell: (r) => r.customer.name },
          {
            key: "expected",
            header: "Expected",
            cell: (r) => <DateText value={r.expected_date} />,
          },
          { key: "delivery_person", header: "Delivery" },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (r) => (
              <ListingRowActions
                viewTo={`/shipments/${r.id}`}
                deleteUrl={`/shipments/${r.id}/`}
                queryKey="shipments"
                itemLabel={r.shipment_number || "shipment"}
              />
            ),
          },
        ]}
        data={data.results}
        isLoading={query.isLoading}
        page={page}
        total={data.count}
        onPageChange={setPage}
      />
    </div>
  );
}
