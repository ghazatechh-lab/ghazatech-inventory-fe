import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/common/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, CreditCard } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["customer", id], queryFn: async () => unwrap(await api.get(`/customers/${id}/`)) });
  const { data: history } = useQuery({ queryKey: ["cust-sales", id], queryFn: async () => unwrap(await api.get(`/customers/${id}/sales-history/`)) });
  const { data: ledger } = useQuery({ queryKey: ["cust-ledger", id], queryFn: async () => unwrap(await api.get(`/customers/${id}/ledger/`)) });
  const { data: outstanding } = useQuery({ queryKey: ["cust-out", id], queryFn: async () => unwrap(await api.get(`/customers/${id}/outstanding/`)) });

  if (isLoading) return <LoadingState />;
  const c = data || {};
  return (
    <div>
      <PageHeader title={c.customer_name} subtitle={`${c.customer_code} · ${c.customer_type}`}
        actions={<Button asChild variant="outline"><Link to={`/customers/${id}/edit`}>Edit</Link></Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className="card-surface p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Outstanding</div><CurrencyText value={outstanding?.total || 0} className="text-2xl font-semibold text-red-300" /></div>
        <div className="card-surface p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Credit limit</div><CurrencyText value={c.credit_limit} className="text-2xl font-semibold text-white" /></div>
        <div className="card-surface p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Payment terms</div><div className="text-2xl font-semibold font-numeric text-white">{c.payment_terms_days ?? 0}d</div></div>
        <div className="card-surface p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">TRN</div><div className="font-numeric text-slate-200 mt-1">{c.trn_number || "-"}</div></div>
      </div>
      <div className="card-surface p-5 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-300"><Phone className="w-4 h-4 text-slate-500" /> <span className="font-numeric">{c.phone || "-"}</span></div>
        <div className="flex items-center gap-2 text-slate-300"><Mail className="w-4 h-4 text-slate-500" /> {c.email || "-"}</div>
        <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4 text-slate-500" /> {c.city}, {c.emirate}</div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales" data-testid="tab-sales">Sales History</TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">Ledger</TabsTrigger>
          <TabsTrigger value="outstanding" data-testid="tab-outstanding">Outstanding</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-3">
          <DataTable
            columns={[
              { key: "invoice_number", header: "Invoice", cell: (r) => <Link to={`/sales/invoices/${r.id}`} className="font-numeric text-blue-400">{r.invoice_number}</Link> },
              { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
              { key: "total", header: "Total", align: "right", cell: (r) => <CurrencyText value={r.total} className="text-white" /> },
              { key: "paid", header: "Paid", align: "right", cell: (r) => <CurrencyText value={r.paid} className="text-emerald-400" /> },
              { key: "balance", header: "Balance", align: "right", cell: (r) => <CurrencyText value={r.balance} className={r.balance > 0 ? "text-red-300" : ""} /> },
              { key: "payment_status", header: "Status", cell: (r) => <StatusBadge status={r.payment_status} /> },
            ]}
            data={history || []} total={(history || []).length} page={1}
          />
        </TabsContent>
        <TabsContent value="ledger" className="mt-3">
          <DataTable
            columns={[
              { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
              { key: "reference", header: "Reference", cell: (r) => <span className="font-numeric text-blue-400">{r.reference}</span> },
              { key: "type", header: "Type", cell: (r) => <span className="capitalize">{r.type}</span> },
              { key: "debit", header: "Debit", align: "right", cell: (r) => <span className="font-numeric text-slate-200">{r.debit ? Number(r.debit).toFixed(2) : "-"}</span> },
              { key: "credit", header: "Credit", align: "right", cell: (r) => <span className="font-numeric text-slate-200">{r.credit ? Number(r.credit).toFixed(2) : "-"}</span> },
              { key: "balance", header: "Balance", align: "right", cell: (r) => <CurrencyText value={r.balance} className="text-white" /> },
            ]}
            data={ledger || []} total={(ledger || []).length} page={1}
          />
        </TabsContent>
        <TabsContent value="outstanding" className="mt-3">
          <DataTable
            columns={[
              { key: "invoice_number", header: "Invoice", cell: (r) => <span className="font-numeric text-blue-400">{r.invoice_number}</span> },
              { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
              { key: "due_date", header: "Due", cell: (r) => <DateText value={r.due_date} /> },
              { key: "balance", header: "Balance", align: "right", cell: (r) => <CurrencyText value={r.balance} className="text-red-300" /> },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.payment_status} /> },
            ]}
            data={outstanding?.invoices || []} total={(outstanding?.invoices || []).length} page={1}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
