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
import { CurrencyText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";
import { toast } from "sonner";

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { data: customers } = useQuery({ queryKey: ["customers-sel"], queryFn: async () => unwrap(await api.get("/customers/", { params: { page_size: 100 } })) });
  const { data: products } = useQuery({ queryKey: ["products-full"], queryFn: async () => unwrap(await api.get("/products/", { params: { page_size: 100 } })) });
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });

  const [customerId, setCustomerId] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [discount, setDiscount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const addItem = () => setItems(v => [...v, { product_id: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i) => setItems(v => v.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(v => v.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const setProduct = (i, pid) => {
    const p = products?.results?.find(pp => pp.id === pid);
    if (p) updateItem(i, { product_id: pid, product_name: p.product_name, sku: p.sku, unit_price: p.retail_price });
  };

  const subtotal = items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0);
  const vat = Math.max(subtotal - discount, 0) * 0.05;
  const total = Math.max(subtotal - discount, 0) + vat;

  const submit = async () => {
    if (!customerId || items.length === 0) { toast.error("Select customer and add items"); return; }
    setSaving(true);
    try {
      const body = {
        customer_id: customerId,
        branch_id: branchId || undefined,
        items: items.map(it => ({ product: { id: it.product_id, name: it.product_name, sku: it.sku }, quantity: it.quantity, unit_price: it.unit_price, discount_pct: 0, vat_pct: 5, line_total: it.quantity * it.unit_price * 1.05 })),
        discount, notes,
      };
      const r = await api.post("/sales/invoices/", body);
      toast.success("Invoice created");
      navigate(`/sales/invoices/${r.data.data.id}`);
    } catch { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="New invoice" subtitle="Confirm sale and issue tax invoice" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Customer</div>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="invoice-customer-select"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="max-h-72">{(customers?.results || []).map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Branch</div>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Discount (AED)</div>
              <Input type="number" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} className="font-numeric" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-200">Line items</div>
              <Button size="sm" variant="outline" onClick={addItem} data-testid="invoice-add-item-btn"><Plus className="w-3.5 h-3.5 mr-1" /> Add item</Button>
            </div>
            <div className="rounded-lg border border-white/5 divide-y divide-white/5">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500">
                <div className="col-span-5">Product</div><div className="col-span-2 text-right">Qty</div><div className="col-span-2 text-right">Unit</div><div className="col-span-2 text-right">Total</div><div className="col-span-1" />
              </div>
              {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-slate-500">No line items — click "Add item".</div>}
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-5">
                    <Select value={it.product_id} onValueChange={(v) => setProduct(i, v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent className="max-h-72">{(products?.results || []).map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Input type="number" value={it.quantity} onChange={e => updateItem(i, { quantity: Number(e.target.value) || 0 })} className="text-right font-numeric h-9" /></div>
                  <div className="col-span-2"><Input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(i, { unit_price: Number(e.target.value) || 0 })} className="text-right font-numeric h-9" /></div>
                  <div className="col-span-2 text-right font-numeric text-slate-100">{formatAED(it.quantity * it.unit_price * 1.05)}</div>
                  <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notes</div>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="card-surface p-5 space-y-3 h-fit sticky top-20">
          <div className="text-sm font-semibold text-slate-200">Summary</div>
          <Row label="Subtotal" value={formatAED(subtotal)} />
          <Row label="Discount" value={`- ${formatAED(discount)}`} />
          <Row label="VAT (5%)" value={formatAED(vat)} />
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between"><span className="text-slate-300">Grand total</span><CurrencyText value={total} className="text-xl font-semibold text-white" /></div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={saving} data-testid="invoice-save-btn">Create invoice</Button>
        </div>
      </div>
    </div>
  );
}
const Row = ({ label, value }) => (<div className="flex items-center justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-numeric text-slate-100">{value}</span></div>);
