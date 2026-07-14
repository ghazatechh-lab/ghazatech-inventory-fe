import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { CurrencyText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";
import { toast } from "sonner";

export default function POFormPage() {
  const navigate = useNavigate();
  const { data: suppliers } = useQuery({ queryKey: ["suppliers-sel"], queryFn: async () => unwrap(await api.get("/suppliers/", { params: { page_size: 100 } })) });
  const { data: products } = useQuery({ queryKey: ["products-full"], queryFn: async () => unwrap(await api.get("/products/", { params: { page_size: 100 } })) });
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });

  const [supplierId, setSupplierId] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [saving, setSaving] = React.useState(false);

  const setProduct = (i, pid) => {
    const p = products?.results?.find(pp => pp.id === pid);
    if (p) update(i, { product_id: pid, product_name: p.product_name, sku: p.sku, unit_price: p.purchase_price });
  };
  const update = (i, patch) => setItems(v => v.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const subtotal = items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;

  const submit = async () => {
    if (!supplierId || items.length === 0) return toast.error("Select supplier & add items");
    setSaving(true);
    try {
      const body = { supplier_id: supplierId, branch_id: branchId || undefined, items: items.map(it => ({ product: { id: it.product_id, name: it.product_name, sku: it.sku }, quantity: it.quantity, unit_price: it.unit_price, line_total: it.quantity * it.unit_price })) };
      const r = await api.post("/purchases/orders/", body);
      toast.success("Purchase order created");
      navigate(`/purchases/orders/${r.data.data.id}`);
    } catch { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="New purchase order" subtitle="Order stock from a supplier" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Supplier</div>
              <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent className="max-h-72">{(suppliers?.results || []).map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Branch</div>
              <Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-200">Line items</div>
              <Button size="sm" variant="outline" onClick={() => setItems(v => [...v, { product_id: "", quantity: 1, unit_price: 0 }])}><Plus className="w-3.5 h-3.5 mr-1" /> Add item</Button>
            </div>
            <div className="rounded-lg border border-white/5 divide-y divide-white/5">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500"><div className="col-span-5">Product</div><div className="col-span-2 text-right">Qty</div><div className="col-span-2 text-right">Unit cost</div><div className="col-span-2 text-right">Total</div><div className="col-span-1"/></div>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-5"><Select value={it.product_id} onValueChange={(v) => setProduct(i, v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="max-h-72">{(products?.results || []).map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Input type="number" value={it.quantity} onChange={e => update(i, { quantity: Number(e.target.value) || 0 })} className="h-9 text-right font-numeric" /></div>
                  <div className="col-span-2"><Input type="number" step="0.01" value={it.unit_price} onChange={e => update(i, { unit_price: Number(e.target.value) || 0 })} className="h-9 text-right font-numeric" /></div>
                  <div className="col-span-2 text-right font-numeric text-slate-100">{formatAED(it.quantity * it.unit_price)}</div>
                  <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setItems(v => v.filter((_, x) => x !== i))}><Trash2 className="w-4 h-4 text-red-400" /></Button></div>
                </div>
              ))}
              {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-slate-500">No items.</div>}
            </div>
          </div>
        </div>
        <div className="card-surface p-5 space-y-2 h-fit">
          <Row label="Subtotal" value={formatAED(subtotal)} />
          <Row label="VAT" value={formatAED(vat)} />
          <div className="h-px bg-white/10 my-2" />
          <div className="flex items-center justify-between"><span className="text-slate-300">Total</span><CurrencyText value={total} className="text-xl font-semibold text-white" /></div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={saving}>Create PO</Button>
        </div>
      </div>
    </div>
  );
}
const Row = ({ label, value }) => (<div className="flex items-center justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-numeric text-slate-100">{value}</span></div>);
