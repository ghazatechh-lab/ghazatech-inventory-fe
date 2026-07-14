import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { AlertTriangle, ShieldAlert, Clock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";

const LABELS = { passport: "Passport", visa: "Visa", emirates_id: "Emirates ID", labour_card: "Labour Card", insurance: "Insurance", driving_license: "Driving License" };

export default function DocumentExpiryPage() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("sev") || "";
  const setF = (v) => { const next = new URLSearchParams(params); if (v && v !== "all") next.set("sev", v); else next.delete("sev"); setParams(next); };
  const { data, isLoading } = useQuery({ queryKey: ["doc-expiry"], queryFn: async () => unwrap(await api.get("/hrms/document-expiry/")) });
  const rows = (data || []).filter(r => !filter || r.severity === filter);
  const groups = { expired: 0, critical: 0, warning: 0, info: 0 };
  (data || []).forEach(r => groups[r.severity] !== undefined && (groups[r.severity]++));
  return (
    <div>
      <PageHeader title="Document Expiry" subtitle="UAE employee document tracker" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Expired" value={groups.expired} icon={ShieldAlert} tint="red" onClick={() => setF("expired")} />
        <Kpi label="Expiring in 7 days" value={groups.critical} icon={AlertTriangle} tint="red" onClick={() => setF("critical")} />
        <Kpi label="Expiring in 30 days" value={groups.warning} icon={Clock} tint="amber" onClick={() => setF("warning")} />
        <Kpi label="Expiring in 60 days" value={groups.info} icon={ShieldCheck} tint="blue" onClick={() => setF("info")} />
      </div>
      <div className="flex gap-3 mb-4">
        <Select value={filter || "all"} onValueChange={(v) => setF(v === "all" ? "" : v)}>
          <SelectTrigger className="w-52 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem>{["expired","critical","warning","info"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "employee", header: "Employee", cell: (r) => <Link to={`/hrms/employees/${r.employee.id}`} className="text-slate-100 hover:text-blue-400">{r.employee.name}</Link> },
          { key: "branch", header: "Branch", cell: (r) => r.branch.name },
          { key: "document_type", header: "Document", cell: (r) => LABELS[r.document_type] },
          { key: "document_number", header: "Number", cell: (r) => <span className="font-numeric text-xs text-slate-400">{r.document_number}</span> },
          { key: "expiry_date", header: "Expiry", cell: (r) => <DateText value={r.expiry_date} /> },
          { key: "days_left", header: "Days", align: "right", cell: (r) => <span className="font-numeric">{r.days_left < 0 ? "Expired" : `${r.days_left}d`}</span> },
          { key: "severity", header: "Status", cell: (r) => <StatusBadge status={r.severity} label={r.severity === "ok" ? "Valid" : r.severity} /> },
        ]}
        data={rows} isLoading={isLoading} page={1} total={rows.length}
      />
    </div>
  );
}
function Kpi({ label, value, icon: Icon, tint, onClick }) {
  const map = { red: "text-red-400", amber: "text-amber-400", blue: "text-blue-400", emerald: "text-emerald-400" };
  return (
    <button onClick={onClick} className="card-surface p-5 text-left hover:border-blue-500/30 transition">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500`}><Icon className={`w-3.5 h-3.5 ${map[tint]}`} /> {label}</div>
      <div className={`mt-1 text-2xl font-semibold font-numeric ${map[tint]}`}>{value}</div>
    </button>
  );
}
