import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Plus, ArrowRight } from "lucide-react";

export default function TransferListPage() {
  const { query, page, setPage } = useListQuery("transfers", "/transfers/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Stock Transfers" subtitle="Move stock between branches"
        actions={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/transfers/new"><Plus className="w-4 h-4 mr-1.5" /> New transfer</Link></Button>} />
      <DataTable
        columns={[
          { key: "transfer_number", header: "Transfer #", cell: (r) => <Link to={`/transfers/${r.id}`} className="font-numeric text-blue-400">{r.transfer_number}</Link> },
          { key: "from", header: "From", cell: (r) => r.from_branch.name },
          { key: "arrow", header: "", cell: () => <ArrowRight className="w-3.5 h-3.5 text-slate-500" /> },
          { key: "to", header: "To", cell: (r) => r.to_branch.name },
          { key: "created_at", header: "Requested", cell: (r) => <DateText value={r.created_at} /> },
          { key: "dispatch_date", header: "Dispatched", cell: (r) => r.dispatch_date ? <DateText value={r.dispatch_date} /> : "-" },
          { key: "receive_date", header: "Received", cell: (r) => r.receive_date ? <DateText value={r.receive_date} /> : "-" },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
