import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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
  const { branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [showLeaveTypeForm, setShowLeaveTypeForm] = React.useState(false);
  const [leaveTypeForm, setLeaveTypeForm] = React.useState({
    name: "",
    annual_limit: "0",
    is_paid: true,
  });
  const [leaveTypeSaving, setLeaveTypeSaving] = React.useState(false);
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
    queryKey: ["leave-options"],
    queryFn: async () => unwrap(await api.get("/hrms/leaves/form-options/")),
  });
  const data = query.data || { results: [], count: 0 };

  const refreshLeaveOptions = async () => {
    await queryClient.invalidateQueries({ queryKey: ["leave-options"] });
  };

  const addLeaveType = async () => {
    if (!leaveTypeForm.name.trim())
      return toast.error("Leave type name is required.");
    setLeaveTypeSaving(true);
    try {
      const response = await api.post(
        "/hrms/leave-types/",
        {
          name: leaveTypeForm.name.trim(),
          annual_limit: Number(leaveTypeForm.annual_limit || 0),
          is_paid: Boolean(leaveTypeForm.is_paid),
          requires_document: false,
          is_active: true,
        },
        { skipGlobalErrorToast: true },
      );
      const created = unwrap(response);
      await refreshLeaveOptions();
      setForm((current) => ({ ...current, leave_type: String(created.id) }));
      setLeaveTypeForm({ name: "", annual_limit: "0", is_paid: true });
      setShowLeaveTypeForm(false);
      toast.success("Leave type added.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to add leave type", {
        description: details.summary || details.message,
      });
    } finally {
      setLeaveTypeSaving(false);
    }
  };

  const deleteLeaveType = async () => {
    if (!form.leave_type) return toast.error("Select a leave type first.");
    const item = normalizeList(options.leave_types).find(
      (row) => String(row.id) === String(form.leave_type),
    );
    if (
      !window.confirm(
        `Delete leave type "${item?.name || "selected leave type"}"?`,
      )
    )
      return;

    try {
      await api.delete(`/hrms/leave-types/${form.leave_type}/`, {
        skipGlobalErrorToast: true,
      });
      setForm((current) => ({ ...current, leave_type: "" }));
      await refreshLeaveOptions();
      toast.success("Leave type deleted.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete leave type", {
        description: details.summary || details.message,
      });
    }
  };

  const save = useMutation({
    mutationFn: () =>
      api.post("/hrms/leaves/", {
        ...form,
        employee: Number(form.employee),
        leave_type: Number(form.leave_type),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted.");
      setOpen(false);
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
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        }
      />

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-[22px] border border-slate-200 bg-background shadow-2xl dark:border-white/10">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
                Leave Management
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                Apply Leave
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Submit a leave request and manage leave type details.
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <Label>Employee</Label>
                <Select
                  value={form.employee}
                  onValueChange={(value) =>
                    setForm((c) => ({ ...c, employee: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {normalizeList(options.employees).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.employee_code} — {item.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Leave Type</Label>
                <div className="mt-2 flex gap-2">
                  <Select
                    value={form.leave_type}
                    onValueChange={(value) =>
                      setForm((c) => ({ ...c, leave_type: value }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizeList(options.leave_types).map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Add leave type"
                    onClick={() => setShowLeaveTypeForm((current) => !current)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Delete selected leave type"
                    disabled={!form.leave_type}
                    onClick={deleteLeaveType}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                {showLeaveTypeForm && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Add New Leave Type
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Create the leave type without leaving this form.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs">Leave Type Name</Label>
                        <Input
                          className="mt-1.5"
                          value={leaveTypeForm.name}
                          onChange={(e) =>
                            setLeaveTypeForm((c) => ({
                              ...c,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g. Annual Leave"
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Annual Limit (Days)</Label>
                        <Input
                          className="mt-1.5"
                          type="number"
                          min="0"
                          value={leaveTypeForm.annual_limit}
                          onChange={(e) =>
                            setLeaveTypeForm((c) => ({
                              ...c,
                              annual_limit: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Salary Treatment</Label>
                        <Select
                          value={leaveTypeForm.is_paid ? "PAID" : "UNPAID"}
                          onValueChange={(value) =>
                            setLeaveTypeForm((current) => ({
                              ...current,
                              is_paid: value === "PAID",
                            }))
                          }
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">Paid Leave</SelectItem>
                            <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowLeaveTypeForm(false);
                          setLeaveTypeForm({
                            name: "",
                            annual_limit: "0",
                            is_paid: true,
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
                        disabled={leaveTypeSaving}
                        onClick={addLeaveType}
                      >
                        {leaveTypeSaving ? "Saving..." : "Add Leave Type"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={form.from_date}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, from_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={form.to_date}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, to_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  className="mt-2"
                  value={form.reason}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, reason: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
                onClick={() => save.mutate()}
              >
                Submit Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
