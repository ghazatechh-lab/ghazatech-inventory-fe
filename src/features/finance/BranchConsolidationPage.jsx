import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, today } from "./accountingUtils";
const start = () => `${new Date().getFullYear()}-01-01`;
export default function BranchConsolidationPage() {
  const [from, setFrom] = React.useState(start);
  const [to, setTo] = React.useState(today);
  const [applied, setApplied] = React.useState({ from: start(), to: today() });
  const q = useQuery({
    queryKey: ["branch-consolidation", applied],
    queryFn: () =>
      api.get("/finance/reporting/branch-consolidation-summary/", {
        params: { date_from: applied.from, date_to: applied.to },
      }),
    staleTime: 0,
  });
  const d = q.data?.data?.data || q.data?.data || {};
  const branches = Array.isArray(d.branches) ? d.branches : [];
  const rows = Array.isArray(d.rows) ? d.rows : [];
  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="Branch Consolidation"
        subtitle="Combined view across Head Office and all branches, with inter-branch balances eliminated."
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
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                Metric
              </th>
              {branches.map((b) => (
                <th
                  key={b.id}
                  className="px-4 py-3 text-right text-xs font-semibold uppercase"
                >
                  {b.name}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                Elimination
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                Consolidated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.metric}
                className={`border-b ${r.metric === "Net Profit" ? "font-semibold" : ""}`}
              >
                <td className="px-4 py-3">{r.metric}</td>
                {branches.map((b) => (
                  <td key={b.id} className="px-4 py-3 text-right">
                    {money(r.branches?.[String(b.id)] || 0)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">{money(r.elimination)}</td>
                <td className="px-4 py-3 text-right">
                  {money(r.consolidated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
