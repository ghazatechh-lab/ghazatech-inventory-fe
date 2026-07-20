import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Plus } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function GRNListPage() {
  const { query, page, setPage } = useListQuery("grns", "/purchases/grn/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Goods Received Notes"
        subtitle="Confirmation of received stock from suppliers"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/purchases/grn/new">
              <Plus className="w-4 h-4 mr-1.5" /> New GRN
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={[
          {
            key: "grn_number",
            header: "GRN #",
            cell: (r) => (
              <Link
                to={`/purchases/grn/${r.id}`}
                className="font-numeric text-blue-400"
              >
                {r.grn_number}
              </Link>
            ),
          },
          {
            key: "date",
            header: "Date",
            cell: (r) => <DateText value={r.date} />,
          },
          {
            key: "po",
            header: "PO",
            cell: (r) => (
              <span className="font-numeric text-slate-400">
                {r.purchase_order?.number}
              </span>
            ),
          },
          { key: "supplier", header: "Supplier", cell: (r) => r.supplier.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
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
                viewTo={`/purchases/grn/${r.id}`}
                deleteUrl={`/purchases/grn/${r.id}/`}
                queryKey="grns"
                itemLabel={r.grn_number || "GRN"}
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
