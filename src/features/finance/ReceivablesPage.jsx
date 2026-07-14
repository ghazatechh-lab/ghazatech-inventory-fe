import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/common/States";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatAED } from "@/lib/utils";

export default function ReceivablesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["receivables"], queryFn: async () => unwrap(await api.get("/finance/customer-receivables/")) });
  if (isLoading) return <LoadingState />;
  const rows = data || [];
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div>
      <PageHeader title="Customer Receivables" subtitle={`Outstanding payments from customers · Total ${formatAED(total)}`} />
      {rows.length === 0 && <div className="card-surface p-6"><EmptyState /></div>}
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.customer.id} className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div><div className="text-sm text-slate-100 font-medium">{r.customer.name}</div><div className="text-[10px] text-slate-500">{r.invoices.length} outstanding invoices</div></div>
              <CurrencyText value={r.total} className="text-xl font-semibold text-red-300" />
            </div>
            <div className="space-y-1.5">
              {r.invoices.map(inv => (
                <div key={inv.number} className="flex items-center justify-between text-xs">
                  <span className="font-numeric text-blue-400">{inv.number}</span>
                  <span><DateText value={inv.date} /> · due <DateText value={inv.due_date} /></span>
                  <StatusBadge status={inv.status} />
                  <CurrencyText value={inv.balance} className="text-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
