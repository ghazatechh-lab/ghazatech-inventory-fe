import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";

export default function GRNDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["grn", id], queryFn: async () => unwrap(await api.get(`/purchases/grn/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const g = data || {};
  return (
    <div>
      <PageHeader title={g.grn_number} subtitle={<><DateText value={g.date} /> · {g.supplier?.name}</>} actions={<StatusBadge status={g.status} />} />
      <div className="card-surface p-5">
        <table className="w-full text-sm">
          <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Product</th><th className="text-right">Ordered</th><th className="text-right">Received</th><th className="text-right">Damaged</th><th className="text-left">Rack</th></tr></thead>
          <tbody>{(g.items || []).map((it, i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-slate-200">{it.product.name}</td><td className="text-right font-numeric">{it.ordered}</td><td className="text-right font-numeric text-emerald-400">{it.received}</td><td className="text-right font-numeric text-red-400">{it.damaged}</td><td className="font-numeric text-slate-400">{it.rack_location}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
