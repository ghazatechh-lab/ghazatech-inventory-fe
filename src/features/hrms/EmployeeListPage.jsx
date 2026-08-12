import React from "react";
import { Link } from "react-router-dom";
import { FileBadge2, Plus, Users } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";

const normalizePayload = (value) => {
  if (Array.isArray(value)) {
    return { results: value, count: value.length };
  }

  if (Array.isArray(value?.results)) {
    return {
      results: value.results,
      count: Number(value.count ?? value.results.length),
    };
  }

  if (Array.isArray(value?.data)) {
    return {
      results: value.data,
      count: Number(value.count ?? value.data.length),
    };
  }

  if (Array.isArray(value?.data?.results)) {
    return {
      results: value.data.results,
      count: Number(
        value.data.count ?? value.count ?? value.data.results.length,
      ),
    };
  }

  if (Array.isArray(value?.data?.data?.results)) {
    return {
      results: value.data.data.results,
      count: Number(
        value.data.data.count ??
          value.data.count ??
          value.count ??
          value.data.data.results.length,
      ),
    };
  }

  return { results: [], count: 0 };
};

export default function EmployeeListPage() {
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();

  const { query, q, setQ, page, setPage } = useListQuery(
    "employees",
    "/hrms/employees/",
    branchParams,
  );

  const previousBranchId = React.useRef(branchId);
  const data = React.useMemo(() => normalizePayload(query.data), [query.data]);

  React.useEffect(() => {
    if (previousBranchId.current !== branchId) {
      previousBranchId.current = branchId;
      setPage(1);
    }
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = React.useMemo(
    () => [
      {
        key: "employee_code",
        header: "Code",
        cell: (row) => (
          <span className="font-mono text-xs font-semibold text-slate-200">
            {row.employee_code || "—"}
          </span>
        ),
      },
      {
        key: "employee",
        header: "Employee",
        cell: (row) => (
          <Link
            to={`/hrms/employees/${row.id}`}
            className="flex min-w-0 items-center gap-3"
          >
            {row.profile_image_url || row.profile_image ? (
              <img
                src={row.profile_image_url || row.profile_image}
                alt={row.full_name || "Employee"}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
                <Users className="h-4 w-4" />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-medium text-blue-500 hover:underline dark:text-blue-300">
                {row.full_name || "Unnamed employee"}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {row.designation_name || "No designation"}
              </p>
            </div>
          </Link>
        ),
      },
      {
        key: "department_name",
        header: "Department",
        cell: (row) => row.department_name || "—",
      },
      {
        key: "branch_name",
        header: "Branch",
        cell: (row) => (
          <div>
            <p className="font-medium">{row.branch_name || "Unassigned"}</p>
            {row.branch_code && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.branch_code}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "passport_number",
        header: "Passport",
        cell: (row) => row.passport_number || "—",
      },
      {
        key: "emirates_id_number",
        header: "Emirates ID",
        cell: (row) => row.emirates_id_number || "—",
      },
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
          <div className="flex items-center justify-end gap-1">
            <Button
              asChild
              size="icon"
              variant="ghost"
              title="Salary Certificate"
            >
              <Link to={`/hrms/salary-certificates?employee=${row.id}`}>
                <FileBadge2 className="h-4 w-4" />
              </Link>
            </Button>

            <ListingRowActions
              viewTo={`/hrms/employees/${row.id}`}
              editTo={`/hrms/employees/${row.id}/edit`}
              deleteUrl={`/hrms/employees/${row.id}/`}
              queryKey="employees"
              itemLabel={row.full_name}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const handlePageChange = React.useCallback(
    (nextPage) => {
      const parsedPage = Number(nextPage);

      if (
        Number.isFinite(parsedPage) &&
        parsedPage >= 1 &&
        parsedPage !== page
      ) {
        setPage(parsedPage);
      }
    },
    [page, setPage],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle={
          isAllBranches
            ? "Full employee directory across all branches"
            : "Employees assigned to the selected branch"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/hrms/salary-certificates">
                <FileBadge2 className="mr-2 h-4 w-4" />
                Salary Certificates
              </Link>
            </Button>

            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link to="/hrms/employees/new">
                <Plus className="mr-2 h-4 w-4" />
                New Employee
              </Link>
            </Button>
          </div>
        }
      />

      {!isAllBranches && (
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-200">
          Showing employees for the selected branch only.
        </div>
      )}

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search name, code, passport or Emirates ID"
      />

      <DataTable
        columns={columns}
        data={data.results}
        isLoading={query.isLoading || query.isFetching}
        page={page}
        total={data.count}
        onPageChange={handlePageChange}
        emptyTitle={
          isAllBranches
            ? "No employees found"
            : "No employees found in this branch"
        }
        emptyDescription={
          isAllBranches
            ? "Add employees to build the HR directory."
            : "Switch branches or add an employee to this branch."
        }
      />
    </div>
  );
}
