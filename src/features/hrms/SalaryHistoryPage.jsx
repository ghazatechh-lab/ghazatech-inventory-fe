import React from "react";
import { Plus, TrendingUp, X } from "lucide-react";
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
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { normalizeList } from "./hrmsUtils";

const emptyRevision = {
  reason: "ANNUAL_INCREMENT",
  effective_from: "",
  basic_salary: "",
  allowances: "",
  approved_by_name: "",
  notes: "",
};

const calculateGrowth = (joiningSalary, currentSalary) => {
  const joining = Number(joiningSalary || 0);
  const current = Number(currentSalary || 0);

  if (!joining) return 0;

  return Math.round(((current - joining) / joining) * 100);
};

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function SalaryHistoryPage() {
  const queryClient = useQueryClient();

  const { branchParams } = useActiveBranchFilter();

  const [employeeId, setEmployeeId] = React.useState("");
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [revision, setRevision] = React.useState(emptyRevision);
  const [errors, setErrors] = React.useState({});

  const { data: employeesResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ["salary-history-employees", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employees/", {
          params: {
            ...branchParams,
            page_size: 500,
            ordering: "first_name",
            is_active: true,
          },
        }),
      ),
  });

  const employees = normalizeList(employeesResponse);

  React.useEffect(() => {
    if (!employeeId && employees.length) {
      setEmployeeId(String(employees[0].id));
    }
  }, [employeeId, employees]);

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["salary-history-employee", employeeId],
    queryFn: async () =>
      unwrap(await api.get(`/hrms/employees/${employeeId}/`)),
    enabled: Boolean(employeeId),
  });

  const { data: historyResponse, isLoading: historyLoading } = useQuery({
    queryKey: ["employee-salary-history", employeeId],
    queryFn: async () =>
      unwrap(await api.get(`/hrms/employees/${employeeId}/salary-history/`)),
    enabled: Boolean(employeeId),
  });

  const history = normalizeList(historyResponse).sort(
    (a, b) => new Date(b.effective_from) - new Date(a.effective_from),
  );

  const currentRevision = history[0];

  const joiningRevision =
    [...history].reverse().find((item) => item.reason === "JOINING") ||
    history[history.length - 1];

  const joiningSalary = toNumber(
    joiningRevision?.total_salary || employee?.total_salary || 0,
  );

  const currentSalary = toNumber(employee?.total_salary || 0);

  const growth = calculateGrowth(joiningSalary, currentSalary);

  const chartItems = [...history].reverse().slice(-5);

  const maximumSalary = Math.max(
    1,
    ...chartItems.map((item) => toNumber(item.total_salary)),
  );

  const updateRevision = (field, value) => {
    setRevision((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const openRevision = () => {
    if (!employee) return;

    setRevision({
      ...emptyRevision,
      basic_salary: employee.basic_salary || "",
      allowances: employee.allowances || "",
    });

    setErrors({});
    setRevisionOpen(true);
  };

  const validateRevision = () => {
    const next = {};

    if (!revision.effective_from) {
      next.effective_from = "Effective date is required.";
    }

    const latestEffectiveDate = currentRevision?.effective_from;

    if (
      revision.effective_from &&
      latestEffectiveDate &&
      revision.effective_from <= latestEffectiveDate
    ) {
      next.effective_from = `Effective date must be after ${latestEffectiveDate}.`;
    }

    const basicSalary = toNumber(revision.basic_salary);
    const allowances = toNumber(revision.allowances);

    if (basicSalary < 0) {
      next.basic_salary = "Basic salary cannot be negative.";
    }

    if (allowances < 0) {
      next.allowances = "Allowances cannot be negative.";
    }

    if (basicSalary + allowances <= 0) {
      next.basic_salary = "Total salary must be greater than zero.";
    }

    if (!revision.approved_by_name.trim()) {
      next.approved_by_name = "Approved by is required.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const revisionMutation = useMutation({
    mutationFn: async () =>
      api.post(
        `/hrms/employees/${employeeId}/salary-revisions/`,
        {
          ...revision,
          basic_salary: toNumber(revision.basic_salary),
          allowances: toNumber(revision.allowances),
        },
        {
          skipGlobalErrorToast: true,
        },
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["salary-history-employee", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["employee-salary-history", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["salary-history-employees"],
        }),
      ]);

      toast.success("Salary revision added.");

      setRevision(emptyRevision);
      setErrors({});
      setRevisionOpen(false);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to add salary revision", {
        description: details.summary || details.message,
      });
    },
  });

  const submitRevision = () => {
    if (!validateRevision()) return;
    revisionMutation.mutate();
  };

  const info = (label, value) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <div className="mt-1 font-medium">{value || "—"}</div>
    </div>
  );

  const isLoading = employeesLoading || employeeLoading || historyLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Salary History"
        subtitle="Effective-dated salary ledger, from joining to today"
        actions={
          <Button
            type="button"
            onClick={openRevision}
            disabled={!employeeId}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Revision
          </Button>
        }
      />

      <section className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <Label>Employee</Label>

            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent className="max-h-80">
                {employees.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.full_name} — {item.designation_name || "Employee"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Joining Salary
              </p>

              <p className="mt-1 font-semibold">
                <CurrencyText value={joiningSalary} />
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Current Salary
              </p>

              <p className="mt-1 font-semibold text-blue-600">
                <CurrencyText value={currentSalary} />
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Total Growth
              </p>

              <p className="mt-1 font-semibold text-emerald-600">+{growth}%</p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="card-surface p-10 text-center text-muted-foreground">
          Loading salary history...
        </section>
      ) : !employee ? (
        <section className="card-surface p-10 text-center text-muted-foreground">
          Select an employee to view salary history.
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Revision Timeline</h2>

            <div className="relative mt-5">
              <div className="absolute bottom-5 left-[7px] top-5 w-px bg-slate-200 dark:bg-white/10" />

              {history.map((item, index) => {
                const previous = history[index + 1];

                const increase =
                  toNumber(item.total_salary) -
                  toNumber(previous?.total_salary);

                return (
                  <div
                    key={item.id}
                    className="relative flex gap-4 pb-7 last:pb-0"
                  >
                    <div
                      className={
                        index === 0
                          ? "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-blue-100 bg-blue-600 dark:border-blue-500/20"
                          : "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-slate-100 bg-slate-400 dark:border-white/10"
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.reason_display}</p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Effective <DateText value={item.effective_from} />
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            index === 0
                              ? "CURRENT"
                              : item.reason === "JOINING"
                                ? "JOINING"
                                : "REVISION"
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        {info(
                          "Basic",
                          <CurrencyText value={item.basic_salary} />,
                        )}

                        {info(
                          "Allowances",
                          <CurrencyText value={item.allowances} />,
                        )}

                        {info(
                          "Total",
                          <CurrencyText value={item.total_salary} />,
                        )}
                      </div>

                      {previous && increase !== 0 && (
                        <p className="mt-3 text-xs font-medium text-emerald-600">
                          +<CurrencyText value={increase} /> from previous
                        </p>
                      )}

                      {item.approved_by_name && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Approved by {item.approved_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {!history.length && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No salary revisions found.
                </div>
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="card-surface p-5">
              <h2 className="font-semibold">Current Structure</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Basic Salary</span>

                  <CurrencyText value={employee.basic_salary} />
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allowances</span>

                  <CurrencyText value={employee.allowances} />
                </div>

                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>Total Package</span>

                  <CurrencyText value={employee.total_salary} />
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective From</span>

                  <span>
                    {currentRevision?.effective_from ||
                      employee.joining_date ||
                      "—"}
                  </span>
                </div>
              </div>
            </section>

            <section className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Salary Growth</h2>

                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="mt-6 flex h-44 items-end gap-4">
                {chartItems.map((item) => {
                  const value = toNumber(item.total_salary);

                  const height = Math.max(
                    18,
                    Math.round((value / maximumSalary) * 100),
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div
                        className="w-full rounded-t-md bg-blue-100 dark:bg-blue-500/20"
                        style={{ height: `${height}%` }}
                        title={`AED ${value.toLocaleString("en-US")}`}
                      />

                      <span className="text-[10px] text-muted-foreground">
                        {String(item.effective_from || "").slice(0, 4)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!chartItems.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Salary growth will appear after revisions are added.
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {revisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Add Salary Revision</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  New ledger entry for {employee?.full_name}
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setRevisionOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                This closes the current salary entry and opens a new
                effective-dated record. Past payroll runs are unaffected.
              </div>

              <div>
                <Label>Reason</Label>

                <Select
                  value={revision.reason}
                  onValueChange={(value) => updateRevision("reason", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ANNUAL_INCREMENT">
                      Annual Increment
                    </SelectItem>

                    <SelectItem value="PROMOTION">Promotion</SelectItem>

                    <SelectItem value="CORRECTION">
                      Salary Correction
                    </SelectItem>

                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Effective From</Label>

                <Input
                  type="date"
                  className="mt-2"
                  value={revision.effective_from}
                  onChange={(event) =>
                    updateRevision("effective_from", event.target.value)
                  }
                />

                {errors.effective_from && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.effective_from}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>New Basic Salary</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    placeholder="e.g. 6500"
                    value={revision.basic_salary}
                    onChange={(event) =>
                      updateRevision("basic_salary", event.target.value)
                    }
                  />

                  {errors.basic_salary && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.basic_salary}
                    </p>
                  )}
                </div>

                <div>
                  <Label>New Allowances</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    placeholder="e.g. 900"
                    value={revision.allowances}
                    onChange={(event) =>
                      updateRevision("allowances", event.target.value)
                    }
                  />

                  {errors.allowances && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.allowances}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Approved By</Label>

                <Input
                  className="mt-2"
                  placeholder="e.g. Super Admin"
                  value={revision.approved_by_name}
                  onChange={(event) =>
                    updateRevision("approved_by_name", event.target.value)
                  }
                />

                {errors.approved_by_name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.approved_by_name}
                  </p>
                )}
              </div>

              <div>
                <Label>Notes</Label>

                <Textarea
                  className="mt-2"
                  rows={3}
                  placeholder="Optional remarks"
                  value={revision.notes}
                  onChange={(event) =>
                    updateRevision("notes", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevisionOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={revisionMutation.isPending}
                onClick={submitRevision}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Revision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
