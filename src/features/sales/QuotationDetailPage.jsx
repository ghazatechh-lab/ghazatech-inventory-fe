import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { formatAED } from "@/lib/utils";
import { toast } from "sonner";
import { Send, FileText, Printer } from "lucide-react";

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["quotation", id], queryFn: async () => unwrap(await api.get(`/sales/quotations/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const q = data || {};

  const send = async () => { await api.post(`/sales/quotations/${id}/send/`); toast.success("Quotation sent"); refetch(); };
  const convert = async () => {
    const r = await api.post(`/sales/quotations/${id}/convert-to-invoice/`);
    toast.success("Converted to invoice");
    navigate(`/sales/invoices/${r.data.data.id}`);
  };

  return (
    <div>
      <PageHeader
        title={q.quotation_number}
        subtitle={<span>Issued <DateText value={q.date} /> · Valid until <DateText value={q.valid_until} /></span>}
        actions={<>
          <StatusBadge status={q.status} className="mr-2" />
          <Button variant="outline" onClick={() => toast.info("Print coming up")}><Printer className="w-4 h-4 mr-1.5" /> Print</Button>
          <Button variant="outline" onClick={send} data-testid="quote-send-btn"><Send className="w-4 h-4 mr-1.5" /> Send</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={convert} data-testid="quote-convert-btn"><FileText className="w-4 h-4 mr-1.5" /> Convert to invoice</Button>
        </>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5">
          <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Customer</div><div className="text-slate-100 mt-0.5">{q.customer?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Branch</div><div className="text-slate-100 mt-0.5">{q.branch?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Salesperson</div><div className="text-slate-100 mt-0.5">{q.salesperson?.name}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Product</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {(q.items || []).map((it, i) => (
                <tr key={i} className="border-b border-white/5"><td className="py-2 text-slate-200">{it.product?.name}<div className="text-[10px] text-slate-500 font-numeric">{it.product?.sku}</div></td><td className="text-right font-numeric text-slate-200">{it.quantity}</td><td className="text-right font-numeric text-slate-200">{formatAED(it.unit_price)}</td><td className="text-right font-numeric text-white">{formatAED(it.line_total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-surface p-5 space-y-2 h-fit">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="font-numeric text-slate-100">{formatAED(q.subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Discount</span><span className="font-numeric text-slate-100">- {formatAED(q.discount)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">VAT</span><span className="font-numeric text-slate-100">{formatAED(q.vat)}</span></div>
          <div className="h-px bg-white/10 my-2" />
          <div className="flex items-center justify-between"><span className="text-slate-300">Grand total</span><CurrencyText value={q.total} className="text-xl font-semibold text-white" /></div>
        </div>
      </div>
    </div>
  );
}
