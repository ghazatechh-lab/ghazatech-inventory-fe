import React from "react";
import { Eye, Lock, Plus, Printer, Unlock, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { extractRows, money } from "./accountingUtils";

export default function PeriodClosePage() {
  const qc = useQueryClient();
  const { branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("overview");
  const [periodId, setPeriodId] = React.useState("");
  const [filters, setFilters] = React.useState({
    branch: "",
    close_type: "MONTH_END",
  });
  const [action, setAction] = React.useState(null);
  const [reason, setReason] = React.useState("");

  const branchesQ = useQuery({
    queryKey: ["pc-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const periodsQ = useQuery({
    queryKey: ["pc-periods", branchParams],
    queryFn: () =>
      api.get("/finance/periods/", {
        params: { ...branchParams, page_size: 500, ordering: "-start_date" },
      }),
    staleTime: 0,
  });
  const dataQ = useQuery({
    queryKey: ["pc-data", periodId, filters],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/reporting/period-close/", {
          params: {
            period: periodId || undefined,
            branch: filters.branch || undefined,
            close_type: filters.close_type,
          },
        }),
      ),
    staleTime: 0,
  });

  const branches = extractRows(branchesQ.data),
    periods = extractRows(periodsQ.data),
    data = dataQ.data || {};
  const current =
    data.period ||
    periods.find((p) => String(p.id) === String(periodId)) ||
    periods[0];

  React.useEffect(() => {
    if (!periodId && periods[0]) setPeriodId(String(periods[0].id));
  }, [periodId, periods]);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["pc-data"] }),
      qc.invalidateQueries({ queryKey: ["pc-periods"] }),
    ]);

  const taskMutation = useMutation({
    mutationFn: ({ taskId, completed }) =>
      api.post(
        `/finance/reporting/period-close/${current.id}/tasks/${taskId}/`,
        { completed },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Checklist task updated.");
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to update task", {
        description: d.summary || d.message,
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ name }) =>
      api.post(
        `/finance/reporting/period-close/${current.id}/${name}/`,
        name === "reopen" ? { reason } : {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Period updated.");
      setAction(null);
      setReason("");
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to update period", {
        description: d.summary || d.message,
      });
    },
  });

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Period Close"
        subtitle="Manage month-end and year-end close tasks, reconciliations, adjustments, approvals, and posting locks."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Period
            </Button>
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["overview", "Close Overview"],
          ["checklist", "Close Checklist"],
          ["reconciliation", "Reconciliations"],
          ["adjustments", "Adjustments"],
          ["locks", "Period Locks"],
          ["history", "Close History"],
        ]}
      />
      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Accounting Period">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || `${p.start_date} → ${p.end_date}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Company">
          <Input disabled value="Ghaza Computer TR LLC" />
        </Field>
        <Field label="Branch">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.branch}
            onChange={(e) =>
              setFilters((x) => ({ ...x, branch: e.target.value }))
            }
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name || b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Close Type">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.close_type}
            onChange={(e) =>
              setFilters((x) => ({ ...x, close_type: e.target.value }))
            }
          >
            <option value="MONTH_END">Month End</option>
            <option value="QUARTER_END">Quarter End</option>
            <option value="YEAR_END">Year End</option>
          </select>
        </Field>
      </div>
      {tab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              l="Checklist Completion"
              v={`${Number(data.checklist_completion || 0).toFixed(0)}%`}
              tone="amber"
            />
            <Kpi l="Blocking Issues" v={data.blocking_issues || 0} tone="red" />
            <Kpi
              l="Reconciliations Complete"
              v={`${data.reconciliations_complete || 0} / ${data.reconciliations_total || 0}`}
              tone="green"
            />
            <Kpi l="Target Close Date" v={data.target_close_date || "—"} />
          </div>
          <Table
            headers={[
              "Period",
              "Type",
              "Branch Scope",
              "Start",
              "End",
              "Progress",
              "Status",
              "Owner",
              "Target Close",
              "Actions",
            ]}
            rows={periods.map((p) => [
              p.name,
              p.close_type_display || p.close_type,
              p.branch_scope_name || "All Branches",
              p.start_date,
              p.end_date,
              `${Number(p.progress_percent || 0).toFixed(0)}%`,
              <StatusBadge status={p.status} />,
              p.owner_name || "—",
              p.target_close_date || "—",
              <Button size="icon" variant="ghost">
                <Eye className="h-4 w-4" />
              </Button>,
            ])}
          />
        </>
      )}
      {tab === "checklist" && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="space-y-2">
            {(data.checklist || []).map((t) => (
              <div
                key={t.id}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.4fr_.8fr_.7fr_.7fr_auto] md:items-center"
              >
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.module}</p>
                </div>
                <span>{t.owner_name || "—"}</span>
                <span>{t.due_date || "—"}</span>
                <StatusBadge status={t.status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    taskMutation.mutate({
                      taskId: t.id,
                      completed: !t.completed,
                    })
                  }
                >
                  {t.completed ? "Reopen" : "Complete"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "reconciliation" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              l="Completed"
              v={data.reconciliation_summary?.completed || 0}
              tone="green"
            />
            <Kpi
              l="Pending"
              v={data.reconciliation_summary?.pending || 0}
              tone="amber"
            />
            <Kpi
              l="Differences"
              v={money(data.reconciliation_summary?.difference || 0)}
              tone="red"
            />
            <Kpi
              l="Accounts Checked"
              v={data.reconciliation_summary?.accounts_checked || 0}
            />
          </div>
          <Table
            headers={[
              "Reconciliation",
              "GL Account",
              "GL Balance",
              "Subledger / Statement",
              "Difference",
              "Owner",
              "Status",
              "Approved By",
            ]}
            rows={(data.reconciliations || []).map((r) => [
              r.name,
              r.gl_account_name,
              money(r.gl_balance),
              money(r.subledger_balance),
              money(r.difference),
              r.owner_name,
              <StatusBadge status={r.status} />,
              r.approved_by_name || "—",
            ])}
          />
        </>
      )}
      {tab === "adjustments" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              l="Draft Adjustments"
              v={data.adjustment_summary?.draft || 0}
              tone="amber"
            />
            <Kpi
              l="Posted Adjustments"
              v={data.adjustment_summary?.posted || 0}
              tone="green"
            />
            <Kpi
              l="Accruals"
              v={money(data.adjustment_summary?.accruals || 0)}
            />
            <Kpi
              l="Prepayments Released"
              v={money(data.adjustment_summary?.prepayments || 0)}
            />
          </div>
          <Table
            headers={[
              "Journal No.",
              "Type",
              "Description",
              "Date",
              "Debit",
              "Credit",
              "Reversing",
              "Status",
              "Approved By",
            ]}
            rows={(data.adjustments || []).map((a) => [
              a.journal_number,
              a.adjustment_type,
              a.description,
              a.date,
              money(a.debit),
              money(a.credit),
              a.reversing_date || "No",
              <StatusBadge status={a.status} />,
              a.approved_by_name || "—",
            ])}
          />
        </>
      )}
      {tab === "locks" && (
        <>
          <Table
            headers={[
              "Module",
              "Branch Scope",
              "Lock Through",
              "Allowed Roles",
              "Status",
              "Locked By",
              "Locked Date",
              "Actions",
            ]}
            rows={(data.locks || []).map((l) => [
              l.module,
              l.branch_scope_name || "All Branches",
              l.lock_through,
              l.allowed_roles,
              <StatusBadge status={l.status} />,
              l.locked_by_name || "—",
              l.locked_at || "—",
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAction({ name: l.status === "LOCKED" ? "reopen" : "lock" })
                }
              >
                {l.status === "LOCKED" ? (
                  <Unlock className="mr-2 h-4 w-4" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {l.status === "LOCKED" ? "Reopen" : "Lock"}
              </Button>,
            ])}
          />
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Reopening a locked period requires a reason, elevated permission,
            approval, and audit logging.
          </div>
        </>
      )}
      {tab === "history" && (
        <div className="space-y-3">
          {(data.history || []).map((h, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[140px_1fr_200px_120px]"
            >
              <strong>{h.date}</strong>
              <div>
                <p className="font-semibold">{h.title}</p>
                <p className="text-xs text-muted-foreground">{h.description}</p>
              </div>
              <span>{h.user_name}</span>
              <StatusBadge status={h.status} />
            </div>
          ))}
        </div>
      )}
      {action && (
        <Confirm
          title={`${action.name} period`}
          reason={reason}
          setReason={setReason}
          needsReason={action.name === "reopen"}
          onClose={() => setAction(null)}
          onConfirm={() => actionMutation.mutate(action)}
        />
      )}
    </div>
  );
}
function Confirm({
  title,
  reason,
  setReason,
  needsReason,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background p-5">
        <div className="mb-4 flex justify-between">
          <h3 className="font-bold capitalize">{title}</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {needsReason && (
          <Field label="Reason">
            <Textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5">
      {items.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${value === v ? "bg-blue-600 text-white" : "text-muted-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {r.map((v, j) => (
                <td key={j} className="px-4 py-3">
                  {v ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Kpi({ l, v, tone }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{l}</p>
      <p
        className={`mt-2 text-2xl font-black ${tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}
