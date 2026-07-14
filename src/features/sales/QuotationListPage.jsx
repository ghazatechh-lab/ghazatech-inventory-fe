import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function QuotationListPage() {
  const { query, q, setQ, page, setPage, getFilter, setFilter } = useListQuery("quotations", "/sales/quotations/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Quotations" subtitle="Sales quotes issued to customers"
        actions={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="new-quotation-btn"><Link to="/sales/quotations/new"><Plus className="w-4 h-4 mr-1.5" /> New quotation</Link></Button>} />
      <div className="flex gap-3 mb-4">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search by quotation # or customer…" /></div>
        <Select value={getFilter("status")} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem>{["draft","sent","approved","rejected","expired","converted"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "quotation_number", header: "Quotation #", cell: (r) => <Link to={`/sales/quotations/${r.id}`} className="font-numeric text-blue-400">{r.quotation_number}</Link> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "customer", header: "Customer", cell: (r) => r.customer.name },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "valid_until", header: "Valid until", cell: (r) => <DateText value={r.valid_until} /> },
          { key: "total", header: "Total", align: "right", cell: (r) => <CurrencyText value={r.total} className="text-white" /> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
