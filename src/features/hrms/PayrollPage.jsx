import React from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  Download,
  Eye,
  History,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { BranchSourceFilter, usePhysicalBranchScope } from "@/components/common/PhysicalBranchScope";
import { PageHeader } from "@/components/common/PageHeader";
import { MonthYearPicker } from "@/components/common/MonthYearPicker";
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
  monthly_deduction_schedule_text: "",
  reference_number: "",
  reason: "",
  notes: "",
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const branchScope = usePhysicalBranchScope();
  const { branchId, listParams: branchParams, isCombined, physicalBranches } = branchScope;

  const [activeTab, setActiveTab] = React.useState("previous");
  const [period, setPeriod] = React.useState(currentPeriod);
  // History defaults to all periods; payroll generation keeps its own required period.
  const [historyPeriodMode, setHistoryPeriodMode] = React.useState("ALL");
  const [historyPeriod, setHistoryPeriod] = React.useState(currentPeriod);
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
    isCombined ? "" : branchId ? String(branchId) : "",
  );
  const [selectedEmployees, setSelectedEmployees] = React.useState([]);
  const [payableDays, setPayableDays] = React.useState({});
  const [selectedPayrollIds, setSelectedPayrollIds] = React.useState([]);
  const [deletingPayrollIds, setDeletingPayrollIds] = React.useState([]);
  const [payrollDeleteDialog, setPayrollDeleteDialog] = React.useState(null);
  const [deleteUnreconciledAcknowledged, setDeleteUnreconciledAcknowledged] = React.useState(false);
  const [payrollDeleteErrors, setPayrollDeleteErrors] = React.useState([]);

  const [advanceForm, setAdvanceForm] = React.useState({
    ...emptyAdvance,
    period,
  });

  const params = {
    ...branchParams,
    ...(historyPeriodMode === "MONTH" && historyPeriod
      ? { period: historyPeriod }
      : {}),
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

  const branches = physicalBranches.length
    ? physicalBranches
    : normalizeList(employeeOptions.branches).filter((item) =>
        ["BR01", "BR02"].includes(String(item.branch_code || "").toUpperCase()),
      );
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
    setSelectedBranch(isCombined ? "" : branchId ? String(branchId) : "");
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
    setSelectedBranch(isCombined ? "" : branchId ? String(branchId) : "");
    setAdvanceOpen(true);
  };

  const openLoanModal = () => {
    setLoanEmployeeSearch("");
    setLoanForm({
      ...emptyLoan,
      loan_date: today,
      start_period: currentPeriod,
    });
    setSelectedBranch(isCombined ? "" : branchId ? String(branchId) : "");
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
      toast.success("Payroll updated successfully.");
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
            monthly_deduction_overrides: Object.fromEntries(
              loanForm.monthly_deduction_schedule_text.split(/\r?\n/).filter(Boolean).map((line) => {
                const [month, amount] = line.split("=").map((v) => v.trim());
                return [month, amount];
              })
            ),
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

    const joiningPeriod = selectedAdvanceEmployee?.joining_date
      ? selectedAdvanceEmployee.joining_date.slice(0, 7)
      : "";

    if (joiningPeriod && advanceForm.period < joiningPeriod) {
      toast.error("Deduction period cannot be before the employee joining month.");
      return;
    }

    if (!advanceForm.advance_date) {
      toast.error("Select an advance date.");
      return;
    }

    if (advanceForm.advance_date > today) {
      toast.error("Advance date cannot be in the future.");
      return;
    }

    if (
      selectedAdvanceEmployee?.joining_date &&
      advanceForm.advance_date < selectedAdvanceEmployee.joining_date
    ) {
      toast.error("Advance date cannot be before the employee joining date.");
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
    link.download = `payroll-${historyPeriodMode === "MONTH" ? historyPeriod : "all-records"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // The backend authorizes deletion and reverses identifiable HR recoveries.
  // Do not pre-disable paid payroll here: an actual DELETE request produces
  // a specific error if an advance allocation is unsafe to reverse.
  const canDeletePayroll = () => true;

  // HRMS payroll is owned by a physical branch even in Consolidated.
  // Resolve using the row's branch ID; never infer the owner from current UI selection.
  const payrollSource = (row) => {
    const branch = branches.find((item) =>
      String(item.id) === String(row.branch?.id ?? row.branch_id ?? row.branch ?? "")
    );
    return {
      code: branch?.branch_code || row.source_branch_code || row.branch_code || "",
      name: row.branch_name || branch?.branch_name || "",
    };
  };

  const payrollRows = Array.isArray(data.results) ? data.results : [];
  // Selection is independent of deletion permission: Paid entries can be
  // selected for review, but remain protected against destructive requests.
  const visiblePayrollIds = payrollRows.map((row) => String(row.id));
  const selectedVisiblePayrollIds = selectedPayrollIds.filter((id) =>
    visiblePayrollIds.includes(id),
  );
  const allVisibleSelected =
    visiblePayrollIds.length > 0 &&
    visiblePayrollIds.every((id) => selectedVisiblePayrollIds.includes(id));
  const selectedPayrollRows = payrollRows.filter((row) =>
    selectedVisiblePayrollIds.includes(String(row.id)),
  );
  const protectedSelectionCount = selectedPayrollRows.filter(
    (row) => !canDeletePayroll(row),
  ).length;

  const togglePageSelection = (checked) => {
    setSelectedPayrollIds(checked ? visiblePayrollIds : []);
  };

  const deletePayrollEntries = (rows) => {
    if (deletingPayrollIds.length) return;
    const targets = rows.filter(canDeletePayroll);
    if (!targets.length) {
      toast.error("Select a payroll entry first.");
      return;
    }
    if (isCombined && targets.some((row) => !payrollSource(row).code)) {
      toast.error("The source branch is missing for a selected payroll.");
      return;
    }
    setPayrollDeleteErrors([]);
    setDeleteUnreconciledAcknowledged(false);
    setPayrollDeleteDialog({ rows: targets, mode: "confirm" });
  };

  const confirmPayrollDelete = async () => {
    if (!payrollDeleteDialog || deletingPayrollIds.length) return;
    const rows = payrollDeleteDialog.rows;
    const ids = rows.map((row) => String(row.id));
    const removedIds = [];
    const failures = [];
    let reconciliationNeeded = false;
    setDeletingPayrollIds(ids);
    try {
      for (const row of rows) {
        try {
          const params = isCombined
            ? { source_branch: row.branch?.id ?? row.branch_id ?? row.branch ?? payrollSource(row).code }
            : {};
          if (payrollDeleteDialog.mode === "reconcile" && deleteUnreconciledAcknowledged) {
            params.unreconciled_override = "CONFIRM_UNTRACKED_LOAN";
          }
          await api.delete(`/hrms/payroll/${row.id}/`, {
            params,
            skipGlobalErrorToast: true,
          });
          removedIds.push(String(row.id));
        } catch (error) {
          const data = error?.response?.data || {};
          if (data.code === "UNRECONCILED_LOAN_RECOVERY") {
            reconciliationNeeded = true;
          }
          const details = getApiErrorDetails(error);
          failures.push({
            row,
            code: data.code || "",
            message: data.detail || details.summary || details.title || "Delete rejected",
            planned: data.payroll_loan_deduction,
            recorded: data.recorded_repayments,
            canOverride: Boolean(data.override_available),
          });
        }
      }
      setSelectedPayrollIds((current) => current.filter((id) => !removedIds.includes(id)));
      if (removedIds.length) {
        await refreshAll();
        toast.success(`${removedIds.length} payroll record(s) deleted.`);
      }
      if (failures.length) {
        setPayrollDeleteErrors(failures);
        const eligible = failures.filter((item) => item.code === "UNRECONCILED_LOAN_RECOVERY" && item.canOverride);
        setPayrollDeleteDialog({
          rows: eligible.map((item) => item.row),
          mode: eligible.length && reconciliationNeeded ? "reconcile" : "errors",
        });
        setDeleteUnreconciledAcknowledged(false);
      } else {
        setPayrollDeleteDialog(null);
        setPayrollDeleteErrors([]);
      }
    } finally {
      setDeletingPayrollIds([]);
    }
  };

  // Do not carry selection across branch, filters or page changes.
  React.useEffect(() => {
    setSelectedPayrollIds([]);
  }, [branchId, isCombined, historyPeriodMode, historyPeriod, statusFilter, q, page]);

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
    <div className="hrms-module-page hrms-workspace w-full space-y-5 pb-8">
      <BranchSourceFilter scope={branchScope} />
      <PageHeader
        variant="hero"
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
              className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
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
            <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(240px,1.2fr)_minmax(230px,1fr)_180px] md:items-end">
              <div className="space-y-2">
                <Label>Payroll period</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={historyPeriodMode}
                    onValueChange={(value) => {
                      setHistoryPeriodMode(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="min-w-[135px] flex-1">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Records</SelectItem>
                      <SelectItem value="MONTH">Select Month</SelectItem>
                    </SelectContent>
                  </Select>
                  {historyPeriodMode === "MONTH" ? (
                    <div className="min-w-[155px] flex-1">
                      <MonthYearPicker
                        max={nextPayrollPeriod}
                        value={historyPeriod}
                        onChange={(value) => {
                          setHistoryPeriod(value);
                          setPage(1);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search employee, code, period or payer"
                />
              </div>

              <Select
                value={statusFilter || "__ALL__"}
                onValueChange={(value) => {
                  setStatusFilter(value === "__ALL__" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 border-b bg-slate-50/65 px-4 py-3 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <label className="inline-flex cursor-pointer select-none items-center gap-2 font-medium text-foreground">
                  <input
                    type="checkbox"
                    aria-label="Select all payroll entries on this page"
                    checked={allVisibleSelected}
                    disabled={!visiblePayrollIds.length || deletingPayrollIds.length > 0}
                    onChange={(event) => togglePageSelection(event.target.checked)}
                    className="h-[18px] w-[18px] cursor-pointer rounded border-slate-300 accent-blue-600"
                  />
                  <span>Select all on page</span>
                </label>
                <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                  {selectedVisiblePayrollIds.length} selected
                </span>
                {protectedSelectionCount > 0 ? (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {protectedSelectionCount} protected from deletion
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedVisiblePayrollIds.length || deletingPayrollIds.length > 0}
                onClick={() => deletePayrollEntries(selectedPayrollRows)}
                className="h-9 shrink-0 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {deletingPayrollIds.length ? "Deleting..." : `Delete Selected (${selectedVisiblePayrollIds.length})`}
              </Button>
            </div>

            {/* Dedicated payroll table: fixed column sizing prevents shared DataTable
                sort styles and action buttons from collapsing the employee column. */}
            <div className="w-full overflow-x-auto" role="region" aria-label="Payroll salary history" tabIndex={0}>
              <table className={`w-full ${isCombined ? "min-w-[1480px]" : "min-w-[1300px]"} table-fixed border-collapse text-[13px]`}>
                <colgroup>
                  <col style={{ width: "42px" }} />
                  <col style={{ width: "190px" }} />
                  {isCombined ? <col style={{ width: "150px" }} /> : null}
                  <col style={{ width: "82px" }} />
                  <col style={{ width: "106px" }} />
                  <col style={{ width: "112px" }} />
                  <col style={{ width: "115px" }} />
                  <col style={{ width: "113px" }} />
                  <col style={{ width: "124px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "190px" }} />
                </colgroup>
                <thead className="border-b bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                        aria-label="Select all payroll records on page"
                        checked={allVisibleSelected}
                        disabled={!visiblePayrollIds.length || Boolean(deletingPayrollIds.length)}
                        onChange={(event) => togglePageSelection(event.target.checked)}
                      />
                    </th>
                    <th scope="col" className="px-3 py-3 text-left">Employee</th>
                    {isCombined ? <th scope="col" className="px-3 py-3 text-left">Branch</th> : null}
                    <th scope="col" className="px-2 py-3 text-left">Period</th>
                    <th scope="col" className="px-2 py-3 text-left">Payroll date</th>
                    <th scope="col" className="px-2 py-3 text-right">Gross salary</th>
                    <th scope="col" className="px-2 py-3 text-right">Advance</th>
                    <th scope="col" className="px-2 py-3 text-right">Loan</th>
                    <th scope="col" className="px-2 py-3 text-right">Remaining</th>
                    <th scope="col" className="px-2 py-3 text-left">Paid by</th>
                    <th scope="col" className="px-2 py-3 text-center">Status</th>
                    <th scope="col" className="px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/50">
                  {query.isLoading || query.isFetching ? (
                    <tr><td colSpan={isCombined ? 12 : 11} className="px-4 py-10 text-center text-muted-foreground">Loading payroll records...</td></tr>
                  ) : payrollRows.length === 0 ? (
                    <tr><td colSpan={isCombined ? 12 : 11} className="px-4 py-10 text-center text-muted-foreground">No payroll records found.</td></tr>
                  ) : payrollRows.map((row) => (
                    <tr key={row.id} className={`align-middle transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40 ${selectedPayrollIds.includes(String(row.id)) ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}>
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                          aria-label={`Select payroll for ${row.employee_name || row.id}`}
                          checked={selectedPayrollIds.includes(String(row.id))}
                          disabled={Boolean(deletingPayrollIds.length)}
                          onChange={(event) => setSelectedPayrollIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, String(row.id)])]
                              : current.filter((id) => id !== String(row.id))
                          )}
                        />
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="min-w-0 font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">{row.employee_name || "—"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{row.employee_code || ""}{!isCombined && row.branch_name ? ` · ${row.branch_name}` : ""}</div>
                      </td>
                      {isCombined ? (
                        <td className="px-3 py-4 text-left">
                          <div className="font-semibold text-foreground">{payrollSource(row).code || "—"}</div>
                          <div className="mt-0.5 text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">{payrollSource(row).name}</div>
                        </td>
                      ) : null}
                      <td className="px-2 py-4 whitespace-nowrap tabular-nums">{row.period || "—"}</td>
                      <td className="px-2 py-4 whitespace-nowrap tabular-nums">{row.payroll_date || "—"}</td>
                      <td className="px-2 py-4 text-right font-medium tabular-nums whitespace-nowrap"><CurrencyText value={row.gross_salary || 0} /></td>
                      <td className="px-2 py-4 text-right tabular-nums whitespace-nowrap text-amber-600"><CurrencyText value={row.advance_deduction || 0} /></td>
                      <td className="px-2 py-4 text-right tabular-nums whitespace-nowrap text-orange-600"><CurrencyText value={row.loan_deduction || 0} /></td>
                      <td className="px-2 py-4 text-right font-semibold tabular-nums whitespace-nowrap"><CurrencyText value={row.balance_payable ?? row.net_salary ?? 0} /></td>
                      <td className="px-2 py-4 text-left [overflow-wrap:anywhere]">{row.paid_by || "—"}</td>
                      <td className="px-2 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge status={row.status} />
                          {String(row.status || "").toUpperCase() === "PAID" && row.paid_at ? (
                            <span className="text-[10px] text-muted-foreground">{String(row.paid_at).slice(0, 10)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          {["PENDING", "PROCESSING"].includes(String(row.status || "").toUpperCase()) ? (
                            <Button type="button" size="sm" onClick={() => openMarkPaidModal(row)} className="col-span-2 h-8 rounded-md bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-700">
                              <Banknote className="mr-1 h-3.5 w-3.5" /> Mark Paid
                            </Button>
                          ) : null}
                          <Button type="button" size="sm" variant="outline" onClick={() => openPayrollEdit(row)} className="h-8 min-w-0 rounded-md px-1.5 text-[11px]">
                            <Pencil className="mr-1 h-3 w-3 shrink-0" /> Edit
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => deletePayrollEntries([row])} disabled={Boolean(deletingPayrollIds.length)} title="Delete payroll (server validates recovery reversals)" className="h-8 min-w-0 rounded-md border-red-200 px-1.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="mr-1 h-3 w-3 shrink-0" /> Delete
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => window.open(`/hrms/payroll/${row.id}/payslip`, "_blank", "noopener,noreferrer")} className="col-span-2 h-8 rounded-md px-1.5 text-[11px]">
                            <Eye className="mr-1 h-3.5 w-3.5" /> Payslip
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {data.count ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, Number(data.count || 0))} of {Number(data.count || 0)} · {PAGE_SIZE} entries per page</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="min-w-14 text-center font-medium tabular-nums">{page} / {totalPayrollPages}</span>
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={page >= totalPayrollPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
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
              <MonthYearPicker
                value={advancePeriod}
                onChange={(value) => {
                  setAdvancePeriod(value);
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

      {payrollDeleteDialog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="payroll-delete-title" className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-background shadow-2xl dark:border-slate-700">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div>
                <h2 id="payroll-delete-title" className="text-lg font-semibold text-foreground">
                  {payrollDeleteDialog.mode === "reconcile" ? "Unreconciled loan recovery" : payrollDeleteDialog.mode === "errors" ? "Payroll deletion blocked" : "Delete payroll records?"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payrollDeleteDialog.mode === "confirm"
                    ? `You are about to permanently delete ${payrollDeleteDialog.rows.length} payroll record(s).`
                    : "Review the affected payroll records and loan-recovery amounts."}
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={() => setPayrollDeleteDialog(null)} disabled={Boolean(deletingPayrollIds.length)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-5 text-sm">
              {payrollDeleteDialog.mode === "confirm" ? (
                <div className="space-y-2">
                  {payrollDeleteDialog.rows.slice(0, 6).map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                      <span className="min-w-0 truncate font-medium">{row.employee_name || "Employee"}</span>
                      <span className="shrink-0 text-muted-foreground">{row.period || "—"}</span>
                    </div>
                  ))}
                  {payrollDeleteDialog.rows.length > 6 && <p className="text-muted-foreground">And {payrollDeleteDialog.rows.length - 6} more.</p>}
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Recorded loan repayments will be reversed. Any unrecorded deductions require separate reconciliation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollDeleteErrors.map((item, index) => (
                    <div key={`${item.row.id}-${index}`} className="rounded-lg border p-3">
                      <p className="font-semibold">{item.row.employee_name || item.row.id} · {item.row.period || "—"}</p>
                      <p className="mt-1 text-muted-foreground">{item.message}</p>
                      {item.code === "UNRECONCILED_LOAN_RECOVERY" && (
                        <p className="mt-2 font-medium tabular-nums">Payroll deduction: {item.planned} · Recorded recovery: {item.recorded}</p>
                      )}
                    </div>
                  ))}
                  {payrollDeleteDialog.mode === "reconcile" && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
                      <input type="checkbox" checked={deleteUnreconciledAcknowledged} onChange={(event) => setDeleteUnreconciledAcknowledged(event.target.checked)} className="mt-1 h-4 w-4" />
                      <span>I understand that unrecorded loan recoveries cannot be reversed automatically. Deletion will reverse only recorded repayments; loan balances may require manual reconciliation. I authorize deleting the listed payroll records.</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setPayrollDeleteDialog(null)} disabled={Boolean(deletingPayrollIds.length)}>{payrollDeleteDialog.mode === "errors" ? "Close" : "Cancel"}</Button>
              {payrollDeleteDialog.mode !== "errors" && (
                <Button type="button" onClick={confirmPayrollDelete}
                  disabled={Boolean(deletingPayrollIds.length) || (payrollDeleteDialog.mode === "reconcile" && !deleteUnreconciledAcknowledged)}
                  className="bg-red-600 text-white hover:bg-red-700">
                  {deletingPayrollIds.length ? "Deleting..." : payrollDeleteDialog.mode === "reconcile" ? "Confirm Unreconciled Delete" : "Delete Payroll"}
                </Button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {payingPayroll && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-[3px] sm:px-6"
          style={{ zIndex: 9999, position: "fixed", inset: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !markPayrollPaidMutation.isPending) {
              setPayingPayroll(null);
              setPayrollPaidBy("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-payment-title"
            className="my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            style={{ maxHeight: "calc(100dvh - 32px)" }}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" /> Payroll payment
                </div>
                <h2 id="payroll-payment-title" className="text-xl font-semibold tracking-tight">
                  Confirm salary payment
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Review this payroll before marking it as paid.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close payment dialog"
                className="h-9 w-9 shrink-0 rounded-lg"
                onClick={() => { setPayingPayroll(null); setPayrollPaidBy(""); }}
                disabled={markPayrollPaidMutation.isPending}
              ><X className="h-4 w-4" /></Button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Employee</p>
                    <p className="mt-1 break-words text-sm font-semibold leading-5">{payingPayroll.employee_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{payingPayroll.employee_code}</p>
                  </div>
                  <div className="min-w-0 text-left sm:text-right">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount to pay</p>
                    <div className="mt-1 whitespace-nowrap text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      <CurrencyText value={payingPayroll.balance_payable ?? payingPayroll.net_salary ?? 0} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Period</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{payingPayroll.period || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Advance</p>
                    <div className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                      <CurrencyText value={payingPayroll.advance_deduction || 0} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Loan</p>
                    <div className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-orange-700 dark:text-orange-400">
                      <CurrencyText value={payingPayroll.loan_deduction || 0} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payroll-paid-by" className="text-sm font-semibold">Paid By <span className="text-red-500">*</span></Label>
                <Input
                  id="payroll-paid-by"
                  className="h-11 w-full rounded-lg"
                  value={payrollPaidBy}
                  onChange={(event) => setPayrollPaidBy(event.target.value)}
                  placeholder="Name or payment source (e.g. Bank Transfer)"
                  autoFocus
                  disabled={markPayrollPaidMutation.isPending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitMarkPaid();
                    }
                  }}
                />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Required to record who confirmed or processed this payment.
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-semibold">Before you confirm:</span> This finalizes the payroll and applies any linked advance or loan recovery. Review the amount and employee details carefully.
              </div>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="h-10 min-w-24 rounded-lg"
                onClick={() => { setPayingPayroll(null); setPayrollPaidBy(""); }}
                disabled={markPayrollPaidMutation.isPending}
              >Cancel</Button>
              <Button
                type="button"
                onClick={submitMarkPaid}
                disabled={markPayrollPaidMutation.isPending}
                className="h-10 min-w-40 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              >
                <Banknote className="mr-2 h-4 w-4" />
                {markPayrollPaidMutation.isPending ? "Confirming..." : "Confirm Payment"}
              </Button>
            </footer>
          </section>
        </div>,
        document.body,
      )}

      {editingPayroll && (
        <div className="hrms-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl hrms-modal-panel">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Edit Payroll Salary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the salary values for this generated payroll entry.
                  Paid payroll remains PAID after correction.
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

              {String(editingPayroll.status || "").toUpperCase() === "PAID" ? (
                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <p className="font-medium">Paid payroll correction</p>
                  <p className="mt-1 text-xs leading-5">
                    This payroll is already PAID. Updating salary values will
                    correct the payroll record while keeping its PAID status.
                    Existing advance and employee-loan deductions remain linked
                    to this payroll entry.
                  </p>
                </div>
              ) : null}

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
                    Existing advance deduction: INR{" "}
                    {numberValue(editingPayroll.advance_deduction).toFixed(2)}.
                    Advance deduction remains linked to this payroll entry.
                  </p>
                ) : null}

                {numberValue(editingPayroll.loan_deduction) > 0 ? (
                  <p className="mt-1 text-xs text-orange-600">
                    Existing loan deduction: INR{" "}
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
                className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {payrollEditMutation.isPending
                  ? "Updating..."
                  : String(editingPayroll.status || "").toUpperCase() === "PAID"
                    ? "Update Paid Payroll"
                    : "Update Salary"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {payrollOpen && (
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl hrms-modal-panel">
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
              {/* Scoped to Generate Payroll: equal-height controls regardless of picker internals. */}
              <style>{`
                .ghaza-payroll-equal-fields { align-items: start; }
                .ghaza-payroll-equal-fields > div { min-width: 0; }
                .ghaza-payroll-equal-fields > div > label {
                  display: flex !important;
                  align-items: center !important;
                  height: 20px !important;
                  min-height: 20px !important;
                  margin: 0 !important;
                  line-height: 20px !important;
                }
                .ghaza-payroll-equal-fields > div > :is(button, input, [role="combobox"]),
                .ghaza-payroll-equal-fields > div > div > :is(button, input, [role="combobox"]),
                .ghaza-payroll-equal-fields > div > div > div > :is(button, input, [role="combobox"]) {
                  box-sizing: border-box !important;
                  display: flex !important;
                  align-items: center !important;
                  width: 100% !important;
                  min-width: 0 !important;
                  height: 48px !important;
                  min-height: 48px !important;
                  max-height: 48px !important;
                  margin-top: 8px !important;
                  padding-top: 0 !important;
                  padding-bottom: 0 !important;
                  line-height: normal !important;
                  vertical-align: top !important;
                }
                .ghaza-payroll-equal-fields > div > input { display: block !important; }
                .ghaza-payroll-equal-fields > div > div {
                  box-sizing: border-box !important;
                  width: 100% !important;
                  min-width: 0 !important;
                }
                .ghaza-payroll-equal-fields > div > div > div:has(> button) {
                  width: 100% !important;
                  min-width: 0 !important;
                }
                .ghaza-payroll-equal-fields > div > p {
                  margin-top: 8px !important;
                  line-height: 18px !important;
                }
              `}</style>
              <div className="ghaza-payroll-equal-fields grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="min-w-0">
                  <Label className="flex h-5 items-center">Pay Period *</Label>
                  <MonthYearPicker
                    className="mt-2 !h-12 w-full"
                    value={period}
                    max={nextPayrollPeriod}
                    onChange={(value) => {
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
                  <p className="mt-2 min-h-[36px] text-xs leading-[18px] text-muted-foreground">
                    Previous months, current month, and next month only.
                  </p>
                </div>

                <div className="min-w-0">
                  <Label className="flex h-5 items-center">Payroll Date *</Label>
                  <Input
                    type="date"
                    className="mt-2 !h-12 w-full"
                    value={payrollDate}
                    onChange={(event) => setPayrollDate(event.target.value)}
                  />
                </div>

                <div className="min-w-0">
                  <Label className="flex h-5 items-center">Branch</Label>
                  <Select
                    value={selectedBranch || undefined}
                    disabled={!isCombined}
                    onValueChange={(value) => {
                      setSelectedBranch(value);
                      setSelectedEmployees([]);
                    }}
                  >
                    <SelectTrigger className="mt-2 !h-12 w-full">
                      <SelectValue placeholder={isCombined ? "Select Branch 1 or Branch 2" : "Current branch"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {String(branch.branch_code).toUpperCase() === "BR01" ? "Branch 1" : "Branch 2"} — {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Label className="flex h-5 items-center">Payroll Status *</Label>

                  <Select
                    value={payrollStatus}
                    onValueChange={(value) => {
                      setPayrollStatus(value);

                      if (value !== "PAID") {
                        setPaidBy("");
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2 !h-12 w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>

                      <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="mt-2 min-h-[36px] text-xs leading-[18px] text-muted-foreground">
                    Pending can be reviewed later. Paid finalizes the salary
                    immediately.
                  </p>
                </div>

                <div className="min-w-0">
                  <Label className="flex h-5 items-center">
                    Paid By
                    {payrollStatus === "PAID" ? " *" : ""}
                  </Label>

                  <Input
                    className="mt-2 !h-12 w-full"
                    value={paidBy}
                    onChange={(event) => setPaidBy(event.target.value)}
                    placeholder={
                      payrollStatus === "PAID"
                        ? "Example: Bank Transfer / Cashier"
                        : "Not required for Pending"
                    }
                    disabled={payrollStatus !== "PAID"}
                  />

                  <p className="mt-2 min-h-[36px] text-xs leading-[18px] text-muted-foreground">
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
                  <div className="min-w-[1050px]">
                    <div className="grid items-center gap-4 border-b bg-muted/35 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      style={{ gridTemplateColumns: "36px minmax(260px, 1fr) 130px 145px 145px 165px" }}>
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
                            <div
                              key={employee.id}
                              className="grid min-h-[108px] items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/30"
                              style={{ gridTemplateColumns: "36px minmax(260px, 1fr) 130px 145px 145px 165px" }}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  aria-label={`Select payroll for ${employee.full_name}`}
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
                                  className="h-10 w-full min-w-0 text-center tabular-nums"
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

                              <div className="min-w-0 text-right">
                                <p className="flex items-center justify-end whitespace-nowrap font-semibold tabular-nums text-amber-600">
                                  <CurrencyText
                                    value={employee.advance_received}
                                  />
                                </p>
                              </div>

                              <div className="min-w-0 text-right">
                                <p className="flex items-center justify-end whitespace-nowrap font-semibold tabular-nums text-orange-600">
                                  <CurrencyText value={loanDeduction} />
                                </p>
                              </div>

                              <div className="min-w-0 text-right">
                                <p className="flex items-center justify-end whitespace-nowrap font-semibold tabular-nums text-emerald-600">
                                  <CurrencyText value={remaining} />
                                </p>
                                {employee.already_generated && (
                                  <p className="text-xs text-amber-600">
                                    Already generated
                                  </p>
                                )}
                              </div>
                            </div>
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
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="hrms-modal-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-2xl hrms-modal-panel">
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
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="hrms-modal-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-2xl hrms-modal-panel">
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
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-2xl hrms-modal-panel">
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

              <div className="md:col-span-2">
                <Label>Optional monthly deductions (YYYY-MM=amount, one per line)</Label>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder={"2026-11=200\n2026-12=350\n2027-01=0"}
                  value={loanForm.monthly_deduction_schedule_text}
                  onChange={(event) => setLoanForm((current) => ({
                    ...current, monthly_deduction_schedule_text: event.target.value,
                  }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">Overrides the default installment for listed months. Zero skips a month. Remaining balance changes only when payroll is paid.</p>
              </div>

              <div>
                <Label>First Deduction Month *</Label>
                <MonthYearPicker
                  className="mt-2"
                  value={loanForm.start_period}
                  onChange={(value) =>
                    setLoanForm((current) => ({
                      ...current,
                      start_period: value,
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
        <div className="hrms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-background shadow-2xl hrms-modal-panel">
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
                <MonthYearPicker
                  min={
                    selectedAdvanceEmployee?.joining_date
                      ? selectedAdvanceEmployee.joining_date.slice(0, 7)
                      : undefined
                  }
                  className="mt-2"
                  value={advanceForm.period}
                  onChange={(value) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      period: value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Advance Date *</Label>
                <Input
                  type="date"
                  min={selectedAdvanceEmployee?.joining_date || undefined}
                  max={today}
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

