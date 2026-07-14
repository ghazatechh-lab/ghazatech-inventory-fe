import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TrendingDown, AlertTriangle } from "lucide-react";

export default function LowStockPage() {
  const { data, isLoading } = useQuery({ queryKey: ["low-stock"], queryFn: async () => unwrap(await api.get("/inventory/low-stock/")) });
  const items = data?.results || [];
  const outOfStock = items.filter(i => i.status === "out").length;
  return (
    <div>
      <PageHeader title="Low stock items" subtitle="Reorder recommendations" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="card-surface p-5"><div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider"><TrendingDown className="w-3.5 h-3.5" /> Low stock</div><div className="mt-1 text-2xl font-semibold font-numeric text-amber-400">{items.filter(i => i.status === "low").length}</div></div>
        <div className="card-surface p-5"><div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider"><AlertTriangle className="w-3.5 h-3.5" /> Out of stock</div><div className="mt-1 text-2xl font-semibold font-numeric text-red-400">{outOfStock}</div></div>
        <div className="card-surface p-5"><div className="text-xs text-slate-500 uppercase tracking-wider">Total to reorder</div><div className="mt-1 text-2xl font-semibold font-numeric text-white">{items.length}</div></div>
      </div>
      <DataTable
        columns={[
          { key: "product", header: "Product", cell: (r) => (
            <div className="flex items-center gap-3">
              <img src={r.product.image} alt="" className="w-8 h-8 rounded-md object-cover" />
              <div><div className="text-slate-100">{r.product.name}</div><div className="text-[10px] text-slate-500 font-numeric">{r.product.sku}</div></div>
            </div>
          )},
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "quantity", header: "Current", align: "right", cell: (r) => <span className="font-numeric text-white">{r.quantity}</span> },
          { key: "reorder_level", header: "Reorder ≥", align: "right", cell: (r) => <span className="font-numeric text-slate-400">{r.reorder_level}</span> },
          { key: "suggested", header: "Suggested order", align: "right", cell: (r) => <span className="font-numeric text-emerald-400">{Math.max(r.reorder_level * 2 - r.quantity, 5)}</span> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status === "low" ? "Low" : "Out"} /> },
        ]}
        data={items}
        isLoading={isLoading}
        total={items.length}
        page={1}
      />
    </div>
  );
}
