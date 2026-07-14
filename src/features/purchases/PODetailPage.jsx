import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";

export default function PODetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["po", id], queryFn: async () => unwrap(await api.get(`/purchases/orders/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const p = data || {};
  return (
    <div>
      <PageHeader title={p.po_number} subtitle={<><DateText value={p.date} /> · {p.supplier?.name}</>} actions={<StatusBadge status={p.status} />} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5">
          <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Supplier</div><div className="text-slate-100 mt-0.5">{p.supplier?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Branch</div><div className="text-slate-100 mt-0.5">{p.branch?.name}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Product</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
            <tbody>{(p.items || []).map((it, i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-slate-200">{it.product.name}</td><td className="text-right font-numeric">{it.quantity}</td><td className="text-right font-numeric">{formatAED(it.unit_price)}</td><td className="text-right font-numeric text-white">{formatAED(it.line_total)}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="card-surface p-5 space-y-2 h-fit">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="font-numeric text-slate-100">{formatAED(p.subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">VAT</span><span className="font-numeric text-slate-100">{formatAED(p.vat)}</span></div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between"><span className="text-slate-300">Total</span><CurrencyText value={p.total} className="text-xl font-semibold text-white" /></div>
        </div>
      </div>
    </div>
  );
}
