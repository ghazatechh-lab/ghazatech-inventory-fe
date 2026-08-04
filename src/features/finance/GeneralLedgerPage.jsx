import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus, Printer } from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { extractRows, money, today } from "./accountingUtils";

const firstDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
};

export default function GeneralLedgerPage() {
  const { branchId } = useActiveBranchFilter();

  const [accountId, setAccountId] = React.useState("");

  const [dateFrom, setDateFrom] = React.useState(firstDay);

  const [dateTo, setDateTo] = React.useState(today);

  const [applied, setApplied] = React.useState({
    dateFrom: firstDay(),
    dateTo: today(),
  });

  const accountsQuery = useQuery({
    queryKey: ["ledger-accounts", branchId],
    queryFn: async () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: branchId || undefined,
          is_active: true,
          page_size: 1000,
          ordering: "code",
        },
      }),
  });

  const accounts = extractRows(accountsQuery.data);

  React.useEffect(() => {
    if (!accountId && accounts.length) {
      setAccountId(String(accounts[0].id));
    }
  }, [accountId, accounts]);

  const ledgerQuery = useQuery({
    queryKey: ["general-ledger", accountId, branchId, applied],

    enabled: Boolean(accountId),

    queryFn: async () =>
      api.get("/finance/ledger/account-summary/", {
        params: {
          account: accountId,
          branch: branchId || undefined,
          date_from: applied.dateFrom,
          date_to: applied.dateTo,
        },
      }),

    staleTime: 0,
  });

  const payload = ledgerQuery.data?.data?.data || ledgerQuery.data?.data || {};

  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="General Ledger"
        subtitle="Transaction history and running balance for each ledger account."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              asChild
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Link to="/finance/journal-entries">
                <Plus className="mr-2 h-4 w-4" />
                New Journal Entry
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          <option value="">Select account</option>

          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} — {account.name}
            </option>
          ))}
        </select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setApplied({
              dateFrom,
              dateTo,
            })
          }
        >
          Filter
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">
              Ledger — {payload.account?.name || "Select an account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {payload.account?.code}
            </p>
          </div>

          <span>
            Opening balance: <strong>{money(payload.opening_balance)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Date",
                  "JV No.",
                  "Narration",
                  "Debit",
                  "Credit",
                  "Balance",
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
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="px-4 py-3">{entry.transaction_date}</td>
                  <td className="px-4 py-3">{entry.entry_number}</td>
                  <td className="px-4 py-3">
                    {entry.remarks || entry.transaction_type}
                  </td>
                  <td className="px-4 py-3">{money(entry.debit_amount)}</td>
                  <td className="px-4 py-3">{money(entry.credit_amount)}</td>
                  <td className="px-4 py-3 font-medium">
                    {money(entry.running_balance)}
                  </td>
                </tr>
              ))}

              {!entries.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No ledger transactions found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot className="border-t-2 font-semibold">
              <tr>
                <td colSpan="3" className="px-4 py-3">
                  Closing balance
                </td>
                <td className="px-4 py-3">{money(payload.total_debit)}</td>
                <td className="px-4 py-3">{money(payload.total_credit)}</td>
                <td className="px-4 py-3">{money(payload.closing_balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
