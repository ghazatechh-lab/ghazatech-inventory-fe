import React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
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
        await api.get("/hrms/attendance/summary/", {
          params: branchParams,
        }),
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
    <div className="hrms-module-page hrms-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        eyebrow="Human Resources"
        title="Attendance"
        subtitle="Track daily attendance, working hours, overtime, absences, and leave status across the active branch."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => exportSheet("csv")}
              className="border border-amber-300 bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <Download className="mr-2 h-4 w-4 text-slate-950" />
              Export CSV
            </Button>

            <Button
              type="button"
              onClick={() => exportSheet("xlsx")}
              className="border border-amber-300 bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-slate-950" />
              Export Attendance Sheet
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Present"
          value={summary.present || 0}
          description="Employees marked present"
        />
        <MetricCard
          label="Absent"
          value={summary.absent || 0}
          description="Employees marked absent"
        />
        <MetricCard
          label="Late"
          value={summary.late || 0}
          description="Late check-ins"
        />
        <MetricCard
          label="On Leave"
          value={summary.on_leave || 0}
          description="Approved leave records"
        />
        <MetricCard
          label="Overtime"
          value={`${summary.overtime_hours || 0} hrs`}
          description="Recorded overtime"
        />
      </div>

      <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
              Attendance Filters
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
              Attendance Records
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Search employees and filter attendance by date range.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                Employee
              </p>
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Search employee"
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                From Date
              </p>
              <Input
                className="h-11 rounded-[10px]"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                To Date
              </p>
              <Input
                className="h-11 rounded-[10px]"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
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
          emptyTitle="No attendance records"
          emptyDescription="No attendance records were found for the current filters."
        />
      </section>
    </div>
  );
}
