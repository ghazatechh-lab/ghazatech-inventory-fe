import React from "react";
import { Download, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, today } from "./accountingUtils";

const yearStart = () => `${new Date().getFullYear()}-01-01`;

export default function FinancialReportsPage() {
  const { branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("trial");
  const [filters, setFilters] = React.useState({
    report_date: today(),
    date_from: yearStart(),
    date_to: today(),
    branch: "",
    display: "BALANCES",
    comparison: "BUDGET",
    detail_level: "SUMMARY",
  });

  const branchesQ = useQuery({
    queryKey: ["fr-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const branches = Array.isArray(branchesQ.data?.data)
    ? branchesQ.data.data
    : branchesQ.data?.data?.results || branchesQ.data?.results || [];

  const endpoint = {
    trial: "trial-balance",
    pl: "income-statement",
    bs: "balance-sheet",
    cf: "cash-flow",
    equity: "changes-in-equity",
  }[tab];
  const reportQ = useQuery({
    queryKey: ["financial-report", tab, branchParams, filters],
    queryFn: async () =>
      unwrap(
        await api.get(`/finance/reporting/reports/${endpoint}/`, {
          params: {
            ...branchParams,
            ...filters,
            branch: filters.branch || undefined,
          },
        }),
      ),
    staleTime: 0,
  });
  const data = reportQ.data || {};

  const exportReport = async (format) => {
    try {
      const r = await api.get(`/finance/reporting/reports/${endpoint}/`, {
        params: {
          ...branchParams,
          ...filters,
          branch: filters.branch || undefined,
          export: format,
        },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${endpoint}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Unable to export ${format.toUpperCase()}.`);
    }
  };

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Financial Reports"
        subtitle="Review trial balance, profit and loss, balance sheet, cash flow, and changes in equity."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={() => exportReport("excel")}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button onClick={() => exportReport("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["trial", "Trial Balance"],
          ["pl", "Income Statement"],
          ["bs", "Balance Sheet"],
          ["cf", "Cash Flow Statement"],
          ["equity", "Changes in Equity"],
        ]}
      />
      <Filters
        tab={tab}
        filters={filters}
        setFilters={setFilters}
        branches={branches}
      />
      {reportQ.isLoading && (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          Loading report...
        </div>
      )}
      {!reportQ.isLoading && tab === "trial" && <Trial data={data} />}
      {!reportQ.isLoading && tab === "pl" && <PL data={data} />}
      {!reportQ.isLoading && tab === "bs" && <BS data={data} />}
      {!reportQ.isLoading && tab === "cf" && <CF data={data} />}
      {!reportQ.isLoading && tab === "equity" && <Equity data={data} />}
    </div>
  );
}

function Filters({ tab, filters, setFilters, branches }) {
  const point = ["trial", "bs"].includes(tab);
  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
      {point ? (
        <Field label="Report Date">
          <Input
            type="date"
            value={filters.report_date}
            onChange={(e) =>
              setFilters((x) => ({ ...x, report_date: e.target.value }))
            }
          />
        </Field>
      ) : (
        <>
          <Field label="From Date">
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) =>
                setFilters((x) => ({ ...x, date_from: e.target.value }))
              }
            />
          </Field>
          <Field label="To Date">
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) =>
                setFilters((x) => ({ ...x, date_to: e.target.value }))
              }
            />
          </Field>
        </>
      )}
      <Field label="Branch">
        <select
          className="h-10 w-full rounded-md border bg-background px-3"
          value={filters.branch}
          onChange={(e) =>
            setFilters((x) => ({ ...x, branch: e.target.value }))
          }
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.branch_name || b.name}
            </option>
          ))}
        </select>
      </Field>
      {tab === "trial" && (
        <Field label="Display">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.display}
            onChange={(e) =>
              setFilters((x) => ({ ...x, display: e.target.value }))
            }
          >
            <option value="BALANCES">Accounts with balances</option>
            <option value="ALL">All accounts</option>
            <option value="SUMMARY">Summary by group</option>
          </select>
        </Field>
      )}
      {tab !== "trial" && (
        <Field label="Comparison">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.comparison}
            onChange={(e) =>
              setFilters((x) => ({ ...x, comparison: e.target.value }))
            }
          >
            <option value="BUDGET">Budget vs Actual</option>
            <option value="PRIOR_YEAR">Prior Year</option>
            <option value="NONE">No Comparison</option>
          </select>
        </Field>
      )}
      {tab === "bs" && (
        <Field label="Detail Level">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.detail_level}
            onChange={(e) =>
              setFilters((x) => ({ ...x, detail_level: e.target.value }))
            }
          >
            <option value="SUMMARY">Summary</option>
            <option value="DETAILED">Detailed</option>
          </select>
        </Field>
      )}
    </div>
  );
}
function Trial({ data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi l="Total Debit" v={money(data.total_debit || 0)} />
        <Kpi l="Total Credit" v={money(data.total_credit || 0)} />
        <Kpi
          l="Difference"
          v={money(data.difference || 0)}
          tone={Number(data.difference || 0) === 0 ? "green" : "red"}
        />
        <Kpi l="Accounts Reported" v={data.accounts_reported || 0} />
      </div>
      <Table
        headers={[
          "Code",
          "Account",
          "Group",
          "Branch",
          "Opening Debit",
          "Opening Credit",
          "Period Debit",
          "Period Credit",
          "Closing Debit",
          "Closing Credit",
        ]}
        rows={(data.rows || []).map((r) => [
          r.code,
          r.account_name,
          r.account_group,
          r.branch_name || "All",
          money(r.opening_debit),
          money(r.opening_credit),
          money(r.period_debit),
          money(r.period_credit),
          money(r.closing_debit),
          money(r.closing_credit),
        ])}
      />
    </>
  );
}
function PL({ data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi l="Revenue" v={money(data.revenue || 0)} tone="green" />
        <Kpi l="Gross Profit" v={money(data.gross_profit || 0)} />
        <Kpi
          l="Operating Expenses"
          v={money(data.operating_expenses || 0)}
          tone="amber"
        />
        <Kpi l="Net Profit" v={money(data.net_profit || 0)} tone="green" />
      </div>
      <Statement title="Income Statement" rows={data.rows || []} />
    </>
  );
}
function BS({ data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi l="Total Assets" v={money(data.total_assets || 0)} />
        <Kpi l="Total Liabilities" v={money(data.total_liabilities || 0)} />
        <Kpi l="Total Equity" v={money(data.total_equity || 0)} />
        <Kpi
          l="Balance Difference"
          v={money(data.difference || 0)}
          tone={Number(data.difference || 0) === 0 ? "green" : "red"}
        />
      </div>
      <Statement title="Balance Sheet" rows={data.rows || []} />
    </>
  );
}
function CF({ data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          l="Operating Cash Flow"
          v={money(data.operating_cash_flow || 0)}
          tone="green"
        />
        <Kpi
          l="Investing Cash Flow"
          v={money(data.investing_cash_flow || 0)}
          tone="amber"
        />
        <Kpi l="Financing Cash Flow" v={money(data.financing_cash_flow || 0)} />
        <Kpi
          l="Net Change in Cash"
          v={money(data.net_change_in_cash || 0)}
          tone="green"
        />
      </div>
      <Statement title="Cash Flow Statement" rows={data.rows || []} />
    </>
  );
}
function Equity({ data }) {
  return (
    <Table
      headers={[
        "Description",
        "Share Capital",
        "Retained Earnings",
        "Current Year Profit",
        "Total Equity",
      ]}
      rows={(data.rows || []).map((r) => [
        r.description,
        money(r.share_capital),
        money(r.retained_earnings),
        money(r.current_year_profit),
        money(r.total_equity),
      ])}
    />
  );
}
function Statement({ title, rows }) {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="p-5">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_180px_180px] gap-3 border-b px-2 py-3 ${r.is_group ? "bg-muted/30 font-bold" : ""} ${r.is_total ? "font-bold" : ""} ${r.is_grand_total ? "bg-blue-50 text-base font-black" : ""}`}
          >
            <span>{r.label || r.description}</span>
            <span className="text-right">
              {money(r.current ?? r.actual ?? r.amount ?? 0)}
            </span>
            <span className="text-right">
              {money(r.comparison ?? r.budget ?? r.prior ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5">
      {items.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${value === v ? "bg-blue-600 text-white" : "text-muted-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {r.map((v, j) => (
                <td key={j} className="px-4 py-3">
                  {v ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Kpi({ l, v, tone }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{l}</p>
      <p
        className={`mt-2 text-2xl font-black ${tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}
