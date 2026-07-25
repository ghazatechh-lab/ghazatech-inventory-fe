import React from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/sales/MetricCard";
import { CurrencyText } from "@/components/common/CurrencyText";

const reportTypes = [
  [
    "EMPLOYEE",
    "Employee Report",
    "Employee identity, visa, contract, salary, and status.",
  ],
  [
    "ATTENDANCE",
    "Attendance Report",
    "Attendance, working hours, late records, and overtime.",
  ],
  [
    "LEAVE",
    "Leave Report",
    "Leave applications, dates, days, reasons, and status.",
  ],
  [
    "PAYROLL",
    "Payroll Report",
    "Gross salary, deductions, net pay, and payroll status.",
  ],
];

export default function HRMSReportPage() {
  const { branchParams } = useActiveBranchFilter();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const { data: summary = {} } = useQuery({
    queryKey: ["hrms-report-summary", branchParams],
    queryFn: async () =>
      unwrap(await api.get("/hrms/reports/summary/", { params: branchParams })),
  });

  const exportReport = async (type) => {
    const response = await api.get("/hrms/reports/export/", {
      params: {
        ...branchParams,
        report_type: type,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type.toLowerCase()}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="HRMS Reports"
        subtitle="Employee, attendance, leave, and payroll reports"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Employees" value={summary.employees || 0} />
        <MetricCard label="Present Today" value={summary.present_today || 0} />
        <MetricCard
          label="Pending Leaves"
          value={summary.pending_leaves || 0}
        />
        <MetricCard
          label="Payroll Net"
          value={<CurrencyText value={summary.payroll_net || 0} />}
        />
      </div>

      <div className="card-surface grid gap-3 p-4 md:grid-cols-2">
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

      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map(([type, title, description]) => (
          <section key={type} className="card-surface p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <Button
              className="mt-5 bg-blue-600 text-white"
              onClick={() => exportReport(type)}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </section>
        ))}
      </div>
    </div>
  );
}
