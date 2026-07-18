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
    <div>
      <PageHeader
        title="Branches"
        subtitle="Manage physical retail and warehouse locations"
        actions={
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="new-branch-btn"
          >
            <Link to="/branches/new">
              <Plus className="w-4 h-4 mr-1.5" /> New branch
            </Link>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by name, code or city…"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "branch_code",
            header: "Code",
            cell: (r) => (
              <span className="font-numeric text-slate-300">
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
                className="flex items-center gap-2 hover:text-blue-400 transition"
              >
                <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-slate-100">{r.branch_name}</div>
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
              <span className="font-numeric text-slate-400">{r.phone}</span>
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
      />
    </div>
  );
}
