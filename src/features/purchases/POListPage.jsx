import React from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  FileText,
  Clock3,
  PackageCheck,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";
const Metric = ({ icon: Icon, label, value }) => (
  <div className="card-surface flex items-center gap-3 p-4">
    <Icon className="h-5 w-5 text-blue-500" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  </div>
);
export default function POListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "purchase-orders",
    "/purchases/orders/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const summary = React.useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          value: a.value + Number(r.total_amount || 0),
          pending:
            a.pending + (!["RECEIVED", "CANCELLED"].includes(r.status) ? 1 : 0),
          received: a.received + (r.status === "RECEIVED" ? 1 : 0),
        }),
        { value: 0, pending: 0, received: 0 },
      ),
    [rows],
  );
  const columns = React.useMemo(
    () => [
      {
        key: "po_number",
        header: "PO #",
        sortType: "text",
        cell: (r) => (
          <Link
            to={`/purchases/orders/${r.id}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {r.po_number}
          </Link>
        ),
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "order_date",
        header: "Order date",
        sortType: "date",
        cell: (r) => <DateText value={r.order_date} />,
      },
      {
        key: "expected_delivery_date",
        header: "Expected",
        sortType: "date",
        cell: (r) =>
          r.expected_delivery_date ? (
            <DateText value={r.expected_delivery_date} />
          ) : (
            "—"
          ),
      },
      {
        key: "item_count",
        header: "Items",
        sortType: "number",
        align: "right",
      },
      {
        key: "total_amount",
        header: "Total",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.total_amount} />,
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
            viewTo={`/purchases/orders/${r.id}`}
            editTo={`/purchases/orders/${r.id}/edit`}
            deleteUrl={`/purchases/orders/${r.id}/`}
            queryKey="purchase-orders"
            itemLabel={r.po_number}
          />
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Raise, approve and track supplier purchase orders"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/purchases/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FileText}
          label="Purchase orders"
          value={payload.count || 0}
        />
        <Metric
          icon={WalletCards}
          label="Value on page"
          value={<CurrencyText value={summary.value} />}
        />
        <Metric icon={Clock3} label="Pending on page" value={summary.pending} />
        <Metric
          icon={PackageCheck}
          label="Received on page"
          value={summary.received}
        />
      </div>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search PO, supplier or reference"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No purchase orders"
        emptyDescription="Create the first purchase order."
      />
    </div>
  );
}
