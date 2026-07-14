import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { LoadingState } from "@/components/common/States";
import { formatAED } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function ReportsDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["report-dashboard"], queryFn: async () => unwrap(await api.get("/reports/dashboard/")) });
  if (isLoading) return <LoadingState />;
  const k = data?.kpi ?? {};
  return (
    <div>
      <PageHeader title="Reports overview" subtitle="High-level business metrics" actions={<ExportButtons />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[["Sales this month", k.sales_month],["Purchases", k.purchases_month],["Receivables", k.receivables],["Payables", k.payables]].map(([label, val]) => (
          <div key={label} className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold font-numeric text-white">{formatAED(val)}</div></div>
        ))}
      </div>
      <div className="card-surface p-5">
        <div className="text-sm font-semibold text-slate-200 mb-3">Sales vs Purchases</div>
        <div className="h-72">
          <ResponsiveContainer><BarChart data={data?.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" stroke="#64748B" fontSize={11} /><YAxis stroke="#64748B" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f1522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={v => formatAED(v)} />
            <Bar dataKey="sales" fill="#3B82F6" radius={[6,6,0,0]} /><Bar dataKey="purchases" fill="#10B981" radius={[6,6,0,0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
