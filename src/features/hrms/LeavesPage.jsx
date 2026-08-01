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
    <div className="space-y-5">
      <PageHeader
        title="Leave Requests"
        subtitle="Pending and historical leave applications"
        actions={
          <Button
            className="bg-blue-600 text-white"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        }
      />

      <div className="flex gap-2">
        {[
          ["", "All"],
          ["PENDING", "Pending"],
          ["APPROVED", "Approved"],
          ["REJECTED", "Rejected"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                : "rounded-lg border px-4 py-2 text-sm"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search employee or reason"
      />

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
                    variant="outline"
                    onClick={() =>
                      action.mutate({ id: row.id, type: "approve" })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      action.mutate({ id: row.id, type: "reject" })
                    }
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
          <div className="w-full max-w-xl rounded-2xl bg-background p-5">
            <h2 className="text-xl font-semibold">Apply Leave</h2>
            <div className="mt-5 space-y-4">
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
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/5">
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
                        className="bg-blue-600 text-white hover:bg-blue-700"
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
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white"
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
