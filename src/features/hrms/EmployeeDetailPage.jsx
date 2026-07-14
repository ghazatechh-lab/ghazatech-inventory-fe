import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, MapPin, Building2, ShieldCheck } from "lucide-react";
import { daysBetween, severityForExpiry } from "@/lib/utils";

const DOC_LABELS = { passport: "Passport", visa: "Visa", emirates_id: "Emirates ID", labour_card: "Labour Card", insurance: "Insurance", driving_license: "Driving License" };

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["employee", id], queryFn: async () => unwrap(await api.get(`/hrms/employees/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const e = data || {};
  return (
    <div>
      <PageHeader title={e.full_name} subtitle={`${e.employee_code} · ${e.designation} · ${e.department}`}
        actions={<Button asChild variant="outline"><Link to={`/hrms/employees/${id}/edit`}>Edit</Link></Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card-surface p-5 flex items-center gap-4">
          <img src={e.profile_image} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/30" />
          <div>
            <div className="text-slate-100 font-medium">{e.full_name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {e.branch?.name}</div>
            <StatusBadge className="mt-1.5" status={e.employment_status === "Active" ? "active" : "closed"} />
          </div>
        </div>
        <div className="card-surface p-5 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-300"><Phone className="w-4 h-4 text-slate-500" /> <span className="font-numeric">{e.personal_mobile}</span></div>
          <div className="flex items-center gap-2 text-slate-300"><Mail className="w-4 h-4 text-slate-500" /> {e.work_email}</div>
          <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4 text-slate-500" /> {e.address}</div>
        </div>
        <div className="card-surface p-5"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Basic salary</div><CurrencyText value={e.basic_salary} className="text-2xl font-semibold text-white" /></div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-docs">Documents</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-3">
          <div className="card-surface p-5 grid grid-cols-2 gap-4 text-sm">
            {[["Nationality", e.nationality],["Gender", e.gender === "M" ? "Male" : "Female"],["DOB", <DateText value={e.date_of_birth} />],["Joining date", <DateText value={e.joining_date} />],["Employment type", e.employment_type],["Reporting manager", e.reporting_manager],["Emergency contact", e.emergency_contact],["Personal email", e.personal_email]].map(([k, v], i) => (
              <div key={i}><div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div><div className="text-slate-200 mt-0.5">{v || "-"}</div></div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="documents" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(e.documents || {}).map(([k, v]) => {
              const days = v.expiry_date ? daysBetween(v.expiry_date) : null;
              const sev = days !== null ? severityForExpiry(days) : "ok";
              return (
                <div key={k} className="card-surface p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-400" /> {DOC_LABELS[k]}</div>
                    <StatusBadge status={sev} label={days < 0 ? "Expired" : sev === "ok" ? "Valid" : `${days}d`} />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Number</div>
                  <div className="text-slate-200 font-numeric">{v.number || "-"}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">Expires</div>
                  <div className="text-slate-200"><DateText value={v.expiry_date} /></div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="salary" className="mt-3">
          <div className="card-surface p-5 grid grid-cols-2 gap-4 text-sm">
            {[["Basic", e.basic_salary],["Housing allowance", e.housing_allowance],["Transport allowance", e.transport_allowance],["Other allowance", e.other_allowance]].map(([k, v], i) => (
              <div key={i}><div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div><CurrencyText value={v} className="text-slate-100" /></div>
            ))}
            <div className="col-span-2 h-px bg-white/10" />
            {[["Bank", e.bank_name],["Account #", e.bank_account_number],["IBAN", e.iban],["WPS #", e.wps_number]].map(([k, v], i) => (
              <div key={i}><div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div><div className="text-slate-200 mt-0.5 font-numeric text-xs">{v || "-"}</div></div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
