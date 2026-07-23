import React from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users,
  UserCheck,
  CreditCard,
  AlertCircle,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { ListingRowActions } from "@/components/common/ListingRowActions";

const Metric = ({ icon: Icon, label, value, tone = "text-blue-500" }) => (
  <div className="card-surface flex items-center gap-3 p-4">
    <Icon className={`h-5 w-5 ${tone}`} />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  </div>
);

export default function SupplierListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "suppliers",
    "/suppliers/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const summary = React.useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          active: a.active + (r.is_active ? 1 : 0),
          credit: a.credit + Number(r.credit_limit || 0),
          outstanding: a.outstanding + Number(r.outstanding_balance || 0),
          purchases: a.purchases + Number(r.total_purchases || 0),
        }),
        { active: 0, credit: 0, outstanding: 0, purchases: 0 },
      ),
    [rows],
  );
  const columns = React.useMemo(
    () => [
      {
        key: "supplier_name",
        header: "Supplier",
        sortType: "text",
        cell: (r) => (
          <Link
            to={`/suppliers/${r.id}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            <div>{r.supplier_name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {r.trade_name || r.supplier_code}
            </div>
          </Link>
        ),
      },
      {
        key: "contact_person",
        header: "Contact",
        sortType: "text",
        cell: (r) => (
          <div>
            <div>{r.contact_person || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {r.email || r.phone || ""}
            </div>
          </div>
        ),
      },
      { key: "supplier_category", header: "Category", sortType: "status" },
      {
        key: "payment_terms_days",
        header: "Terms",
        sortType: "number",
        align: "right",
        cell: (r) => `${r.payment_terms_days || 0} d`,
      },
      {
        key: "credit_limit",
        header: "Credit limit",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.credit_limit} />,
      },
      {
        key: "outstanding_balance",
        header: "Outstanding",
        sortType: "currency",
        align: "right",
        cell: (r) => (
          <CurrencyText
            value={r.outstanding_balance}
            className={Number(r.outstanding_balance) > 0 ? "text-red-500" : ""}
          />
        ),
      },
      {
        key: "is_active",
        header: "Status",
        sortType: "active",
        cell: (r) => (
          <span
            className={
              r.is_active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500"
            }
          >
            {r.is_active ? "Active" : "Blocked"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        cell: (r) => (
          <ListingRowActions
            viewTo={`/suppliers/${r.id}`}
            editTo={`/suppliers/${r.id}/edit`}
            deleteUrl={`/suppliers/${r.id}/`}
            queryKey="suppliers"
            itemLabel={r.supplier_name}
          />
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Vendor contacts, commercial terms, credit limits and outstanding balances"
        actions={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add supplier
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Users} label="Suppliers" value={payload.count || 0} />
        <Metric
          icon={UserCheck}
          label="Active on page"
          value={summary.active}
          tone="text-emerald-500"
        />
        <Metric
          icon={CreditCard}
          label="Credit limit"
          value={<CurrencyText value={summary.credit} />}
          tone="text-violet-500"
        />
        <Metric
          icon={AlertCircle}
          label="Outstanding"
          value={<CurrencyText value={summary.outstanding} />}
          tone="text-red-500"
        />
        <Metric
          icon={WalletCards}
          label="Total purchases"
          value={<CurrencyText value={summary.purchases} />}
          tone="text-amber-500"
        />
      </div>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search supplier, contact, email, phone or TRN"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No suppliers found"
        emptyDescription="Add your first supplier."
      />
    </div>
  );
}
