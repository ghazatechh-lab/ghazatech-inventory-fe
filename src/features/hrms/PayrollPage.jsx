import React from "react";
import { Check, Download, Eye, Plus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { MetricCard } from "@/components/sales/MetricCard";
import { normalizeList } from "./hrmsUtils";

const currentPeriod = new Date().toISOString().slice(0, 7);
const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
const monthLabel = (value) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [period, setPeriod] = React.useState(currentPeriod);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [selected, setSelected] = React.useState([]);
  const [selectedBranch, setSelectedBranch] = React.useState(
    branchId ? String(branchId) : "",
  );

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
      unwrap(await api.get("/hrms/payroll-runs/summary/", { params })),
  });
  const { data: eligibleResponse, isLoading: eligibleLoading } = useQuery({
    queryKey: ["eligible-payroll-employees", period, selectedBranch],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/payroll-runs/eligible-employees/", {
          params: { period, branch: selectedBranch || undefined },
        }),
      ),
    enabled: open,
  });
  const { data: branchOptions = {} } = useQuery({
    queryKey: ["employee-form-options"],
    queryFn: async () => unwrap(await api.get("/hrms/employees/form-options/")),
    enabled: open,
  });

  const data = query.data || { results: [], count: 0 };
  const eligible = normalizeList(eligibleResponse);
  const branches = normalizeList(branchOptions.branches);
  const selectedEmployees = eligible.filter((item) =>
    selected.includes(item.id),
  );
  const selectedGross = selectedEmployees.reduce(
    (sum, item) => sum + Number(item.gross_salary || 0),
    0,
  );

  const openGenerator = () => {
    setSelected([]);
    setSelectedBranch(branchId ? String(branchId) : "");
    setStep(1);
    setOpen(true);
  };
  const closeGenerator = () => {
    setOpen(false);
    setStep(1);
    setSelected([]);
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
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payroll-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["payroll-summary"] }),
        queryClient.invalidateQueries({
          queryKey: ["eligible-payroll-employees"],
        }),
      ]);
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
      key: "basic_salary",
      header: "Basic",
      align: "right",
      cell: (row) => <CurrencyText value={row.basic_salary} />,
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
      key: "payslip",
      header: "",
      align: "right",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            window.open(`/hrms/payroll/${row.id}/payslip`, "_blank")
          }
        >
          <Eye className="mr-2 h-4 w-4" />
          View Payslip
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll"
        subtitle="Monthly salary generation"
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

      {open && (
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
                    {number < 3 && (
                      <div className="ml-auto h-px flex-1 bg-slate-200" />
                    )}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Pay period</label>
                      <Input
                        type="month"
                        value={period}
                        onChange={(event) => {
                          setPeriod(event.target.value);
                          setSelected([]);
                        }}
                        className="mt-2"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {period} ({monthLabel(period)})
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Branch</label>
                      <select
                        value={selectedBranch}
                        onChange={(event) => {
                          setSelectedBranch(event.target.value);
                          setSelected([]);
                        }}
                        className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-medium">Employees to include</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                        {selected.length} selected
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border">
                      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3 text-sm">
                        <span className="text-muted-foreground">
                          {eligible.filter((item) => !item.already_paid).length}{" "}
                          eligible for {period}
                        </span>
                        <button
                          type="button"
                          className="font-medium text-blue-600"
                          onClick={selectAll}
                        >
                          Select all
                        </button>
                      </div>
                      {eligibleLoading && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Loading eligible employees...
                        </div>
                      )}
                      {!eligibleLoading &&
                        eligible.map((employee) => (
                          <label
                            key={employee.id}
                            className="flex cursor-pointer items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                disabled={employee.already_paid}
                                checked={selected.includes(employee.id)}
                                onChange={(event) =>
                                  setSelected((current) =>
                                    event.target.checked
                                      ? [...new Set([...current, employee.id])]
                                      : current.filter(
                                          (id) => id !== employee.id,
                                        ),
                                  )
                                }
                              />
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                                {initials(employee.full_name)}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {employee.full_name}{" "}
                                  <span className="font-normal text-muted-foreground">
                                    · {employee.branch_name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {employee.already_paid
                                    ? "Already paid this period"
                                    : `Basic AED ${Number(employee.basic_salary || 0).toLocaleString("en-US")}`}
                                </div>
                              </div>
                            </div>
                            <div className="font-semibold">
                              <CurrencyText value={employee.gross_salary} />
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-xl border p-5">
                    <h3 className="font-semibold">Review Payroll Run</h3>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          Period
                        </p>
                        <p className="mt-1 font-semibold">
                          {monthLabel(period)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          Employees
                        </p>
                        <p className="mt-1 font-semibold">
                          {selectedEmployees.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          Gross Pay
                        </p>
                        <p className="mt-1 font-semibold">
                          <CurrencyText value={selectedGross} />
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border">
                    {selectedEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between border-b px-4 py-4 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">
                            {employee.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {employee.branch_name}
                          </div>
                        </div>
                        <CurrencyText value={employee.gross_salary} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">
                    Payroll Generated
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Payroll entries for {monthLabel(period)} were generated for{" "}
                    {selected.length} employee(s).
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">Step {step} of 3</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeGenerator}>
                  Cancel
                </Button>
                {step === 1 && (
                  <Button
                    disabled={!selected.length}
                    onClick={() => setStep(2)}
                    className="bg-blue-600 text-white"
                  >
                    Continue
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    disabled={generate.isPending}
                    onClick={() => generate.mutate()}
                    className="bg-blue-600 text-white"
                  >
                    Generate Payroll
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    onClick={closeGenerator}
                    className="bg-blue-600 text-white"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
