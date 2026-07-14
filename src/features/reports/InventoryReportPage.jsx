import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { LoadingState } from "@/components/common/States";
import { DataTable } from "@/components/common/DataTable";
import { formatAED } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function InventoryReportPage() {
  const { data, isLoading } = useQuery({ queryKey: ["inv-val"], queryFn: async () => unwrap(await api.get("/reports/inventory-valuation/")) });
  if (isLoading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Inventory valuation" subtitle="Stock value by branch" actions={<ExportButtons />} />
      <div className="card-surface p-5 mb-4">
        <div className="h-64">
          <ResponsiveContainer><BarChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="branch" stroke="#64748B" fontSize={11} /><YAxis stroke="#64748B" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f1522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={v => formatAED(v)} />
            <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </div>
      <DataTable columns={[{ key: "branch", header: "Branch" }, { key: "value", header: "Value", align: "right", cell: (r) => <span className="font-numeric text-white">{formatAED(r.value)}</span> }]} data={data || []} total={(data || []).length} page={1} />
    </div>
  );
}
