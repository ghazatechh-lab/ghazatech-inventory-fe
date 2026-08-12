import React from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Printer,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
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
import { extractRows, money, today } from "./accountingUtils";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const num = (v) => Number(v || 0);
const norm = (v) => String(v || "").toUpperCase();
const blankLine = () => ({
  account: "",
  department: "",
  branch: "",
  cost_center: "",
  jan: "0",
  feb: "0",
  mar: "0",
  apr: "0",
  may: "0",
  jun: "0",
  jul: "0",
  aug: "0",
  sep: "0",
  oct: "0",
  nov: "0",
  dec: "0",
});
const y = new Date().getFullYear() + 1;
const blankBudget = (branchId = "") => ({
  budget_name: `FY ${y} Annual Budget`,
  budget_type: "ANNUAL_OPERATING",
  fiscal_year: String(y),
  company_name: "Ghaza Computer TR LLC",
  branch_scope: branchId ? String(branchId) : "",
  department_scope: "",
  currency: "AED",
  start_date: `${y}-01-01`,
  end_date: `${y}-12-31`,
  budget_owner: "",
  description: "",
  revenue_growth_percent: "8",
  cost_inflation_percent: "4",
  headcount_growth_percent: "3",
  exchange_rate_assumption: "1.0000",
  control_level: "ACCOUNT_DEPARTMENT_BRANCH",
  warning_threshold_percent: "80",
  block_threshold_percent: "100",
  commitment_basis: "ACTUAL_PO_REQUISITION",
  variance_tolerance: "0",
  revision_policy: "APPROVAL_REQUIRED",
  enable_budget_control: true,
  block_over_budget: true,
  include_commitments: true,
  allow_budget_transfers: true,
  approval_workflow: "DEPT_FINANCE_MD",
  primary_approver: "",
  approval_priority: "NORMAL",
  approval_notes: "",
  lines: [blankLine()],
});
const editable = (s) => ["DRAFT", "REJECTED"].includes(norm(s));

