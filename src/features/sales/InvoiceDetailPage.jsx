import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";
import { Printer, Truck, Check, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function PayDialog({ invoiceId, onDone }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("Cash");
  const [ref, setRef] = React.useState("");
  const submit = async () => {
    if (!amount) return;
    await api.post(`/sales/invoices/${invoiceId}/add-payment/`, { amount: Number(amount), method, reference: ref });
    toast.success("Payment added");
    setOpen(false); onDone?.();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" data-testid="add-payment-btn"><CreditCard className="w-4 h-4 mr-1.5" /> Add payment</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 font-numeric" /></div>
          <div><Label>Method</Label>
            <Select value={method} onValueChange={setMethod}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{["Cash","Bank Transfer","Cheque","Card"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Reference</Label><Input value={ref} onChange={e => setRef(e.target.value)} className="mt-1.5" /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["invoice", id], queryFn: async () => unwrap(await api.get(`/sales/invoices/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const i = data || {};

  const confirm = async () => { await api.post(`/sales/invoices/${id}/confirm/`); toast.success("Invoice confirmed"); refetch(); };
  const cancel = async () => { if (!window.confirm("Cancel this invoice?")) return; await api.post(`/sales/invoices/${id}/cancel/`); toast.success("Invoice cancelled"); refetch(); };

  return (
    <div>
      <PageHeader
        title={i.invoice_number}
        subtitle={<span><DateText value={i.date} /> · Due <DateText value={i.due_date} /></span>}
        actions={<>
          <StatusBadge status={i.payment_status} />
          <StatusBadge status={i.delivery_status} />
          <Button variant="outline" onClick={() => toast.info("Print coming up")}><Printer className="w-4 h-4 mr-1.5" /> Print</Button>
          {i.status !== "confirmed" && <Button variant="outline" onClick={confirm}><Check className="w-4 h-4 mr-1.5" /> Confirm</Button>}
          {i.status !== "cancelled" && <Button variant="outline" onClick={cancel}><X className="w-4 h-4 mr-1.5" /> Cancel</Button>}
          <PayDialog invoiceId={id} onDone={refetch} />
          <Button variant="outline"><Truck className="w-4 h-4 mr-1.5" /> Ship</Button>
        </>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5">
          <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Customer</div><div className="text-slate-100 mt-0.5">{i.customer?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Branch</div><div className="text-slate-100 mt-0.5">{i.branch?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Salesperson</div><div className="text-slate-100 mt-0.5">{i.salesperson?.name}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Product</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
            <tbody>{(i.items || []).map((it, idx) => (
              <tr key={idx} className="border-b border-white/5">
                <td className="py-2 text-slate-200">{it.product?.name}<div className="text-[10px] text-slate-500 font-numeric">{it.product?.sku}</div></td>
                <td className="text-right font-numeric text-slate-200">{it.quantity}</td>
                <td className="text-right font-numeric text-slate-200">{formatAED(it.unit_price)}</td>
                <td className="text-right font-numeric text-white">{formatAED(it.line_total)}</td>
              </tr>
            ))}</tbody>
          </table>

          {(i.payments || []).length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-200 mb-2">Payment history</div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Payment #</th><th className="text-left">Date</th><th className="text-left">Method</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{(i.payments || []).map(p => (
                  <tr key={p.id} className="border-b border-white/5"><td className="py-2 font-numeric text-blue-400">{p.payment_number}</td><td><DateText value={p.date} /></td><td className="text-slate-200">{p.method}</td><td className="text-right font-numeric text-emerald-400">{formatAED(p.amount)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-surface p-5 space-y-2 h-fit">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="font-numeric text-slate-100">{formatAED(i.subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Discount</span><span className="font-numeric text-slate-100">- {formatAED(i.discount)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">VAT</span><span className="font-numeric text-slate-100">{formatAED(i.vat)}</span></div>
          <div className="h-px bg-white/10 my-2" />
          <div className="flex items-center justify-between"><span className="text-slate-300">Grand total</span><CurrencyText value={i.total} className="text-xl font-semibold text-white" /></div>
          <div className="flex items-center justify-between mt-3 text-sm"><span className="text-emerald-300">Paid</span><CurrencyText value={i.paid} className="text-emerald-400" /></div>
          <div className="flex items-center justify-between text-sm"><span className="text-red-300">Balance</span><CurrencyText value={i.balance} className="text-red-300" /></div>
        </div>
      </div>
    </div>
  );
}
