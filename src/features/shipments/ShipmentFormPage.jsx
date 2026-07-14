import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ShipmentFormPage() {
  const navigate = useNavigate();
  const { data: invoices } = useQuery({ queryKey: ["invoices-open"], queryFn: async () => unwrap(await api.get("/sales/invoices/", { params: { page_size: 60 } })) });
  const [invoiceId, setInvoiceId] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [person, setPerson] = React.useState("");
  const [expected, setExpected] = React.useState("");

  const submit = async () => {
    if (!invoiceId || !address) return toast.error("Fill required fields");
    try { await api.post("/shipments/", { invoice_id: invoiceId, delivery_address: address, delivery_person: person, expected_date: expected }); toast.success("Shipment created"); navigate("/shipments"); } catch {}
  };
  return (
    <div>
      <PageHeader title="New shipment" subtitle="Prepare a delivery to a customer" />
      <div className="card-surface p-5 space-y-4 max-w-2xl">
        <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Invoice</div>
          <Select value={invoiceId} onValueChange={setInvoiceId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="max-h-72">{(invoices?.results || []).map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number} · {i.customer.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Delivery address</div><Textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Delivery person</div><Input value={person} onChange={e => setPerson(e.target.value)} /></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Expected date</div><Input type="date" value={expected} onChange={e => setExpected(e.target.value)} /></div>
        </div>
        <div className="flex gap-2"><Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Create shipment</Button><Button variant="ghost" onClick={() => navigate("/shipments")}>Cancel</Button></div>
      </div>
    </div>
  );
}
