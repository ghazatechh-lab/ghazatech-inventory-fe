import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACTIVE_STATUSES,
  MetricCard,
  Modal,
  ServiceHero,
  ServiceJobForm,
  StatusBadge,
  SubmitButton,
  emptyJob,
  money,
  rowsFrom,
} from "./serviceShared";

const toForm = (job, branchId) => ({
  ...emptyJob(branchId),
  ...job,
  branch: String(job?.branch?.id || job?.branch || branchId || ""),
  technician: String(job?.technician?.id || job?.technician || ""),
  customer: job?.customer?.id || job?.customer || null,
  expected_completion_date: job?.expected_completion_date || "",
  charges: (job?.charges || []).map((item) => ({ ...item })),
});

const payloadFrom = (form) => ({
  ...form,
  branch: Number(form.branch),
  customer: form.customer ? Number(form.customer) : null,
  technician: form.technician ? Number(form.technician) : null,
  labour_charge: Number(form.labour_charge || 0),
  discount_amount: Number(form.discount_amount || 0),
  tax_amount: Number(form.tax_amount || 0),
  amount_paid: Number(form.amount_paid || 0),
  charges: (form.charges || [])
    .filter((item) => item.description?.trim())
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
    })),
});

export default function ServiceManagementPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [modalMode, setModalMode] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [form, setForm] = React.useState(() => emptyJob(branchId));

  const params = React.useMemo(
    () => ({
      ...branchParams,
      section: "active",
      page_size: 500,
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [branchParams, search, statusFilter],
  );

  const jobsQuery = useQuery({
    queryKey: ["service-jobs", params],
    queryFn: async () => unwrap(await api.get("/service-repairs/jobs/", { params })),
  });

  const summaryQuery = useQuery({
    queryKey: ["service-summary", branchParams],
    queryFn: async () => unwrap(await api.get("/service-repairs/jobs/summary/", { params: branchParams })),
  });

  const employeesQuery = useQuery({
    queryKey: ["service-technicians", branchParams],
    queryFn: async () => unwrap(await api.get("/hrms/employees/", { params: { ...branchParams, page_size: 500, status: "ACTIVE" } })),
  });

  const branchesQuery = useQuery({
    queryKey: ["service-branches"],
    queryFn: async () => unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
    enabled: isAllBranches,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["service-jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["service-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["service-history"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = payloadFrom(form);
      if (!payload.branch) throw new Error("Select a branch.");
      if (modalMode === "edit") {
        return unwrap(await api.patch(`/service-repairs/jobs/${selected.id}/`, payload));
      }
      return unwrap(await api.post("/service-repairs/jobs/", payload));
    },
    onSuccess: async () => {
      toast.success(modalMode === "edit" ? "Service job updated" : "Service job created");
      setModalMode(null);
      setSelected(null);
      await invalidate();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || "Unable to save service job"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (job) => api.delete(`/service-repairs/jobs/${job.id}/`),
    onSuccess: async () => {
      toast.success("Service job deleted");
      await invalidate();
    },
    onError: () => toast.error("Unable to delete this service job"),
  });

  const completeMutation = useMutation({
    mutationFn: async (job) =>
      unwrap(
        await api.post(`/service-repairs/jobs/${job.id}/complete/`, {
          status: "COMPLETED",
          amount_paid: job.amount_paid,
          payment_status: job.payment_status,
        }),
      ),
    onSuccess: async () => {
      toast.success("Service completed and moved to history");
      await invalidate();
    },
    onError: () => toast.error("Unable to complete service job"),
  });

  const openCreate = () => {
    setSelected(null);
    setForm(emptyJob(branchId));
    setModalMode("create");
  };

  const openEdit = (job) => {
    setSelected(job);
    setForm(toForm(job, branchId));
    setModalMode("edit");
  };

  const jobs = rowsFrom(jobsQuery.data);
  const employees = rowsFrom(employeesQuery.data);
  const branches = isAllBranches ? rowsFrom(branchesQuery.data) : [];
  const summary = summaryQuery.data || {};

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <ServiceHero
        title="Service List & Management"
        description="Create service jobs, assign technicians, record diagnosis, manage parts and charges, update progress, and complete repairs from one operational workspace."
        actions={
          <Button onClick={openCreate} className="bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />New Service Job
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Jobs" value={summary.open_jobs || 0} helper="Active service and repair jobs" icon={Wrench} tone="blue" />
        <MetricCard label="Awaiting Approval" value={summary.awaiting_approval || 0} helper="Customer approval pending" icon={ShieldAlert} tone="amber" />
        <MetricCard label="Ready for Delivery" value={summary.ready || 0} helper="Repair completed and ready" icon={CheckCircle2} tone="emerald" />
        <MetricCard label="Completed Services" value={summary.completed || 0} helper="Available in service history" icon={Clock3} tone="violet" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Active Service Jobs</h2>
            <p className="mt-1 text-sm text-slate-500">Completed services automatically move to Service History.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-[280px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job, customer, phone or serial..." /></label>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All active statuses</option>{ACTIVE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500 dark:bg-white/[0.03]">
              <tr><th className="px-5 py-3">Job</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Device</th><th className="px-4 py-3">Complaint</th><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Estimate</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {jobsQuery.isLoading ? <tr><td colSpan="8" className="px-5 py-12 text-center text-slate-500">Loading service jobs...</td></tr> : jobs.length === 0 ? <tr><td colSpan="8" className="px-5 py-14 text-center"><Wrench className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 font-bold">No active service jobs</p><p className="mt-1 text-sm text-slate-500">Create the first service job to begin.</p></td></tr> : jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-4"><p className="font-black text-slate-900 dark:text-white">{job.job_number}</p><p className="mt-1 text-xs text-slate-500">{job.branch_name || "—"}</p></td>
                  <td className="px-4 py-4"><p className="font-bold">{job.customer_display || job.customer_name}</p><p className="mt-1 text-xs text-slate-500">{job.phone}</p></td>
                  <td className="px-4 py-4"><p className="font-bold">{job.device_name}</p><p className="mt-1 text-xs text-slate-500">{job.serial_number || "No serial"}</p></td>
                  <td className="max-w-[220px] px-4 py-4"><p className="truncate">{job.complaint}</p></td>
                  <td className="px-4 py-4">{job.technician_name}</td>
                  <td className="px-4 py-4"><StatusBadge status={job.status} label={job.status_display} /></td>
                  <td className="px-4 py-4 font-bold">{money(job.grand_total)}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => { setSelected(job); setModalMode("view"); }}><Eye className="mr-1.5 h-4 w-4" />View</Button><Button size="sm" variant="outline" onClick={() => openEdit(job)}><FilePenLine className="mr-1.5 h-4 w-4" />Edit</Button><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => completeMutation.mutate(job)} disabled={completeMutation.isPending}><CheckCircle2 className="mr-1.5 h-4 w-4" />Complete</Button><Button size="icon" variant="ghost" onClick={() => window.confirm(`Delete ${job.job_number}?`) && deleteMutation.mutate(job)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={modalMode === "create" || modalMode === "edit"} onClose={() => setModalMode(null)} title={modalMode === "edit" ? `Edit ${selected?.job_number}` : "Create Service Job"} subtitle="Record customer intake, device details, technician assignment, diagnosis, parts and charges.">
        <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          <ServiceJobForm form={form} setForm={setForm} employees={employees} branches={branches} />
          <div className="mt-7 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModalMode(null)}>Cancel</Button><SubmitButton pending={saveMutation.isPending}>{modalMode === "edit" ? "Save Changes" : "Create Service Job"}</SubmitButton></div>
        </form>
      </Modal>

      <Modal open={modalMode === "view"} onClose={() => setModalMode(null)} title={selected?.job_number || "Service Job"} subtitle={`${selected?.customer_display || selected?.customer_name || ""} · ${selected?.device_name || ""}`} maxWidth="max-w-4xl">
        {selected ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[["Status", <StatusBadge status={selected.status} label={selected.status_display} />], ["Technician", selected.technician_name], ["Estimate", money(selected.grand_total)], ["Complaint", selected.complaint], ["Diagnosis", selected.diagnosis || "Pending"], ["Payment", selected.payment_status_display]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><div className="mt-2 font-semibold">{value}</div></div>)}</div><div><h3 className="font-black">Parts & Charges</h3><div className="mt-3 space-y-2">{selected.charges?.length ? selected.charges.map((charge) => <div key={charge.id} className="flex justify-between rounded-xl border border-slate-200 p-3 dark:border-white/10"><span>{charge.description} × {charge.quantity}</span><strong>{money(charge.line_total)}</strong></div>) : <p className="text-sm text-slate-500">No charges added.</p>}</div></div></div> : null}
      </Modal>
    </div>
  );
}
