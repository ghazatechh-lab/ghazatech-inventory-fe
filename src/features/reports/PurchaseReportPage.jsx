import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function PurchaseReportPage() {
  const { query, page, setPage } = useListQuery("purchase-report", "/purchases/orders/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Purchase report" subtitle="Purchase orders by supplier" actions={<ExportButtons />} />
      <DataTable
        columns={[
          { key: "po_number", header: "PO #", cell: (r) => <span className="font-numeric text-blue-400">{r.po_number}</span> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "supplier", header: "Supplier", cell: (r) => r.supplier.name },
          { key: "total", header: "Amount", align: "right", cell: (r) => <CurrencyText value={r.total} className="text-white" /> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
