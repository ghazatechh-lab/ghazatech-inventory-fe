import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function POListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "purchase-orders",
    "/purchases/orders/",
  );
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Orders raised with suppliers"
        actions={
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="new-po-btn"
          >
            <Link to="/purchases/orders/new">
              <Plus className="w-4 h-4 mr-1.5" /> New PO
            </Link>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search PO # or supplier…"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "po_number",
            header: "PO #",
            cell: (r) => (
              <Link
                to={`/purchases/orders/${r.id}`}
                className="font-numeric text-blue-400"
              >
                {r.po_number}
              </Link>
            ),
          },
          {
            key: "date",
            header: "Date",
            cell: (r) => <DateText value={r.date} />,
          },
          { key: "supplier", header: "Supplier", cell: (r) => r.supplier.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          {
            key: "total",
            header: "Total",
            align: "right",
            cell: (r) => (
              <CurrencyText value={r.total} className="text-white" />
            ),
          },
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
                viewTo={`/purchases/orders/${r.id}`}
                deleteUrl={`/purchases/orders/${r.id}/`}
                queryKey="purchase-orders"
                itemLabel={
                  r.po_number || r.purchase_order_number || "purchase order"
                }
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
