import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";

export default function SalesPaymentsPage() {
  const { query, page, setPage } = useListQuery("sales-payments", "/sales/payments/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Sales Payments" subtitle="All customer receipts recorded" />
      <DataTable
        columns={[
          { key: "payment_number", header: "Payment #", cell: (r) => <span className="font-numeric text-blue-400">{r.payment_number}</span> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "customer", header: "Customer", cell: (r) => r.customer.name },
          { key: "invoice", header: "Invoice", cell: (r) => <span className="font-numeric">{r.invoice.number}</span> },
          { key: "method", header: "Method" },
          { key: "reference", header: "Reference", cell: (r) => <span className="font-numeric text-slate-400">{r.reference || "-"}</span> },
          { key: "amount", header: "Amount", align: "right", cell: (r) => <CurrencyText value={r.amount} className="text-emerald-400" /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
