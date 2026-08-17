import React from "react";
import {
  Banknote,
  Download,
  Eye,
  History,
  Pencil,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { MetricCard } from "@/components/sales/MetricCard";
import { normalizeList } from "./hrmsUtils";

const PAGE_SIZE = 12;

const getLocalDateValue = () => {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset();

  return new Date(date.getTime() - timezoneOffset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};

const today = getLocalDateValue();
const currentPeriod = today.slice(0, 7);

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
  const [advancePage, setAdvancePage] = React.useState(1);
  const [payrollEmployeeSearch, setPayrollEmployeeSearch] = React.useState("");
  const [advanceEmployeeSearch, setAdvanceEmployeeSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [payrollOpen, setPayrollOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [advanceDetail, setAdvanceDetail] = React.useState(null);
  const [editingPayroll, setEditingPayroll] = React.useState(null);
  const [editPayrollForm, setEditPayrollForm] = React.useState({
    payroll_date: today,
    basic_salary: "",
    allowances: "",
    deductions: "",
    paid_by: "",
  });

  const [payrollDate, setPayrollDate] = React.useState(today);
  const [paidBy, setPaidBy] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState(
    branchId ? String(branchId) : "",
  );
  const [selectedEmployees, setSelectedEmployees] = React.useState([]);
  const [payableDays, setPayableDays] = React.useState({});

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

  const advancesQuery = useQuery({
    queryKey: ["salary-advances", advancePage, advanceSearch, advanceParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/salary-advances/", {
          params: {
            ...advanceParams,
            page: advancePage,
            page_size: PAGE_SIZE,
            search: advanceSearch || undefined,
          },
        }),
      ),
    placeholderData: (previousData) => previousData,
  });

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

  const data = query.data || { results: [], count: 0 };
  const advanceData = advancesQuery.data || {
    results: [],
    count: 0,
  };

  const branches = normalizeList(employeeOptions.branches);
  const eligible = normalizeList(eligibleResponse);
  const advanceEmployees = normalizeList(advanceOptions.employees);

  const filteredEligibleEmployees = React.useMemo(() => {
    const search = payrollEmployeeSearch.trim().toLowerCase();

    if (!search) {
      return eligible;
    }

    return eligible.filter((employee) =>
      [
        employee.full_name,
        employee.employee_code,
        employee.branch_name,
        employee.designation_name,
        employee.department_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [eligible, payrollEmployeeSearch]);

  const filteredAdvanceEmployees = React.useMemo(() => {
    const search = advanceEmployeeSearch.trim().toLowerCase();

    if (!search) {
      return advanceEmployees;
    }

    return advanceEmployees.filter((employee) =>
      [
        employee.full_name,
        employee.employee_code,
        employee.branch_name,
        employee.designation_name,
        employee.department_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [advanceEmployees, advanceEmployeeSearch]);

  const selectedAdvanceEmployee = advanceEmployees.find(
    (employee) => String(employee.id) === String(advanceForm.employee),
  );

  const selectedRows = eligible.filter((employee) =>
    selectedEmployees.includes(employee.id),
  );

  const selectedTotal = selectedRows.reduce((sum, employee) => {
    const totalDays = numberValue(employee.total_period_days) || 30;
    const days = numberValue(
      payableDays[employee.id] ?? employee.suggested_payable_days,
    );
    const gross = numberValue(employee.gross_salary) * (days / totalDays);

    return sum + Math.max(0, gross - numberValue(employee.advance_received));
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
    setPaidBy("");
    setPayrollEmployeeSearch("");
    setSelectedBranch(branchId ? String(branchId) : "");
    setSelectedEmployees([]);
    setPayableDays({});
    setPayrollOpen(true);
  };

  const openAdvanceModal = () => {
    setAdvanceEmployeeSearch("");
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
            paid_by: paidBy.trim(),
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
      toast.success("Payroll generated successfully.");
      setPayrollOpen(false);
      setActiveTab("previous");
      setPage(1);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to generate payroll", {
        description: details.summary || details.message,
      });
    },
  });

  const openPayrollEdit = (row) => {
    setEditingPayroll(row);
    setEditPayrollForm({
      payroll_date: row.payroll_date || today,
      basic_salary: String(row.basic_salary ?? 0),
      allowances: String(row.allowances ?? 0),
      deductions: String(row.deductions ?? 0),
      paid_by: row.paid_by || "",
    });
  };

  const payrollEditMutation = useMutation({
    mutationFn: async () => {
      if (!editingPayroll?.id) {
        throw new Error("Payroll entry is missing.");
      }

      return unwrap(
        await api.patch(
          `/hrms/payroll/${editingPayroll.id}/`,
          {
            payroll_date: editPayrollForm.payroll_date,
            basic_salary: numberValue(editPayrollForm.basic_salary),
            allowances: numberValue(editPayrollForm.allowances),
            deductions: numberValue(editPayrollForm.deductions),
            paid_by: editPayrollForm.paid_by.trim(),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      );
    },

    onSuccess: async () => {
      await refreshAll();
      toast.success("Payroll salary updated successfully.");
      setEditingPayroll(null);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update payroll salary", {
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
      setAdvancePage(1);
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

    if (!paidBy.trim()) {
      toast.error("Enter Paid By.");
      return;
    }

    if (!selectedEmployees.length) {
      toast.error("Select at least one employee.");
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

    if (!advanceForm.period) {
      toast.error("Select a deduction period.");
      return;
    }

    if (advanceForm.period < currentPeriod) {
      toast.error(
        "Previous months cannot be selected as the deduction period.",
      );
      return;
    }

    if (!advanceForm.advance_date) {
      toast.error("Select an advance date.");
      return;
    }

    if (advanceForm.advance_date < today) {
      toast.error("Previous dates cannot be selected for advance salary.");
      return;
    }

    if (!advanceForm.paid_by.trim()) {
      toast.error("Enter Paid By.");
      return;
    }

    advanceMutation.mutate();
  };

  const submitPayrollEdit = () => {
    const basicSalary = numberValue(editPayrollForm.basic_salary);
    const allowances = numberValue(editPayrollForm.allowances);
    const deductions = numberValue(editPayrollForm.deductions);

    if (!editPayrollForm.payroll_date) {
      toast.error("Payroll date is required.");
      return;
    }

    if (basicSalary < 0 || allowances < 0 || deductions < 0) {
      toast.error("Salary values cannot be negative.");
      return;
    }

    if (deductions > basicSalary + allowances) {
      toast.error("Deductions cannot exceed gross salary.");
      return;
    }

    payrollEditMutation.mutate();
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

  const previousSalaryColumns = [
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
    { key: "period", header: "Period" },
    { key: "payroll_date", header: "Payroll Date" },
    {
      key: "gross_salary",
      header: "Gross Salary",
      align: "right",
      cell: (row) => <CurrencyText value={row.gross_salary} />,
    },
    {
      key: "advance_deduction",
      header: "Advance Deduction",
      align: "right",
      cell: (row) => (
        <span className="text-amber-600">
          <CurrencyText value={row.advance_deduction} />
        </span>
      ),
    },
    {
      key: "net_salary",
      header: "Remaining Payroll",
      align: "right",
      cell: (row) => (
        <span className="font-semibold">
          <CurrencyText value={row.balance_payable ?? row.net_salary} />
        </span>
      ),
    },
    { key: "paid_by", header: "Paid By" },
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openPayrollEdit(row)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
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
            <Eye className="mr-2 h-4 w-4" />
            Payslip
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
    { key: "period", header: "Deduction Period" },
    { key: "advance_date", header: "Advance Date" },
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
    { key: "paid_by", header: "Paid By" },
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
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdvanceDetail(row)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      ),
    },
  ];

  const totalPayrollPages = Math.max(
    1,
    Math.ceil(numberValue(data.count) / PAGE_SIZE),
  );

  const totalAdvancePages = Math.max(
    1,
    Math.ceil(numberValue(advanceData.count) / PAGE_SIZE),
  );

  return (
    <div className="hrms-module-page hrms-workspace space-y-5">
      <PageHeader
        title="Payroll"
        subtitle="Review previous salaries, manage advance salary, and generate payroll from the action button"
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
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <DataTable
              columns={previousSalaryColumns}
              data={data.results || []}
              isLoading={query.isLoading || query.isFetching}
              page={page}
              pageSize={PAGE_SIZE}
              total={Number(data.count || 0)}
              onPageChange={(nextPage) => {
                if (nextPage < 1 || nextPage > totalPayrollPages) {
                  return;
                }
                setPage(nextPage);
              }}
            />
          </section>
        </TabsContent>

        <TabsContent value="advances" className="mt-4">
          <section className="card-surface overflow-hidden">
            <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold">Advance Salary History</h2>
                <p className="text-xs text-muted-foreground">
                  Paid advances are deducted automatically during payroll.
                </p>
              </div>

              <Button onClick={openAdvanceModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Advance
              </Button>
            </div>

            <div className="grid gap-3 border-b p-4 md:grid-cols-[220px_1fr]">
              <Input
                type="month"
                value={advancePeriod}
                onChange={(event) => {
                  setAdvancePeriod(event.target.value);
                  setAdvancePage(1);
                }}
              />

              <SearchInput
                value={advanceSearch}
                onChange={(value) => {
                  setAdvanceSearch(value);
                  setAdvancePage(1);
                }}
                placeholder="Search employee, code, paid by or reference number"
              />
            </div>

            <DataTable
              columns={advanceColumns}
              data={advanceData.results || []}
              isLoading={advancesQuery.isLoading || advancesQuery.isFetching}
              page={advancePage}
              pageSize={PAGE_SIZE}
              total={Number(advanceData.count || 0)}
              onPageChange={(nextPage) => {
                if (nextPage < 1 || nextPage > totalAdvancePages) {
                  return;
                }
                setAdvancePage(nextPage);
              }}
            />
          </section>
        </TabsContent>
      </Tabs>

      {editingPayroll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Edit Payroll Salary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the salary values for this generated payroll entry.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setEditingPayroll(null)}
                disabled={payrollEditMutation.isPending}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <Label>Employee</Label>
                <Input
                  className="mt-2"
                  value={[
                    editingPayroll.employee_code,
                    editingPayroll.employee_name,
                  ]
                    .filter(Boolean)
                    .join(" — ")}
                  disabled
                />
              </div>

              <div>
                <Label>Period</Label>
                <Input
                  className="mt-2"
                  value={editingPayroll.period || ""}
                  disabled
                />
              </div>

              <div>
                <Label>Payroll Date *</Label>
                <Input
                  type="date"
                  className="mt-2"
                  value={editPayrollForm.payroll_date}
                  onChange={(event) =>
                    setEditPayrollForm((current) => ({
                      ...current,
                      payroll_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Paid By</Label>
                <Input
                  className="mt-2"
                  value={editPayrollForm.paid_by}
                  onChange={(event) =>
                    setEditPayrollForm((current) => ({
                      ...current,
                      paid_by: event.target.value,
                    }))
                  }
                  placeholder="Payer / payment source"
                />
              </div>

              <div>
                <Label>Basic Salary *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={editPayrollForm.basic_salary}
                  onChange={(event) =>
                    setEditPayrollForm((current) => ({
                      ...current,
                      basic_salary: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Allowances</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={editPayrollForm.allowances}
                  onChange={(event) =>
                    setEditPayrollForm((current) => ({
                      ...current,
                      allowances: event.target.value,
                    }))
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
                  value={editPayrollForm.deductions}
                  onChange={(event) =>
                    setEditPayrollForm((current) => ({
                      ...current,
                      deductions: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Calculated Gross Salary</Label>
                <Input
                  className="mt-2"
                  value={(
                    numberValue(editPayrollForm.basic_salary) +
                    numberValue(editPayrollForm.allowances)
                  ).toFixed(2)}
                  disabled
                />
              </div>

              <div className="md:col-span-2 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Calculated Net Salary
                  </span>
                  <span className="text-lg font-semibold">
                    <CurrencyText
                      value={Math.max(
                        0,
                        numberValue(editPayrollForm.basic_salary) +
                          numberValue(editPayrollForm.allowances) -
                          numberValue(editPayrollForm.deductions),
                      )}
                    />
                  </span>
                </div>

                {numberValue(editingPayroll.advance_deduction) > 0 ? (
                  <p className="mt-2 text-xs text-amber-600">
                    Existing advance deduction: AED{" "}
                    {numberValue(editingPayroll.advance_deduction).toFixed(2)}.
                    Advance deduction remains linked to this payroll entry.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPayroll(null)}
                disabled={payrollEditMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submitPayrollEdit}
                disabled={payrollEditMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {payrollEditMutation.isPending
                  ? "Updating..."
                  : "Update Salary"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {payrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Generate Payroll</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Salary and advance deductions are calculated automatically.
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Pay Period *</Label>
                  <Input
                    type="month"
                    className="mt-2"
                    value={period}
                    onChange={(event) => {
                      setPeriod(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <div>
                  <Label>Payroll Date *</Label>
                  <Input
                    type="date"
                    className="mt-2"
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
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Paid By *</Label>
                  <Input
                    className="mt-2"
                    value={paidBy}
                    onChange={(event) => setPaidBy(event.target.value)}
                    placeholder="Enter payer name / source"
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
                      filteredEligibleEmployees
                        .filter((item) => !item.already_generated)
                        .map((item) => item.id),
                    )
                  }
                >
                  Select All
                </Button>
              </div>

              <div className="mt-3">
                <SearchInput
                  value={payrollEmployeeSearch}
                  onChange={setPayrollEmployeeSearch}
                  placeholder="Search employee name, code, branch or designation"
                />
              </div>

              <div className="mt-3 max-h-[430px] divide-y overflow-y-auto rounded-xl border">
                {eligibleLoading ? (
                  <p className="p-8 text-center text-muted-foreground">
                    Loading employees...
                  </p>
                ) : filteredEligibleEmployees.length ? (
                  filteredEligibleEmployees.map((employee) => {
                    const totalDays =
                      numberValue(employee.total_period_days) || 30;
                    const days = numberValue(
                      payableDays[employee.id] ??
                        employee.suggested_payable_days,
                    );
                    const gross =
                      numberValue(employee.gross_salary) * (days / totalDays);
                    const remaining = Math.max(
                      0,
                      gross - numberValue(employee.advance_received),
                    );

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
                            value={
                              payableDays[employee.id] ??
                              employee.suggested_payable_days ??
                              0
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
                            <CurrencyText value={employee.advance_received} />
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
                    {payrollEmployeeSearch
                      ? "No employees match your search."
                      : "No eligible employees found."}
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
                  Generate Payroll
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {advanceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Advance Salary Details
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete information for the selected advance salary record.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setAdvanceDetail(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-xl border p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Employee
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {advanceDetail.employee_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {advanceDetail.employee_code}
                  {advanceDetail.branch_name
                    ? ` · ${advanceDetail.branch_name}`
                    : ""}
                </p>
              </div>

              <div>
                <Label>Deduction Period</Label>
                <Input
                  className="mt-2"
                  value={advanceDetail.period || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>Advance Date</Label>
                <Input
                  className="mt-2"
                  value={advanceDetail.advance_date || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>Current Salary</Label>
                <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 font-medium">
                  <CurrencyText value={advanceDetail.salary_at_time} />
                </div>
              </div>

              <div>
                <Label>Advance Paid</Label>
                <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 font-semibold">
                  <CurrencyText value={advanceDetail.amount} />
                </div>
              </div>

              <div>
                <Label>Paid By</Label>
                <Input
                  className="mt-2"
                  value={advanceDetail.paid_by || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-2 flex h-10 items-center rounded-md border px-3">
                  <StatusBadge status={advanceDetail.status} />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Reference Number</Label>
                <Input
                  className="mt-2"
                  value={advanceDetail.reference_number || ""}
                  readOnly
                  placeholder="No reference number"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  className="mt-2"
                  rows={4}
                  value={advanceDetail.notes || ""}
                  readOnly
                  placeholder="No notes"
                />
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdvanceDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {advanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Add Advance Salary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The employee salary is fetched automatically.
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
              <div className="md:col-span-2">
                <Label>Employee *</Label>
                <Select
                  value={advanceForm.employee}
                  onValueChange={(value) => {
                    setAdvanceForm((current) => ({
                      ...current,
                      employee: value,
                    }));
                    setAdvanceEmployeeSearch("");
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 p-0">
                    <div
                      className="sticky top-0 z-10 border-b bg-popover p-2"
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Input
                        value={advanceEmployeeSearch}
                        onChange={(event) =>
                          setAdvanceEmployeeSearch(event.target.value)
                        }
                        placeholder="Search employee name or code"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                      {filteredAdvanceEmployees.length ? (
                        filteredAdvanceEmployees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={String(employee.id)}
                          >
                            {employee.employee_code} — {employee.full_name}
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

              <div>
                <Label>Current Monthly Salary</Label>
                <Input
                  className="mt-2"
                  readOnly
                  value={
                    selectedAdvanceEmployee
                      ? numberValue(
                          selectedAdvanceEmployee.total_salary,
                        ).toFixed(2)
                      : ""
                  }
                  placeholder="Fetched automatically"
                />
              </div>

              <div>
                <Label>Advance Amount *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-2"
                  value={advanceForm.amount}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Deduction Period *</Label>
                <Input
                  type="month"
                  min={currentPeriod}
                  className="mt-2"
                  value={advanceForm.period}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      period: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Advance Date *</Label>
                <Input
                  type="date"
                  min={today}
                  className="mt-2"
                  value={advanceForm.advance_date}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      advance_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Paid By *</Label>
                <Input
                  className="mt-2"
                  value={advanceForm.paid_by}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      paid_by: event.target.value,
                    }))
                  }
                  placeholder="Cash, bank, manager name, etc."
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  className="mt-2"
                  value={advanceForm.reference_number}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      reference_number: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={advanceForm.notes}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setAdvanceOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitAdvance}
                disabled={advanceMutation.isPending}
              >
                Save Advance Salary
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
