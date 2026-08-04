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
  effective_to: "",
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
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [revisionMode, setRevisionMode] = React.useState("CURRENT");
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

  const filteredEmployees = React.useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.full_name,
        employee.employee_code,
        employee.designation_name,
        employee.department_name,
        employee.branch_name,
        employee.email,
        employee.phone_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [employees, employeeSearch]);

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

  const history = normalizeList(historyResponse)
    .filter((item) => item?.effective_from)
    .sort((a, b) => {
      const dateDifference =
        new Date(b.effective_from).getTime() -
        new Date(a.effective_from).getTime();

      return dateDifference || Number(b.id || 0) - Number(a.id || 0);
    });

  const currentRevision =
    history.find((item) => !item.effective_to) || history[0] || null;

  const chronologicalHistory = [...history].reverse();

  const joiningRevision =
    chronologicalHistory.find((item) => item.reason === "JOINING") ||
    chronologicalHistory[0] ||
    null;

  const firstPositiveSalary = chronologicalHistory.find(
    (item) => toNumber(item.total_salary) > 0,
  );

  const currentSalary = toNumber(
    employee?.total_salary || currentRevision?.total_salary || 0,
  );

  // Legacy joining records may contain zero when salary was entered after the
  // employee was created. Prefer the earliest valid salary rather than showing
  // an incorrect AED 0.00 and a misleading growth percentage.
  const joiningSalary = toNumber(
    joiningRevision?.total_salary ||
      firstPositiveSalary?.total_salary ||
      currentSalary,
  );

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

    setRevisionMode("CURRENT");
    setRevision({
      ...emptyRevision,
      basic_salary: employee.basic_salary || "",
      allowances: employee.allowances || "",
    });

    setErrors({});
    setRevisionOpen(true);
  };

  const openPreviousSalary = () => {
    if (!employee) return;

    setRevisionMode("PREVIOUS");
    setRevision({
      ...emptyRevision,
      reason: "OTHER",
      basic_salary: "",
      allowances: "",
      notes: "Previous salary record",
    });

    setErrors({});
    setRevisionOpen(true);
  };

  const validateRevision = () => {
    const next = {};

    if (!revision.effective_from) {
      next.effective_from =
        revisionMode === "PREVIOUS"
          ? "From date is required."
          : "Effective date is required.";
    }

    if (revisionMode === "PREVIOUS" && !revision.effective_to) {
      next.effective_to = "To date is required.";
    }

    const joiningDate = String(employee?.joining_date || "");
    const today = new Date().toISOString().slice(0, 10);

    if (
      revision.effective_from &&
      joiningDate &&
      revision.effective_from < joiningDate
    ) {
      next.effective_from = `From date cannot be before joining date (${joiningDate}).`;
    }

    if (
      revisionMode === "PREVIOUS" &&
      revision.effective_from &&
      revision.effective_to &&
      revision.effective_to < revision.effective_from
    ) {
      next.effective_to = "To date must be on or after the From date.";
    }

    if (
      revisionMode === "PREVIOUS" &&
      revision.effective_to &&
      revision.effective_to > today
    ) {
      next.effective_to = "Previous salary To date cannot be in the future.";
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
          reason: revision.reason,
          effective_from: revision.effective_from,
          effective_to:
            revisionMode === "PREVIOUS" ? revision.effective_to : null,
          basic_salary: toNumber(revision.basic_salary),
          allowances: toNumber(revision.allowances),
          approved_by_name: revision.approved_by_name.trim(),
          notes:
            revision.notes?.trim() ||
            (revisionMode === "PREVIOUS" ? "Previous salary record" : ""),
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

      toast.success(
        revisionMode === "PREVIOUS"
          ? "Previous salary record added."
          : "Salary revision added.",
      );

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
    <div className="hrms-module-page hrms-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Salary History"
        subtitle="Effective-dated salary ledger, from joining to today"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openPreviousSalary}
              disabled={!employeeId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Previous Salary
            </Button>

            <Button
              type="button"
              onClick={openRevision}
              disabled={!employeeId}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Revision
            </Button>
          </div>
        }
      />

      <section className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <Label>Employee</Label>

            <Select
              value={employeeId}
              onValueChange={(value) => {
                setEmployeeId(value);
                setEmployeeSearch("");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent className="max-h-80 p-0">
                <div
                  className="sticky top-0 z-10 border-b bg-popover p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="Search employee name, code or designation"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredEmployees.length ? (
                    filteredEmployees.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.full_name} — {item.designation_name || "Employee"}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No employees match your search.
                    </div>
                  )}
                </div>
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
                            <DateText value={item.effective_from} />
                            {item.effective_to ? (
                              <>
                                {" "}
                                to <DateText value={item.effective_to} />
                              </>
                            ) : (
                              <> onward</>
                            )}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            currentRevision && item.id === currentRevision.id
                              ? "CURRENT"
                              : item.reason === "JOINING"
                                ? "JOINING"
                                : "REVISION"
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-4">
                        {info(
                          "Basic",
                          <CurrencyText value={item.basic_salary} />,
                        )}

                        {info(
                          "Allowances",
                          <CurrencyText value={item.allowances} />,
                        )}

                        {info(
                          "Gross",
                          <CurrencyText value={item.total_salary} />,
                        )}

                        {info("Net", <CurrencyText value={item.net_salary} />)}
                      </div>

                      {previous && increase !== 0 && (
                        <p className="mt-3 text-xs font-medium text-emerald-600">
                          +<CurrencyText value={increase} /> from previous
                        </p>
                      )}

                      {(item.payroll_status_display ||
                        item.payment_date ||
                        item.payment_reference) && (
                        <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs">
                          <span className="font-medium">Payroll:</span>{" "}
                          {item.payroll_status_display || "—"}
                          {item.payment_date ? (
                            <>
                              {" "}
                              · Paid <DateText value={item.payment_date} />
                            </>
                          ) : null}
                          {item.payment_reference ? (
                            <> · Ref: {item.payment_reference}</>
                          ) : null}
                          {toNumber(item.deductions) > 0 ? (
                            <>
                              {" "}
                              · Deductions{" "}
                              <CurrencyText value={item.deductions} />
                            </>
                          ) : null}
                        </div>
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
                <h2 className="text-xl font-semibold">
                  {revisionMode === "PREVIOUS"
                    ? "Add Previous Salary"
                    : "Add Salary Revision"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {revisionMode === "PREVIOUS"
                    ? `Historical salary period for ${employee?.full_name}`
                    : `New ledger entry for ${employee?.full_name}`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRevisionOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {revisionMode === "PREVIOUS"
                  ? "From Date and To Date are mandatory. The period must start on or after the employee joining date and cannot extend into the future."
                  : "This closes the current salary entry and opens a new effective-dated record. Past payroll runs are unaffected."}
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

              <div
                className={
                  revisionMode === "PREVIOUS" ? "grid gap-4 md:grid-cols-2" : ""
                }
              >
                <div>
                  <Label>
                    {revisionMode === "PREVIOUS"
                      ? "From Date *"
                      : "Effective From *"}
                  </Label>
                  <Input
                    type="date"
                    className="mt-2"
                    min={employee?.joining_date || undefined}
                    max={new Date().toISOString().slice(0, 10)}
                    value={revision.effective_from}
                    onChange={(event) =>
                      updateRevision("effective_from", event.target.value)
                    }
                  />
                  {errors.effective_from && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.effective_from}
                    </p>
                  )}
                </div>

                {revisionMode === "PREVIOUS" && (
                  <div>
                    <Label>To Date *</Label>
                    <Input
                      type="date"
                      className="mt-2"
                      min={
                        revision.effective_from ||
                        employee?.joining_date ||
                        undefined
                      }
                      max={new Date().toISOString().slice(0, 10)}
                      value={revision.effective_to}
                      onChange={(event) =>
                        updateRevision("effective_to", event.target.value)
                      }
                    />
                    {errors.effective_to && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.effective_to}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>New Basic Salary *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={revision.basic_salary}
                    onChange={(event) =>
                      updateRevision("basic_salary", event.target.value)
                    }
                    placeholder="e.g. 6500"
                  />
                  {errors.basic_salary && (
                    <p className="mt-1 text-sm text-red-500">
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
                    value={revision.allowances}
                    onChange={(event) =>
                      updateRevision("allowances", event.target.value)
                    }
                    placeholder="e.g. 900"
                  />
                  {errors.allowances && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.allowances}
                    </p>
                  )}
                </div>
              </div>

              {revisionMode === "PREVIOUS" && (
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    className="mt-2"
                    value={revision.notes}
                    onChange={(event) =>
                      updateRevision("notes", event.target.value)
                    }
                    placeholder="Optional details about this historical salary period"
                  />
                </div>
              )}

              <div>
                <Label>Approved By *</Label>
                <Input
                  className="mt-2"
                  value={revision.approved_by_name}
                  onChange={(event) =>
                    updateRevision("approved_by_name", event.target.value)
                  }
                  placeholder="e.g. Super Admin"
                />
                {errors.approved_by_name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.approved_by_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setRevisionOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={revisionMutation.isPending}
                onClick={submitRevision}
                className="bg-blue-600 text-white"
              >
                {revisionMutation.isPending
                  ? "Saving..."
                  : revisionMode === "PREVIOUS"
                    ? "Save Previous Salary"
                    : "Save Revision"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
