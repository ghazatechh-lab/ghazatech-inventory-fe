import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";
import { Search, Plus, Minus, Trash2, CreditCard, UserPlus, Pause, ScanBarcode } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function POSPage() {
  const { data: products } = useQuery({ queryKey: ["pos-products"], queryFn: async () => unwrap(await api.get("/products/", { params: { page_size: 200 } })) });
  const { data: customers } = useQuery({ queryKey: ["pos-customers"], queryFn: async () => unwrap(await api.get("/customers/", { params: { page_size: 100 } })) });

  const walkIn = React.useMemo(() => customers?.results?.find(c => c.is_walkin), [customers]);
  const [customerId, setCustomerId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [brand, setBrand] = React.useState("all");
  const [cat, setCat] = React.useState("all");
  const [cart, setCart] = React.useState([]);
  const [received, setReceived] = React.useState(0);
  const [method, setMethod] = React.useState("Cash");
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => { if (walkIn && !customerId) setCustomerId(walkIn.id); }, [walkIn, customerId]);

  const filtered = React.useMemo(() => {
    const list = products?.results || [];
    return list.filter(p =>
      (brand === "all" || p.brand === brand) &&
      (cat === "all" || p.category === cat) &&
      (!search || p.product_name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || "").includes(search))
    ).slice(0, 24);
  }, [products, brand, cat, search]);

  const add = (p) => setCart(prev => {
    const i = prev.findIndex(x => x.id === p.id);
    if (i >= 0) return prev.map((x, idx) => idx === i ? { ...x, quantity: x.quantity + 1 } : x);
    return [...prev, { id: p.id, name: p.product_name, sku: p.sku, unit_price: p.retail_price, quantity: 1 }];
  });
  const change = (id, delta) => setCart(prev => prev.map(x => x.id === id ? { ...x, quantity: Math.max(1, x.quantity + delta) } : x));
  const remove = (id) => setCart(prev => prev.filter(x => x.id !== id));

  const subtotal = cart.reduce((s, x) => s + x.quantity * x.unit_price, 0);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;
  const balance = Math.max((received || 0) - total, 0);

  const complete = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setProcessing(true);
    try {
      await api.post("/sales/direct-sale/", {
        customer_id: customerId,
        items: cart.map(x => ({ product: { id: x.id, name: x.name, sku: x.sku }, quantity: x.quantity, unit_price: x.unit_price, discount_pct: 0, vat_pct: 5, line_total: x.quantity * x.unit_price * 1.05 })),
        discount: 0,
        payment_method: method,
        amount_received: received || total,
      });
      toast.success(`Sale completed · ${formatAED(total)}`);
      setCart([]); setReceived(0);
    } catch {} finally { setProcessing(false); }
  };

  return (
    <div>
      <PageHeader title="Direct Sale / POS" subtitle="Fast point-of-sale checkout" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-3">
          <div className="card-surface p-4 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search / scan barcode…" className="pl-9 h-10 bg-white/[0.02] border-white/10" value={search} onChange={e => setSearch(e.target.value)} data-testid="pos-search-input" autoFocus />
            </div>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-36 h-10 bg-white/[0.02] border-white/10"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All brands</SelectItem>{["Dell","HP","Lenovo","Apple","Asus","Acer","MSI","Samsung","Toshiba","Sony"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-40 h-10 bg-white/[0.02] border-white/10"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{["Battery","Keyboard","Screen/LCD","Adapter/Charger","RAM","SSD/HDD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="h-10"><ScanBarcode className="w-4 h-4 mr-1.5" /> Scan</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(p => (
              <button key={p.id} onClick={() => add(p)} data-testid={`pos-product-${p.id}`} className="card-surface p-3 text-left hover:border-blue-500/40 hover:shadow-blue-900/40 transition group">
                <img src={p.product_image} alt="" className="w-full h-24 object-cover rounded-md" />
                <div className="mt-2 text-xs text-slate-100 line-clamp-2 leading-snug">{p.product_name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-numeric">{p.sku}</div>
                  <div className="text-xs font-numeric text-blue-400">{formatAED(p.retail_price)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 card-surface p-4 flex flex-col max-h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-3">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full h-10 bg-white/[0.02] border-white/10" data-testid="pos-customer-select"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{(customers?.results || []).map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="icon" variant="ghost"><UserPlus className="w-4 h-4" /></Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 && <div className="text-xs text-slate-500 text-center py-10">Cart is empty. Tap a product to add.</div>}
            {cart.map(x => (
              <div key={x.id} className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-100 truncate">{x.name}</div>
                    <div className="text-[10px] text-slate-500 font-numeric">{formatAED(x.unit_price)} × {x.quantity}</div>
                  </div>
                  <div className="text-xs font-numeric text-white">{formatAED(x.unit_price * x.quantity)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => change(x.id, -1)}><Minus className="w-3 h-3" /></Button>
                    <span className="font-numeric text-xs w-6 text-center">{x.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => change(x.id, 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(x.id)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-3 mt-3 space-y-1.5">
            <Row label="Subtotal" value={formatAED(subtotal)} />
            <Row label="VAT" value={formatAED(vat)} />
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-slate-300">Total</div>
              <CurrencyText value={total} className="text-xl font-semibold text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="Received" value={received || ""} onChange={e => setReceived(Number(e.target.value) || 0)} className="h-9 text-right font-numeric" />
            </div>
            {balance > 0 && <div className="text-xs text-emerald-400 text-right">Change: <span className="font-numeric">{formatAED(balance)}</span></div>}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline"><Pause className="w-3.5 h-3.5 mr-1.5" /> Hold</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={complete} disabled={processing} data-testid="pos-complete-btn"><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Complete sale</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const Row = ({ label, value }) => (<div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><span className="font-numeric text-slate-100">{value}</span></div>);
