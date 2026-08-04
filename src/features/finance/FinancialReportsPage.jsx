import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import api from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { money, today } from "./accountingUtils";

import { FinanceTabs } from "./FinanceSectionUI";

const tabs = [
  {
    value: "trial",
    label: "Trial Balance",
  },
  {
    value: "income",
    label: "Income Statement (P&L)",
  },
  {
    value: "balance",
    label: "Balance Sheet",
  },
  {
    value: "cash",
    label: "Cash Flow Statement",
  },
  {
    value: "equity",
    label: "Statement of Changes in Equity",
  },
];

const endpoints = {
  trial: "trial-balance",
  income: "income-statement",
  balance: "balance-sheet",
  cash: "cash-flow",
  equity: "changes-in-equity",
};

function AccountTable({ rows = [], emptyText = "No accounts found." }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-[750px] w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Code
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Account
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Branch
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-4 py-3 font-mono">{row.code || "—"}</td>

              <td className="px-4 py-3">{row.name || "—"}</td>

              <td className="px-4 py-3">{row.branch_name || "All branches"}</td>

              <td className="px-4 py-3 text-right">
                {money(row.current_balance)}
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td
                colSpan="4"
                className="p-10 text-center text-muted-foreground"
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportLoading() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
      Loading financial report...
    </div>
  );
}

function ReportError({ message }) {
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
      {message || "Unable to load the financial report."}
    </div>
  );
}

