import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, PackageCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function UpdateStatus({ id, onDone }) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("dispatched");
  const [note, setNote] = React.useState("");
  const submit = async () => { await api.post(`/shipments/${id}/update-status/`, { status, note }); toast.success("Status updated"); setOpen(false); onDone?.(); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><PackageCheck className="w-4 h-4 mr-1.5" /> Update status</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>Update shipment status</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["picked","dispatched","in_transit","out_for_delivery","delivered"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Note</Label><Textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1.5" rows={2} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Update</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["shipment", id], queryFn: async () => unwrap(await api.get(`/shipments/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const s = data || {};
  return (
    <div>
      <PageHeader title={s.shipment_number} subtitle={`Invoice ${s.invoice?.number} · ${s.customer?.name}`}
        actions={<><StatusBadge status={s.status} /><UpdateStatus id={id} onDone={refetch} /></>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5">
          <div className="text-sm font-semibold text-slate-200 mb-4">Tracking timeline</div>
          <div className="space-y-3">
            {(s.tracking || []).map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center"><Truck className="w-4 h-4 text-blue-400" /></div>
                  {i < (s.tracking.length - 1) && <div className="w-px flex-1 bg-white/10 mt-1" />}
                </div>
                <div className="pb-3 flex-1">
                  <div className="flex items-center gap-2"><StatusBadge status={t.status} /><span className="text-[10px] text-slate-500"><DateText value={t.date} /></span></div>
                  <div className="text-sm text-slate-200 mt-1">{t.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface p-5 space-y-3 text-sm">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Delivery address</div><div className="flex items-start gap-2 text-slate-200"><MapPin className="w-4 h-4 text-slate-500 mt-0.5" /> {s.delivery_address}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Delivery person</div><div className="text-slate-200">{s.delivery_person}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Expected</div><div className="text-slate-200"><DateText value={s.expected_date} /></div></div>
        </div>
      </div>
    </div>
  );
}
