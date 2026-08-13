import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileDown, Filter, Printer, Search } from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { extractRows, money, today } from "./accountingUtils";

const firstDay = () => {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isZero = (value) => Math.abs(Number(value || 0)) < 0.00001;

export default function GeneralLedgerPage() {
  const { branchId } = useActiveBranchFilter();

  const [accountId, setAccountId] = React.useState("");

  const [dateFrom, setDateFrom] = React.useState(firstDay);

  const [dateTo, setDateTo] = React.useState(today);

  const [search, setSearch] = React.useState("");

  const [showMoreFilters, setShowMoreFilters] = React.useState(false);

  const [page, setPage] = React.useState(1);

  const pageSize = 12;

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

  const selectedAccount = accounts.find(
    (account) => String(account.id) === String(accountId),
  );

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

  const entries = React.useMemo(
    () => (Array.isArray(payload.entries) ? payload.entries : []),
    [payload.entries],
  );

  const filteredEntries = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.entry_number, entry.remarks, entry.transaction_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [entries, search]);

  React.useEffect(() => {
    setPage(1);
  }, [search, accountId, applied]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));

  const paginatedEntries = filteredEntries.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleApplyFilter = () => {
    setApplied({
      dateFrom,
      dateTo,
    });

    setPage(1);
  };

  const downloadFile = async (format) => {
    try {
      const response = await api.get(`/finance/ledger/export/`, {
        params: {
          account: accountId,
          branch: branchId || undefined,
          date_from: applied.dateFrom,
          date_to: applied.dateTo,
          format,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data]);

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `general-ledger-${selectedAccount?.code || "account"}.${format === "pdf" ? "pdf" : "xlsx"}`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      window.print();
    }
  };

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <section
        className="relative overflow-hidden rounded-[22px] px-6 py-7 text-white shadow-[0_18px_45px_rgba(5,29,55,0.20)] md:px-8 md:py-8"
        style={{
          background:
            "linear-gradient(112deg, #071b33 0%, #0b4674 65%, #1889ad 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_72%,rgba(101,211,239,0.22),transparent_23%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[0.18em]"
              style={{
                color: "#67d8f3",
                WebkitTextFillColor: "#67d8f3",
              }}
            >
              Finance & Accounting
            </p>

            <h1
              className="mt-2 text-3xl font-black tracking-tight md:text-[38px]"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
              }}
            >
              General Ledger
            </h1>

            <p
              className="mt-2 text-sm"
              style={{
                color: "#d9eaf4",
                WebkitTextFillColor: "#d9eaf4",
              }}
            >
              Review account activity, debit and credit movements, and the
              running balance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => downloadFile("xlsx")}
              className="border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => downloadFile("pdf")}
              className="border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-slate-800 dark:bg-card">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.8fr_0.9fr_0.9fr_auto]">
          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
              Ledger Account
            </Label>

            <select
              className="mt-2 h-11 w-full rounded-[9px] border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-background"
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
          </div>

          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
              From Date
            </Label>

            <Input
              className="mt-2 h-11 rounded-[9px]"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
              To Date
            </Label>

            <Input
              className="mt-2 h-11 rounded-[9px]"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleApplyFilter}
              className="h-11 rounded-[10px] bg-[#0a689b] px-5 text-white hover:bg-[#085881]"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LedgerMetric
          label="Opening Balance"
          value={money(payload.opening_balance)}
          description="Balance before selected period"
        />

        <LedgerMetric
          label="Total Debit"
          value={money(payload.total_debit)}
          description="Debit movement in selected period"
        />

        <LedgerMetric
          label="Total Credit"
          value={money(payload.total_credit)}
          description="Credit movement in selected period"
        />

        <LedgerMetric
          label="Closing Balance"
          value={money(payload.closing_balance)}
          description="Balance at end of selected period"
          success
        />
      </section>

      <section className="overflow-hidden rounded-[17px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(22,42,73,0.07)] dark:border-slate-800 dark:bg-card">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black">
              {payload.account?.name ||
                selectedAccount?.name ||
                "Select an account"}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Account code:{" "}
              {payload.account?.code || selectedAccount?.code || "—"}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                className="h-11 rounded-[9px] pl-9"
                placeholder="Search JV number or narration"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMoreFilters((current) => !current)}
              className="h-11 rounded-[10px] bg-slate-100 px-5 font-bold text-slate-700 hover:bg-slate-200 dark:bg-muted dark:text-foreground"
            >
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-muted/20">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Showing ledger entries from{" "}
                <strong className="text-foreground">
                  {formatDate(applied.dateFrom)}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {formatDate(applied.dateTo)}
                </strong>
              </span>

              {branchId && <span>• Active branch filter applied</span>}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-slate-200 bg-[#f6f9fc] dark:border-slate-800 dark:bg-muted/30">
              <tr>
                <LedgerTh>Date</LedgerTh>

                <LedgerTh>JV No.</LedgerTh>

                <LedgerTh>Narration</LedgerTh>

                <LedgerTh right>Debit</LedgerTh>

                <LedgerTh right>Credit</LedgerTh>

                <LedgerTh right>Running Balance</LedgerTh>
              </tr>
            </thead>

            <tbody>
              {paginatedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 transition hover:bg-[#fbfdff] dark:border-slate-800 dark:hover:bg-muted/20"
                >
                  <td className="px-[15px] py-[14px]">
                    {formatDate(entry.transaction_date)}
                  </td>

                  <td className="px-[15px] py-[14px]">
                    {entry.journal_entry_id || entry.journal_id ? (
                      <Link
                        to={`/finance/journal-entries?view=${
                          entry.journal_entry_id || entry.journal_id
                        }`}
                        className="font-extrabold text-[#0c67a0] hover:underline"
                      >
                        {entry.entry_number || "View Journal"}
                      </Link>
                    ) : (
                      <span className="font-extrabold text-[#0c67a0]">
                        {entry.entry_number || "—"}
                      </span>
                    )}
                  </td>

                  <td className="px-[15px] py-[14px]">
                    {entry.remarks || entry.transaction_type || "—"}
                  </td>

                  <td className="px-[15px] py-[14px] text-right font-semibold tabular-nums text-[#0767a1]">
                    {isZero(entry.debit_amount)
                      ? "—"
                      : money(entry.debit_amount)}
                  </td>

                  <td className="px-[15px] py-[14px] text-right font-semibold tabular-nums text-red-500">
                    {isZero(entry.credit_amount)
                      ? "—"
                      : money(entry.credit_amount)}
                  </td>

                  <td className="px-[15px] py-[14px] text-right font-black tabular-nums">
                    {money(entry.running_balance)}
                  </td>
                </tr>
              ))}

              {!paginatedEntries.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    {ledgerQuery.isLoading
                      ? "Loading ledger transactions..."
                      : "No ledger transactions found for the selected period."}
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 font-bold dark:border-slate-800 dark:bg-muted/20">
              <tr>
                <td
                  colSpan="3"
                  className="px-[15px] py-[14px] text-base font-black"
                >
                  Period Totals / Closing Balance
                </td>

                <td className="px-[15px] py-[14px] text-right font-black tabular-nums">
                  {money(payload.total_debit)}
                </td>

                <td className="px-[15px] py-[14px] text-right font-black tabular-nums">
                  {money(payload.total_credit)}
                </td>

                <td className="px-[15px] py-[14px] text-right font-black tabular-nums">
                  {money(payload.closing_balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <span>
            Showing {filteredEntries.length} transaction
            {filteredEntries.length === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-card"
            >
              ‹
            </button>

            <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-[#0a689b] px-3 font-bold text-white">
              {page}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-card"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
        General Ledger is a read-only reporting page. Click a JV number to open
        the related journal entry in view mode.
      </div>
    </div>
  );
}

function LedgerMetric({ label, value, description, success = false }) {
  return (
    <div
      className={`rounded-[16px] border p-5 shadow-[0_12px_35px_rgba(22,42,73,0.05)] ${
        success
          ? "border-emerald-100 bg-[linear-gradient(135deg,#f5fff9,#ffffff)] dark:border-emerald-500/20 dark:bg-card"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-card"
      }`}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>

      <p
        className={`mt-2 text-[26px] font-black ${
          success ? "text-emerald-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function LedgerTh({ children, right = false }) {
  return (
    <th
      className={`px-[15px] py-[13px] text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
