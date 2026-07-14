import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function StockMovementsPage() {
  const { query, page, setPage } = useListQuery("movements", "/inventory/movements/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Stock movements" subtitle="All inventory transactions" />
      <DataTable
        columns={[
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "reference", header: "Reference", cell: (r) => <span className="font-numeric text-blue-400">{r.reference}</span> },
          { key: "product", header: "Product", cell: (r) => r.product.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "type", header: "Type", cell: (r) => <StatusBadge status={r.type === "grn_in" ? "success" : "warning"} label={r.type === "grn_in" ? "Stock in" : "Stock out"} /> },
          { key: "quantity", header: "Qty", align: "right", cell: (r) => (
            <span className={`font-numeric font-medium inline-flex items-center gap-1 ${r.quantity > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {r.quantity > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {Math.abs(r.quantity)}
            </span>
          )},
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
