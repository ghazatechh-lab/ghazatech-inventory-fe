import React from "react";
import {
  Download,
  Eye,
  LockKeyhole,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";

const primaryButton =
  "bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950";

const tabs = [
  ["deleted", "Deleted Items"],
  ["activity", "Recovery Activity"],
  ["settings", "Retention & Settings"],
  ["permissions", "Permissions"],
];

const rowsFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const moduleLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const errorMessage = (error, fallback) => {
  const details = getApiErrorDetails(error);
  return details.summary || details.message || details.title || fallback;
};

function KpiCard({ label, value, description }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(22,42,73,0.05)] dark:border-white/10 dark:bg-slate-950/70">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
        {value ?? 0}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
      {title ? (
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-amber-400" : "bg-slate-300 dark:bg-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function RecoveryCentrePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = React.useState("deleted");
  const [q, setQ] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("");
  const [ordering, setOrdering] = React.useState("-deleted_at");
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [previewRecord, setPreviewRecord] = React.useState(null);
  const [deleteRecord, setDeleteRecord] = React.useState(null);

  const canRestore = isAdmin(user) || hasPermission(user, "settings.recovery.restore");
  const canPermanentDelete =
    isAdmin(user) || hasPermission(user, "settings.recovery.permanent_delete");
  const canEditSettings =
    isAdmin(user) || hasPermission(user, "settings.recovery.edit");
  const canExport = isAdmin(user) || hasPermission(user, "settings.recovery.export");

  const recordsQuery = useQuery({
    queryKey: ["recovery-records", q, moduleFilter, ordering],
    queryFn: async () =>
      unwrap(
        await api.get("/recovery/records/", {
          params: {
            q: q || undefined,
            module: moduleFilter || undefined,
            ordering,
            page_size: 500,
          },
        }),
      ),
  });

  const summaryQuery = useQuery({
    queryKey: ["recovery-summary"],
    queryFn: async () => unwrap(await api.get("/recovery/records/summary/")),
  });

  const activityQuery = useQuery({
    queryKey: ["recovery-activity"],
    queryFn: async () => unwrap(await api.get("/recovery/records/activity/")),
    enabled: tab === "activity",
  });

  const settingsQuery = useQuery({
    queryKey: ["recovery-settings"],
    queryFn: async () => unwrap(await api.get("/recovery/settings/current/")),
  });

  const records = rowsFrom(recordsQuery.data);
  const activities = rowsFrom(activityQuery.data);
  const summary = summaryQuery.data || {};
  const settings = settingsQuery.data || {};

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recovery-records"] }),
      queryClient.invalidateQueries({ queryKey: ["recovery-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["recovery-activity"] }),
    ]);
  };

  const restoreMutation = useMutation({
    mutationFn: async (record) =>
      unwrap(await api.post(`/recovery/records/${record.id}/restore/`)),
    onSuccess: async () => {
      toast.success("Record restored successfully.");
      setPreviewRecord(null);
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to restore record.")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (record) =>
      api.delete(`/recovery/records/${record.id}/permanent-delete/`),
    onSuccess: async () => {
      toast.success("Record permanently deleted.");
      setDeleteRecord(null);
      await refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to permanently delete record.")),
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post("/recovery/records/bulk-restore/", {
          ids: selectedIds,
        }),
      ),
    onSuccess: async () => {
      toast.success("Selected records restored.");
      setSelectedIds([]);
      await refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to restore selected records.")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post("/recovery/records/bulk-delete/", {
          ids: selectedIds,
        }),
      ),
    onSuccess: async () => {
      toast.success("Selected records permanently deleted.");
      setSelectedIds([]);
      await refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to delete selected records.")),
  });

  const updateSettings = useMutation({
    mutationFn: async (payload) =>
      unwrap(await api.patch("/recovery/settings/current/", payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recovery-settings"] });
      toast.success("Recovery settings updated.");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to update recovery settings.")),
  });

  const visibleIds = records.map((record) => record.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  };

  const toggleOne = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const exportRecoveryLog = async () => {
    try {
      const response = await api.get("/recovery/records/export/", {
        params: {
          q: q || undefined,
          module: moduleFilter || undefined,
          ordering,
        },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "recovery-centre-log.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to export recovery log."));
    }
  };

  return (
    <div className="recovery-module-page recovery-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        eyebrow="System Recovery"
        title="Recovery Centre"
        subtitle="Recover deleted ERP records, review deletion history, configure retention rules, and control permanent removal."
        actions={
          canExport ? (
            <Button type="button" onClick={exportRecoveryLog} className={primaryButton}>
              <Download className="mr-2 h-4 w-4 text-slate-950" />
              Export Recovery Log
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Deleted Records" value={summary.total_deleted} description="Currently recoverable" />
        <KpiCard label="Deleted Today" value={summary.deleted_today} description="Deleted during the current day" />
        <KpiCard label="Restored This Month" value={summary.restored_this_month} description="Successfully recovered" />
        <KpiCard label="Expiring Soon" value={summary.expiring_soon} description="Will expire within 7 days" />
        <KpiCard label="Permanent Deletes" value={summary.permanent_deletes} description="Recorded permanent removals" />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "rounded-xl border border-amber-300 bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm"
                : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/[0.04]"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "deleted" ? (
        <SectionCard>
          <div className="border-b border-slate-200/80 p-5 dark:border-white/10">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-11 rounded-[10px] pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search record, reference, user or reason..." />
              </div>
              <select className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                <option value="">All Modules</option>
                <option value="inventory">Inventory</option>
                <option value="customers">Customers</option>
                <option value="suppliers">Suppliers</option>
                <option value="sales">Sales</option>
                <option value="purchases">Purchase</option>
                <option value="hrms">HRMS</option>
                <option value="finance">Finance</option>
              </select>
              <select className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950" value={ordering} onChange={(event) => setOrdering(event.target.value)}>
                <option value="-deleted_at">Newest Deleted</option>
                <option value="deleted_at">Oldest Deleted</option>
                <option value="expires_at">Expiring Soon</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canRestore ? (
                <Button type="button" className={primaryButton} disabled={!selectedIds.length || bulkRestoreMutation.isPending} onClick={() => bulkRestoreMutation.mutate()}>
                  <RefreshCcw className="mr-2 h-4 w-4 text-slate-950" />
                  Restore Selected
                </Button>
              ) : null}
              {canPermanentDelete ? (
                <Button type="button" variant="destructive" disabled={!selectedIds.length || bulkDeleteMutation.isPending} onClick={() => {
                  if (window.confirm("Permanently delete the selected records? This action cannot be undone.")) bulkDeleteMutation.mutate();
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected Permanently
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-b border-slate-200 bg-[#f6f9fc] text-left text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-5 py-3.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-amber-400" /></th>
                  <th className="px-5 py-3.5">Record</th>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Deleted By</th>
                  <th className="px-5 py-3.5">Deleted Date</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Expires In</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recordsQuery.isLoading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">Loading deleted records...</td></tr>
                ) : records.length ? (
                  records.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} className="accent-amber-400" /></td>
                      <td className="px-5 py-4"><div className="font-semibold text-slate-950 dark:text-white">{record.record_name || record.model_name}</div><div className="mt-1 text-xs text-muted-foreground">{record.model_name}</div></td>
                      <td className="px-5 py-4"><StatusBadge status="info" label={moduleLabel(record.module)} /></td>
                      <td className="px-5 py-4 font-semibold">{record.reference || `#${record.object_id}`}</td>
                      <td className="px-5 py-4">{record.deleted_by_name || "System"}</td>
                      <td className="whitespace-nowrap px-5 py-4">{record.deleted_at ? new Date(record.deleted_at).toLocaleString() : "—"}</td>
                      <td className="px-5 py-4">{record.deletion_reason || "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={(record.expires_in_days ?? 999) <= 7 ? "danger" : "success"} label={record.expires_in_days === null ? "No expiry" : `${record.expires_in_days} days`} /></td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPreviewRecord(record)}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button>
                        {canRestore ? <Button type="button" size="sm" className={primaryButton} disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(record)}><RefreshCcw className="mr-1.5 h-3.5 w-3.5 text-slate-950" />Restore</Button> : null}
                        {canPermanentDelete ? <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteRecord(record)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button> : null}
                      </div></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="px-5 py-14 text-center text-muted-foreground">No recoverable records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === "activity" ? (
        <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
          <SectionCard title="Recovery Activity Timeline" subtitle="Restore and permanent-delete history">
            <div className="p-5">
              {activityQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading recovery activity...</p> : activities.length ? (
                <div className="relative border-l-2 border-slate-200 pl-6 dark:border-white/10">
                  {activities.map((record) => (
                    <div key={record.id} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow dark:border-slate-950" />
                      <p className="text-sm font-bold">{record.reference || record.record_name} · {record.status === "RESTORED" ? "Restored" : "Permanently Deleted"}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{record.status === "RESTORED" ? `${record.restored_by_name || "System"} · ${record.restored_at ? new Date(record.restored_at).toLocaleString() : ""}` : `${record.permanent_deleted_by_name || "System"} · ${record.permanently_deleted_at ? new Date(record.permanently_deleted_at).toLocaleString() : ""}`}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No recovery activity yet.</p>}
            </div>
          </SectionCard>
          <SectionCard title="Audit Information Captured" subtitle="Stored for every recoverable deletion">
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {["Original record reference", "Module and branch", "Deleting user", "Deletion date and time", "Deletion reason", "Original record snapshot", "Restore user and time", "Permanent deletion user and time"].map((label) => (
                <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5"><span className="text-sm">{label}</span><ShieldCheck className="h-4 w-4 text-emerald-600" /></div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Retention Rules" subtitle="Recovery retention periods">
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              <SettingNumber label="Default recovery period" description="Days deleted records remain recoverable" value={settings.default_retention_days} disabled={!canEditSettings} onChange={(value) => updateSettings.mutate({ default_retention_days: Number(value) })} />
              <SettingNumber label="Finance records" description="Longer retention for finance data" value={settings.finance_retention_days} disabled={!canEditSettings} onChange={(value) => updateSettings.mutate({ finance_retention_days: Number(value) })} />
              <SettingNumber label="Employee records" description="Longer retention for HRMS data" value={settings.hrms_retention_days} disabled={!canEditSettings} onChange={(value) => updateSettings.mutate({ hrms_retention_days: Number(value) })} />
              <SettingToggle label="Auto cleanup after expiry" description="Permanently delete eligible expired records automatically" checked={Boolean(settings.auto_cleanup)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ auto_cleanup: checked })} />
              <SettingToggle label="Require deletion reason" description="Require a reason before a supported record is deleted" checked={Boolean(settings.require_deletion_reason)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ require_deletion_reason: checked })} />
            </div>
          </SectionCard>
          <SectionCard title="Deletion Protection" subtitle="Safety controls">
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              <SettingToggle label="Paid Sales Invoices" description="Keep protection enabled for paid invoice deletion workflows" checked={Boolean(settings.protect_paid_invoices)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ protect_paid_invoices: checked })} />
              <SettingToggle label="Posted Journal Entries" description="Protect posted accounting journals" checked={Boolean(settings.protect_posted_journals)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ protect_posted_journals: checked })} />
              <SettingToggle label="VAT Records" description="Protect VAT records from unsafe permanent removal" checked={Boolean(settings.protect_vat_records)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ protect_vat_records: checked })} />
              <SettingToggle label="Products With Transactions" description="Prefer archive/recovery over destructive deletion" checked={Boolean(settings.protect_transactional_products)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ protect_transactional_products: checked })} />
              <SettingToggle label="Permanent Delete Confirmation" description="Require explicit confirmation for permanent deletion" checked={Boolean(settings.permanent_delete_confirmation)} disabled={!canEditSettings} onChange={(checked) => updateSettings.mutate({ permanent_delete_confirmation: checked })} />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "permissions" ? (
        <SectionCard title="Recovery Centre Permissions" subtitle="Configure these permissions from Users, Roles & Permissions">
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="border-b border-slate-200 bg-[#f6f9fc] text-left text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03]"><tr><th className="px-5 py-3.5">Permission</th><th className="px-5 py-3.5">Purpose</th></tr></thead><tbody>
            {["settings.recovery.view|View deleted records and activity", "settings.recovery.restore|Restore recoverable records", "settings.recovery.permanent_delete|Permanently delete eligible records", "settings.recovery.edit|Change retention and protection settings", "settings.recovery.export|Export the recovery log"].map((item) => { const [code, description] = item.split("|"); return <tr key={code} className="border-b border-slate-100 last:border-0 dark:border-white/10"><td className="px-5 py-4 font-mono text-xs font-semibold">{code}</td><td className="px-5 py-4">{description}</td></tr>; })}
          </tbody></table></div>
        </SectionCard>
      ) : null}

      {previewRecord ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">Deleted Record Preview</p><h2 className="mt-1 text-xl font-black">{previewRecord.record_name || previewRecord.reference}</h2><p className="mt-1 text-sm text-muted-foreground">Review stored deletion information before restoring.</p></div>
            <div className="grid gap-3 p-6 sm:grid-cols-2"><PreviewField label="Reference" value={previewRecord.reference} /><PreviewField label="Module" value={moduleLabel(previewRecord.module)} /><PreviewField label="Deleted By" value={previewRecord.deleted_by_name} /><PreviewField label="Deleted At" value={previewRecord.deleted_at ? new Date(previewRecord.deleted_at).toLocaleString() : "—"} /><PreviewField label="Reason" value={previewRecord.deletion_reason} /><PreviewField label="Branch" value={previewRecord.branch_name} /></div>
            <div className="px-6 pb-6"><div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-white/10 dark:bg-white/[0.03]"><pre className="whitespace-pre-wrap break-words">{JSON.stringify(previewRecord.snapshot || {}, null, 2)}</pre></div></div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-white/10"><Button type="button" variant="outline" onClick={() => setPreviewRecord(null)}>Close</Button>{canRestore ? <Button type="button" className={primaryButton} onClick={() => restoreMutation.mutate(previewRecord)}><RefreshCcw className="mr-2 h-4 w-4 text-slate-950" />Restore Record</Button> : null}</div>
          </div>
        </div>
      ) : null}

      {deleteRecord ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-lg overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"><div className="p-6"><div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10"><LockKeyhole className="h-5 w-5" /></div><h2 className="mt-4 text-xl font-black">Permanent Delete</h2><p className="mt-2 text-sm text-muted-foreground">Permanently delete <strong>{deleteRecord.reference || deleteRecord.record_name}</strong>? This action cannot be undone.</p></div><div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-white/10"><Button type="button" variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteRecord)}><Trash2 className="mr-2 h-4 w-4" />Delete Permanently</Button></div></div></div>
      ) : null}
    </div>
  );
}

function SettingNumber({ label, description, value, onChange, disabled }) {
  const [localValue, setLocalValue] = React.useState(value ?? 30);
  React.useEffect(() => setLocalValue(value ?? 30), [value]);
  return <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_140px] sm:items-center"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Input type="number" min="1" disabled={disabled} value={localValue} onChange={(event) => setLocalValue(event.target.value)} onBlur={() => Number(localValue) > 0 && onChange(localValue)} /></div>;
}

function SettingToggle({ label, description, checked, onChange, disabled }) {
  return <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Toggle checked={checked} onChange={onChange} disabled={disabled} /></div>;
}

function PreviewField({ label, value }) {
  return <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value || "—"}</p></div>;
}