export default function BudgetingPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("overview");
  const [mode, setMode] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [form, setForm] = React.useState(() => blankBudget(branchId));
  const [filters, setFilters] = React.useState({
    budget: "",
    branch: "",
    department: "",
    period: "YTD",
    status: "",
  });
  const [workflow, setWorkflow] = React.useState(null);
  const [reason, setReason] = React.useState("");

  const branchesQ = useQuery({
    queryKey: ["budget-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const accountsQ = useQuery({
    queryKey: ["budget-accounts"],
    queryFn: () =>
      api.get("/finance/accounts/", {
        params: { is_active: true, page_size: 2000, ordering: "code" },
      }),
  });
  const usersQ = useQuery({
    queryKey: ["budget-users"],
    queryFn: () => api.get("/auth/users/form-options/"),
  });
  const budgetsQ = useQuery({
    queryKey: ["budgets", branchParams, filters],
    queryFn: () =>
      api.get("/finance/budgets/", {
        params: {
          ...branchParams,
          branch: filters.branch || undefined,
          status: filters.status || undefined,
          page_size: 1000,
        },
      }),
    staleTime: 0,
  });
  const summaryQ = useQuery({
    queryKey: ["budget-summary", branchParams, filters],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/budgets/summary/", {
          params: {
            ...branchParams,
            budget: filters.budget || undefined,
            branch: filters.branch || undefined,
            department: filters.department || undefined,
            period: filters.period,
          },
        }),
      ),
    staleTime: 0,
  });
  const varianceQ = useQuery({
    queryKey: ["budget-variance", branchParams, filters],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/budgets/variance/", {
          params: {
            ...branchParams,
            budget: filters.budget || undefined,
            branch: filters.branch || undefined,
            department: filters.department || undefined,
            period: filters.period,
          },
        }),
      ),
    staleTime: 0,
  });
  const revisionsQ = useQuery({
    queryKey: ["budget-revisions", branchParams],
    queryFn: () =>
      api.get("/finance/budget-revisions/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });

  const branches = extractRows(branchesQ.data),
    accounts = extractRows(accountsQ.data),
    budgets = extractRows(budgetsQ.data),
    revisions = extractRows(revisionsQ.data);
  const raw = usersQ.data?.data ?? usersQ.data;
  const users = Array.isArray(raw) ? raw : raw?.users || raw?.results || [];
  const summary = summaryQ.data || {},
    variance = varianceQ.data || {};
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["budgets"] }),
      qc.invalidateQueries({ queryKey: ["budget-summary"] }),
      qc.invalidateQueries({ queryKey: ["budget-variance"] }),
      qc.invalidateQueries({ queryKey: ["budget-revisions"] }),
    ]);

  const openExisting = async (row, requested = "view") => {
    try {
      const d = unwrap(await api.get(`/finance/budgets/${row.id}/`));
      setActive(d);
      setForm({
        ...blankBudget(branchId),
        ...d,
        branch_scope: d.branch_scope
          ? String(d.branch_scope?.id || d.branch_scope)
          : "",
        budget_owner: d.budget_owner
          ? String(d.budget_owner?.id || d.budget_owner)
          : "",
        primary_approver: d.primary_approver
          ? String(d.primary_approver?.id || d.primary_approver)
          : "",
        lines: (d.lines || []).map((l) => ({
          ...blankLine(),
          ...l,
          account: String(l.account?.id || l.account || ""),
          branch: l.branch ? String(l.branch?.id || l.branch) : "",
        })),
      });
      setMode(requested === "edit" && !editable(d.status) ? "view" : requested);
    } catch (e) {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to open budget", {
        description: d.summary || d.message,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ submit }) => {
      if (
        !form.budget_name ||
        !form.fiscal_year ||
        !form.budget_owner ||
        !form.lines.length
      )
        throw new Error("Complete required budget fields.");
      const payload = {
        ...form,
        branch_scope: form.branch_scope ? Number(form.branch_scope) : null,
        budget_owner: Number(form.budget_owner),
        primary_approver: form.primary_approver
          ? Number(form.primary_approver)
          : null,
        revenue_growth_percent: num(form.revenue_growth_percent),
        cost_inflation_percent: num(form.cost_inflation_percent),
        headcount_growth_percent: num(form.headcount_growth_percent),
        exchange_rate_assumption: num(form.exchange_rate_assumption),
        warning_threshold_percent: num(form.warning_threshold_percent),
        block_threshold_percent: num(form.block_threshold_percent),
        variance_tolerance: num(form.variance_tolerance),
        lines: form.lines.map((l) => ({
          ...l,
          account: Number(l.account),
          branch: l.branch ? Number(l.branch) : null,
          ...Object.fromEntries(MONTHS.map((m) => [m, num(l[m])])),
        })),
      };
      const r =
        mode === "edit"
          ? await api.put(`/finance/budgets/${active.id}/`, payload, {
              skipGlobalErrorToast: true,
            })
          : await api.post("/finance/budgets/", payload, {
              skipGlobalErrorToast: true,
            });
      const saved = unwrap(r);
      if (submit)
        await api.post(
          `/finance/budgets/${saved.id}/submit-approval/`,
          {},
          { skipGlobalErrorToast: true },
        );
      return { submit };
    },
    onSuccess: async ({ submit }) => {
      await refresh();
      toast.success(
        submit ? "Budget submitted for approval." : "Budget saved.",
      );
      setMode(null);
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(
        e?.message && !e?.response
          ? e.message
          : d.title || "Unable to save budget",
        { description: d.summary || d.message },
      );
    },
  });

  const workflowMutation = useMutation({
    mutationFn: ({ budget, action }) =>
      api.post(
        `/finance/budgets/${budget.id}/${action}/`,
        action === "reject" ? { reason } : {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Budget updated.");
      setWorkflow(null);
      setReason("");
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to update budget", {
        description: d.summary || d.message,
      });
    },
  });

  if (mode)
    return (
      <BudgetForm
        mode={mode}
        active={active}
        form={form}
        setForm={setForm}
        branches={branches}
        accounts={accounts}
        users={users}
        saveMutation={saveMutation}
        onClose={() => setMode(null)}
      />
    );

  const lines = variance.lines || summary.lines || [];
  const approvals = budgets.filter((b) =>
    ["PENDING_APPROVAL", "APPROVED"].includes(norm(b.status)),
  );

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Budgeting"
        subtitle="Plan annual and departmental budgets, monitor actuals, manage revisions, and control overspending."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={() => {
                setActive(null);
                setForm(blankBudget(branchId));
                setMode("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Button>
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["overview", "Budget Overview"],
          ["lines", "Budget Lines"],
          ["variance", "Budget vs Actual"],
          ["revisions", "Revisions"],
          ["approvals", "Approval Queue"],
        ]}
      />
      {["overview", "lines"].includes(tab) && (
        <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Budget">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={filters.budget}
              onChange={(e) =>
                setFilters((x) => ({ ...x, budget: e.target.value }))
              }
            >
              <option value="">All budgets</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.budget_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Branch">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={filters.branch}
              onChange={(e) =>
                setFilters((x) => ({ ...x, branch: e.target.value }))
              }
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name || b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <Input
              value={filters.department}
              onChange={(e) =>
                setFilters((x) => ({ ...x, department: e.target.value }))
              }
            />
          </Field>
          <Field label="Period">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={filters.period}
              onChange={(e) =>
                setFilters((x) => ({ ...x, period: e.target.value }))
              }
            >
              <option value="YTD">Year to Date</option>
              <option value="MONTH">Current Month</option>
              <option value="QUARTER">Quarter</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={filters.status}
              onChange={(e) =>
                setFilters((x) => ({ ...x, status: e.target.value }))
              }
            >
              <option value="">All</option>
              {[
                "DRAFT",
                "PENDING_APPROVAL",
                "APPROVED",
                "ACTIVE",
                "REJECTED",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {tab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi l="Approved Budget" v={money(summary.approved_budget || 0)} />
            <Kpi
              l="Actual Spend YTD"
              v={money(summary.actual_spend_ytd || 0)}
              tone="green"
            />
            <Kpi
              l="Committed Spend"
              v={money(summary.committed_spend || 0)}
              tone="amber"
            />
            <Kpi
              l="Over-Budget Lines"
              v={summary.over_budget_lines || 0}
              tone="red"
            />
          </div>
          <SimpleTable
            headers={[
              "Budget",
              "Status",
              "Owner",
              "Version",
              "Updated",
              "Actions",
            ]}
            rows={budgets.map((b) => [
              b.budget_name,
              <StatusBadge status={b.status} />,
              b.budget_owner_name || "—",
              b.version_label || `Rev ${b.version || 1}`,
              b.updated_at ? new Date(b.updated_at).toLocaleDateString() : "—",
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openExisting(b, "view")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {editable(b.status) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openExisting(b, "edit")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>,
            ])}
          />
        </>
      )}
      {tab === "lines" && (
        <SimpleTable
          headers={[
            "Account",
            "Department",
            "Branch",
            "Annual Budget",
            "Actual YTD",
            "Committed",
            "Available",
            "Variance",
            "% Used",
            "Status",
          ]}
          rows={lines.map((l) => [
            `${l.account_code || ""} ${l.account_name || ""}`.trim(),
            l.department || "—",
            l.branch_name || "All",
            money(l.annual_budget),
            money(l.actual_ytd),
            money(l.committed),
            money(l.available),
            money(l.variance),
            `${Number(l.used_percent || 0).toFixed(1)}%`,
            <StatusBadge status={l.status || "WITHIN_BUDGET"} />,
          ])}
        />
      )}
      {tab === "variance" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              l="Favorable Variance"
              v={money(variance.favorable_variance || 0)}
              tone="green"
            />
            <Kpi
              l="Unfavorable Variance"
              v={money(variance.unfavorable_variance || 0)}
              tone="red"
            />
            <Kpi
              l="Forecast at Completion"
              v={money(variance.forecast_at_completion || 0)}
              tone="amber"
            />
            <Kpi
              l="Forecast Variance"
              v={money(variance.forecast_variance || 0)}
            />
          </div>
          <SimpleTable
            headers={[
              "Account",
              "Department",
              "Budget YTD",
              "Actual YTD",
              "Committed",
              "Forecast",
              "Variance",
              "Variance %",
              "Status",
            ]}
            rows={(variance.analysis || []).map((r) => [
              r.account_name,
              r.department,
              money(r.budget_ytd),
              money(r.actual_ytd),
              money(r.committed),
              money(r.forecast),
              money(r.variance),
              `${Number(r.variance_percent || 0).toFixed(1)}%`,
              <StatusBadge status={r.status} />,
            ])}
          />
        </>
      )}
      {tab === "revisions" && (
        <SimpleTable
          headers={[
            "Revision No.",
            "Date",
            "Budget",
            "Type",
            "From",
            "To",
            "Amount",
            "Reason",
            "Status",
            "Approved By",
          ]}
          rows={revisions.map((r) => [
            r.revision_number,
            r.revision_date,
            r.budget_name,
            r.revision_type,
            r.from_account_name || "—",
            r.to_account_name || "—",
            money(r.amount),
            r.reason,
            <StatusBadge status={r.status} />,
            r.approved_by_name || "—",
          ])}
        />
      )}
      {tab === "approvals" && (
        <SimpleTable
          headers={[
            "Budget",
            "Type",
            "Owner",
            "Amount",
            "Priority",
            "Status",
            "Actions",
          ]}
          rows={approvals.map((b) => [
            b.budget_name,
            b.budget_type_display || b.budget_type,
            b.budget_owner_name || "—",
            money(b.total_budget),
            b.approval_priority,
            <StatusBadge status={b.status} />,
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openExisting(b, "view")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {norm(b.status) === "PENDING_APPROVAL" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setWorkflow({ budget: b, action: "approve" })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setWorkflow({ budget: b, action: "reject" })}
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              )}
              {norm(b.status) === "APPROVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWorkflow({ budget: b, action: "activate" })}
                >
                  Activate
                </Button>
              )}
            </div>,
          ])}
        />
      )}
      {workflow && (
        <Confirm
          title={`${workflow.action} budget`}
          reason={reason}
          setReason={setReason}
          needsReason={workflow.action === "reject"}
          onClose={() => setWorkflow(null)}
          onConfirm={() => workflowMutation.mutate(workflow)}
        />
      )}
    </div>
  );
}

