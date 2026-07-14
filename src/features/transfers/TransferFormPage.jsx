import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function TransferFormPage() {
  const navigate = useNavigate();
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });
  const { data: products } = useQuery({ queryKey: ["products-sel"], queryFn: async () => unwrap(await api.get("/products/", { params: { page_size: 100 } })) });
  const [from, setFrom] = React.useState(""); const [to, setTo] = React.useState("");
  const [items, setItems] = React.useState([]); const [notes, setNotes] = React.useState("");

  const submit = async () => {
    if (!from || !to || items.length === 0) return toast.error("Fill all fields");
    try {
      await api.post("/transfers/", { from_branch_id: from, to_branch_id: to, items, notes });
      toast.success("Transfer request created"); navigate("/transfers");
    } catch {}
  };
  return (
    <div>
      <PageHeader title="New stock transfer" />
      <div className="card-surface p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">From branch</div><Select value={from} onValueChange={setFrom}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">To branch</div><Select value={to} onValueChange={setTo}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-200">Items</div><Button size="sm" variant="outline" onClick={() => setItems(v => [...v, { product: null, quantity: 1 }])}><Plus className="w-3.5 h-3.5 mr-1" /> Add item</Button></div>
        <div className="rounded-lg border border-white/5 divide-y divide-white/5">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
              <div className="col-span-8"><Select value={it.product?.id || ""} onValueChange={(v) => { const p = products?.results?.find(pp => pp.id === v); setItems(x => x.map((y, idx) => idx === i ? { ...y, product: { id: p.id, name: p.product_name, sku: p.sku } } : y)); }}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Product" /></SelectTrigger><SelectContent className="max-h-72">{(products?.results || []).map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-3"><Input type="number" value={it.quantity} onChange={e => setItems(x => x.map((y, idx) => idx === i ? { ...y, quantity: Number(e.target.value) } : y))} className="h-9 text-right font-numeric" /></div>
              <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setItems(x => x.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-red-400" /></Button></div>
            </div>
          ))}
          {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-slate-500">No items yet.</div>}
        </div>
        <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notes</div><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        <div className="flex gap-2"><Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Request transfer</Button><Button variant="ghost" onClick={() => navigate("/transfers")}>Cancel</Button></div>
      </div>
    </div>
  );
}
