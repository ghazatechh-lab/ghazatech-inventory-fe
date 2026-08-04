import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
const m = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "AED" }).format(
    Number(v || 0),
  );
export default function AccountingDashboardPage() {
  const { branchParams } = useActiveBranchFilter();
  const q = useQuery({
    queryKey: ["accounting-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/dashboard/summary/", { params: branchParams }),
      ),
  });
  const d = q.data || {};
  return (
    <div className="finance-module-page finance-workspace space-y-5">
      <PageHeader
        title="Accounting Dashboard"
        subtitle="Finance and accounting overview"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Chart Accounts", d.accounts],
          ["Posted Journals", d.posted_journals],
          ["Receivables", m(d.receivables)],
          ["Payables", m(d.payables)],
          ["Bank Balance", m(d.bank_balance)],
          ["Fixed Assets", m(d.fixed_assets)],
        ].map(([l, v]) => (
          <div className="card-surface p-5" key={l}>
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 text-2xl font-bold">{v ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
