import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";

export default function EmployeeListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "employees",
    "/hrms/employees/",
  );
  const data = query.data || { results: [], count: 0 };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle="Full HR directory across branches"
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/hrms/employees/new">
              <Plus className="mr-2 h-4 w-4" />
              New Employee
            </Link>
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search name, code, passport or Emirates ID"
      />

      <DataTable
        columns={[
          { key: "employee_code", header: "Code" },
          {
            key: "employee",
            header: "Employee",
            cell: (row) => (
              <Link
                to={`/hrms/employees/${row.id}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {row.full_name}
              </Link>
            ),
          },
          { key: "department_name", header: "Department" },
          { key: "branch_name", header: "Branch" },
          { key: "passport_number", header: "Passport" },
          { key: "emirates_id_number", header: "Emirates ID" },
          {
            key: "total_salary",
            header: "Package",
            align: "right",
            cell: (row) => <CurrencyText value={row.total_salary} />,
          },
          {
            key: "employment_status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.employment_status} />,
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (row) => (
              <ListingRowActions
                viewTo={`/hrms/employees/${row.id}`}
                editTo={`/hrms/employees/${row.id}/edit`}
                deleteUrl={`/hrms/employees/${row.id}/`}
                queryKey="employees"
                itemLabel={row.full_name}
              />
            ),
          },
        ]}
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        total={data.count || 0}
        onPageChange={setPage}
      />
    </div>
  );
}
