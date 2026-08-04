import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const formatPeriod = (period) => {
  if (!period) return "—";
  const [year, month] = String(period).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(date.getTime())
    ? period
    : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

function AmountRow({ label, value, strong = false, negative = false }) {
  return (
    <div
      className={`flex items-center justify-between border-b py-3 ${strong ? "text-base font-bold" : "text-sm"}`}
    >
      <span className="text-slate-600">{label}</span>
      <span
        className={
          negative
            ? "font-semibold text-red-600"
            : "font-semibold text-slate-900"
        }
      >
        {negative ? "-" : ""}
        <CurrencyText value={value || 0} />
      </span>
    </div>
  );
}

export default function PayslipPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: payslip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payroll-payslip", id],
    queryFn: async () => unwrap(await api.get(`/hrms/payroll/${id}/`)),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading payslip...</div>
    );
  }

  if (isError || !payslip) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">Payslip not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The payroll record may have been removed or you may not have
          permission to view it.
        </p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => navigate("/hrms/payroll")}
        >
          Back to Payroll
        </Button>
      </div>
    );
  }

  return (
    <div className="hrms-module-page hrms-payslip-page mx-auto max-w-4xl space-y-4 p-4 sm:p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="outline" onClick={() => navigate("/hrms/payroll")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print Payslip
        </Button>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none sm:p-9">
        <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              GHAZA COMPUTER
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Employee Payslip
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Salary statement for {formatPeriod(payslip.period)}
            </p>
          </div>
          <StatusBadge status={payslip.status} />
        </header>

        <div className="grid gap-5 border-b py-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Employee</p>
            <p className="mt-1 font-bold text-slate-900">
              {payslip.employee_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Employee Code</p>
            <p className="mt-1 font-semibold text-slate-900">
              {payslip.employee_code || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Branch</p>
            <p className="mt-1 font-semibold text-slate-900">
              {payslip.branch_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Pay Period</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatPeriod(payslip.period)}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="border-b pb-3 text-sm font-bold uppercase tracking-wide text-slate-800">
              Earnings
            </h2>
            <AmountRow label="Basic Salary" value={payslip.basic_salary} />
            <AmountRow label="Allowances" value={payslip.allowances} />
            <AmountRow
              label="Gross Salary"
              value={payslip.gross_salary}
              strong
            />
          </div>
          <div>
            <h2 className="border-b pb-3 text-sm font-bold uppercase tracking-wide text-slate-800">
              Deductions & Net Pay
            </h2>
            <AmountRow
              label="Total Deductions"
              value={payslip.deductions}
              negative
            />
            <AmountRow label="Net Salary" value={payslip.net_salary} strong />
          </div>
        </div>

        <div className="mt-9 rounded-xl bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-300">Net Pay</span>
            <span className="text-2xl font-bold">
              <CurrencyText value={payslip.net_salary} />
            </span>
          </div>
        </div>

        <footer className="mt-8 border-t pt-5 text-center text-xs text-slate-500">
          This is a system-generated payslip and does not require a signature.
        </footer>
      </section>
    </div>
  );
}
