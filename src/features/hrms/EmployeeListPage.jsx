import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus } from "lucide-react";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function EmployeeListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "employees",
    "/hrms/employees/",
  );
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Full HR directory across branches"
        actions={
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="new-employee-btn"
          >
            <Link to="/hrms/employees/new">
              <Plus className="w-4 h-4 mr-1.5" /> New employee
            </Link>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search name, code or email…"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "employee_code",
            header: "Code",
            cell: (r) => (
              <span className="font-numeric text-slate-300">
                {r.employee_code}
              </span>
            ),
          },
          {
            key: "employee",
            header: "Employee",
            cell: (r) => (
              <Link
                to={`/hrms/employees/${r.id}`}
                className="flex items-center gap-2.5 hover:text-blue-400"
              >
                <img
                  src={r.profile_image}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                />
                <div>
                  <div className="text-slate-100">{r.full_name}</div>
                  <div className="text-[10px] text-slate-500">
                    {r.designation}
                  </div>
                </div>
              </Link>
            ),
          },
          { key: "department", header: "Department" },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "nationality", header: "Nationality" },
          {
            key: "basic_salary",
            header: "Basic",
            align: "right",
            cell: (r) => <CurrencyText value={r.basic_salary} />,
          },
          {
            key: "employment_status",
            header: "Status",
            cell: (r) => (
              <StatusBadge
                status={r.employment_status === "Active" ? "active" : "closed"}
              />
            ),
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (r) => (
              <ListingRowActions
                viewTo={`/hrms/employees/${r.id}`}
                deleteUrl={`/hrms/employees/${r.id}/`}
                queryKey="employees"
                itemLabel={
                  r.full_name ||
                  r.employee_name ||
                  r.employee_code ||
                  "employee"
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
