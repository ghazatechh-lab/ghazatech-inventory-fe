import React from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
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
    mutationFn: ({ id, type }) => api.post(`/hrms/leaves/${id}/${type}/`, {}),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(
        variables.type === "approve" ? "Leave approved." : "Leave rejected.",
      );
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
                <Select
                  value={form.leave_type}
                  onValueChange={(value) =>
                    setForm((c) => ({ ...c, leave_type: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
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
