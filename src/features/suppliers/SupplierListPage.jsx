import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { Plus, Truck } from "lucide-react";

export default function SupplierListPage() {
  const { query, q, setQ, page, setPage } = useListQuery("suppliers", "/suppliers/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Distributors and part vendors"
        actions={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="new-supplier-btn"><Link to="/suppliers/new"><Plus className="w-4 h-4 mr-1.5" /> New supplier</Link></Button>} />
      <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Search supplier…" /></div>
      <DataTable
        columns={[
          { key: "supplier_code", header: "Code", cell: (r) => <span className="font-numeric text-slate-300">{r.supplier_code}</span> },
          { key: "supplier", header: "Supplier", cell: (r) => (
            <Link to={`/suppliers/${r.id}`} className="flex items-center gap-2.5 hover:text-blue-400">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Truck className="w-4 h-4 text-emerald-400" /></div>
              <div><div className="text-slate-100">{r.supplier_name}</div><div className="text-[10px] text-slate-500">{r.contact_person}</div></div>
            </Link>
          )},
          { key: "phone", header: "Phone", cell: (r) => <span className="font-numeric text-slate-400 text-xs">{r.phone}</span> },
          { key: "city", header: "City" },
          { key: "payment_terms_days", header: "Payment terms", align: "right", cell: (r) => <span className="font-numeric">{r.payment_terms_days}d</span> },
          { key: "outstanding", header: "Outstanding", align: "right", cell: (r) => <CurrencyText value={r.outstanding} className={r.outstanding > 0 ? "text-red-300" : ""} /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
