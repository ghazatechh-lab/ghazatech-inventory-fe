import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["supplier", id], queryFn: async () => unwrap(await api.get(`/suppliers/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const s = data || {};
  return (
    <div>
      <PageHeader title={s.supplier_name} subtitle={s.supplier_code} actions={<Button asChild variant="outline"><Link to={`/suppliers/${id}/edit`}>Edit</Link></Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-5 lg:col-span-2 grid grid-cols-2 gap-4 text-sm">
          {[["Contact person", s.contact_person],["Phone", s.phone],["Email", s.email],["TRN", s.trn_number],["Address", s.address],["City", `${s.city}, ${s.emirate}`],["Payment terms", `${s.payment_terms_days}d`]].map(([k, v]) => (
            <div key={k}><div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div><div className="text-slate-200 mt-0.5">{v || "-"}</div></div>
          ))}
        </div>
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Outstanding payable</div><CurrencyText value={s.outstanding} className="text-2xl font-semibold text-red-300" /></div>
      </div>
    </div>
  );
}
