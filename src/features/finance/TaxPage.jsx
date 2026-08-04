import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import api from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, today } from "./accountingUtils";
import { MetricCard } from "./FinanceSectionUI";

const quarterStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
    .toISOString()
    .slice(0, 10);
};

export default function TaxPage() {
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();
  const [from, setFrom] = React.useState(quarterStart);
  const [to, setTo] = React.useState(today);
  const [applied, setApplied] = React.useState({
    from: quarterStart(),
    to: today(),
  });
  const q = useQuery({
    queryKey: ["vat-summary", branchId, applied],
    queryFn: () =>
      api.get("/finance/reporting/vat-summary/", {
        params: {
          ...branchParams,
          date_from: applied.from,
          date_to: applied.to,
        },
      }),
    staleTime: 0,
  });
  const data = q.data?.data?.data || q.data?.data || {};
  const rows = Array.isArray(data.transactions) ? data.transactions : [];
  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="VAT / Tax"
        subtitle={
          isAllBranches
            ? "Consolidated UAE VAT tracking across all branches."
            : "UAE VAT tracking for the selected branch."
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
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button
          type="button"
          variant="outline"
          onClick={() => setApplied({ from, to })}
        >
          Apply Period
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Output VAT (Sales)" value={money(data.output_vat)} />
        <MetricCard
          label="Input VAT (Purchases)"
          value={money(data.input_vat)}
        />
        <MetricCard
          label="Net VAT Payable"
          value={money(data.net_vat_payable)}
        />
        <MetricCard
          label="Branch Scope"
          value={isAllBranches ? "All Branches" : "Selected Branch"}
        />
      </div>
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="text-xl font-semibold">VAT Return Summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {applied.from} to {applied.to}
          </p>
        </div>
        <div className="max-w-3xl space-y-5 p-6">
          <div>
            <h3 className="font-semibold">Standard-rated supplies</h3>
            <div className="mt-3 space-y-2 pl-4 font-mono text-sm">
              <div className="flex justify-between">
                <span>Taxable sales</span>
                <span>{money(data.taxable_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Output VAT due</span>
                <span>{money(data.output_vat)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Recoverable input tax</h3>
            <div className="mt-3 space-y-2 pl-4 font-mono text-sm">
              <div className="flex justify-between">
                <span>Taxable purchases</span>
                <span>{money(data.taxable_purchases)}</span>
              </div>
              <div className="flex justify-between">
                <span>Recoverable input VAT</span>
                <span>{money(data.input_vat)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between border-y-2 py-3 font-mono text-lg font-semibold">
            <span>Net VAT Payable</span>
            <span>{money(data.net_vat_payable)}</span>
          </div>
        </div>
      </section>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {[
                "Date",
                "Document No.",
                "Type",
                "Branch",
                "Taxable Value",
                "VAT Amount",
              ].map((x) => (
                <th
                  key={x}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                >
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-3">{r.transaction_date}</td>
                <td className="px-4 py-3">{r.document_number}</td>
                <td className="px-4 py-3">{r.transaction_type_display}</td>
                <td className="px-4 py-3">{r.branch_name}</td>
                <td className="px-4 py-3">{money(r.taxable_value)}</td>
                <td className="px-4 py-3">{money(r.vat_amount)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan="6"
                  className="p-10 text-center text-muted-foreground"
                >
                  No VAT transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
