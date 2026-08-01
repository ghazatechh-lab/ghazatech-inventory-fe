import React from "react";
import { Check, Download, Edit, Eye, History, Plus, X } from "lucide-react";
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

const currentPeriod = new Date().toISOString().slice(0, 7);

const emptyPayroll = {
  employee: "",
  from_period: "",
  to_period: "",
  period: "",
  basic_salary: "",
  allowances: "",
  deductions: "",
  status: "PAID",
};

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const moneyNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [period, setPeriod] = React.useState(currentPeriod);
  const [statusFilter, setStatusFilter] = React.useState("");

  const [generatorOpen, setGeneratorOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [selected, setSelected] = React.useState([]);
  const [payableDays, setPayableDays] = React.useState({});
  const [selectedBranch, setSelectedBranch] = React.useState(
    branchId ? String(branchId) : "",
  );

  const [payrollOpen, setPayrollOpen] = React.useState(false);
  const [editingPayroll, setEditingPayroll] = React.useState(null);
  const [payrollForm, setPayrollForm] = React.useState(emptyPayroll);
  const [payrollErrors, setPayrollErrors] = React.useState({});

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

  const { data: summary = {} } = useQuery({
    queryKey: ["payroll-summary", params],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/summary/", {
          params,
        }),
      ),
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
    enabled: generatorOpen,
  });

  const { data: employeeResponse } = useQuery({
    queryKey: ["payroll-form-employees", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employees/", {
          params: {
            ...branchParams,
            page_size: 1000,
            ordering: "first_name",
          },
        }),
      ),
  });

  const { data: branchOptions = {} } = useQuery({
    queryKey: ["employee-form-options"],
    queryFn: async () => unwrap(await api.get("/hrms/employees/form-options/")),
    enabled: generatorOpen,
  });

  const data = query.data || { results: [], count: 0 };
  const eligible = normalizeList(eligibleResponse);
  const employees = normalizeList(employeeResponse);
  const branches = normalizeList(branchOptions.branches);

  const selectedEmployees = eligible.filter((item) =>
    selected.includes(item.id),
  );

  const selectedGross = selectedEmployees.reduce((sum, item) => {
    const totalDays = moneyNumber(item.total_period_days) || 30;
    const days = moneyNumber(
      payableDays[item.id] ?? item.suggested_payable_days ?? totalDays,
    );
    return sum + moneyNumber(item.gross_salary) * (days / totalDays);
  }, 0);

  const selectedPayrollEmployee = employees.find(
    (item) => String(item.id) === String(payrollForm.employee),
  );

  const grossPreview =
    moneyNumber(payrollForm.basic_salary) + moneyNumber(payrollForm.allowances);
  const netPreview = grossPreview - moneyNumber(payrollForm.deductions);

  const refreshPayroll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["payroll-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll-summary"] }),
      queryClient.invalidateQueries({
        queryKey: ["eligible-payroll-employees"],
      }),
    ]);
  };

  const openGenerator = () => {
    setSelected([]);
    setPayableDays({});
    setSelectedBranch(branchId ? String(branchId) : "");
    setStep(1);
    setGeneratorOpen(true);
  };

  const closeGenerator = () => {
    setGeneratorOpen(false);
    setStep(1);
    setSelected([]);
    setPayableDays({});
  };

  const selectAll = () =>
    setSelected(
      eligible.filter((item) => !item.already_paid).map((item) => item.id),
    );

  const generate = useMutation({
    mutationFn: () =>
      api.post(
        "/hrms/payroll-runs/generate/",
        {
          period,
          branch: selectedBranch ? Number(selectedBranch) : null,
          employee_ids: selected,
          payable_days: Object.fromEntries(
            selected.map((employeeId) => [
              String(employeeId),
              payableDays[employeeId] ??
                eligible.find((item) => item.id === employeeId)
                  ?.suggested_payable_days,
            ]),
          ),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      setStatusFilter("");
      setPage(1);
      await refreshPayroll();
      toast.success("Payroll generated successfully.");
      setStep(3);
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to generate payroll", {
        description: details.summary || details.message,
      });
    },
  });

  const openPreviousPayroll = () => {
    setEditingPayroll(null);
    setPayrollErrors({});
    setPayrollForm({
      ...emptyPayroll,
      from_period: "",
      to_period: "",
    });
    setPayrollOpen(true);
  };

  const openEditPayroll = (row) => {
    setEditingPayroll(row);
    setPayrollErrors({});
    setPayrollForm({
      employee: String(row.employee || ""),
      from_period: "",
      to_period: "",
      period: row.period || "",
      basic_salary: row.basic_salary ?? "",
      allowances: row.allowances ?? "",
      deductions: row.deductions ?? "",
      status: row.status || "PENDING",
    });
    setPayrollOpen(true);
  };

  const updatePayrollForm = (field, value) => {
    setPayrollForm((current) => ({
      ...current,
      [field]: value,
    }));
    setPayrollErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const selectPayrollEmployee = (value) => {
    const employee = employees.find(
      (item) => String(item.id) === String(value),
    );

    setPayrollForm((current) => ({
      ...current,
      employee: value,
      basic_salary: employee?.basic_salary ?? current.basic_salary,
      allowances: employee?.allowances ?? current.allowances,
    }));
    setPayrollErrors((current) => ({ ...current, employee: "" }));
  };

  const validatePayroll = () => {
    const next = {};

    if (!payrollForm.employee) {
      next.employee = "Employee is required.";
    }

    const joiningMonth = String(
      selectedPayrollEmployee?.joining_date || "",
    ).slice(0, 7);

    if (!joiningMonth) {
      next.employee =
        "Employee joining date is required before adding payroll.";
    }

    if (editingPayroll) {
      if (!payrollForm.period) {
        next.period = "Payroll month is required.";
      }

      if (payrollForm.period > currentPeriod) {
        next.period = "Future payroll periods are not allowed.";
      }

      if (
        payrollForm.period &&
        joiningMonth &&
        payrollForm.period < joiningMonth
      ) {
        next.period = `Employee joined in ${joiningMonth}.`;
      }
    } else {
      if (!payrollForm.from_period) {
        next.from_period = "From Month is required.";
      }

      if (!payrollForm.to_period) {
        next.to_period = "To Month is required.";
      }

      if (
        payrollForm.from_period &&
        payrollForm.to_period &&
        payrollForm.to_period < payrollForm.from_period
      ) {
        next.to_period = "To Month cannot be before From Month.";
      }

      if (
        payrollForm.from_period &&
        joiningMonth &&
        payrollForm.from_period < joiningMonth
      ) {
        next.from_period = `Employee joined in ${joiningMonth}.`;
      }

      if (payrollForm.to_period && payrollForm.to_period > currentPeriod) {
        next.to_period = "Future payroll periods are not allowed.";
      }
    }

    const basic = moneyNumber(payrollForm.basic_salary);
    const allowances = moneyNumber(payrollForm.allowances);
    const deductions = moneyNumber(payrollForm.deductions);

    if (basic < 0) next.basic_salary = "Basic salary cannot be negative.";
    if (allowances < 0) next.allowances = "Allowances cannot be negative.";
    if (deductions < 0) next.deductions = "Deductions cannot be negative.";
    if (deductions > basic + allowances) {
      next.deductions = "Deductions cannot exceed gross salary.";
    }

    setPayrollErrors(next);
    return Object.keys(next).length === 0;
  };

  const payrollMutation = useMutation({
    mutationFn: async () => {
      const salaryPayload = {
        employee: Number(payrollForm.employee),
        basic_salary: moneyNumber(payrollForm.basic_salary),
        allowances: moneyNumber(payrollForm.allowances),
        deductions: moneyNumber(payrollForm.deductions),
        status: payrollForm.status,
      };

      if (editingPayroll) {
        return api.patch(
          `/hrms/payroll/${editingPayroll.id}/`,
          {
            ...salaryPayload,
            period: payrollForm.period,
          },
          {
            skipGlobalErrorToast: true,
          },
        );
      }

      return api.post(
        "/hrms/payroll/bulk-previous/",
        {
          ...salaryPayload,
          from_period: payrollForm.from_period,
          to_period: payrollForm.to_period,
        },
        {
          skipGlobalErrorToast: true,
        },
      );
    },
    onSuccess: async () => {
      await refreshPayroll();
      toast.success(
        editingPayroll
          ? "Payroll details updated."
          : "Previous payroll records generated successfully.",
      );
      setPayrollOpen(false);
      setEditingPayroll(null);
      setPayrollForm(emptyPayroll);
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save payroll", {
        description: details.summary || details.message,
      });
    },
  });

  const submitPayroll = () => {
    if (validatePayroll()) payrollMutation.mutate();
  };

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
            <div className="font-medium">{row.employee_name}</div>
            <div className="text-xs text-muted-foreground">
              {row.employee_code}
            </div>
          </div>
        </div>
      ),
    },
    { key: "branch_name", header: "Branch" },
    { key: "period", header: "Period" },
    {
      key: "payable_days",
      header: "Payable Days",
      cell: (row) =>
        `${row.payable_days || row.total_period_days || 30} / ${row.total_period_days || 30}`,
    },
    {
      key: "basic_salary",
      header: "Basic",
      align: "right",
      cell: (row) => <CurrencyText value={row.basic_salary} />,
    },
    {
      key: "allowances",
      header: "Allowances",
      align: "right",
      cell: (row) => <CurrencyText value={row.allowances} />,
    },
    {
      key: "gross_salary",
      header: "Gross",
      align: "right",
      cell: (row) => <CurrencyText value={row.gross_salary} />,
    },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      cell: (row) => (
        <span className="text-red-500">
          -<CurrencyText value={row.deductions} />
        </span>
      ),
    },
    {
      key: "net_salary",
      header: "Net",
      align: "right",
      cell: (row) => (
        <span className="font-semibold">
          <CurrencyText value={row.net_salary} />
        </span>
      ),
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
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Edit payroll"
            onClick={() => openEditPayroll(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
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
        subtitle="Generate current payroll and maintain previous payroll history"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportPayroll}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={openPreviousPayroll}>
              <History className="mr-2 h-4 w-4" />
              Add Previous Payroll
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Employees on Payroll"
          value={summary.employees_on_payroll || 0}
        />
        <MetricCard
          label="Total Gross"
          value={<CurrencyText value={summary.total_gross || 0} />}
        />
        <MetricCard
          label="Total Deductions"
          value={<CurrencyText value={summary.total_deductions || 0} />}
        />
        <MetricCard
          label="Total Net Payable"
          value={<CurrencyText value={summary.total_net || 0} />}
        />
      </div>

      <section className="card-surface overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-4">
          <Input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
          <div className="md:col-span-2">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search employee or code"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
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

      {payrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingPayroll
                    ? "Edit Payroll Details"
                    : "Add Previous Payroll"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a valid month range on or after the employee joining
                  month.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPayrollOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Employee *</Label>
                <Select
                  value={payrollForm.employee}
                  onValueChange={selectPayrollEmployee}
                  disabled={Boolean(editingPayroll)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.employee_code} — {employee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {payrollErrors.employee && (
                  <p className="mt-1 text-sm text-red-500">
                    {payrollErrors.employee}
                  </p>
                )}
              </div>

              {editingPayroll ? (
                <div>
                  <Label>Payroll Month *</Label>
                  <Input
                    type="month"
                    className="mt-2"
                    max={currentPeriod}
                    min={
                      String(selectedPayrollEmployee?.joining_date || "").slice(
                        0,
                        7,
                      ) || undefined
                    }
                    value={payrollForm.period}
                    onChange={(event) =>
                      updatePayrollForm("period", event.target.value)
                    }
                  />
                  {payrollErrors.period && (
                    <p className="mt-1 text-sm text-red-500">
                      {payrollErrors.period}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label>From Month *</Label>
                    <Input
                      type="month"
                      className="mt-2"
                      max={currentPeriod}
                      min={
                        String(
                          selectedPayrollEmployee?.joining_date || "",
                        ).slice(0, 7) || undefined
                      }
                      value={payrollForm.from_period}
                      onChange={(event) => {
                        updatePayrollForm("from_period", event.target.value);

                        if (
                          payrollForm.to_period &&
                          payrollForm.to_period < event.target.value
                        ) {
                          updatePayrollForm("to_period", event.target.value);
                        }
                      }}
                    />
                    {payrollErrors.from_period && (
                      <p className="mt-1 text-sm text-red-500">
                        {payrollErrors.from_period}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>To Month *</Label>
                    <Input
                      type="month"
                      className="mt-2"
                      max={currentPeriod}
                      min={
                        payrollForm.from_period ||
                        String(
                          selectedPayrollEmployee?.joining_date || "",
                        ).slice(0, 7) ||
                        undefined
                      }
                      value={payrollForm.to_period}
                      onChange={(event) =>
                        updatePayrollForm("to_period", event.target.value)
                      }
                    />
                    {payrollErrors.to_period && (
                      <p className="mt-1 text-sm text-red-500">
                        {payrollErrors.to_period}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label>Status *</Label>
                <Select
                  value={payrollForm.status}
                  onValueChange={(value) => updatePayrollForm("status", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Basic Salary *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={payrollForm.basic_salary}
                  onChange={(event) =>
                    updatePayrollForm("basic_salary", event.target.value)
                  }
                />
                {payrollErrors.basic_salary && (
                  <p className="mt-1 text-sm text-red-500">
                    {payrollErrors.basic_salary}
                  </p>
                )}
              </div>

              <div>
                <Label>Allowances</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={payrollForm.allowances}
                  onChange={(event) =>
                    updatePayrollForm("allowances", event.target.value)
                  }
                />
              </div>

              <div>
                <Label>Deductions</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={payrollForm.deductions}
                  onChange={(event) =>
                    updatePayrollForm("deductions", event.target.value)
                  }
                />
                {payrollErrors.deductions && (
                  <p className="mt-1 text-sm text-red-500">
                    {payrollErrors.deductions}
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs uppercase text-muted-foreground">Gross</p>
                <p className="mt-1 text-lg font-semibold">
                  <CurrencyText value={grossPreview} />
                </p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Net Salary
                </p>
                <p className="mt-1 text-lg font-semibold text-blue-600">
                  <CurrencyText value={netPreview} />
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setPayrollOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitPayroll}
                disabled={payrollMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {payrollMutation.isPending ? "Saving..." : "Save Payroll"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {generatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold">Generate Payroll</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a period and confirm who gets paid this run.
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={closeGenerator}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-5">
              <div className="mb-7 grid grid-cols-3 gap-3">
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Pay Period</Label>
                      <Input
                        type="month"
                        className="mt-2"
                        value={period}
                        onChange={(event) => setPeriod(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <select
                        className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                        value={selectedBranch}
                        onChange={(event) => {
                          setSelectedBranch(event.target.value);
                          setSelected([]);
                        }}
                      >
                        <option value="">All branches</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.branch_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Label>Eligible Employees</Label>
                    <Button size="sm" variant="outline" onClick={selectAll}>
                      Select All
                    </Button>
                  </div>

                  <div className="max-h-80 divide-y overflow-y-auto rounded-xl border">
                    {eligibleLoading ? (
                      <p className="p-6 text-center text-muted-foreground">
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
                            checked={selected.includes(employee.id)}
                            disabled={employee.already_paid}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, employee.id]
                                  : current.filter((id) => id !== employee.id),
                              )
                            }
                          />
                          <div className="flex-1">
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.employee_code} · {employee.branch_name}
                            </p>
                          </div>
                          <div className="w-36">
                            <Label className="text-xs">Payable Days</Label>
                            <Input
                              type="number"
                              min="0"
                              max={employee.total_period_days || 30}
                              step="0.5"
                              value={
                                payableDays[employee.id] ??
                                employee.suggested_payable_days ??
                                employee.total_period_days ??
                                30
                              }
                              disabled={employee.already_paid}
                              onClick={(event) => event.preventDefault()}
                              onChange={(event) =>
                                setPayableDays((current) => ({
                                  ...current,
                                  [employee.id]: event.target.value,
                                }))
                              }
                            />
                            {moneyNumber(employee.unpaid_leave_days) > 0 && (
                              <p className="mt-1 text-xs text-amber-600">
                                {employee.unpaid_leave_days} unpaid leave day(s)
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <CurrencyText
                              value={
                                moneyNumber(employee.gross_salary) *
                                (moneyNumber(
                                  payableDays[employee.id] ??
                                    employee.suggested_payable_days ??
                                    employee.total_period_days ??
                                    30,
                                ) /
                                  (moneyNumber(employee.total_period_days) ||
                                    30))
                              }
                            />
                            {employee.already_paid && (
                              <p className="text-xs text-amber-600">
                                Already generated
                              </p>
                            )}
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="p-6 text-center text-muted-foreground">
                        No eligible employees found.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-semibold">{period}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="font-semibold">{selected.length}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Total Gross</p>
                    <p className="font-semibold">
                      <CurrencyText value={selectedGross} />
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">
                    Payroll Generated
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    The payroll entries are now available in the list.
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
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selected.length}
                    className="bg-blue-600 text-white"
                  >
                    Review
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => generate.mutate()}
                    disabled={generate.isPending}
                    className="bg-blue-600 text-white"
                  >
                    {generate.isPending ? "Generating..." : "Generate Payroll"}
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
