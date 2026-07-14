import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StockPage() {
  const { query, q, setQ, page, setPage, getFilter, setFilter } = useListQuery("stock", "/inventory/stock/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Stock overview" subtitle="Current inventory across all branches" />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[220px]"><SearchInput value={q} onChange={setQ} placeholder="Search product or SKU…" /></div>
        <Select value={getFilter("status")} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Stock status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ok">In stock</SelectItem><SelectItem value="low">Low stock</SelectItem><SelectItem value="out">Out of stock</SelectItem></SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "product", header: "Product", cell: (r) => (
            <div className="flex items-center gap-3">
              <img src={r.product.image} alt="" className="w-8 h-8 rounded-md object-cover ring-1 ring-white/5" />
              <div>
                <div className="text-slate-100">{r.product.name}</div>
                <div className="text-[10px] text-slate-500 font-numeric">{r.product.sku}</div>
              </div>
            </div>
          )},
          { key: "brand", header: "Brand", cell: (r) => r.product.brand },
          { key: "category", header: "Category", cell: (r) => r.product.category },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "quantity", header: "Stock", align: "right", cell: (r) => <span className="font-numeric text-white">{r.quantity}</span> },
          { key: "reserved", header: "Reserved", align: "right", cell: (r) => <span className="font-numeric text-slate-400">{r.reserved}</span> },
          { key: "damaged", header: "Damaged", align: "right", cell: (r) => <span className="font-numeric text-slate-400">{r.damaged}</span> },
          { key: "reorder_level", header: "Reorder", align: "right", cell: (r) => <span className="font-numeric text-slate-400">{r.reorder_level}</span> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status === "ok" ? "In stock" : r.status === "low" ? "Low stock" : "Out"} /> },
        ]}
        data={data.results}
        isLoading={query.isLoading}
        page={page}
        total={data.count}
        onPageChange={setPage}
      />
    </div>
  );
}