export default function FinancialReportsPage() {
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();

  const [tab, setTab] = React.useState("trial");

  const [date, setDate] = React.useState(today());

  const reportQuery = useQuery({
    queryKey: ["financial-report", tab, branchId, date],

    queryFn: () =>
      api.get(`/finance/reporting/reports/${endpoints[tab]}/`, {
        params: {
          ...branchParams,
          date_to: date,
        },
      }),

    staleTime: 0,
    refetchOnMount: "always",
  });

  const data = reportQuery.data?.data?.data || reportQuery.data?.data || {};

  const renderTrialBalance = () => (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {["Code", "Account", "Branch", "Debit", "Credit"].map((label) => (
              <th
                key={label}
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(data.rows || []).map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-4 py-3 font-mono">{row.code || "—"}</td>

              <td className="px-4 py-3">{row.name || "—"}</td>

              <td className="px-4 py-3">{row.branch_name || "All branches"}</td>

              <td className="px-4 py-3 text-right">
                {Number(row.debit) ? money(row.debit) : "—"}
              </td>

              <td className="px-4 py-3 text-right">
                {Number(row.credit) ? money(row.credit) : "—"}
              </td>
            </tr>
          ))}

          {!data.rows?.length && (
            <tr>
              <td
                colSpan="5"
                className="p-10 text-center text-muted-foreground"
              >
                No trial-balance entries found.
              </td>
            </tr>
          )}
        </tbody>

        <tfoot className="border-t-2 font-semibold">
          <tr>
            <td colSpan="3" className="px-4 py-3">
              Total
            </td>

            <td className="px-4 py-3 text-right">{money(data.total_debit)}</td>

            <td className="px-4 py-3 text-right">{money(data.total_credit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderIncomeStatement = () => (
    <div className="finance-module-page finance-workspace space-y-5">
      <h2 className="text-xl font-semibold">Revenue</h2>

      <AccountTable
        rows={data.revenue || []}
        emptyText="No revenue accounts found."
      />

      <div className="rounded-2xl border bg-card p-5 text-right text-lg font-semibold">
        Total Revenue: {money(data.total_revenue)}
      </div>

      <h2 className="text-xl font-semibold">Expenses</h2>

      <AccountTable
        rows={data.expenses || []}
        emptyText="No expense accounts found."
      />

      <div className="rounded-2xl border bg-card p-5 text-right text-lg font-semibold">
        Total Expenses: {money(data.total_expenses)}
      </div>

      <div className="rounded-2xl border-2 bg-card p-5 text-right text-xl font-semibold">
        Net Profit: {money(data.net_profit)}
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Assets</h2>

      <AccountTable
        rows={data.assets || []}
        emptyText="No asset accounts found."
      />

      <div className="rounded-2xl border bg-card p-5 text-right text-lg font-semibold">
        Total Assets: {money(data.total_assets)}
      </div>

      <h2 className="text-xl font-semibold">Liabilities</h2>

      <AccountTable
        rows={data.liabilities || []}
        emptyText="No liability accounts found."
      />

      <div className="rounded-2xl border bg-card p-5 text-right text-lg font-semibold">
        Total Liabilities: {money(data.total_liabilities)}
      </div>

      <h2 className="text-xl font-semibold">Equity</h2>

      <AccountTable
        rows={data.equity || []}
        emptyText="No equity accounts found."
      />

      <div className="rounded-2xl border bg-card p-5 text-right text-lg font-semibold">
        Total Equity: {money(data.total_equity)}
      </div>
    </div>
  );

  const renderCashFlow = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Cash Receipts</p>

          <strong className="mt-2 block text-xl">
            {money(data.cash_receipts)}
          </strong>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Cash Payments</p>

          <strong className="mt-2 block text-xl">
            {money(data.cash_payments)}
          </strong>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Net Cash Flow</p>

          <strong className="mt-2 block text-xl">
            {money(data.net_cash_flow)}
          </strong>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {[
                "Date",
                "Reference",
                "Account",
                "Narration",
                "Debit",
                "Credit",
              ].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(data.rows || []).map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-4 py-3">{row.transaction_date || "—"}</td>

                <td className="px-4 py-3">
                  {row.entry_number || row.journal_entry_number || "—"}
                </td>

                <td className="px-4 py-3">{row.account_name || "—"}</td>

                <td className="px-4 py-3">
                  {row.remarks || row.description || "—"}
                </td>

                <td className="px-4 py-3 text-right">
                  {Number(row.debit_amount) ? money(row.debit_amount) : "—"}
                </td>

                <td className="px-4 py-3 text-right">
                  {Number(row.credit_amount) ? money(row.credit_amount) : "—"}
                </td>
              </tr>
            ))}

            {!data.rows?.length && (
              <tr>
                <td
                  colSpan="6"
                  className="p-10 text-center text-muted-foreground"
                >
                  No cash-flow transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEquityStatement = () => (
    <div className="space-y-5">
      <AccountTable
        rows={data.rows || []}
        emptyText="No equity accounts found."
      />

      <div className="rounded-2xl border-2 bg-card p-5 text-right text-xl font-semibold">
        Closing Equity: {money(data.closing_equity)}
      </div>
    </div>
  );

  const renderReport = () => {
    if (reportQuery.isLoading) {
      return <ReportLoading />;
    }

    if (reportQuery.isError) {
      return (
        <ReportError
          message={
            reportQuery.error?.response?.data?.detail ||
            reportQuery.error?.message
          }
        />
      );
    }

    if (tab === "trial") {
      return renderTrialBalance();
    }

    if (tab === "income") {
      return renderIncomeStatement();
    }

    if (tab === "balance") {
      return renderBalanceSheet();
    }

    if (tab === "cash") {
      return renderCashFlow();
    }

    return renderEquityStatement();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        subtitle={
          isAllBranches
            ? "Consolidated statutory and management reports."
            : "Financial reports for the selected branch."
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />

      <FinanceTabs tabs={tabs} value={tab} onChange={setTab} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <label className="mb-2 block text-sm font-medium">Report Date</label>

          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={reportQuery.isFetching}
          onClick={() => reportQuery.refetch()}
        >
          {reportQuery.isFetching ? "Refreshing..." : "Refresh Report"}
        </Button>
      </div>

      {renderReport()}
    </div>
  );
}
