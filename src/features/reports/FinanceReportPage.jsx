import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { LoadingState } from "@/components/common/States";
import { formatAED } from "@/lib/utils";

export default function FinanceReportPage() {
  const { data: expenses } = useQuery({ queryKey: ["fin-expenses"], queryFn: async () => unwrap(await api.get("/finance/expenses/", { params: { page_size: 200 } })) });
  const { data: receivables } = useQuery({ queryKey: ["fin-recv"], queryFn: async () => unwrap(await api.get("/finance/customer-receivables/")) });
  if (!expenses || !receivables) return <LoadingState />;
  const expTotal = (expenses.results || []).reduce((s, e) => s + e.amount, 0);
  const recvTotal = (receivables || []).reduce((s, r) => s + r.total, 0);
  return (
    <div>
      <PageHeader title="Finance report" subtitle="Aggregated financial summary" actions={<ExportButtons />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Total expenses</div><div className="mt-1 text-2xl font-semibold font-numeric text-red-300">{formatAED(expTotal)}</div></div>
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Total receivables</div><div className="mt-1 text-2xl font-semibold font-numeric text-amber-300">{formatAED(recvTotal)}</div></div>
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Expense entries</div><div className="mt-1 text-2xl font-semibold font-numeric text-white">{expenses.count}</div></div>
      </div>
    </div>
  );
}
