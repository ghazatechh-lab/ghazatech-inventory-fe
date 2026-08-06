import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Eye, History, Search, WalletCards } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MetricCard,
  Modal,
  ServiceHero,
  StatusBadge,
  dateTime,
  money,
  rowsFrom,
} from "./serviceShared";

export default function ServiceHistoryPage() {
  const { branchParams } = useActiveBranchFilter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [selected, setSelected] = React.useState(null);

  const params = React.useMemo(
    () => ({
      ...branchParams,
      section: "history",
      page_size: 500,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    }),
    [branchParams, search, status],
  );

  const historyQuery = useQuery({
    queryKey: ["service-history", params],
    queryFn: async () => unwrap(await api.get("/service-repairs/jobs/", { params })),
  });

  const summaryQuery = useQuery({
    queryKey: ["service-summary", branchParams],
    queryFn: async () => unwrap(await api.get("/service-repairs/jobs/summary/", { params: branchParams })),
  });

  const jobs = rowsFrom(historyQuery.data);
  const summary = summaryQuery.data || {};

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <ServiceHero
        title="Service History"
        description="Review completed, delivered, and cancelled service jobs with their diagnosis, technician work, parts, charges, payments, and completion timeline."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Completed Records" value={summary.completed || 0} helper="Completed and delivered jobs" icon={CheckCircle2} tone="emerald" />
        <MetricCard label="Collected Revenue" value={money(summary.revenue)} helper="Payments recorded on completed jobs" icon={WalletCards} tone="blue" />
        <MetricCard label="History Results" value={jobs.length} helper="Matching current filters" icon={History} tone="violet" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-black">Completed Service Records</h2><p className="mt-1 text-sm text-slate-500">Read-only repair history and delivery audit trail.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><label className="relative min-w-[280px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search completed services..." /></label><select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All history statuses</option><option value="COMPLETED">Completed</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500 dark:bg-white/[0.03]"><tr><th className="px-5 py-3">Job</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Device</th><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/10">{historyQuery.isLoading ? <tr><td colSpan="8" className="px-5 py-12 text-center text-slate-500">Loading service history...</td></tr> : jobs.length === 0 ? <tr><td colSpan="8" className="px-5 py-14 text-center"><History className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 font-bold">No completed services</p><p className="mt-1 text-sm text-slate-500">Completed jobs will appear here automatically.</p></td></tr> : jobs.map((job) => <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"><td className="px-5 py-4"><p className="font-black">{job.job_number}</p><p className="mt-1 text-xs text-slate-500">{job.branch_name || "—"}</p></td><td className="px-4 py-4"><p className="font-bold">{job.customer_display || job.customer_name}</p><p className="mt-1 text-xs text-slate-500">{job.phone}</p></td><td className="px-4 py-4"><p className="font-bold">{job.device_name}</p><p className="mt-1 text-xs text-slate-500">{job.serial_number || "No serial"}</p></td><td className="px-4 py-4">{job.technician_name}</td><td className="px-4 py-4">{dateTime(job.completed_at || job.updated_at)}</td><td className="px-4 py-4"><StatusBadge status={job.status} label={job.status_display} /></td><td className="px-4 py-4 font-bold">{money(job.grand_total)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(job)}><Eye className="mr-1.5 h-4 w-4" />View</Button></td></tr>)}</tbody></table></div>
      </section>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.job_number || "Service History"} subtitle={`${selected?.customer_display || selected?.customer_name || ""} · ${selected?.device_name || ""}`} maxWidth="max-w-4xl">
        {selected ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[["Status", <StatusBadge status={selected.status} label={selected.status_display} />], ["Technician", selected.technician_name], ["Completed", dateTime(selected.completed_at)], ["Complaint", selected.complaint], ["Diagnosis", selected.diagnosis || "—"], ["Payment", `${selected.payment_status_display} · ${money(selected.amount_paid)}`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><div className="mt-2 font-semibold">{value}</div></div>)}</div><div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10"><h3 className="font-black">Technician Notes</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{selected.technician_notes || "No technician notes recorded."}</p></div><div><h3 className="font-black">Parts & Charges</h3><div className="mt-3 space-y-2">{selected.charges?.length ? selected.charges.map((charge) => <div key={charge.id} className="flex justify-between rounded-xl border border-slate-200 p-3 dark:border-white/10"><span>{charge.description} × {charge.quantity}</span><strong>{money(charge.line_total)}</strong></div>) : <p className="text-sm text-slate-500">No parts or charges recorded.</p>}</div><div className="ml-auto mt-4 max-w-xs space-y-2 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/[0.04]"><div className="flex justify-between"><span>Parts</span><strong>{money(selected.parts_total)}</strong></div><div className="flex justify-between"><span>Labour</span><strong>{money(selected.labour_charge)}</strong></div><div className="flex justify-between border-t pt-2 text-base"><span>Total</span><strong>{money(selected.grand_total)}</strong></div></div></div></div> : null}
      </Modal>
    </div>
  );
}