function BudgetForm({
  mode,
  active,
  form,
  setForm,
  branches,
  accounts,
  users,
  saveMutation,
  onClose,
}) {
  const ro = mode === "view",
    totalLine = (l) => MONTHS.reduce((s, m) => s + num(l[m]), 0),
    total = form.lines.reduce((s, l) => s + totalLine(l), 0);
  const setLine = (i, k, v) =>
    setForm((x) => ({
      ...x,
      lines: x.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)),
    }));
  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title={
          mode === "create" ? "New Budget" : active?.budget_number || "Budget"
        }
        subtitle="Allocate budgets by account, branch, department and month, then submit for approval."
        actions={
          <div className="flex gap-2">
            {active && <StatusBadge status={active.status} />}
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Section t="01 Budget Details">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Budget Number">
              <Input
                disabled
                value={active?.budget_number || "Auto-generated on save"}
              />
            </Field>
            <Field label="Budget Name *">
              <Input
                disabled={ro}
                value={form.budget_name}
                onChange={(e) =>
                  setForm((x) => ({ ...x, budget_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Budget Type">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.budget_type}
                onChange={(e) =>
                  setForm((x) => ({ ...x, budget_type: e.target.value }))
                }
              >
                <option value="ANNUAL_OPERATING">Annual Operating</option>
                <option value="CAPEX">CAPEX</option>
                <option value="PROJECT">Project</option>
                <option value="DEPARTMENT">Department</option>
              </select>
            </Field>
            <Field label="Fiscal Year">
              <Input
                disabled={ro}
                value={form.fiscal_year}
                onChange={(e) =>
                  setForm((x) => ({ ...x, fiscal_year: e.target.value }))
                }
              />
            </Field>
            <Field label="Branch Scope">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.branch_scope}
                onChange={(e) =>
                  setForm((x) => ({ ...x, branch_scope: e.target.value }))
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
            <Field label="Department Scope">
              <Input
                disabled={ro}
                value={form.department_scope}
                onChange={(e) =>
                  setForm((x) => ({ ...x, department_scope: e.target.value }))
                }
              />
            </Field>
            <Field label="Currency">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.currency}
                onChange={(e) =>
                  setForm((x) => ({ ...x, currency: e.target.value }))
                }
              >
                <option>AED</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Budget Owner *">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.budget_owner}
                onChange={(e) =>
                  setForm((x) => ({ ...x, budget_owner: e.target.value }))
                }
              >
                <option value="">Select owner</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start Date">
              <Input
                type="date"
                disabled={ro}
                value={form.start_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, start_date: e.target.value }))
                }
              />
            </Field>
            <Field label="End Date">
              <Input
                type="date"
                disabled={ro}
                value={form.end_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, end_date: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description">
              <Textarea
                disabled={ro}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((x) => ({ ...x, description: e.target.value }))
                }
              />
            </Field>
          </div>
        </Section>
        <Section t="02 Planning Assumptions">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Revenue Growth %">
              <Input
                type="number"
                disabled={ro}
                value={form.revenue_growth_percent}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    revenue_growth_percent: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Cost Inflation %">
              <Input
                type="number"
                disabled={ro}
                value={form.cost_inflation_percent}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    cost_inflation_percent: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Headcount Growth %">
              <Input
                type="number"
                disabled={ro}
                value={form.headcount_growth_percent}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    headcount_growth_percent: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Exchange Rate">
              <Input
                type="number"
                disabled={ro}
                value={form.exchange_rate_assumption}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    exchange_rate_assumption: e.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </Section>
        <Section t="03 Budget Lines">
          <div className="overflow-x-auto">
            <div className="min-w-[2200px] space-y-2">
              {form.lines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.3fr_.9fr_.9fr_.9fr_repeat(12,.65fr)_.85fr_44px] gap-2"
                >
                  <select
                    disabled={ro}
                    className="h-10 rounded-md border bg-background px-2"
                    value={l.account}
                    onChange={(e) => setLine(i, "account", e.target.value)}
                  >
                    <option value="">Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    disabled={ro}
                    placeholder="Department"
                    value={l.department}
                    onChange={(e) => setLine(i, "department", e.target.value)}
                  />
                  <select
                    disabled={ro}
                    className="h-10 rounded-md border bg-background px-2"
                    value={l.branch}
                    onChange={(e) => setLine(i, "branch", e.target.value)}
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    disabled={ro}
                    placeholder="Cost Center"
                    value={l.cost_center}
                    onChange={(e) => setLine(i, "cost_center", e.target.value)}
                  />
                  {MONTHS.map((m) => (
                    <Input
                      key={m}
                      type="number"
                      disabled={ro}
                      value={l[m]}
                      onChange={(e) => setLine(i, m, e.target.value)}
                    />
                  ))}
                  <Input disabled value={money(totalLine(l))} />
                  <Button
                    disabled={ro || form.lines.length === 1}
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm((x) => ({
                        ...x,
                        lines: x.lines.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {!ro && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() =>
                setForm((x) => ({ ...x, lines: [...x.lines, blankLine()] }))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Budget Line
            </Button>
          )}
          <div className="mt-4">
            <Kpi l="Total Budget" v={money(total)} />
          </div>
        </Section>
        <Section t="04 Budget Controls">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Warning Threshold %">
              <Input
                type="number"
                disabled={ro}
                value={form.warning_threshold_percent}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    warning_threshold_percent: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Block Threshold %">
              <Input
                type="number"
                disabled={ro}
                value={form.block_threshold_percent}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    block_threshold_percent: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Variance Tolerance">
              <Input
                type="number"
                disabled={ro}
                value={form.variance_tolerance}
                onChange={(e) =>
                  setForm((x) => ({ ...x, variance_tolerance: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-2">
            {[
              ["enable_budget_control", "Enable budget control"],
              ["block_over_budget", "Block over-budget transactions"],
              ["include_commitments", "Include commitments"],
              ["allow_budget_transfers", "Allow budget transfers"],
            ].map(([k, l]) => (
              <label
                key={k}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <span>{l}</span>
                <input
                  type="checkbox"
                  disabled={ro}
                  checked={form[k]}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, [k]: e.target.checked }))
                  }
                />
              </label>
            ))}
          </div>
        </Section>
        <Section t="05 Approval Workflow">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Workflow">
              <Input
                disabled
                value="Department Heads → Finance Manager → Managing Director"
              />
            </Field>
            <Field label="Primary Approver">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.primary_approver}
                onChange={(e) =>
                  setForm((x) => ({ ...x, primary_approver: e.target.value }))
                }
              >
                <option value="">Select approver</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approval_priority}
                onChange={(e) =>
                  setForm((x) => ({ ...x, approval_priority: e.target.value }))
                }
              >
                <option>NORMAL</option>
                <option>HIGH</option>
                <option>URGENT</option>
              </select>
            </Field>
          </div>
        </Section>
        <div className="flex justify-end gap-2 bg-muted/20 p-5">
          <Button variant="outline" onClick={onClose}>
            {ro ? "Close" : "Cancel"}
          </Button>
          {!ro && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate({ submit: false })}
              >
                Save Draft
              </Button>
              <Button onClick={() => saveMutation.mutate({ submit: true })}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>
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
function SimpleTable({ headers, rows }) {
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
function Section({ t, children }) {
  return (
    <section className="border-b p-5 md:p-6">
      <h3 className="mb-4 font-bold">{t}</h3>
      {children}
    </section>
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
