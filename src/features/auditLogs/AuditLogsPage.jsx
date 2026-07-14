import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const { query, page, setPage } = useListQuery("audits", "/audit-logs/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="All administrative actions" />
      <DataTable
        columns={[
          { key: "timestamp", header: "Time", cell: (r) => <span className="font-numeric text-slate-400">{formatDateTime(r.timestamp)}</span> },
          { key: "user", header: "User", cell: (r) => r.user.name },
          { key: "branch", header: "Branch" },
          { key: "module", header: "Module" },
          { key: "action", header: "Action", cell: (r) => <StatusBadge status={r.action === "delete" ? "danger" : r.action === "create" ? "success" : "info"} label={r.action} /> },
          { key: "description", header: "Description" },
          { key: "ip_address", header: "IP", cell: (r) => <span className="font-numeric text-xs text-slate-400">{r.ip_address}</span> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
