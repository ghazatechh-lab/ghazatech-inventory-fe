import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus, User, UserRound } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function CustomerListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "customers",
    "/customers/",
  );
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Retail, wholesale and walk-in customers"
        actions={
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="new-customer-btn"
          >
            <Link to="/customers/new">
              <Plus className="w-4 h-4 mr-1.5" /> New customer
            </Link>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by name, code, phone or email…"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "customer_code",
            header: "Code",
            cell: (r) => (
              <span className="font-numeric text-slate-300">
                {r.customer_code}
              </span>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            cell: (r) => (
              <Link
                to={`/customers/${r.id}`}
                className="flex items-center gap-2.5 hover:text-blue-400"
              >
                <div
                  className={`w-8 h-8 rounded-md border flex items-center justify-center ${r.is_walkin ? "bg-violet-500/10 border-violet-500/30" : "bg-blue-500/10 border-blue-500/20"}`}
                >
                  {r.is_walkin ? (
                    <UserRound className="w-4 h-4 text-violet-400" />
                  ) : (
                    <User className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="text-slate-100 flex items-center gap-1.5">
                    {r.customer_name}
                    {r.is_walkin && (
                      <span className="text-[10px] bg-violet-500/15 text-violet-300 px-1.5 rounded">
                        WALK-IN
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {r.customer_type}
                  </div>
                </div>
              </Link>
            ),
          },
          {
            key: "phone",
            header: "Phone",
            cell: (r) => (
              <span className="font-numeric text-slate-400 text-xs">
                {r.phone}
              </span>
            ),
          },
          { key: "city", header: "City" },
          {
            key: "credit_limit",
            header: "Credit limit",
            align: "right",
            cell: (r) => <CurrencyText value={r.credit_limit} />,
          },
          {
            key: "outstanding",
            header: "Outstanding",
            align: "right",
            cell: (r) => (
              <CurrencyText
                value={r.outstanding}
                className={
                  r.outstanding > 0 ? "text-red-300" : "text-slate-400"
                }
              />
            ),
          },
          {
            key: "is_active",
            header: "Status",
            cell: (r) => (
              <StatusBadge
                status={r.is_active ? "active" : "closed"}
                label={r.is_active ? "Active" : "Inactive"}
              />
            ),
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (r) => (
              <ListingRowActions
                viewTo={`/customers/${r.id}`}
                deleteUrl={`/customers/${r.id}/`}
                queryKey="customers"
                itemLabel={r.customer_name || r.customer_code || "customer"}
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
