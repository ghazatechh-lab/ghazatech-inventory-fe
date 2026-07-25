import React from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { MetricCard } from "@/components/sales/MetricCard";

export default function AttendancePage() {
  const { branchParams } = useActiveBranchFilter();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const { query, q, setQ, page, setPage } = useListQuery(
    "attendance",
    "/hrms/attendance/",
    branchParams,
  );
  const { data: summary = {} } = useQuery({
    queryKey: ["attendance-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/attendance/summary/", { params: branchParams }),
      ),
  });
  const data = query.data || { results: [], count: 0 };

  const exportSheet = async (format) => {
    const response = await api.get("/hrms/attendance/export/", {
      params: {
        ...branchParams,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        format,
      },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-sheet.${format === "xlsx" ? "xlsx" : "csv"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Daily attendance, working hours, and overtime"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportSheet("csv")}>
              Export CSV
            </Button>
            <Button
              className="bg-blue-600 text-white"
              onClick={() => exportSheet("xlsx")}
            >
              <Download className="mr-2 h-4 w-4" /> Export Attendance Sheet
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Present" value={summary.present || 0} />
        <MetricCard label="Absent" value={summary.absent || 0} />
        <MetricCard label="Late" value={summary.late || 0} />
        <MetricCard label="On Leave" value={summary.on_leave || 0} />
        <MetricCard
          label="Overtime"
          value={`${summary.overtime_hours || 0} hrs`}
        />
      </div>

      <div className="card-surface grid gap-3 p-4 md:grid-cols-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search employee" />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <DataTable
        columns={[
          { key: "employee_code", header: "Code" },
          { key: "employee_name", header: "Employee" },
          { key: "branch_name", header: "Branch" },
          { key: "date", header: "Date" },
          { key: "check_in", header: "Check In" },
          { key: "check_out", header: "Check Out" },
          { key: "working_hours", header: "Hours" },
          { key: "overtime_hours", header: "Overtime" },
          {
            key: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
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
