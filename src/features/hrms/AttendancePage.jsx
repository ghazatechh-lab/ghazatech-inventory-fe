import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AttendancePage() {
  const { query, page, setPage } = useListQuery("attendance", "/hrms/attendance/");
  const data = query.data || { results: [], count: 0 };
  const check = async (kind) => {
    await api.post(`/hrms/attendance/check-${kind}/`);
    toast.success(kind === "in" ? "Checked in" : "Checked out");
    query.refetch();
  };
  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily employee attendance"
        actions={<><Button variant="outline" onClick={() => check("in")} data-testid="check-in-btn"><LogIn className="w-4 h-4 mr-1.5" /> Check in</Button><Button variant="outline" onClick={() => check("out")} data-testid="check-out-btn"><LogOut className="w-4 h-4 mr-1.5" /> Check out</Button></>} />
      <DataTable
        columns={[
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "employee", header: "Employee", cell: (r) => r.employee.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch?.name || "-" },
          { key: "check_in", header: "In", cell: (r) => <span className="font-numeric text-emerald-400">{r.check_in || "-"}</span> },
          { key: "check_out", header: "Out", cell: (r) => <span className="font-numeric text-slate-300">{r.check_out || "-"}</span> },
          { key: "hours", header: "Hours", align: "right", cell: (r) => <span className="font-numeric">{r.hours || "-"}</span> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
