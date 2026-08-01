import React from "react";
import { Check, Download, Eye, Plus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { MetricCard } from "@/components/sales/MetricCard";
import { normalizeList } from "./hrmsUtils";

const today = new Date().toISOString().slice(0, 10);

const currentPeriod = today.slice(0, 7);

const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function PayrollPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [period, setPeriod] = React.useState(currentPeriod);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [salaryTypeFilter, setSalaryTypeFilter] = React.useState("");

  const [generatorOpen, setGeneratorOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [salaryType, setSalaryType] = React.useState("REGULAR");
  const [payrollDate, setPayrollDate] = React.useState(today);
  const [paidBy, setPaidBy] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState(
    branchId ? String(branchId) : "",
  );
  const [selectedEmployees, setSelectedEmployees] = React.useState([]);
  const [payableDays, setPayableDays] = React.useState({});
  const [advanceAmounts, setAdvanceAmounts] = React.useState({});

  const params = {
    ...branchParams,
    period,
    ...(statusFilter
      ? {
          status: statusFilter,
        }
      : {}),
    ...(salaryTypeFilter
      ? {
          salary_type: salaryTypeFilter,
        }
      : {}),
  };

  const { query, q, setQ, page, setPage } = useListQuery(
    "payroll-entries",
    "/hrms/payroll/",
    params,
  );

  const { data: summary = {} } = useQuery({
    queryKey: ["payroll-summary", params],

    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/summary/", {
          params,
        }),
      ),
  });

  const { data: formOptions = {} } = useQuery({
    queryKey: ["payroll-form-options"],

    queryFn: async () =>
      unwrap(await api.get("/hrms/payroll-runs/form-options/")),
  });

  const { data: employeeOptions = {} } = useQuery({
    queryKey: ["payroll-branch-options"],

    queryFn: async () => unwrap(await api.get("/hrms/employees/form-options/")),
  });

  const { data: eligibleResponse, isLoading: eligibleLoading } = useQuery({
    queryKey: [
      "eligible-payroll-employees",
      period,
      selectedBranch,
      salaryType,
    ],

    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/eligible-employees/", {
          params: {
            period,
            branch: selectedBranch || undefined,
            salary_type: salaryType,
          },
        }),
      ),

    enabled: generatorOpen && Boolean(period),
  });

  const data = query.data || {
    results: [],
    count: 0,
  };

  const eligible = normalizeList(eligibleResponse);

  const branches = normalizeList(employeeOptions.branches);

  const paidByUsers = normalizeList(
    formOptions.paid_by_users ||
      formOptions.data?.paid_by_users ||
      formOptions.users ||
      [],
  );

  const selectedRows = eligible.filter((employee) =>
    selectedEmployees.includes(employee.id),
  );

  React.useEffect(() => {
    if (!generatorOpen || paidBy || !paidByUsers.length) {
      return;
    }

    const preferred =
      paidByUsers.find((user) => user.is_current_user) || paidByUsers[0];

    if (preferred?.id) {
      setPaidBy(String(preferred.id));
    }
  }, [generatorOpen, paidBy, paidByUsers]);

  const selectedTotal = selectedRows.reduce((sum, employee) => {
    if (salaryType === "ADVANCE") {
      return sum + numberValue(advanceAmounts[employee.id]);
    }

    const totalDays = numberValue(employee.total_period_days) || 30;

    const days = numberValue(
      payableDays[employee.id] ?? employee.suggested_payable_days,
    );

    const proratedGross =
      numberValue(employee.gross_salary) * (days / totalDays);

    const advanceDeduction = numberValue(employee.advance_received);

    return sum + Math.max(0, proratedGross - advanceDeduction);
  }, 0);

  const refreshPayroll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["payroll-entries"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["payroll-summary"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["eligible-payroll-employees"],
      }),
    ]);
  };

  const openGenerator = () => {
    setSalaryType("REGULAR");
    setPayrollDate(`${period}-01`);
    setPaidBy("");
    setSelectedBranch(branchId ? String(branchId) : "");
    setSelectedEmployees([]);
    setPayableDays({});
    setAdvanceAmounts({});
    setStep(1);
    setGeneratorOpen(true);
  };

  const closeGenerator = () => {
    setGeneratorOpen(false);
    setStep(1);
  };

  const changeSalaryType = (value) => {
    setSalaryType(value);
    setSelectedEmployees([]);
    setPayableDays({});
    setAdvanceAmounts({});
  };

  const toggleEmployee = (employeeId, checked) => {
    setSelectedEmployees((current) =>
      checked
        ? [...current, employeeId]
        : current.filter((id) => id !== employeeId),
    );
  };

  const selectAll = () => {
    setSelectedEmployees(
      eligible
        .filter((employee) => !employee.already_generated)
        .map((employee) => employee.id),
    );
  };

  const generateMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          "/hrms/payroll-runs/generate/",
          {
            period,
            payroll_date: payrollDate,
            salary_type: salaryType,
            branch: selectedBranch ? Number(selectedBranch) : null,
            paid_by: Number(paidBy),
            employee_ids: selectedEmployees,
            payable_days: Object.fromEntries(
              selectedEmployees.map((employeeId) => [
                String(employeeId),
                payableDays[employeeId] ??
                  eligible.find((employee) => employee.id === employeeId)
                    ?.suggested_payable_days,
              ]),
            ),
            advance_amounts: Object.fromEntries(
              selectedEmployees.map((employeeId) => [
                String(employeeId),
                numberValue(advanceAmounts[employeeId]),
              ]),
            ),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await refreshPayroll();

      toast.success(
        salaryType === "ADVANCE"
          ? "Advance salary generated successfully."
          : "Regular salary generated successfully.",
      );

      setStep(3);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to generate payroll", {
        description: details.summary || details.message,
      });
    },
  });

  const continueGenerator = () => {
    if (!period) {
      toast.error("Pay period is required.");
      return;
    }

    if (!payrollDate) {
      toast.error("Payroll Date is required.");
      return;
    }

    if (!payrollDate.startsWith(period)) {
      toast.error("Payroll Date must be within the selected month.");
      return;
    }

    if (!paidBy) {
      toast.error("Select Paid By.");
      return;
    }

    if (!selectedEmployees.length) {
      toast.error("Select at least one employee.");
      return;
    }

    if (salaryType === "ADVANCE") {
      const invalid = selectedEmployees.find(
        (employeeId) => numberValue(advanceAmounts[employeeId]) <= 0,
      );

      if (invalid) {
        toast.error("Enter an advance amount for every selected employee.");
        return;
      }
    }

    setStep(2);
  };

  const markPaidMutation = useMutation({
    mutationFn: async ({ entryId, payerId }) =>
      unwrap(
        await api.post(
          `/hrms/payroll/${entryId}/mark-paid/`,
          {
            paid_by: Number(payerId),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await refreshPayroll();

      toast.success("Payroll entry marked as paid.");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to mark payroll as paid", {
        description: details.summary || details.message,
      });
    },
  });

  const exportPayroll = async () => {
    const response = await api.get("/hrms/payroll-runs/export/", {
      params,
      responseType: "blob",
    });

    const url = URL.createObjectURL(new Blob([response.data]));

    const link = document.createElement("a");

    link.href = url;
    link.download = `payroll-${period}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "employee",
      header: "Employee",

      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
            {initials(row.employee_name)}
          </div>

          <div>
            <p className="font-medium">{row.employee_name}</p>
            <p className="text-xs text-muted-foreground">{row.employee_code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "salary_type",
      header: "Type",

      cell: (row) => (
        <span className="font-medium">
          {row.salary_type_display || row.salary_type}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
    },
    {
      key: "payroll_date",
      header: "Payroll Date",
    },
    {
      key: "payable_days",
      header: "Payable Days",

      cell: (row) =>
        row.salary_type === "ADVANCE"
          ? "—"
          : `${row.payable_days || 0} / ${row.total_period_days || 0}`,
    },
    {
      key: "gross_salary",
      header: "Gross",
      align: "right",

      cell: (row) => <CurrencyText value={row.gross_salary} />,
    },
    {
      key: "advance_amount",
      header: "Advance",
      align: "right",

      cell: (row) => <CurrencyText value={row.advance_amount} />,
    },
    {
      key: "advance_deduction",
      header: "Advance Deducted",
      align: "right",

      cell: (row) => (
        <span className="text-amber-600">
          <CurrencyText value={row.advance_deduction} />
        </span>
      ),
    },
    {
      key: "balance_payable",
      header: "Balance Payable",
      align: "right",

      cell: (row) => (
        <span className="font-semibold">
          <CurrencyText value={row.balance_payable ?? row.net_salary} />
        </span>
      ),
    },
    {
      key: "paid_by_name",
      header: "Paid By",
    },
    {
      key: "status",
      header: "Status",

      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",

      cell: (row) => (
        <div className="flex justify-end gap-2">
          {row.status === "PENDING" && (
            <Button
              size="sm"
              onClick={() => {
                const payer =
                  row.paid_by ||
                  paidByUsers.find((user) => user.is_current_user)?.id ||
                  paidByUsers[0]?.id;

                if (!payer) {
                  toast.error(
                    "No payer is available. Add or activate a system user first.",
                  );
                  return;
                }

                markPaidMutation.mutate({
                  entryId: row.id,
                  payerId: payer,
                });
              }}
              disabled={markPaidMutation.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Mark Paid
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(`/hrms/payroll/${row.id}/payslip`, "_blank")
            }
          >
            <Eye className="mr-2 h-4 w-4" />
            Payslip
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll"
        subtitle="Generate regular or advance salary with automatic advance deduction and joining-date proration"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPayroll}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              onClick={openGenerator}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Payroll
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Employees"
          value={summary.employees_on_payroll || 0}
        />

        <MetricCard
          label="Gross"
          value={<CurrencyText value={summary.total_gross || 0} />}
        />

        <MetricCard
          label="Advance Paid"
          value={<CurrencyText value={summary.total_advances || 0} />}
        />

        <MetricCard
          label="Advance Deducted"
          value={<CurrencyText value={summary.total_advance_deductions || 0} />}
        />

        <MetricCard
          label="Balance Payable"
          value={<CurrencyText value={summary.total_net || 0} />}
        />
      </div>

      <section className="card-surface overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-5">
          <Input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />

          <div className="md:col-span-2">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search employee, code or payer"
            />
          </div>

          <select
            value={salaryTypeFilter}
            onChange={(event) => setSalaryTypeFilter(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All salary types</option>
            <option value="REGULAR">Regular Salary</option>
            <option value="ADVANCE">Advance Salary</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={data.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={data.count || 0}
          onPageChange={setPage}
        />
      </section>

      {generatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold">Generate Payroll</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select Regular or Advance Salary, Payroll Date and Paid By.
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={closeGenerator}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  [1, "Setup"],
                  [2, "Review"],
                  [3, "Done"],
                ].map(([number, label]) => (
                  <div key={number} className="flex items-center gap-3">
                    <div
                      className={
                        step >= number
                          ? "flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                          : "flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400"
                      }
                    >
                      {step > number ? <Check className="h-4 w-4" /> : number}
                    </div>

                    <span
                      className={
                        step >= number ? "font-medium" : "text-muted-foreground"
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <Label>Salary Type</Label>

                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={
                          salaryType === "REGULAR" ? "default" : "outline"
                        }
                        onClick={() => changeSalaryType("REGULAR")}
                      >
                        Regular Salary
                      </Button>

                      <Button
                        type="button"
                        variant={
                          salaryType === "ADVANCE" ? "default" : "outline"
                        }
                        onClick={() => changeSalaryType("ADVANCE")}
                      >
                        Advance Salary
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <Label>Pay Period *</Label>
                      <Input
                        type="month"
                        className="mt-2"
                        value={period}
                        onChange={(event) => {
                          setPeriod(event.target.value);
                          setPayrollDate(`${event.target.value}-01`);
                        }}
                      />
                    </div>

                    <div>
                      <Label>Payroll Date *</Label>
                      <Input
                        type="date"
                        className="mt-2"
                        min={`${period}-01`}
                        max={`${period}-31`}
                        value={payrollDate}
                        onChange={(event) => setPayrollDate(event.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Branch</Label>
                      <Select
                        value={selectedBranch || "__all__"}
                        onValueChange={(value) => {
                          setSelectedBranch(value === "__all__" ? "" : value);
                          setSelectedEmployees([]);
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem
                              key={branch.id}
                              value={String(branch.id)}
                            >
                              {branch.branch_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Paid By *</Label>
                      <Select value={paidBy} onValueChange={setPaidBy}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select payer" />
                        </SelectTrigger>
                        <SelectContent>
                          {paidByUsers.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!paidByUsers.length && (
                        <p className="mt-1 text-xs text-amber-600">
                          No payer users were returned. Ensure at least one
                          system user exists.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Eligible Employees</Label>

                    <Button size="sm" variant="outline" onClick={selectAll}>
                      Select All
                    </Button>
                  </div>

                  <div className="max-h-[420px] divide-y overflow-y-auto rounded-xl border">
                    {eligibleLoading ? (
                      <p className="p-8 text-center text-muted-foreground">
                        Loading employees...
                      </p>
                    ) : eligible.length ? (
                      eligible.map((employee) => (
                        <label
                          key={employee.id}
                          className="flex items-center gap-4 p-4 hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            disabled={employee.already_generated}
                            onChange={(event) =>
                              toggleEmployee(employee.id, event.target.checked)
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.employee_code} · {employee.branch_name}{" "}
                              · Joined {employee.joining_date || "—"}
                            </p>

                            {salaryType === "REGULAR" &&
                              numberValue(employee.advance_received) > 0 && (
                                <p className="mt-1 text-xs text-amber-600">
                                  Advance to deduct:{" "}
                                  <CurrencyText
                                    value={employee.advance_received}
                                  />
                                </p>
                              )}
                          </div>

                          {salaryType === "REGULAR" ? (
                            <div className="w-40">
                              <Label className="text-xs">Payable Days</Label>

                              <Input
                                type="number"
                                min="0"
                                max={
                                  employee.employment_days ||
                                  employee.total_period_days
                                }
                                step="0.5"
                                value={
                                  payableDays[employee.id] ??
                                  employee.suggested_payable_days ??
                                  0
                                }
                                disabled={employee.already_generated}
                                onClick={(event) => event.preventDefault()}
                                onChange={(event) =>
                                  setPayableDays((current) => ({
                                    ...current,
                                    [employee.id]: event.target.value,
                                  }))
                                }
                              />

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Employment days: {employee.employment_days}
                              </p>
                            </div>
                          ) : (
                            <div className="w-44">
                              <Label className="text-xs">Advance Amount</Label>

                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={advanceAmounts[employee.id] || ""}
                                onChange={(event) =>
                                  setAdvanceAmounts((current) => ({
                                    ...current,
                                    [employee.id]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}

                          <div className="w-36 text-right">
                            {salaryType === "ADVANCE" ? (
                              <CurrencyText
                                value={advanceAmounts[employee.id] || 0}
                              />
                            ) : (
                              <CurrencyText
                                value={Math.max(
                                  0,
                                  numberValue(employee.gross_salary) *
                                    (numberValue(
                                      payableDays[employee.id] ??
                                        employee.suggested_payable_days,
                                    ) /
                                      (numberValue(
                                        employee.total_period_days,
                                      ) || 30)) -
                                    numberValue(employee.advance_received),
                                )}
                              />
                            )}

                            {employee.already_generated && (
                              <p className="text-xs text-amber-600">
                                Already generated
                              </p>
                            )}
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="p-8 text-center text-muted-foreground">
                        No eligible employees found.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Salary Type</p>
                    <p className="font-semibold">
                      {salaryType === "ADVANCE"
                        ? "Advance Salary"
                        : "Regular Salary"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      Payroll Date
                    </p>
                    <p className="font-semibold">{payrollDate}</p>
                  </div>

                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="font-semibold">{selectedEmployees.length}</p>
                  </div>

                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Payable
                    </p>
                    <p className="font-semibold">
                      <CurrencyText value={selectedTotal} />
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-8 w-8" />
                  </div>

                  <h3 className="mt-4 text-xl font-semibold">
                    Payroll Generated
                  </h3>

                  <p className="mt-2 text-muted-foreground">
                    Salary entries are now available in the payroll list.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={closeGenerator}>
                    Cancel
                  </Button>

                  <Button onClick={continueGenerator}>Review</Button>
                </>
              )}

              {step === 2 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>

                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {generateMutation.isPending
                      ? "Generating..."
                      : "Generate Payroll"}
                  </Button>
                </>
              )}

              {step === 3 && <Button onClick={closeGenerator}>Done</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
