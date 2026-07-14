import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CurrencyText } from "@/components/common/CurrencyText";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

export default function PayrollPage() {
  const { query, page, setPage } = useListQuery("payroll", "/hrms/payroll/");
  const data = query.data || { results: [], count: 0 };
  const act = async (id, kind) => { await api.post(`/hrms/payroll/${id}/${kind}/`); toast.success(kind === "approve" ? "Approved" : "Marked as paid"); query.refetch(); };
  return (
    <div>
      <PageHeader title="Payroll" subtitle="Monthly salary generation" />
      <DataTable
        columns={[
          { key: "employee", header: "Employee", cell: (r) => r.employee.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "period", header: "Period" },
          { key: "basic_salary", header: "Basic", align: "right", cell: (r) => <CurrencyText value={r.basic_salary} /> },
          { key: "gross", header: "Gross", align: "right", cell: (r) => <CurrencyText value={r.gross} /> },
          { key: "deductions", header: "Deductions", align: "right", cell: (r) => <CurrencyText value={r.deductions} className="text-red-300" /> },
          { key: "net", header: "Net", align: "right", cell: (r) => <CurrencyText value={r.net} className="text-emerald-400 font-semibold" /> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "actions", header: "", align: "right", cell: (r) => (
            <div className="flex gap-1 justify-end">
              {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => act(r.id, "approve")}>Approve</Button>}
              {r.status === "approved" && <Button size="sm" variant="outline" onClick={() => act(r.id, "mark-paid")}>Mark paid</Button>}
            </div>
          )},
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
