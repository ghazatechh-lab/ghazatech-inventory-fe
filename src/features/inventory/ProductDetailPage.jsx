import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Barcode as BarcodeIcon, Printer } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["product", id], queryFn: async () => unwrap(await api.get(`/products/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const p = data || {};
  return (
    <div>
      <PageHeader
        title={p.product_name}
        subtitle={`SKU ${p.sku} · ${p.brand} · ${p.category}`}
        actions={<>
          <Button variant="outline" data-testid="print-barcode-btn"><Printer className="w-4 h-4 mr-1.5" /> Print barcode</Button>
          <Button asChild variant="outline"><Link to={`/inventory/products/${id}/edit`}>Edit</Link></Button>
        </>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-5 lg:col-span-1">
          <img src={p.product_image} alt="" className="w-full h-56 rounded-lg object-cover" />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><BarcodeIcon className="w-3.5 h-3.5" /> <span className="font-numeric">{p.barcode}</span></span>
            <span>Rack <span className="text-slate-200 font-numeric">{p.rack_location}</span></span>
          </div>
        </div>
        <div className="card-surface p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Purchase price</div><div className="mt-0.5"><CurrencyText value={p.purchase_price} className="text-slate-100" /></div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Retail price</div><div className="mt-0.5"><CurrencyText value={p.retail_price} className="text-slate-100" /></div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Wholesale price</div><div className="mt-0.5"><CurrencyText value={p.wholesale_price} className="text-slate-100" /></div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Min selling</div><div className="mt-0.5"><CurrencyText value={p.minimum_selling_price} className="text-slate-100" /></div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Warranty</div><div className="mt-0.5 font-numeric text-slate-200">{p.warranty_period_days} days</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Reorder level</div><div className="mt-0.5 font-numeric text-slate-200">{p.reorder_level}</div></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Compatible models</div>
            <div className="flex flex-wrap gap-1.5">{(p.compatible_models || []).map(m => <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/10 text-slate-300">{m}</span>)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Description</div>
            <p className="text-sm text-slate-300">{p.description || "-"}</p>
          </div>
        </div>
      </div>
      <div className="card-surface p-5 mt-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Stock by branch</h3>
        {(p.stock_by_branch || []).length === 0 ? <EmptyState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.stock_by_branch.map(s => (
              <div key={s.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100">{s.branch.name}</div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-2 text-2xl font-semibold font-numeric text-white">{s.quantity}</div>
                <div className="text-[10px] text-slate-500 flex gap-3 mt-0.5"><span>Reserved <span className="text-slate-300 font-numeric">{s.reserved}</span></span><span>Damaged <span className="text-slate-300 font-numeric">{s.damaged}</span></span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
