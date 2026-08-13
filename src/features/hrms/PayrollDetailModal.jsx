import React from "react";
import { FileText, Save, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const STATUS_OPTIONS = [
  ["PENDING", "Pending"],
  ["PROCESSING", "Processing"],
  ["PAID", "Paid"],
  ["FAILED", "Failed"],
  ["CANCELLED", "Cancelled"],
];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB");
};

export default function PayrollDetailModal({ payroll, onClose, onUpdated }) {
  const queryClient = useQueryClient();

  const [status, setStatus] = React.useState(
    String(payroll?.status || "PENDING").toUpperCase(),
  );

  const [paidBy, setPaidBy] = React.useState(
    payroll?.paid_by ? String(payroll.paid_by) : "",
  );

  React.useEffect(() => {
    setStatus(String(payroll?.status || "PENDING").toUpperCase());
    setPaidBy(payroll?.paid_by ? String(payroll.paid_by) : "");
  }, [payroll]);

  const mutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          `/hrms/payroll/${payroll.id}/update-status/`,
          {
            status,
            paid_by: status === "PAID" ? paidBy.trim() : "",
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["payroll-entries"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["payroll-summary"],
        }),
      ]);

      toast.success(
        `Payroll status updated to ${
          updated.status_display || updated.status
        }.`,
      );

      onUpdated?.(updated);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(
        error?.message && !error?.response
          ? error.message
          : details.title || "Unable to update payroll status",
        {
          description: details.summary || details.message,
        },
      );
    },
  });

  if (!payroll) {
    return null;
  }

  const currentStatus = String(payroll.status || "").toUpperCase();
  const locked = ["PAID", "CANCELLED"].includes(currentStatus);
  const statusChanged = status !== currentStatus;

  const saveStatus = () => {
    if (!statusChanged) {
      toast.info("Select a different payroll status.");
      return;
    }

    if (status === "PAID" && !paidBy) {
      toast.error("Enter Paid By before marking payroll as Paid.");
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px]">
      <div className="flex h-full w-full items-start justify-center overflow-hidden px-3 pb-4 pt-[76px] sm:px-4 sm:pb-6 sm:pt-[84px]">
        <div className="flex max-h-[calc(100vh-100px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="shrink-0 flex items-start justify-between border-b bg-background p-5">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">Payroll Details</h2>
                <StatusBadge status={payroll.status} />
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {payroll.employee_name || "Employee"} · {payroll.period || "—"}
              </p>
            </div>

            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            <section>
              <Title>Employee & Payroll</Title>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Info label="Employee" value={payroll.employee_name || "—"} />
                <Info
                  label="Employee Code"
                  value={payroll.employee_code || "—"}
                />
                <Info label="Branch" value={payroll.branch_name || "—"} />
                <Info label="Period" value={payroll.period || "—"} />

                <Info
                  label="Payroll Date"
                  value={formatDate(payroll.payroll_date)}
                />

                <Info
                  label="Salary Type"
                  value={
                    payroll.salary_type_display ||
                    payroll.salary_type ||
                    "Regular Salary"
                  }
                />

                <Info
                  label="Calculation"
                  value={
                    payroll.salary_calculation_method_display ||
                    payroll.salary_calculation_method ||
                    "—"
                  }
                />

                <Info label="Paid By" value={payroll.paid_by || "—"} />
              </div>
            </section>

            <section>
              <Title>Salary Calculation</Title>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MoneyCard label="Basic Salary" value={payroll.basic_salary} />
                <MoneyCard label="Allowances" value={payroll.allowances} />
                <MoneyCard label="Gross Salary" value={payroll.gross_salary} />
                <MoneyCard
                  label="Other Deductions"
                  value={payroll.deductions}
                />

                <MoneyCard
                  label="Advance Amount"
                  value={payroll.advance_amount}
                />

                <MoneyCard
                  label="Advance Deduction"
                  value={payroll.advance_deduction}
                />

                <MoneyCard label="Net Salary" value={payroll.net_salary} />

                <MoneyCard
                  label="Balance Payable"
                  value={payroll.balance_payable ?? payroll.net_salary}
                  strong
                />
              </div>
            </section>

            <section>
              <Title>Payable Days</Title>

              <div className="grid gap-3 sm:grid-cols-3">
                <Info
                  label="Period Days"
                  value={payroll.total_period_days ?? "—"}
                />

                <Info
                  label="Payable Days"
                  value={payroll.payable_days ?? "—"}
                />

                <Info
                  label="Unpaid Leave Days"
                  value={payroll.unpaid_leave_days ?? "0"}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-muted/20 p-4">
              <Title>Update Payroll Status</Title>

              {locked ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  {currentStatus === "PAID"
                    ? "This payroll is already Paid. Paid payroll records are locked from further status changes."
                    : "This payroll is Cancelled and cannot be changed."}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Status</Label>

                    <select
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {status === "PAID" && (
                    <div>
                      <Label>Paid By *</Label>

                      <Input
                        className="mt-2"
                        value={paidBy}
                        onChange={(event) => setPaidBy(event.target.value)}
                        placeholder="Enter payer name"
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="shrink-0 flex flex-wrap justify-end gap-2 border-t bg-background p-4 sm:p-5">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `/hrms/payroll/${payroll.id}/payslip`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              View Payslip
            </Button>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            {!locked && (
              <Button
                onClick={saveStatus}
                disabled={mutation.isPending || !statusChanged}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Title({ children }) {
  return (
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function MoneyCard({ label, value, strong = false }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        strong ? "bg-emerald-50" : "bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>

      <p
        className={`mt-1 ${
          strong ? "text-lg font-black text-emerald-700" : "font-semibold"
        }`}
      >
        <CurrencyText value={value || 0} />
      </p>
    </div>
  );
}
