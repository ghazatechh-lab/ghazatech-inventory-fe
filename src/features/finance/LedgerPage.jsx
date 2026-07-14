import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { DateText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";

export default function LedgerPage() {
  const [customerId, setCustomerId] = React.useState("");
  const { data: customers } = useQuery({ queryKey: ["customers-sel"], queryFn: async () => unwrap(await api.get("/customers/", { params: { page_size: 100 } })) });
  const { data: ledger, isFetching } = useQuery({ queryKey: ["ledger", customerId], queryFn: async () => unwrap(await api.get(`/customers/${customerId}/ledger/`)), enabled: !!customerId });
  return (
    <div>
      <PageHeader title="Ledger" subtitle="Customer transaction history" />
      <div className="card-surface p-4 mb-4 max-w-md">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Customer</div>
        <Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger><SelectContent className="max-h-72">{(customers?.results || []).map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent></Select>
      </div>
      {!customerId ? <div className="card-surface p-6"><EmptyState title="Select a customer" description="Choose a customer to view their ledger." /></div> : (
        <DataTable
          columns={[
            { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
            { key: "reference", header: "Reference", cell: (r) => <span className="font-numeric text-blue-400">{r.reference}</span> },
            { key: "type", header: "Type", cell: (r) => <span className="capitalize">{r.type}</span> },
            { key: "debit", header: "Debit", align: "right", cell: (r) => <span className="font-numeric">{r.debit ? formatAED(r.debit) : "-"}</span> },
            { key: "credit", header: "Credit", align: "right", cell: (r) => <span className="font-numeric text-emerald-400">{r.credit ? formatAED(r.credit) : "-"}</span> },
            { key: "balance", header: "Balance", align: "right", cell: (r) => <span className="font-numeric text-white">{formatAED(r.balance)}</span> },
          ]}
          data={ledger || []} isLoading={isFetching} page={1} total={(ledger || []).length}
        />
      )}
    </div>
  );
}
