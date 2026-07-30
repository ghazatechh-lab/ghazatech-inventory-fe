import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractRows } from "./accountingUtils";
import { FinanceModal } from "./FinanceSectionUI";
const blank = () => ({
  name: "",
  branch: "",
  start_date: "",
  end_date: "",
  notes: "",
});
export default function PeriodClosePage() {
  const qc = useQueryClient();
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => {
    if (branchId) setForm((c) => ({ ...c, branch: String(branchId) }));
  }, [branchId]);
  const q = useQuery({
    queryKey: ["period-close", branchId],
    queryFn: () =>
      api.get("/finance/reporting/period-close/", { params: branchParams }),
    staleTime: 0,
  });
  const bq = useQuery({
    queryKey: ["period-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const periods = extractRows(q.data),
    branches = extractRows(bq.data),
    p = periods[0];
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["period-close"], exact: false });
    await q.refetch();
  };
  const create = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/reporting/period-close/",
        { ...form, branch: form.branch ? Number(form.branch) : null },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      setForm(blank());
      toast.success("Accounting period created.");
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to create period", {
        description: d.summary || d.message,
      });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ task, completed }) =>
      api.post(`/finance/reporting/period-close/${p.id}/tasks/${task.id}/`, {
        completed,
      }),
    onSuccess: refresh,
  });
  const action = useMutation({
    mutationFn: (a) =>
      api.post(`/finance/reporting/period-close/${p.id}/${a}/`, {}),
    onSuccess: refresh,
    onError: (e) =>
      toast.error(e?.response?.data?.detail || "Unable to update period"),
  });
  const tasks = p?.close_tasks || [],
    done = tasks.filter((t) => t.is_completed).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Period Close"
        subtitle={
          isAllBranches
            ? "Month-end close controls across all branches."
            : "Month-end checklist and posting lock for the selected branch."
        }
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Period
            </Button>
          </div>
        }
      />
      {!p ? (
        <div className="rounded-2xl border p-10 text-center text-muted-foreground">
          No accounting period found.
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-xl font-semibold">
                {p.name} Close Checklist
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.branch_name} · {p.start_date} to {p.end_date}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {done} of {tasks.length} complete
            </span>
          </div>
          {tasks.map((t) => (
            <label
              key={t.id}
              className="flex items-center justify-between gap-4 border-b px-5 py-4"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={t.is_completed}
                  disabled={p.status === "LOCKED"}
                  onChange={(e) =>
                    toggle.mutate({ task: t, completed: e.target.checked })
                  }
                />
                <span>{t.title}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {t.responsible_role_display}
              </span>
            </label>
          ))}
          <div className="flex justify-end gap-3 border-t p-5">
            {p.status !== "LOCKED" && (
              <Button
                type="button"
                disabled={done !== tasks.length}
                onClick={() => action.mutate("close")}
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
              >
                Close Period
              </Button>
            )}
            {p.status === "CLOSED" && (
              <Button
                type="button"
                onClick={() => action.mutate("lock")}
                className="bg-red-700 text-white hover:bg-red-800"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                Lock Period
              </Button>
            )}
          </div>
        </section>
      )}
      <FinanceModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Finance & Accounting · Period Close"
        title="New Accounting Period"
        subtitle="A seven-step close checklist is generated automatically."
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => create.mutate()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              Create Period
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Period Name *</Label>
            <Input
              className="mt-2"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>
              Branch {isAllBranches ? "(optional for consolidated close)" : "*"}
            </Label>
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3"
              value={form.branch}
              onChange={(e) =>
                setForm((c) => ({ ...c, branch: e.target.value }))
              }
            >
              <option value="">All branches / consolidated</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name || b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Start Date *</Label>
            <Input
              className="mt-2"
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((c) => ({ ...c, start_date: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>End Date *</Label>
            <Input
              className="mt-2"
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm((c) => ({ ...c, end_date: e.target.value }))
              }
            />
          </div>
        </div>
      </FinanceModal>
    </div>
  );
}
