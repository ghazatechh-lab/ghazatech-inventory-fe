import React from "react";
import { Plus, X, CalendarDays } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { BranchSourceFilter, usePhysicalBranchScope } from "@/components/common/PhysicalBranchScope";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { normalizeList, today } from "./hrmsUtils";

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const branchScope = usePhysicalBranchScope();
  const { listParams: branchParams } = branchScope;
  const [tab, setTab] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [showLeaveTypeForm, setShowLeaveTypeForm] = React.useState(false);
  const [leaveTypeForm, setLeaveTypeForm] = React.useState({
    name: "",
    annual_limit: "",
    is_paid: true,
  });
  const [leaveTypeSaving, setLeaveTypeSaving] = React.useState(false);
  const [leaveTypeError, setLeaveTypeError] = React.useState("");
  const [leaveError, setLeaveError] = React.useState("");
  const [form, setForm] = React.useState({
    employee: "",
    leave_type: "",
    from_date: today(),
    to_date: today(),
    reason: "",
  });

  const params = { ...branchParams, ...(tab ? { status: tab } : {}) };
  const { query, q, setQ, page, setPage } = useListQuery(
    "leave-requests",
    "/hrms/leaves/",
    params,
  );
  const { data: options = {} } = useQuery({
    queryKey: ["leave-options", branchParams],
    queryFn: async () => unwrap(await api.get("/hrms/leaves/form-options/", { params: branchParams })),
  });
  const data = query.data || { results: [], count: 0 };

  const refreshLeaveOptions = async () => {
    await queryClient.invalidateQueries({ queryKey: ["leave-options"] });
  };

  const leaveTypes = normalizeList(options.leave_types);
  const employees = normalizeList(options.employees);
  const leaveDays = React.useMemo(() => {
    if (!form.from_date || !form.to_date || form.to_date < form.from_date) return 0;
    const start = Date.parse(`${form.from_date}T00:00:00Z`);
    const end = Date.parse(`${form.to_date}T00:00:00Z`);
    return Number.isFinite(start) && Number.isFinite(end)
      ? Math.round((end - start) / 86400000) + 1
      : 0;
  }, [form.from_date, form.to_date]);

  const resetLeaveTypeForm = () => {
    setLeaveTypeForm({ name: "", annual_limit: "", is_paid: true });
    setLeaveTypeError("");
    setShowLeaveTypeForm(false);
  };

  const selectAnnualLeave = () => {
    const annual = leaveTypes.find((item) =>
      /annual\s*leave/i.test(String(item.name || "")),
    );
    if (annual) {
      setForm((current) => ({ ...current, leave_type: String(annual.id) }));
      setShowLeaveTypeForm(false);
      setLeaveError("");
    } else {
      setLeaveTypeForm({ name: "Annual Leave", annual_limit: "", is_paid: true });
      setLeaveTypeError("");
      setShowLeaveTypeForm(true);
    }
  };

  const addLeaveType = async () => {
    const name = leaveTypeForm.name.trim();
    const rawLimit = String(leaveTypeForm.annual_limit).trim();
    const limit = Number(rawLimit);
    if (!name) {
      setLeaveTypeError("Enter a leave type name, for example Annual Leave.");
      return;
    }
    if (!rawLimit || !Number.isInteger(limit) || limit < 0 || limit > 366) {
      setLeaveTypeError("Annual entitlement must be a whole number from 0 to 366.");
      return;
    }
    if (leaveTypes.some((item) => String(item.name || "").trim().toLowerCase() === name.toLowerCase())) {
      setLeaveTypeError("This leave type already exists. Select it in the list above.");
      return;
    }
    setLeaveTypeError("");
    setLeaveTypeSaving(true);
    try {
      const response = await api.post(
        "/hrms/leave-types/",
        {
          name,
          annual_limit: limit,
          is_paid: Boolean(leaveTypeForm.is_paid),
          requires_document: false,
          is_active: true,
        },
        { skipGlobalErrorToast: true },
      );
      const created = unwrap(response);
      await refreshLeaveOptions();
      if (created?.id != null) {
        setForm((current) => ({ ...current, leave_type: String(created.id) }));
      }
      resetLeaveTypeForm();
      toast.success("Leave type saved and selected.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      const message = details.summary || details.message || "Check the leave type details and try again.";
      setLeaveTypeError(message);
      toast.error(details.title || "Unable to add leave type");
    } finally {
      setLeaveTypeSaving(false);
    }
  };

  const submitLeave = () => {
    if (!form.employee) return setLeaveError("Select an employee.");
    if (!form.leave_type) return setLeaveError("Select a leave type.");
    if (!form.from_date || !form.to_date) return setLeaveError("Select both leave dates.");
    if (form.to_date < form.from_date) return setLeaveError("End date cannot be before start date.");
    if (!form.reason.trim()) return setLeaveError("Enter the reason for the leave request.");
    setLeaveError("");
    save.mutate();
  };

  const save = useMutation({
    mutationFn: () =>
      api.post("/hrms/leaves/", {
        ...form,
        reason: form.reason.trim(),
        employee: Number(form.employee),
        leave_type: Number(form.leave_type),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted.");
      setOpen(false);
      resetLeaveTypeForm();
      setLeaveError("");
      setForm({ employee: "", leave_type: "", from_date: today(), to_date: today(), reason: "" });
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      setLeaveError(details.summary || details.message || "Please check the form and try again.");
      toast.error(details.title || "Unable to submit leave request");
    },
  });

  const action = useMutation({
    mutationFn: ({ id, type, overrideBalance = false }) =>
      api.post(
        `/hrms/leaves/${id}/${type}/`,
        overrideBalance ? { override_balance: true } : {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(
        variables.type === "approve" ? "Leave approved." : "Leave rejected.",
      );
    },
    onError: (error, variables) => {
      const payload = error?.response?.data || {};
      if (
        variables.type === "approve" &&
        payload.code === "INSUFFICIENT_LEAVE_BALANCE" &&
        payload.can_override
      ) {
        const proceed = window.confirm(
          `${payload.detail} Approve this leave as an HR override?`,
        );
        if (proceed) {
          action.mutate({ ...variables, overrideBalance: true });
          return;
        }
      }
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update leave", {
        description: details.summary || details.message || payload.detail,
      });
    },
  });

  return (
    <div className="hrms-module-page hrms-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        title="Leave Requests"
        subtitle="Pending and historical leave applications"
        actions={
          <Button
            className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            onClick={() => {
              setLeaveError("");
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        }
      />

      <BranchSourceFilter scope={branchScope} />

      <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
              Leave Filters
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["", "All"],
                ["PENDING", "Pending"],
                ["APPROVED", "Approved"],
                ["REJECTED", "Rejected"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setTab(value)}
                  className={
                    tab === value
                      ? "rounded-lg border border-amber-300 bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm"
                      : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/[0.04]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search employee or reason"
            />
          </div>
        </div>
      </section>

      <DataTable
        columns={[
          { key: "employee_name", header: "Employee" },
          { key: "branch_name", header: "Branch" },
          { key: "leave_type_name", header: "Type" },
          { key: "from_date", header: "From" },
          { key: "to_date", header: "To" },
          { key: "days", header: "Days" },
          { key: "reason", header: "Reason" },
          {
            key: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            cell: (row) =>
              row.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      action.mutate({ id: row.id, type: "approve" })
                    }
                    className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      action.mutate({ id: row.id, type: "reject" })
                    }
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:hover:bg-red-500/10"
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                "—"
              ),
          },
        ]}
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        total={data.count || 0}
        onPageChange={setPage}
      />

      {open && (
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5">
          <div className="hrms-modal-panel flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">HRMS / Leave Requests</p>
                <h2 className="mt-1 text-xl font-semibold">Apply Leave</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose an employee, leave category and dates.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Close leave form"
                onClick={() => { setOpen(false); resetLeaveTypeForm(); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Label>Employee <span className="text-red-500">*</span></Label>
                <Select value={form.employee} onValueChange={(value) => {
                  setForm((current) => ({ ...current, employee: value })); setLeaveError("");
                }}>
                  <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {employees.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.employee_code} — {item.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Leave Type <span className="text-red-500">*</span></Label>
                  <button type="button" onClick={selectAnnualLeave}
                    className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300">
                    Use Annual Leave
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={form.leave_type} onValueChange={(value) => {
                    setForm((current) => ({ ...current, leave_type: value })); setLeaveError("");
                  }}>
                    <SelectTrigger className="h-11 min-w-0 flex-1"><SelectValue placeholder="Choose leave type" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {leaveTypes.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" className="h-11 shrink-0"
                    onClick={() => { setShowLeaveTypeForm((value) => !value); setLeaveTypeError(""); }}>
                    <Plus className="mr-1.5 h-4 w-4" /> New type
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Choose an existing type. Create a new one only if it is not listed.</p>

                {showLeaveTypeForm && (
                  <div className="mt-3 space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
                    <div>
                      <h3 className="text-sm font-semibold">Create Leave Type</h3>
                      <p className="mt-1 text-xs text-muted-foreground">This sets up a reusable category for future leave requests. It does not submit a leave request.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Leave Type Name <span className="text-red-500">*</span></Label>
                        <Input className="h-11" value={leaveTypeForm.name} autoFocus
                          onChange={(event) => setLeaveTypeForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Example: Annual Leave, Sick Leave" />
                      </div>
                      <div className="space-y-2">
                        <Label>Annual Entitlement (Days) <span className="text-red-500">*</span></Label>
                        <Input className="h-11" type="number" min="0" max="366" step="1"
                          value={leaveTypeForm.annual_limit}
                          onChange={(event) => setLeaveTypeForm((current) => ({ ...current, annual_limit: event.target.value }))} />
                        <p className="text-xs text-muted-foreground">Company-approved days per year. Enter 0 if there is no fixed annual allowance.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Salary Treatment <span className="text-red-500">*</span></Label>
                        <Select value={leaveTypeForm.is_paid ? "PAID" : "UNPAID"}
                          onValueChange={(value) => setLeaveTypeForm((current) => ({ ...current, is_paid: value === "PAID" }))}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">Paid — salary continues</SelectItem>
                            <SelectItem value="UNPAID">Unpaid — salary may be deducted</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Controls the leave category's paid/unpaid setting.</p>
                      </div>
                    </div>
                    {leaveTypeError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{leaveTypeError}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" disabled={leaveTypeSaving} onClick={resetLeaveTypeForm}>Cancel</Button>
                      <Button type="button" disabled={leaveTypeSaving} onClick={addLeaveType}>
                        {leaveTypeSaving ? "Saving..." : "Save & Select Type"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Date <span className="text-red-500">*</span></Label>
                  <Input className="h-11" type="date" value={form.from_date}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((current) => ({ ...current, from_date: value,
                        to_date: current.to_date && current.to_date < value ? value : current.to_date }));
                      setLeaveError("");
                    }} />
                </div>
                <div className="space-y-2">
                  <Label>To Date <span className="text-red-500">*</span></Label>
                  <Input className="h-11" type="date" min={form.from_date || undefined} value={form.to_date}
                    onChange={(event) => { setForm((current) => ({ ...current, to_date: event.target.value })); setLeaveError(""); }} />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Selected calendar days:</span>
                <span className="font-semibold tabular-nums">{leaveDays}</span>
                <span className="ml-auto text-xs text-muted-foreground">Actual leave days are calculated by HRMS</span>
              </div>
              <div className="space-y-2">
                <Label>Reason for Leave <span className="text-red-500">*</span></Label>
                <Textarea rows={3} value={form.reason}
                  onChange={(event) => { setForm((current) => ({ ...current, reason: event.target.value })); setLeaveError(""); }}
                  placeholder="Briefly explain the reason for the request" />
              </div>
              {leaveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{leaveError}</p>}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" disabled={save.isPending}
                onClick={() => { setOpen(false); resetLeaveTypeForm(); }}>Cancel</Button>
              <Button type="button" disabled={save.isPending || leaveTypeSaving} onClick={submitLeave}
                className="bg-amber-400 font-semibold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950">
                {save.isPending ? "Submitting..." : "Submit Leave Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
