import React from "react";
import {
  Banknote,
  Download,
  Eye,
  History,
  Landmark,
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

const addMonthsToPeriod = (periodValue, months) => {
  const [year, month] = String(periodValue).split("-").map(Number);

  if (!year || !month) {
    return "";
  }

  const date = new Date(year, month - 1 + months, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
};

const nextPayrollPeriod = addMonthsToPeriod(currentPeriod, 1);

const getPeriodEndDate = (periodValue) => {
  const [year, month] = String(periodValue).split("-").map(Number);

  if (!year || !month) {
    return "";
  }

  return new Date(year, month, 0).toISOString().slice(0, 10);
};

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

const emptyLoan = {
  employee: "",
  loan_date: today,
  start_period: currentPeriod,
  amount: "",
  monthly_installment: "",
  reference_number: "",
  reason: "",
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
  const [loanSearch, setLoanSearch] = React.useState("");
  const [loanPage, setLoanPage] = React.useState(1);
  const [loanEmployeeSearch, setLoanEmployeeSearch] = React.useState("");
  const [loanOpen, setLoanOpen] = React.useState(false);
  const [loanDetail, setLoanDetail] = React.useState(null);
  const [loanForm, setLoanForm] = React.useState(emptyLoan);
  const [statusFilter, setStatusFilter] = React.useState("");

  const [payrollOpen, setPayrollOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [advanceDetail, setAdvanceDetail] = React.useState(null);
  const [editingPayroll, setEditingPayroll] = React.useState(null);
  const [payingPayroll, setPayingPayroll] = React.useState(null);
  const [payrollPaidBy, setPayrollPaidBy] = React.useState("");

  const [editPayrollForm, setEditPayrollForm] = React.useState({
    payroll_date: today,
    basic_salary: "",
    allowances: "",
    deductions: "",
    paid_by: "",
  });

  const [payrollDate, setPayrollDate] = React.useState(today);
  const [payrollStatus, setPayrollStatus] = React.useState("PENDING");
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

  const loansQuery = useQuery({
    queryKey: ["employee-loans", loanPage, loanSearch, branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employee-loans/", {
          params: {
            ...branchParams,
            page: loanPage,
            page_size: PAGE_SIZE,
            search: loanSearch || undefined,
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

  const { data: loanOptions = {} } = useQuery({
    queryKey: ["employee-loan-options", selectedBranch],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employee-loans/form-options/", {
          params: {
            branch: selectedBranch || undefined,
          },
        }),
      ),
    enabled: loanOpen,
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

  const loanData = loansQuery.data || {
    results: [],
    count: 0,
  };

  const branches = normalizeList(employeeOptions.branches);
  const eligible = normalizeList(eligibleResponse);
  const advanceEmployees = normalizeList(advanceOptions.employees);
  const loanEmployees = normalizeList(loanOptions.employees);

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

  const filteredLoanEmployees = React.useMemo(() => {
    const search = loanEmployeeSearch.trim().toLowerCase();

    if (!search) {
      return loanEmployees;
    }

    return loanEmployees.filter((employee) =>
      [employee.full_name, employee.employee_code, employee.branch_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [loanEmployees, loanEmployeeSearch]);

  const selectedLoanEmployee = loanEmployees.find(
    (employee) => String(employee.id) === String(loanForm.employee),
  );

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

    const loanDeduction = numberValue(
      employee.loan_deduction_preview ??
        employee.loan_deduction ??
        employee.monthly_loan_deduction ??
        0,
    );

    return (
      sum +
      Math.max(
        0,
        gross - numberValue(employee.advance_received) - loanDeduction,
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
        queryKey: ["employee-loans"],
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

  const openLoanModal = () => {
    setLoanEmployeeSearch("");
    setLoanForm({
      ...emptyLoan,
      loan_date: today,
      start_period: currentPeriod,
    });
    setSelectedBranch(branchId ? String(branchId) : "");
    setLoanOpen(true);
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
      toast.success(
        payrollStatus === "PAID"
          ? "Payroll generated and marked as paid successfully."
          : "Payroll generated successfully.",
      );
      setPayrollOpen(false);
      setPayrollStatus("PENDING");
      setPaidBy("");
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
    if (String(row.status || "").toUpperCase() === "PAID") {
      toast.error("Paid payroll cannot be edited.");
      return;
    }

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

  const markPayrollPaidMutation = useMutation({
    mutationFn: async () => {
      if (!payingPayroll?.id) {
        throw new Error("Payroll entry is required.");
      }

      const paidByValue = payrollPaidBy.trim();

      if (!paidByValue) {
        throw new Error("Paid By is required.");
      }

      return unwrap(
        await api.post(
          `/hrms/payroll/${payingPayroll.id}/mark-paid/`,
          {
            paid_by: paidByValue,
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      );
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["payroll-entries"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["payroll-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["payroll-runs"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["employee-loans"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["salary-advances"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["eligible-payroll-employees"],
        }),
      ]);

      toast.success("Payroll marked as paid successfully.");

      setPayingPayroll(null);
      setPayrollPaidBy("");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(
        error?.message || details.title || "Unable to mark payroll as paid",
        {
          description:
            error?.response?.data?.paid_by ||
            error?.response?.data?.detail ||
            details.summary ||
            details.message,
        },
      );
    },
  });

  const openMarkPaidModal = (row) => {
    setPayingPayroll(row);
    setPayrollPaidBy(row.paid_by || "");
  };

  const submitMarkPaid = () => {
    if (!payrollPaidBy.trim()) {
      toast.error("Enter Paid By.");
      return;
    }

    markPayrollPaidMutation.mutate();
  };

  const loanMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          "/hrms/employee-loans/",
          {
            ...loanForm,
            employee: Number(loanForm.employee),
            amount: numberValue(loanForm.amount),
            monthly_installment: numberValue(loanForm.monthly_installment),
            reference_number: loanForm.reference_number.trim(),
            reason: loanForm.reason.trim(),
            notes: loanForm.notes.trim(),
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await refreshAll();

      await queryClient.invalidateQueries({
        queryKey: ["employee-loans"],
      });

      toast.success("Employee loan created successfully.");
      setLoanOpen(false);
      setActiveTab("loans");
      setLoanPage(1);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to create employee loan", {
        description: details.summary || details.message,
      });
    },
  });

  const submitPayroll = () => {
    if (!period || !payrollDate) {
      toast.error("Pay period and payroll date are required.");
      return;
    }

    if (period > nextPayrollPeriod) {
      toast.error(
        `Future payroll is limited to the next month (${nextPayrollPeriod}).`,
      );
      return;
    }

    if (payrollStatus === "PAID" && !paidBy.trim()) {
      toast.error("Paid By is required when creating payroll as Paid.");
      return;
    }

    if (!selectedEmployees.length) {
      toast.error("Select at least one employee.");
      return;
    }

    const selectedPeriodEnd = getPeriodEndDate(period);

    const invalidEmployee = eligible.find(
      (employee) =>
        selectedEmployees.includes(employee.id) &&
        employee.joining_date &&
        selectedPeriodEnd &&
        employee.joining_date > selectedPeriodEnd,
    );

    if (invalidEmployee) {
      toast.error(
        `${invalidEmployee.full_name} joined on ${invalidEmployee.joining_date}. ` +
          `Payroll cannot be created before the joining date.`,
      );
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

  const submitLoan = () => {
    if (!loanForm.employee) {
      toast.error("Select an employee.");
      return;
    }

    if (!loanForm.loan_date) {
      toast.error("Select the loan date.");
      return;
    }

    if (!loanForm.start_period) {
      toast.error("Select the first deduction month.");
      return;
    }

    const amount = numberValue(loanForm.amount);
    const installment = numberValue(loanForm.monthly_installment);

    if (amount <= 0) {
      toast.error("Enter a valid loan amount.");
      return;
    }

    if (installment <= 0) {
      toast.error("Enter a valid monthly deduction.");
      return;
    }

    if (installment > amount) {
      toast.error("Monthly deduction cannot exceed the loan amount.");
      return;
    }

    loanMutation.mutate();
  };

  const cancelLoan = async (loan) => {
    if (!window.confirm(`Cancel the active loan for ${loan.employee_name}?`)) {
      return;
    }

    try {
      await api.post(
        `/hrms/employee-loans/${loan.id}/cancel/`,
        {},
        {
          skipGlobalErrorToast: true,
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["employee-loans"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["eligible-payroll-employees"],
      });

      toast.success("Employee loan cancelled.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to cancel employee loan", {
        description: details.summary || details.message,
      });
    }
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
      key: "loan_deduction",
      header: "Loan Deduction",
      align: "right",
      cell: (row) => (
        <span className="text-orange-600">
          <CurrencyText value={row.loan_deduction || 0} />
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
      cell: (row) => (
        <div>
          <StatusBadge status={row.status} />

          {String(row.status || "").toUpperCase() === "PAID" && row.paid_at ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Paid {String(row.paid_at).slice(0, 10)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          {["PENDING", "PROCESSING"].includes(
            String(row.status || "").toUpperCase(),
          ) ? (
            <Button
              type="button"
              size="sm"
              onClick={() => openMarkPaidModal(row)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Mark Paid
            </Button>
          ) : null}

          {String(row.status || "").toUpperCase() !== "PAID" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openPayrollEdit(row)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}

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

  const loanColumns = [
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
      key: "loan_date",
      header: "Loan Date",
    },
    {
      key: "start_period",
      header: "Starts From",
    },
    {
      key: "amount",
      header: "Loan Amount",
      align: "right",
      cell: (row) => <CurrencyText value={row.amount || 0} />,
    },
    {
      key: "monthly_installment",
      header: "Monthly Deduction",
      align: "right",
      cell: (row) => <CurrencyText value={row.monthly_installment || 0} />,
    },
    {
      key: "paid_amount",
      header: "Recovered",
      align: "right",
      cell: (row) => <CurrencyText value={row.paid_amount || 0} />,
    },
    {
      key: "remaining_balance",
      header: "Balance",
      align: "right",
      cell: (row) => (
        <span className="font-semibold">
          <CurrencyText value={row.remaining_balance || 0} />
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setLoanDetail(row)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>

          {String(row.status || "").toUpperCase() === "ACTIVE" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => cancelLoan(row)}
            >
              Cancel
            </Button>
          ) : null}
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

  const totalLoanPages = Math.max(
    1,
    Math.ceil(numberValue(loanData.count) / PAGE_SIZE),
  );

  return (
    <div className="hrms-module-page hrms-workspace mx-auto w-full max-w-[1800px] space-y-5 pb-8">
      <PageHeader
        title="Payroll"
        subtitle="Review salary history, manage advance salary and employee loans, and generate payroll"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={exportPayroll}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button variant="outline" onClick={openAdvanceModal}>
              <Banknote className="mr-2 h-4 w-4" />
              Add Advance Salary
            </Button>

            <Button variant="outline" onClick={openLoanModal}>
              <Landmark className="mr-2 h-4 w-4" />
              Add Employee Loan
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <TabsList
          className="
            grid h-12 w-full grid-cols-3 gap-1 rounded-xl border
            bg-muted/35 p-1 shadow-none
            lg:max-w-2xl
          "
        >
          <TabsTrigger
            value="previous"
            className="
              flex h-10 items-center justify-center gap-2 rounded-lg
              px-3 text-sm font-medium text-muted-foreground
              transition-all
              hover:bg-background/70 hover:text-foreground
              data-[state=active]:bg-blue-600
              data-[state=active]:text-white
              data-[state=active]:shadow-sm
            "
          >
            <History className="h-4 w-4 shrink-0" />
            <span className="truncate">Salary History</span>
          </TabsTrigger>

          <TabsTrigger
            value="advances"
            className="
              flex h-10 items-center justify-center gap-2 rounded-lg
              px-3 text-sm font-medium text-muted-foreground
              transition-all
              hover:bg-background/70 hover:text-foreground
              data-[state=active]:bg-blue-600
              data-[state=active]:text-white
              data-[state=active]:shadow-sm
            "
          >
            <Banknote className="h-4 w-4 shrink-0" />
            <span className="truncate">Advance Salary</span>
          </TabsTrigger>

          <TabsTrigger
            value="loans"
            className="
              flex h-10 items-center justify-center gap-2 rounded-lg
              px-3 text-sm font-medium text-muted-foreground
              transition-all
              hover:bg-background/70 hover:text-foreground
              data-[state=active]:bg-blue-600
              data-[state=active]:text-white
              data-[state=active]:shadow-sm
            "
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span className="truncate">Employee Loans</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="previous" className="mt-4">
          <section className="card-surface overflow-hidden">
            <div className="grid gap-3 border-b p-4 md:grid-cols-[200px_minmax(280px,1fr)_200px] md:items-center">
              <Input
                type="month"
                max={nextPayrollPeriod}
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setPage(1);
                }}
              />

              <div>
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
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
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

        <TabsContent value="loans" className="mt-4">
          <section className="card-surface overflow-hidden">
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Employee Loan History</h2>
                <p className="text-xs text-muted-foreground">
                  Active loan installments are deducted automatically from
                  monthly payroll.
                </p>
              </div>

              <Button onClick={openLoanModal}>
                <Plus className="mr-2 h-4 w-4" />
                New Loan
              </Button>
            </div>

            <div className="border-b p-4">
              <SearchInput
                value={loanSearch}
                onChange={(value) => {
                  setLoanSearch(value);
                  setLoanPage(1);
                }}
                placeholder="Search employee, code, reference or reason"
              />
            </div>

            <DataTable
              columns={loanColumns}
              data={loanData.results || []}
              isLoading={loansQuery.isLoading || loansQuery.isFetching}
              page={loanPage}
              pageSize={PAGE_SIZE}
              total={Number(loanData.count || 0)}
              onPageChange={(nextPage) => {
                if (nextPage < 1 || nextPage > totalLoanPages) {
                  return;
                }

                setLoanPage(nextPage);
              }}
              emptyTitle="No employee loans"
              emptyDescription="Create an employee loan to start automatic monthly recovery."
            />
          </section>
        </TabsContent>
      </Tabs>

      {payingPayroll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Mark Payroll as Paid</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm the salary payment before finalizing this payroll.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setPayingPayroll(null);
                  setPayrollPaidBy("");
                }}
                disabled={markPayrollPaidMutation.isPending}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border bg-muted/25 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Employee</p>
                    <p className="mt-1 font-semibold">
                      {payingPayroll.employee_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payingPayroll.employee_code}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">Net Salary</p>
                    <div className="mt-1 text-lg font-bold text-emerald-600">
                      <CurrencyText
                        value={
                          payingPayroll.balance_payable ??
                          payingPayroll.net_salary ??
                          0
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Period</p>
                    <p className="mt-1 font-medium">
                      {payingPayroll.period || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Advance</p>
                    <div className="mt-1 font-medium text-amber-600">
                      <CurrencyText
                        value={payingPayroll.advance_deduction || 0}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Loan</p>
                    <div className="mt-1 font-medium text-orange-600">
                      <CurrencyText value={payingPayroll.loan_deduction || 0} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Paid By *</Label>
                <Input
                  className="mt-2"
                  value={payrollPaidBy}
                  onChange={(event) => setPayrollPaidBy(event.target.value)}
                  placeholder="Example: Bank Transfer, Cashier, Hashif Muhammed"
                  autoFocus
                  disabled={markPayrollPaidMutation.isPending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitMarkPaid();
                    }
                  }}
                />

                <p className="mt-1.5 text-xs text-muted-foreground">
                  This will set the salary to PAID and apply the employee's
                  advance/loan settlement.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                After payment is confirmed, this payroll should no longer be
                edited. Loan repayment is deducted from the outstanding loan
                balance at this stage.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPayingPayroll(null);
                  setPayrollPaidBy("");
                }}
                disabled={markPayrollPaidMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submitMarkPaid}
                disabled={markPayrollPaidMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Banknote className="mr-2 h-4 w-4" />

                {markPayrollPaidMutation.isPending
                  ? "Marking Paid..."
                  : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                          numberValue(editPayrollForm.deductions) -
                          numberValue(editingPayroll.advance_deduction) -
                          numberValue(editingPayroll.loan_deduction),
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

                {numberValue(editingPayroll.loan_deduction) > 0 ? (
                  <p className="mt-1 text-xs text-orange-600">
                    Existing loan deduction: AED{" "}
                    {numberValue(editingPayroll.loan_deduction).toFixed(2)}.
                    Loan deduction remains linked to this payroll entry.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Generate Payroll</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Salary, advance deductions, and loan installments are
                  calculated automatically.
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <Label>Pay Period *</Label>
                  <Input
                    type="month"
                    className="mt-2"
                    value={period}
                    max={nextPayrollPeriod}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value && value > nextPayrollPeriod) {
                        toast.error(
                          `Payroll can only be created up to ${nextPayrollPeriod}.`,
                        );
                        return;
                      }

                      setPeriod(value);
                      setSelectedEmployees([]);
                      setPayableDays({});
                      setPage(1);
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Previous months, current month, and next month only.
                  </p>
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
                  <Label>Payroll Status *</Label>

                  <Select
                    value={payrollStatus}
                    onValueChange={(value) => {
                      setPayrollStatus(value);

                      if (value !== "PAID") {
                        setPaidBy("");
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>

                      <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Pending can be reviewed later. Paid finalizes the salary
                    immediately.
                  </p>
                </div>

                <div>
                  <Label>
                    Paid By
                    {payrollStatus === "PAID" ? " *" : ""}
                  </Label>

                  <Input
                    className="mt-2"
                    value={paidBy}
                    onChange={(event) => setPaidBy(event.target.value)}
                    placeholder={
                      payrollStatus === "PAID"
                        ? "Example: Bank Transfer / Cashier"
                        : "Not required for Pending"
                    }
                    disabled={payrollStatus !== "PAID"}
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    {payrollStatus === "PAID"
                      ? "Required because the payroll will be settled immediately."
                      : "Use Mark Paid later after reviewing the payroll."}
                  </p>
                </div>
              </div>

              <div
                className={`mt-5 rounded-xl border p-3 text-sm ${
                  payrollStatus === "PAID"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                }`}
              >
                {payrollStatus === "PAID" ? (
                  <>
                    <strong>Paid payroll:</strong> Salary will be finalized
                    immediately. Advance and employee-loan deductions will be
                    settled when the payroll is generated.
                  </>
                ) : (
                  <>
                    <strong>Pending payroll:</strong> Generate first,
                    review/edit the salary, then use Mark Paid from Salary
                    History.
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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

              <div className="mt-3 overflow-hidden rounded-xl border">
                <div className="overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[36px_minmax(260px,1fr)_130px_145px_145px_165px] items-center gap-4 border-b bg-muted/35 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <div />
                      <div>Employee</div>
                      <div>Payable Days</div>
                      <div className="text-right">Advance Deduction</div>
                      <div className="text-right">Loan Deduction</div>
                      <div className="text-right">Remaining Payroll</div>
                    </div>

                    <div className="max-h-[430px] divide-y overflow-y-auto">
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
                            numberValue(employee.gross_salary) *
                            (days / totalDays);
                          const loanDeduction = numberValue(
                            employee.loan_deduction_preview ??
                              employee.loan_deduction ??
                              employee.monthly_loan_deduction ??
                              0,
                          );

                          const remaining = Math.max(
                            0,
                            gross -
                              numberValue(employee.advance_received) -
                              loanDeduction,
                          );

                          return (
                            <label
                              key={employee.id}
                              className="grid grid-cols-[36px_minmax(260px,1fr)_130px_145px_145px_165px] items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/30"
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedEmployees.includes(
                                    employee.id,
                                  )}
                                  disabled={employee.already_generated}
                                  onChange={(event) =>
                                    setSelectedEmployees((current) =>
                                      event.target.checked
                                        ? [...current, employee.id]
                                        : current.filter(
                                            (id) => id !== employee.id,
                                          ),
                                    )
                                  }
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {employee.full_name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {employee.employee_code} ·{" "}
                                  {employee.branch_name}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Monthly salary:{" "}
                                  <CurrencyText value={employee.gross_salary} />
                                </p>

                                {employee.joining_date ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Joined: {employee.joining_date}
                                  </p>
                                ) : null}
                              </div>

                              <div>
                                <Input
                                  type="number"
                                  className="h-10 text-center"
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
                                <p className="whitespace-nowrap font-semibold tabular-nums text-amber-600">
                                  <CurrencyText
                                    value={employee.advance_received}
                                  />
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="whitespace-nowrap font-semibold tabular-nums text-orange-600">
                                  <CurrencyText value={loanDeduction} />
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="whitespace-nowrap font-semibold tabular-nums text-emerald-600">
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
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Selected payroll total
                </p>
                <p className="text-lg font-semibold">
                  <CurrencyText value={selectedTotal} />
                </p>
              </div>

              <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                <Button
                  className="flex-1 sm:flex-none"
                  variant="outline"
                  onClick={() => setPayrollOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 sm:flex-none ${
                    payrollStatus === "PAID"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : ""
                  }`}
                  onClick={submitPayroll}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending
                    ? payrollStatus === "PAID"
                      ? "Generating & Paying..."
                      : "Generating..."
                    : payrollStatus === "PAID"
                      ? "Generate & Mark Paid"
                      : "Generate Payroll"}
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

            <div className="flex justify-end gap-2 border-t px-6 py-4">
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

      {loanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Employee Loan Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Loan balance and automatic payroll repayment information.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setLoanDetail(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <Label>Employee</Label>
                <Input
                  className="mt-2"
                  value={[loanDetail.employee_code, loanDetail.employee_name]
                    .filter(Boolean)
                    .join(" — ")}
                  readOnly
                />
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-3">
                  <StatusBadge status={loanDetail.status} />
                </div>
              </div>

              <div>
                <Label>Loan Date</Label>
                <Input
                  className="mt-2"
                  value={loanDetail.loan_date || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>First Deduction Month</Label>
                <Input
                  className="mt-2"
                  value={loanDetail.start_period || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>Loan Amount</Label>
                <div className="mt-2 rounded-md border px-3 py-2 font-semibold">
                  <CurrencyText value={loanDetail.amount || 0} />
                </div>
              </div>

              <div>
                <Label>Monthly Deduction</Label>
                <div className="mt-2 rounded-md border px-3 py-2">
                  <CurrencyText value={loanDetail.monthly_installment || 0} />
                </div>
              </div>

              <div>
                <Label>Recovered</Label>
                <div className="mt-2 rounded-md border px-3 py-2 text-emerald-600">
                  <CurrencyText value={loanDetail.paid_amount || 0} />
                </div>
              </div>

              <div>
                <Label>Remaining Balance</Label>
                <div className="mt-2 rounded-md border px-3 py-2 font-semibold text-orange-600">
                  <CurrencyText value={loanDetail.remaining_balance || 0} />
                </div>
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  className="mt-2"
                  value={loanDetail.reference_number || ""}
                  readOnly
                />
              </div>

              <div>
                <Label>Reason</Label>
                <Input
                  className="mt-2"
                  value={loanDetail.reason || ""}
                  readOnly
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={loanDetail.notes || ""}
                  readOnly
                />
              </div>

              {Array.isArray(loanDetail.repayments) &&
              loanDetail.repayments.length ? (
                <div className="md:col-span-2">
                  <Label>Repayment History</Label>

                  <div className="mt-2 divide-y overflow-hidden rounded-xl border">
                    {loanDetail.repayments.map((repayment) => (
                      <div
                        key={repayment.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <span>{repayment.period}</span>
                        <CurrencyText value={repayment.amount || 0} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLoanDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {loanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">New Employee Loan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The monthly installment will be deducted automatically from
                  payroll.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setLoanOpen(false)}
                disabled={loanMutation.isPending}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Employee *</Label>

                <Select
                  value={loanForm.employee}
                  onValueChange={(value) => {
                    setLoanForm((current) => ({
                      ...current,
                      employee: value,
                    }));
                    setLoanEmployeeSearch("");
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
                        value={loanEmployeeSearch}
                        onChange={(event) =>
                          setLoanEmployeeSearch(event.target.value)
                        }
                        placeholder="Search employee name or code"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1">
                      {filteredLoanEmployees.length ? (
                        filteredLoanEmployees.map((employee) => (
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
                    selectedLoanEmployee
                      ? numberValue(
                          selectedLoanEmployee.total_salary ??
                            numberValue(selectedLoanEmployee.basic_salary) +
                              numberValue(selectedLoanEmployee.allowances),
                        ).toFixed(2)
                      : ""
                  }
                  placeholder="Fetched automatically"
                />
              </div>

              <div>
                <Label>Loan Date *</Label>
                <Input
                  type="date"
                  className="mt-2"
                  value={loanForm.loan_date}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      loan_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Loan Amount *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-2"
                  value={loanForm.amount}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Monthly Deduction *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-2"
                  value={loanForm.monthly_installment}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      monthly_installment: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>First Deduction Month *</Label>
                <Input
                  type="month"
                  className="mt-2"
                  value={loanForm.start_period}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      start_period: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  className="mt-2"
                  value={loanForm.reference_number}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      reference_number: event.target.value,
                    }))
                  }
                  placeholder="Optional reference"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Reason</Label>
                <Input
                  className="mt-2"
                  value={loanForm.reason}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Reason for employee loan"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={loanForm.notes}
                  onChange={(event) =>
                    setLoanForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>

              {numberValue(loanForm.amount) > 0 &&
              numberValue(loanForm.monthly_installment) > 0 ? (
                <div className="md:col-span-2 rounded-xl border bg-muted/30 p-4">
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Estimated Installments
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {Math.ceil(
                          numberValue(loanForm.amount) /
                            numberValue(loanForm.monthly_installment),
                        )}{" "}
                        month(s)
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-muted-foreground">
                        Monthly Payroll Deduction
                      </p>
                      <p className="mt-1 font-semibold text-orange-600">
                        <CurrencyText
                          value={numberValue(loanForm.monthly_installment)}
                        />
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    The final installment is automatically limited to the
                    outstanding loan balance.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLoanOpen(false)}
                disabled={loanMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submitLoan}
                disabled={loanMutation.isPending}
              >
                {loanMutation.isPending ? "Saving..." : "Create Loan"}
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
