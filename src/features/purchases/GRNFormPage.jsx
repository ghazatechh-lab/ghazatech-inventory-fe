import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/common/States";
import { toast } from "sonner";

export default function GRNFormPage() {
  const navigate = useNavigate();
  const { data: pos } = useQuery({ queryKey: ["pos-open"], queryFn: async () => unwrap(await api.get("/purchases/orders/", { params: { page_size: 60 } })) });
  const [poId, setPoId] = React.useState("");
  const selectedPo = React.useMemo(() => pos?.results?.find(p => p.id === poId), [pos, poId]);
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    if (selectedPo) setItems(selectedPo.items.map(it => ({ product: it.product, ordered: it.quantity, received: it.quantity, damaged: 0, rack_location: "" })));
  }, [selectedPo]);

  const submit = async () => {
    if (!selectedPo) return toast.error("Select a PO");
    try {
      await api.post("/purchases/grn/", { purchase_order: { id: selectedPo.id, number: selectedPo.po_number }, supplier: selectedPo.supplier, branch: selectedPo.branch, items });
      toast.success("GRN created");
      navigate("/purchases/grn");
    } catch {}
  };
  return (
    <div>
      <PageHeader title="New Goods Received Note" subtitle="Receive stock against a purchase order" />
      <div className="card-surface p-5 space-y-5">
        <div className="max-w-sm">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Purchase order</div>
          <Select value={poId} onValueChange={setPoId}><SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger><SelectContent className="max-h-72">{(pos?.results || []).map(p => <SelectItem key={p.id} value={p.id}>{p.po_number} · {p.supplier.name}</SelectItem>)}</SelectContent></Select>
        </div>
        {!selectedPo ? <LoadingState label="Waiting for PO selection…" rows={3} /> : (
          <div className="rounded-lg border border-white/5 divide-y divide-white/5">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500"><div className="col-span-4">Product</div><div className="col-span-2 text-right">Ordered</div><div className="col-span-2 text-right">Received</div><div className="col-span-2 text-right">Damaged</div><div className="col-span-2">Rack</div></div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-sm">
                <div className="col-span-4 text-slate-200">{it.product.name}</div>
                <div className="col-span-2 text-right font-numeric">{it.ordered}</div>
                <div className="col-span-2"><Input type="number" value={it.received} onChange={e => setItems(v => v.map((x, idx) => idx === i ? { ...x, received: Number(e.target.value) } : x))} className="h-8 text-right font-numeric" /></div>
                <div className="col-span-2"><Input type="number" value={it.damaged} onChange={e => setItems(v => v.map((x, idx) => idx === i ? { ...x, damaged: Number(e.target.value) } : x))} className="h-8 text-right font-numeric" /></div>
                <div className="col-span-2"><Input value={it.rack_location} onChange={e => setItems(v => v.map((x, idx) => idx === i ? { ...x, rack_location: e.target.value } : x))} placeholder="R1-S1" className="h-8" /></div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2"><Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Confirm receipt</Button><Button variant="ghost" onClick={() => navigate("/purchases/grn")}>Cancel</Button></div>
      </div>
    </div>
  );
}
