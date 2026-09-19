import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus, Building2 } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function BranchListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "branches",
    "/branches/",
  );
  const data = query.data || { results: [], count: 0 };

  return (
    <div className="branch-module-page branch-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        eyebrow="Branch Management"
        title="Branches"
        subtitle="Manage physical retail, warehouse, and office locations from one place."
        actions={
          <Button
            asChild
            className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            data-testid="new-branch-btn"
          >
            <Link to="/branches/new">
              <Plus className="mr-1.5 h-4 w-4 text-slate-950" /> New Branch
            </Link>
          </Button>
        }
      />
      <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by name, code or city…"
        />
      </section>
      <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <DataTable
          columns={[
            {
              key: "branch_code",
              header: "Code",
              cell: (r) => (
                <span className="font-numeric font-semibold text-slate-700 dark:text-slate-200">
                  {r.branch_code}
                </span>
              ),
            },
            {
              key: "branch_name",
              header: "Branch",
              cell: (r) => (
                <Link
                  to={`/branches/${r.id}`}
                  className="flex items-center gap-2 transition hover:text-sky-600 dark:hover:text-sky-300"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {r.branch_name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {r.branch_type}
                    </div>
                  </div>
                </Link>
              ),
            },
            { key: "city", header: "City" },
            { key: "manager", header: "Manager" },
            {
              key: "phone",
              header: "Phone",
              cell: (r) => (
                <span className="font-numeric text-slate-600 dark:text-slate-300">
                  {r.phone}
                </span>
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
                  viewTo={`/branches/${r.id}`}
                  deleteUrl={`/branches/${r.id}/`}
                  queryKey="branches"
                  itemLabel={r.branch_name || r.branch_code || "branch"}
                />
              ),
            },
          ]}
          data={data.results}
          isLoading={query.isLoading}
          page={page}
          total={data.count}
          onPageChange={setPage}
          emptyTitle="No branches"
          emptyDescription="Create a branch to start managing locations and operations."
        />
      </section>
    </div>
  );
}
