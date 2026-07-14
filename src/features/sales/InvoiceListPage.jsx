import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvoiceListPage() {
  const { query, q, setQ, page, setPage, getFilter, setFilter } = useListQuery("invoices", "/sales/invoices/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Invoices" subtitle="Confirmed sales and outstanding balances"
        actions={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="new-invoice-btn"><Link to="/sales/invoices/new"><Plus className="w-4 h-4 mr-1.5" /> New invoice</Link></Button>} />
      <div className="flex gap-3 mb-4">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search invoice # or customer…" /></div>
        <Select value={getFilter("payment_status")} onValueChange={(v) => setFilter("payment_status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All payments</SelectItem>{["paid","partial","unpaid","overdue"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "invoice_number", header: "Invoice #", cell: (r) => <Link to={`/sales/invoices/${r.id}`} className="font-numeric text-blue-400">{r.invoice_number}</Link> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "customer", header: "Customer", cell: (r) => r.customer.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "total", header: "Total", align: "right", cell: (r) => <CurrencyText value={r.total} className="text-white" /> },
          { key: "paid", header: "Paid", align: "right", cell: (r) => <CurrencyText value={r.paid} className="text-emerald-400" /> },
          { key: "balance", header: "Balance", align: "right", cell: (r) => <CurrencyText value={r.balance} className={r.balance > 0 ? "text-red-300" : ""} /> },
          { key: "payment_status", header: "Payment", cell: (r) => <StatusBadge status={r.payment_status} /> },
          { key: "delivery_status", header: "Delivery", cell: (r) => <StatusBadge status={r.delivery_status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
