import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { LoadingState } from "@/components/common/States";
import { formatAED } from "@/lib/utils";
import { CurrencyText } from "@/components/common/CurrencyText";
import { DataTable } from "@/components/common/DataTable";

export default function SalesReportPage() {
  const { data, isLoading } = useQuery({ queryKey: ["report-sales"], queryFn: async () => unwrap(await api.get("/reports/sales/")) });
  if (isLoading) return <LoadingState />;
  const d = data || {};
  return (
    <div>
      <PageHeader title="Sales report" subtitle="Sales summary by customer and product" actions={<ExportButtons />} />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Total sales</div><CurrencyText value={d.total_sales} className="mt-1 block text-2xl font-semibold text-white" /></div>
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500">Invoice count</div><div className="mt-1 text-2xl font-semibold font-numeric text-white">{d.invoice_count}</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <div className="text-sm font-semibold text-slate-200 mb-3">Sales by customer</div>
          <DataTable columns={[{ key: "name", header: "Customer" }, { key: "value", header: "Amount", align: "right", cell: (r) => <span className="font-numeric text-white">{formatAED(r.value)}</span> }]} data={d.by_customer || []} total={(d.by_customer || []).length} page={1} />
        </div>
        <div className="card-surface p-5">
          <div className="text-sm font-semibold text-slate-200 mb-3">Sales by product</div>
          <DataTable columns={[{ key: "name", header: "Product" }, { key: "value", header: "Amount", align: "right", cell: (r) => <span className="font-numeric text-white">{formatAED(r.value)}</span> }]} data={d.by_product || []} total={(d.by_product || []).length} page={1} />
        </div>
      </div>
    </div>
  );
}
