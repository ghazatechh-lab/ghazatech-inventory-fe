import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

export default function LeavesPage() {
  const { query, page, setPage } = useListQuery("leaves", "/hrms/leaves/");
  const data = query.data || { results: [], count: 0 };
  const act = async (id, kind) => { await api.post(`/hrms/leaves/${id}/${kind}/`); toast.success(kind === "approve" ? "Approved" : "Rejected"); query.refetch(); };
  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Pending and historical leave applications" />
      <DataTable
        columns={[
          { key: "employee", header: "Employee", cell: (r) => r.employee.name },
          { key: "leave_type", header: "Type" },
          { key: "start_date", header: "From", cell: (r) => <DateText value={r.start_date} /> },
          { key: "end_date", header: "To", cell: (r) => <DateText value={r.end_date} /> },
          { key: "days", header: "Days", align: "right", cell: (r) => <span className="font-numeric">{r.days}</span> },
          { key: "reason", header: "Reason" },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "actions", header: "", align: "right", cell: (r) => r.status === "pending" && <div className="flex gap-1 justify-end"><Button size="sm" variant="outline" onClick={() => act(r.id, "approve")}>Approve</Button><Button size="sm" variant="ghost" className="text-red-400" onClick={() => act(r.id, "reject")}>Reject</Button></div> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
