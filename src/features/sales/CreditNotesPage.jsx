import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CreditNotesPage() {
  const { query, page, setPage } = useListQuery("credit-notes", "/sales/credit-notes/");
  const data = query.data || { results: [], count: 0 };
  const approve = async (id) => { await api.post(`/sales/credit-notes/${id}/approve/`); toast.success("Approved"); query.refetch(); };
  return (
    <div>
      <PageHeader title="Credit Notes" subtitle="Refunds and returns issued against invoices" />
      <DataTable
        columns={[
          { key: "credit_note_number", header: "CN #", cell: (r) => <span className="font-numeric text-blue-400">{r.credit_note_number}</span> },
          { key: "invoice", header: "Invoice", cell: (r) => <span className="font-numeric">{r.invoice.number}</span> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "customer", header: "Customer", cell: (r) => r.customer.name },
          { key: "reason", header: "Reason" },
          { key: "amount", header: "Amount", align: "right", cell: (r) => <CurrencyText value={r.amount} className="text-red-300" /> },
          { key: "stock_returned", header: "Stock returned", cell: (r) => r.stock_returned ? "Yes" : "No" },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "actions", header: "", align: "right", cell: (r) => r.status === "pending" && <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Approve</Button> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
