import React from "react";
import {
  Banknote,
  Download,
  Eye,
  History,
  Plus,
  Search,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { MetricCard } from "@/components/sales/MetricCard";
import { normalizeList } from "./hrmsUtils";
import PayrollDetailModal from "./PayrollDetailModal";

const today = new Date().toISOString().slice(0, 10);
const currentPeriod = today.slice(0, 7);

const PAYROLL_STATUS_OPTIONS = [
  ["PENDING", "Pending"],
  ["PROCESSING", "Processing"],
  ["PAID", "Paid"],
  ["FAILED", "Failed"],
  ["CANCELLED", "Cancelled"],
];

const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyAdvance = {
  employee: "",
  period: currentPeriod,
  advance_date: today,
  amount: "",
  paid_by: "",
  reference_number: "",
  notes: "",
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [activeTab, setActiveTab] = React.useState("previous");
  const [period, setPeriod] = React.useState(currentPeriod);
  const [advancePeriod, setAdvancePeriod] = React.useState(currentPeriod);
  const [advanceSearch, setAdvanceSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [payrollOpen, setPayrollOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [advanceDetail, setAdvanceDetail] = React.useState(null);
  const [payrollDetail, setPayrollDetail] = React.useState(null);

  const [payrollDate, setPayrollDate] = React.useState(today);
  const [payrollStatus, setPayrollStatus] = React.useState("PENDING");
  const [paidBy, setPaidBy] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState(
    branchId ? String(branchId) : "",
  );
  const [selectedEmployees, setSelectedEmployees] = React.useState([]);
  const [payableDays, setPayableDays] = React.useState({});
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  const [advanceForm, setAdvanceForm] = React.useState({
    ...emptyAdvance,
    period,
  });

  const params = {
    ...branchParams,
    period,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { query, q, setQ, page, setPage } = useListQuery(
    "payroll-entries",
    "/hrms/payroll/",
    params,
  );

  const advanceParams = {
    ...branchParams,
    period: advancePeriod,
  };

  const advancesQuery = useListQuery(
    "salary-advances",
    "/hrms/salary-advances/",
    advanceParams,
  );

  const { setQ: setAdvanceQuery } = advancesQuery;

  const { data: summary = {} } = useQuery({
    queryKey: ["payroll-summary", params],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/summary/", {
          params,
        }),
      ),
  });

  const { data: employeeOptions = {} } = useQuery({
    queryKey: ["payroll-employee-options"],
    queryFn: async () => unwrap(await api.get("/hrms/employees/form-options/")),
  });

  const { data: advanceOptions = {} } = useQuery({
    queryKey: ["salary-advance-options", selectedBranch],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/salary-advances/form-options/", {
          params: {
            branch: selectedBranch || undefined,
          },
        }),
      ),
    enabled: advanceOpen,
  });

  const { data: eligibleResponse, isLoading: eligibleLoading } = useQuery({
    queryKey: ["eligible-payroll-employees", period, selectedBranch],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/eligible-employees/", {
          params: {
            period,
            branch: selectedBranch || undefined,
          },
        }),
      ),
    enabled: payrollOpen && Boolean(period),
  });

  React.useEffect(() => {
    setAdvanceQuery(advanceSearch);
  }, [advanceSearch, setAdvanceQuery]);

  const data = query.data || {
    results: [],
    count: 0,
  };

  const advanceData = advancesQuery.query.data || {
    results: [],
    count: 0,
  };

  const branches = normalizeList(employeeOptions.branches);
  const eligible = normalizeList(eligibleResponse);
  const advanceEmployees = normalizeList(advanceOptions.employees);

  const filteredEligible = eligible.filter((employee) => {
    const needle = employeeSearch.trim().toLowerCase();

    if (!needle) return true;

    return [employee.full_name, employee.employee_code, employee.branch_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  const selectedAdvanceEmployee = advanceEmployees.find(
    (employee) => String(employee.id) === String(advanceForm.employee),
  );

  const selectedRows = eligible.filter((employee) =>
    selectedEmployees.includes(employee.id),
  );

  const selectedTotal = selectedRows.reduce((sum, employee) => {
    const totalDays = numberValue(employee.total_period_days) || 30;

    const days = numberValue(
      payableDays[employee.id] ?? employee.suggested_payable_days ?? totalDays,
    );

    const gross = numberValue(employee.gross_salary) * (days / totalDays);

    return (
      sum +
      Math.max(
        0,
        gross - numberValue(employee.advance_received ?? employee.advance_paid),
      )
    );
  }, 0);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["payroll-entries"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["salary-advances"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["payroll-summary"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["eligible-payroll-employees"],
      }),
    ]);
  };

  const openPayrollModal = () => {
    setPayrollDate(today);
    setPayrollStatus("PENDING");
    setSelectedBranch(branchId ? String(branchId) : "");
    setSelectedEmployees([]);
    setPayableDays({});
    setEmployeeSearch("");

    setPaidBy("");

    setPayrollOpen(true);
  };

  const openAdvanceModal = () => {
    setAdvanceForm({
      ...emptyAdvance,
      period,
    });

    setSelectedBranch(branchId ? String(branchId) : "");

    setAdvanceOpen(true);
  };

  const generateMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          "/hrms/payroll-runs/generate/",
          {
            period,
            payroll_date: payrollDate,
            branch: selectedBranch ? Number(selectedBranch) : null,
            status: payrollStatus,
            paid_by: payrollStatus === "PAID" ? paidBy.trim() : "",
            employee_ids: selectedEmployees,
            payable_days: Object.fromEntries(
              selectedEmployees.map((employeeId) => [
                String(employeeId),
                payableDays[employeeId] ??
                  eligible.find((employee) => employee.id === employeeId)
                    ?.suggested_payable_days,
              ]),
            ),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await refreshAll();

      toast.success(`Payroll generated with ${payrollStatus} status.`);

      setPayrollOpen(false);
      setActiveTab("previous");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to generate payroll", {
        description: details.summary || details.message,
      });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          "/hrms/salary-advances/",
          {
            ...advanceForm,
            employee: Number(advanceForm.employee),
            amount: numberValue(advanceForm.amount),
            paid_by: advanceForm.paid_by.trim(),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await refreshAll();

      toast.success("Advance salary recorded successfully.");

      setAdvanceOpen(false);
      setActiveTab("advances");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save advance salary", {
        description: details.summary || details.message,
      });
    },
  });

  const submitPayroll = () => {
    if (!period || !payrollDate) {
      toast.error("Pay period and payroll date are required.");
      return;
    }

    if (!selectedEmployees.length) {
      toast.error("Select at least one employee.");
      return;
    }

    if (payrollStatus === "PAID" && !paidBy) {
      toast.error("Enter Paid By when creating a Paid payroll.");
      return;
    }

    generateMutation.mutate();
  };

  const submitAdvance = () => {
    if (!advanceForm.employee) {
      toast.error("Select an employee.");
      return;
    }

    if (numberValue(advanceForm.amount) <= 0) {
      toast.error("Enter a valid advance amount.");
      return;
    }

    if (!advanceForm.paid_by.trim()) {
      toast.error("Enter Paid By.");
      return;
    }

    advanceMutation.mutate();
  };

  const exportPayroll = async () => {
    try {
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
    } catch (error) {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to export payroll");
    }
  };

  const previousSalaryColumns = [
    {
      key: "period",
      header: "Period",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.period || "—"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.employee_name || row.employee_code || ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "payable_days",
      header: "Payable Days",
      cell: (row) => (
        <span className="font-mono text-xs">
          {numberValue(row.payable_days).toFixed(2)}
          {" / "}
          {numberValue(row.total_period_days || row.payable_days).toFixed(2)}
        </span>
      ),
    },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      cell: (row) => (
        <CurrencyText
          value={
            numberValue(row.deductions) + numberValue(row.advance_deduction)
          }
        />
      ),
    },
    {
      key: "allowances",
      header: "Allowances",
      align: "right",
      cell: (row) => <CurrencyText value={row.allowances || 0} />,
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => (
        <span>
          {row.salary_calculation_method_display ||
            row.salary_calculation_method ||
            row.salary_type_display ||
            row.salary_type ||
            "Full"}
        </span>
      ),
    },
    {
      key: "net_salary",
      header: "Net",
      align: "right",
      cell: (row) => (
        <span className="font-semibold">
          <CurrencyText value={row.balance_payable ?? row.net_salary ?? 0} />
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const detail = unwrap(
                  await api.get(`/hrms/payroll/${row.id}/`),
                );
                setPayrollDetail(detail);
              } catch {
                setPayrollDetail(row);
              }
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Payroll
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(
                `/hrms/payroll/${row.id}/payslip`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            View Payslip
          </Button>
        </div>
      ),
    },
  ];

  const advanceColumns = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.employee_name}</p>

          <p className="text-xs text-muted-foreground">{row.employee_code}</p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Deduction Period",
    },
    {
      key: "advance_date",
      header: "Advance Date",
    },
    {
      key: "salary_at_time",
      header: "Current Salary",
      align: "right",
      cell: (row) => <CurrencyText value={row.salary_at_time} />,
    },
    {
      key: "amount",
      header: "Advance Paid",
      align: "right",
      cell: (row) => <CurrencyText value={row.amount} />,
    },
    {
      key: "paid_by",
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdvanceDetail(row)}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll"
        subtitle="Review payroll history, update status, manage advances, and generate salary records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportPayroll}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button variant="outline" onClick={openAdvanceModal}>
              <Banknote className="mr-2 h-4 w-4" />
              Add Advance Salary
            </Button>

            <Button
              onClick={openPayrollModal}
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
          label="Gross Salary"
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
          label="Remaining Payroll"
          value={<CurrencyText value={summary.total_net || 0} />}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="previous">
            <History className="mr-2 h-4 w-4" />
            Salary History
          </TabsTrigger>

          <TabsTrigger value="advances">
            <Banknote className="mr-2 h-4 w-4" />
            Advance Salary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="previous" className="mt-4">
          <section className="card-surface overflow-hidden">
            <div className="grid gap-3 border-b p-4 md:grid-cols-4">
              <Input
                type="month"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setPage(1);
                }}
              />

              <div className="md:col-span-2">
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search employee, code, period or payer"
                />
              </div>

              <select
                className="h-10 rounded-md border bg-background px-3"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>

                {PAYROLL_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <DataTable
              columns={previousSalaryColumns}
              data={data.results || []}
              isLoading={query.isLoading || query.isFetching}
              page={page}
              total={data.count || 0}
              onPageChange={setPage}
              emptyTitle="No payroll found"
              emptyDescription="Generate payroll for the selected period."
            />
          </section>
        </TabsContent>

        <TabsContent value="advances" className="mt-4">
          <section className="card-surface overflow-hidden">
            <div className="grid gap-3 border-b p-4 md:grid-cols-3">
              <Input
                type="month"
                value={advancePeriod}
                onChange={(event) => setAdvancePeriod(event.target.value)}
              />

              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input
                  value={advanceSearch}
                  onChange={(event) => setAdvanceSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search advance salary..."
                />
              </div>
            </div>

            <DataTable
              columns={advanceColumns}
              data={advanceData.results || []}
              isLoading={
                advancesQuery.query.isLoading || advancesQuery.query.isFetching
              }
              page={advancesQuery.page}
              total={advanceData.count || 0}
              onPageChange={advancesQuery.setPage}
              emptyTitle="No salary advances"
              emptyDescription="No advance salary records were found."
            />
          </section>
        </TabsContent>
      </Tabs>

      {payrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Generate Payroll</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Select the initial payroll status when creating payroll.
                  Status can be updated later from View Payroll.
                </p>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPayrollOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Pay Period *">
                  <Input
                    type="month"
                    value={period}
                    onChange={(event) => {
                      setPeriod(event.target.value);
                      setSelectedEmployees([]);
                    }}
                  />
                </Field>

                <Field label="Payroll Date *">
                  <Input
                    type="date"
                    value={payrollDate}
                    onChange={(event) => setPayrollDate(event.target.value)}
                  />
                </Field>

                <Field label="Branch">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={selectedBranch}
                    onChange={(event) => {
                      setSelectedBranch(event.target.value);
                      setSelectedEmployees([]);
                    }}
                  >
                    <option value="">All branches</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Initial Status *">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={payrollStatus}
                    onChange={(event) => setPayrollStatus(event.target.value)}
                  >
                    {PAYROLL_STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={payrollStatus === "PAID" ? "Paid By *" : "Paid By"}
                >
                  <Input
                    value={paidBy}
                    disabled={payrollStatus !== "PAID"}
                    onChange={(event) => setPaidBy(event.target.value)}
                    placeholder={
                      payrollStatus === "PAID"
                        ? "Enter payer name"
                        : "Not required"
                    }
                  />
                </Field>
              </div>

              <div className="mt-5">
                <Label>Search Eligible Employees</Label>

                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                  <Input
                    className="pl-9"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search employee name or code"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Label>Eligible Employees</Label>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedEmployees(
                      filteredEligible
                        .filter((item) => !item.already_generated)
                        .map((item) => item.id),
                    )
                  }
                >
                  Select All
                </Button>
              </div>

              <div className="mt-3 max-h-[430px] divide-y overflow-y-auto rounded-xl border">
                {eligibleLoading ? (
                  <p className="p-8 text-center text-muted-foreground">
                    Loading employees...
                  </p>
                ) : filteredEligible.length ? (
                  filteredEligible.map((employee) => {
                    const totalDays =
                      numberValue(employee.total_period_days) || 30;

                    const days = numberValue(
                      payableDays[employee.id] ??
                        employee.suggested_payable_days ??
                        totalDays,
                    );

                    const gross =
                      numberValue(employee.gross_salary) * (days / totalDays);

                    const advance = numberValue(
                      employee.advance_received ?? employee.advance_paid,
                    );

                    const remaining = Math.max(0, gross - advance);

                    return (
                      <label
                        key={employee.id}
                        className="grid items-center gap-4 p-4 hover:bg-muted/30 md:grid-cols-[auto_1fr_150px_150px_150px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          disabled={employee.already_generated}
                          onChange={(event) =>
                            setSelectedEmployees((current) =>
                              event.target.checked
                                ? [...current, employee.id]
                                : current.filter((id) => id !== employee.id),
                            )
                          }
                        />

                        <div>
                          <p className="font-medium">{employee.full_name}</p>

                          <p className="text-xs text-muted-foreground">
                            {employee.employee_code} · {employee.branch_name}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Monthly salary:{" "}
                            <CurrencyText value={employee.gross_salary} />
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs">Payable Days</Label>

                          <Input
                            type="number"
                            className="mt-1"
                            min="0"
                            max={employee.employment_days || totalDays}
                            value={
                              payableDays[employee.id] ??
                              employee.suggested_payable_days ??
                              totalDays
                            }
                            disabled={employee.already_generated}
                            onChange={(event) =>
                              setPayableDays((current) => ({
                                ...current,
                                [employee.id]: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Advance Deduction
                          </p>

                          <p className="font-medium text-amber-600">
                            <CurrencyText value={advance} />
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Remaining Payroll
                          </p>

                          <p className="font-semibold text-emerald-600">
                            <CurrencyText value={remaining} />
                          </p>

                          {employee.already_generated && (
                            <p className="text-xs text-amber-600">
                              Already generated
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="p-8 text-center text-muted-foreground">
                    No eligible employees found.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Selected payroll total
                </p>

                <p className="text-lg font-semibold">
                  <CurrencyText value={selectedTotal} />
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPayrollOpen(false)}>
                  Cancel
                </Button>

                <Button
                  onClick={submitPayroll}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending
                    ? "Generating..."
                    : "Generate Payroll"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {advanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Add Advance Salary</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Record advance salary for an employee.
                </p>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAdvanceOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Field label="Employee *">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={advanceForm.employee}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      employee: event.target.value,
                    }))
                  }
                >
                  <option value="">Select employee</option>

                  {advanceEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} — {employee.employee_code}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Deduction Period *">
                <Input
                  type="month"
                  value={advanceForm.period}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      period: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Advance Date *">
                <Input
                  type="date"
                  value={advanceForm.advance_date}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      advance_date: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Advance Amount *">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advanceForm.amount}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Paid By *">
                <Input
                  value={advanceForm.paid_by}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      paid_by: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Reference">
                <Input
                  value={advanceForm.reference_number}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      reference_number: event.target.value,
                    }))
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Notes">
                  <Textarea
                    rows={3}
                    value={advanceForm.notes}
                    onChange={(event) =>
                      setAdvanceForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              {selectedAdvanceEmployee && (
                <div className="rounded-xl border bg-muted/20 p-4 md:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Info
                      label="Employee"
                      value={selectedAdvanceEmployee.full_name}
                    />

                    <Info
                      label="Branch"
                      value={selectedAdvanceEmployee.branch_name || "—"}
                    />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Current Salary
                      </p>

                      <p className="mt-1 font-semibold">
                        <CurrencyText
                          value={
                            selectedAdvanceEmployee.total_salary ||
                            selectedAdvanceEmployee.basic_salary
                          }
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setAdvanceOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={submitAdvance}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? "Saving..." : "Save Advance"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {advanceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Advance Salary Details
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Complete information for the selected advance.
                </p>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAdvanceDetail(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Info label="Employee" value={advanceDetail.employee_name} />

              <Info label="Employee Code" value={advanceDetail.employee_code} />

              <Info label="Period" value={advanceDetail.period} />

              <Info label="Advance Date" value={advanceDetail.advance_date} />

              <Info label="Paid By" value={advanceDetail.paid_by || "—"} />

              <Info label="Status" value={advanceDetail.status} />

              <div>
                <p className="text-xs text-muted-foreground">Advance Amount</p>

                <p className="mt-1 font-semibold">
                  <CurrencyText value={advanceDetail.amount} />
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Remaining Amount
                </p>

                <p className="mt-1 font-semibold">
                  <CurrencyText value={advanceDetail.remaining_amount} />
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <Button variant="outline" onClick={() => setAdvanceDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {payrollDetail && (
        <PayrollDetailModal
          payroll={payrollDetail}
          onClose={() => setPayrollDetail(null)}
          onUpdated={(updated) => setPayrollDetail(updated)}
        />
      )}
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

function Info({ label, value }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 font-semibold">{value || "—"}</p>
    </div>
  );
}
