import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { GHAZA_LOGO_DATA_URL } from "@/lib/documentLogo";

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

const getPayslipFileName = (payslip, fallbackId) => {
  const today = new Date();
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const employeeId = String(
    payslip?.employee_code || payslip?.employee_id || fallbackId || "employee",
  )
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-");

  return `payslip-${date}-${employeeId}`;
};

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

  const printPayslip = () => {
    const previousTitle = document.title;
    const printTitle = getPayslipFileName(payslip, id);

    document.title = printTitle;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle, { once: true });

    /*
     * Give the browser one render frame to commit the new document title
     * before opening the native print dialog. Chrome uses document.title
     * as the default "Save as PDF" filename.
     */
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 50);
    });
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .payslip-print-shell,
          .payslip-print-shell * {
            visibility: visible !important;
          }

          .payslip-print-shell {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            inset: 0 auto auto 0 !important;
          }

          .payslip-document {
            width: 100% !important;
            min-height: auto !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .payslip-print-only {
            display: block !important;
          }

          .payslip-screen-only {
            display: none !important;
          }

          .payslip-section,
          .payslip-total-box,
          .payslip-info-grid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        @media screen {
          .payslip-print-only {
            display: block;
          }
        }
      `}</style>

      <div className="hrms-module-page payslip-print-shell w-full space-y-4 pb-10 print:space-y-0 print:pb-0">
        <div className="payslip-screen-only flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate("/hrms/payroll")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payroll
          </Button>

          <Button
            onClick={printPayslip}
            className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>

        <section className="payslip-document overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Invoice-style company header */}
          <div className="payslip-print-only bg-[#f6f6f6] px-7 pb-0 pt-6 sm:px-9">
            <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[150px_1fr_150px_165px] md:gap-0">
              <div className="flex items-center md:pr-6">
                <img
                  src={GHAZA_LOGO_DATA_URL}
                  alt="Ghaza Computer"
                  className="h-auto w-[120px] object-contain"
                />
              </div>

              <div className="border-slate-300 md:border-l md:px-6">
                <div className="text-[18px] font-black leading-none tracking-tight text-[#121212]">
                  GHAZA
                </div>
                <div className="mt-1 text-[15px] font-black leading-none text-[#da1221]">
                  COMPUTER TR LLC
                </div>
                <div className="mt-3 h-[2px] w-40 bg-[#121212]" />
                <div className="mt-2 text-[9px] font-bold tracking-[0.08em] text-[#da1221]">
                  LAPTOPS • SPARE PARTS • ACCESSORIES
                </div>
                <p className="mt-2 max-w-[290px] text-[8px] leading-4 text-slate-600">
                  Second Industrial St - Industrial Area 2 - Sharjah - United
                  Arab Emirates
                </p>
              </div>

              <div className="border-slate-300 text-center md:border-l md:px-5">
                <div className="text-[14px] font-black text-[#da1221]">
                  LAPTOP
                </div>
                <div className="text-[14px] font-black text-[#da1221]">
                  SPARE PARTS
                </div>
                <div className="mx-auto my-2 h-px w-24 bg-[#da1221]" />
                <div className="text-[8px] font-bold text-[#121212]">
                  QUALITY PARTS • PROFESSIONAL SERVICE
                </div>
              </div>

              <div className="border-slate-300 text-[9px] leading-6 text-[#121212] md:border-l md:pl-6">
                <div>Sharjah, UAE</div>
                <div>HR & Payroll</div>
                <div>Ghaza Computer TR LLC</div>
                <div>Employee Salary Statement</div>
              </div>
            </div>

            <div className="mt-5 flex h-[6px] w-full">
              <div className="w-[22%] bg-[#121212]" />
              <div className="w-[21%] bg-[#bcbec1]" />
              <div className="flex-1 bg-[#da1221]" />
            </div>
          </div>

          <div className="px-7 py-7 sm:px-9 sm:py-8">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#da1221]">
                  Payroll Document
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Employee Payslip
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Salary statement for {formatPeriod(payslip.period)}
                </p>
              </div>

              <div className="self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                {String(payslip.status || "Pending").replaceAll("_", " ")}
              </div>
            </div>

            <div className="payslip-info-grid mt-6 grid overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-2">
              {[
                ["Employee", payslip.employee_name || "—"],
                ["Employee Code", payslip.employee_code || "—"],
                ["Branch", payslip.branch_name || "—"],
                ["Pay Period", formatPeriod(payslip.period)],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`px-5 py-4 ${
                    index < 2 ? "border-b border-slate-200" : ""
                  } ${
                    index % 2 === 0 ? "sm:border-r sm:border-slate-200" : ""
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-7 md:grid-cols-2">
              <section className="payslip-section overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-50 px-5 py-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-800">
                    Earnings
                  </h2>
                </div>
                <div className="px-5 pb-2">
                  <AmountRow
                    label="Basic Salary"
                    value={payslip.basic_salary}
                  />
                  <AmountRow label="Allowances" value={payslip.allowances} />
                  <AmountRow
                    label="Gross Salary"
                    value={payslip.gross_salary}
                    strong
                  />
                </div>
              </section>

              <section className="payslip-section overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-50 px-5 py-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-800">
                    Deductions & Net Pay
                  </h2>
                </div>
                <div className="px-5 pb-2">
                  <AmountRow
                    label="Total Deductions"
                    value={payslip.deductions}
                    negative
                  />
                  <AmountRow
                    label="Net Salary"
                    value={payslip.net_salary}
                    strong
                  />
                </div>
              </section>
            </div>

            <div className="payslip-total-box mt-8 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-4 bg-[#121212] px-6 py-5 text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Final Salary Payable
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Net Pay
                  </p>
                </div>
                <div className="text-right text-2xl font-black tracking-tight text-white">
                  <CurrencyText value={payslip.net_salary} />
                </div>
              </div>
              <div className="h-1.5 w-full bg-[#da1221]" />
            </div>

            <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-700">
                  Payroll Reference
                </p>
                <p className="mt-1">
                  Employee: {payslip.employee_code || "—"} · Period:{" "}
                  {formatPeriod(payslip.period)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-slate-700">System Generated</p>
                <p className="mt-1">
                  This payslip is generated electronically and does not require
                  a signature.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
