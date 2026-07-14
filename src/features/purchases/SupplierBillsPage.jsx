import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function SupplierBillsPage() {
  const { query, page, setPage } = useListQuery("supplier-bills", "/purchases/supplier-bills/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Supplier Bills" subtitle="Invoices from suppliers awaiting payment" />
      <DataTable
        columns={[
          { key: "po_number", header: "Bill #", cell: (r) => <span className="font-numeric text-blue-400">{r.po_number}</span> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "supplier", header: "Supplier", cell: (r) => r.supplier.name },
          { key: "total", header: "Amount", align: "right", cell: (r) => <CurrencyText value={r.total} /> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
