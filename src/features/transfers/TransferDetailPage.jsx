import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { CheckCircle2, Truck, PackageCheck, X, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["draft", "requested", "approved", "dispatched", "in_transit", "received"];
const STEP_LABELS = { draft: "Draft", requested: "Requested", approved: "Approved", dispatched: "Dispatched", in_transit: "In transit", received: "Received" };

function Timeline({ status }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border whitespace-nowrap",
            i < idx ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : i === idx ? "border-blue-500/40 bg-blue-500/15 text-blue-200 glow-primary"
            : "border-white/10 bg-white/[0.02] text-slate-500")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", i < idx ? "bg-emerald-400" : i === idx ? "bg-blue-400" : "bg-slate-500")} />
            {STEP_LABELS[s]}
          </div>
          {i < STEPS.length - 1 && <div className={cn("w-6 h-px", i < idx ? "bg-emerald-500/30" : "bg-white/10")} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function TransferDetailPage() {
  const { id } = useParams();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["transfer", id], queryFn: async () => unwrap(await api.get(`/transfers/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const t = data || {};
  const act = async (path, msg) => { await api.post(`/transfers/${id}/${path}/`); toast.success(msg); refetch(); };
  return (
    <div>
      <PageHeader title={t.transfer_number} subtitle={`${t.from_branch?.name} → ${t.to_branch?.name}`}
        actions={<>
          <StatusBadge status={t.status} />
          {t.status === "requested" && <Button variant="outline" onClick={() => act("approve", "Approved")}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve</Button>}
          {t.status === "approved" && <Button variant="outline" onClick={() => act("dispatch", "Dispatched")}><Send className="w-4 h-4 mr-1.5" /> Dispatch</Button>}
          {["dispatched", "in_transit"].includes(t.status) && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => act("receive", "Received")}><PackageCheck className="w-4 h-4 mr-1.5" /> Receive</Button>}
          {!["received", "cancelled"].includes(t.status) && <Button variant="outline" onClick={() => act("cancel", "Cancelled")}><X className="w-4 h-4 mr-1.5" /> Cancel</Button>}
        </>}
      />
      <div className="card-surface p-5"><Timeline status={t.status} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 card-surface p-5">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="text-left py-2">Product</th><th className="text-right">Quantity</th><th className="text-right">Damaged</th></tr></thead>
            <tbody>{(t.items || []).map((it, i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-slate-200">{it.product.name}</td><td className="text-right font-numeric text-white">{it.quantity}</td><td className="text-right font-numeric text-red-400">{it.damaged || 0}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="card-surface p-5 space-y-3 text-sm">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Requested by</div><div className="text-slate-100 mt-0.5">{t.requested_by?.name}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Approved by</div><div className="text-slate-100 mt-0.5">{t.approved_by?.name || "-"}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Dispatch date</div><div className="text-slate-100 mt-0.5">{t.dispatch_date ? <DateText value={t.dispatch_date} /> : "-"}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Received on</div><div className="text-slate-100 mt-0.5">{t.receive_date ? <DateText value={t.receive_date} /> : "-"}</div></div>
        </div>
      </div>
    </div>
  );
}
