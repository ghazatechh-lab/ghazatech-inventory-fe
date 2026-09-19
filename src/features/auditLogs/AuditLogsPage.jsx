import React from "react";
import { FileText, Search } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "audits",
    "/audit-logs/",
  );

  const data = query.data || { results: [], count: 0 };

  return (
    <div className="audit-module-page audit-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        eyebrow="System Administration"
        title="Audit Logs"
        subtitle="Review administrative actions, user activity, module changes, and system events."
      />

      <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 md:flex-row md:items-center md:justify-between dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
                Activity History
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                Administrative Audit Trail
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Search and review recorded actions across the system.
              </p>
            </div>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search user, module, action or description"
            />
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "timestamp",
              header: "Time",
              cell: (row) => (
                <span className="whitespace-nowrap font-numeric text-slate-600 dark:text-slate-300">
                  {formatDateTime(row.timestamp)}
                </span>
              ),
            },
            {
              key: "user",
              header: "User",
              cell: (row) => (
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {row.user?.name ||
                      row.user?.full_name ||
                      row.user_name ||
                      "—"}
                  </div>
                  {row.user?.email ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {row.user.email}
                    </div>
                  ) : null}
                </div>
              ),
            },
            {
              key: "branch",
              header: "Branch",
              cell: (row) =>
                row.branch?.branch_name || row.branch_name || row.branch || "—",
            },
            {
              key: "module",
              header: "Module",
              cell: (row) => (
                <span className="font-medium capitalize">
                  {row.module || "—"}
                </span>
              ),
            },
            {
              key: "action",
              header: "Action",
              cell: (row) => (
                <StatusBadge
                  status={
                    row.action === "delete"
                      ? "danger"
                      : row.action === "create"
                        ? "success"
                        : "info"
                  }
                  label={row.action || "—"}
                />
              ),
            },
            {
              key: "description",
              header: "Description",
              cell: (row) => (
                <span className="text-slate-700 dark:text-slate-300">
                  {row.description || "—"}
                </span>
              ),
            },
            {
              key: "ip_address",
              header: "IP Address",
              cell: (row) => (
                <span className="whitespace-nowrap font-numeric text-xs text-slate-500 dark:text-slate-400">
                  {row.ip_address || "—"}
                </span>
              ),
            },
          ]}
          data={data.results || []}
          isLoading={query.isLoading}
          page={page}
          total={data.count || 0}
          onPageChange={setPage}
          emptyTitle="No audit logs found"
          emptyDescription="No administrative activity matches the current search."
        />
      </section>
    </div>
  );
}
