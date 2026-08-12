import React from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";

import { extractRows, money, today } from "./accountingUtils";

const JOURNAL_TYPES = [
  ["MANUAL", "Manual Journal"],
  ["ADJUSTMENT", "Adjustment"],
  ["OPENING_BALANCE", "Opening Balance"],
  ["ACCRUAL", "Accrual"],
  ["YEAR_END", "Year End"],
  ["REVERSAL", "Reversal"],
];

const blankLine = () => ({
  account: "",
  description: "",
  cost_center: "",
  project: "",
  debit: "",
  credit: "",
});

const blankForm = (branchId) => ({
  entry_date: today(),
  document_date: today(),
  branch: branchId ? String(branchId) : "",
  voucher_type: "MANUAL",
  reference: "",
  description: "",
  currency: "AED",
  exchange_rate: "1.000000",
  source: "MANUAL",

  is_recurring_template: false,
  recurrence_frequency: "MONTHLY",
  recurrence_start_date: "",
  recurrence_end_date: "",

  is_reversing: false,
  reversal_date: "",
  reversal_narration: "",

  approval_workflow: "ACCOUNTANT_FINANCE_MANAGER",
  approver: "",
  approval_priority: "NORMAL",
  approval_comments: "",

  lines: [blankLine(), blankLine()],
});

const normalize = (value) => String(value || "").toUpperCase();

const canEdit = (status) => ["DRAFT", "REJECTED"].includes(normalize(status));

const canSubmit = (status) => ["DRAFT", "REJECTED"].includes(normalize(status));

const canApprove = (status) => normalize(status) === "PENDING_APPROVAL";

const canPost = (status) => normalize(status) === "APPROVED";

const canReverse = (status) => normalize(status) === "POSTED";

const niceStatus = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const detailValue = (value) => value || "—";

export default function JournalEntriesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [mode, setMode] = React.useState("list");
  const [activeJournal, setActiveJournal] = React.useState(null);
  const [form, setForm] = React.useState(() => blankForm(branchId));
  const [files, setFiles] = React.useState([]);

  const [filters, setFilters] = React.useState({
    search: "",
    date_from: "",
    date_to: "",
    status: "",
  });

  const [confirmState, setConfirmState] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [reverseDate, setReverseDate] = React.useState(today());
  const [reverseNarration, setReverseNarration] = React.useState("");

  const readOnly = mode === "view";

  React.useEffect(() => {
    if (mode !== "create" || !branchId) return;

    setForm((current) => {
      if (current.branch) return current;

      return {
        ...current,
        branch: String(branchId),
      };
    });
  }, [branchId, mode]);

  const branchesQuery = useQuery({
    queryKey: ["journal-branch-options"],
    queryFn: async () =>
      api.get("/branches/", {
        params: {
          is_active: true,
          page_size: 500,
          ordering: "branch_name",
        },
      }),
    staleTime: 60_000,
  });

  const selectedJournalBranchId = form.branch || branchId || "";

  const accountsQuery = useQuery({
    queryKey: ["journal-account-options", selectedJournalBranchId],
    queryFn: async () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: selectedJournalBranchId || undefined,
          is_active: true,
          page_size: 1000,
          ordering: "code",
        },
      }),
  });

  const usersQuery = useQuery({
    queryKey: ["journal-approver-options"],
    queryFn: async () => api.get("/auth/users/form-options/"),
    staleTime: 60_000,
  });

  const journalsQuery = useQuery({
    queryKey: ["journal-register", branchParams, filters],
    queryFn: async () =>
      api.get("/finance/journals/", {
        params: {
          ...branchParams,
          search: filters.search || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          status: filters.status || undefined,
          page_size: 500,
          ordering: "-entry_date,-id",
        },
      }),
    staleTime: 0,
  });

  const summaryQuery = useQuery({
    queryKey: ["journal-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/journals/summary/", {
          params: branchParams,
        }),
      ),
  });

  const branches = extractRows(branchesQuery.data);
  const accounts = extractRows(accountsQuery.data);
  const journals = extractRows(journalsQuery.data);
  const summary = summaryQuery.data || {};

  const approvers = React.useMemo(() => {
    const response = usersQuery.data?.data ?? usersQuery.data;

    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.users)) return response.users;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data?.users)) return response.data.users;
    if (Array.isArray(response?.data?.results)) return response.data.results;

    return [];
  }, [usersQuery.data]);

  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (result, line) => ({
          debit: result.debit + Number(line.debit || 0),
          credit: result.credit + Number(line.credit || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [form.lines],
  );

  const difference = totals.debit - totals.credit;
  const balanced = totals.debit > 0 && Math.abs(difference) < 0.005;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["journal-register"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["journal-summary"],
      }),
    ]);
  };

  const openCreate = () => {
    setActiveJournal(null);
    setForm(blankForm(branchId));
    setFiles([]);
    setMode("create");
  };

  const openExisting = async (row, requestedMode = "view") => {
    try {
      const detail = unwrap(await api.get(`/finance/journals/${row.id}/`));

      const nextMode =
        requestedMode === "edit" && !canEdit(detail.status)
          ? "view"
          : requestedMode;

      setActiveJournal(detail);
      setForm({
        entry_date: detail.entry_date || today(),
        document_date: detail.document_date || detail.entry_date || today(),
        branch: String(detail.branch?.id || detail.branch || ""),
        voucher_type: detail.voucher_type || "MANUAL",
        reference: detail.reference || "",
        description: detail.description || "",
        currency: detail.currency || "AED",
        exchange_rate: String(detail.exchange_rate || "1.000000"),
        source: detail.source || "MANUAL",

        is_recurring_template: Boolean(detail.is_recurring_template),
        recurrence_frequency: detail.recurrence_frequency || "MONTHLY",
        recurrence_start_date: detail.recurrence_start_date || "",
        recurrence_end_date: detail.recurrence_end_date || "",

        is_reversing: Boolean(detail.is_reversing),
        reversal_date: detail.reversal_date || "",
        reversal_narration: detail.reversal_narration || "",

        approval_workflow:
          detail.approval_workflow || "ACCOUNTANT_FINANCE_MANAGER",
        approver: detail.approver
          ? String(detail.approver?.id || detail.approver)
          : "",
        approval_priority: detail.approval_priority || "NORMAL",
        approval_comments: detail.approval_comments || "",

        lines: (detail.lines || []).map((line) => ({
          id: line.id,
          account: String(line.account?.id || line.account || ""),
          description: line.description || "",
          cost_center: line.cost_center || "",
          project: line.project || "",
          debit: line.debit || "",
          credit: line.credit || "",
        })),
      });

      setFiles([]);
      setMode(nextMode);
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to open journal", {
        description: details.summary || details.message,
      });
    }
  };

  const closeForm = () => {
    setMode("list");
    setActiveJournal(null);
    setFiles([]);
  };

  const updateLine = (index, field, value) => {
    if (readOnly) return;

    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;

        if (field === "debit" && Number(value || 0) > 0) {
          return { ...line, debit: value, credit: "" };
        }

        if (field === "credit" && Number(value || 0) > 0) {
          return { ...line, credit: value, debit: "" };
        }

        return { ...line, [field]: value };
      }),
    }));
  };

  const validateForm = () => {
    if (!form.branch) {
      toast.error("Select a branch for this journal entry.");
      return false;
    }

    if (!form.entry_date || !form.document_date) {
      toast.error("Posting Date and Document Date are required.");
      return false;
    }

    if (!form.description.trim()) {
      toast.error("Header Narration is required.");
      return false;
    }

    if (Number(form.exchange_rate || 0) <= 0) {
      toast.error("Exchange Rate must be greater than zero.");
      return false;
    }

    if (form.lines.length < 2) {
      toast.error("At least two journal lines are required.");
      return false;
    }

    for (let index = 0; index < form.lines.length; index += 1) {
      const line = form.lines[index];
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      if (!line.account) {
        toast.error(`Line ${index + 1}: select an account.`);
        return false;
      }

      if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
        toast.error(
          `Line ${index + 1}: enter either Debit or Credit, not both.`,
        );
        return false;
      }
    }

    if (!balanced) {
      toast.error("Total Debit must equal Total Credit.");
      return false;
    }

    if (
      form.is_recurring_template &&
      (!form.recurrence_frequency || !form.recurrence_start_date)
    ) {
      toast.error("Recurring journals require Frequency and Start Date.");
      return false;
    }

    if (form.is_reversing && !form.reversal_date) {
      toast.error("Select a reversal date.");
      return false;
    }

    return true;
  };

  const uploadAttachments = async (journalId) => {
    if (!files.length) return;

    const body = new FormData();
    files.forEach((file) => body.append("files", file));

    await api.post(`/finance/journals/${journalId}/attachments/`, body, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      skipGlobalErrorToast: true,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ submitAfterSave }) => {
      if (!validateForm()) {
        throw new Error("__VALIDATION__");
      }

      const payload = {
        entry_date: form.entry_date,
        document_date: form.document_date,
        branch: Number(form.branch),
        voucher_type: form.voucher_type,
        reference: form.reference.trim(),
        description: form.description.trim(),
        currency: form.currency,
        exchange_rate: Number(form.exchange_rate || 1),
        source: form.source,

        is_recurring_template: Boolean(form.is_recurring_template),
        recurrence_frequency: form.is_recurring_template
          ? form.recurrence_frequency
          : "",
        recurrence_start_date: form.is_recurring_template
          ? form.recurrence_start_date || null
          : null,
        recurrence_end_date: form.is_recurring_template
          ? form.recurrence_end_date || null
          : null,

        is_reversing: Boolean(form.is_reversing),
        reversal_date: form.is_reversing ? form.reversal_date || null : null,
        reversal_narration: form.is_reversing
          ? form.reversal_narration.trim()
          : "",

        approval_workflow: form.approval_workflow,
        approver: form.approver ? Number(form.approver) : null,
        approval_priority: form.approval_priority,
        approval_comments: form.approval_comments.trim(),

        lines: form.lines.map((line) => ({
          account: Number(line.account),
          description: line.description.trim(),
          cost_center: line.cost_center.trim(),
          project: line.project.trim(),
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        })),
      };

      let response;

      if (mode === "edit") {
        response = await api.put(
          `/finance/journals/${activeJournal.id}/`,
          payload,
          { skipGlobalErrorToast: true },
        );
      } else {
        response = await api.post("/finance/journals/", payload, {
          skipGlobalErrorToast: true,
        });
      }

      const saved = unwrap(response);

      await uploadAttachments(saved.id);

      if (submitAfterSave) {
        await api.post(
          `/finance/journals/${saved.id}/submit/`,
          {},
          { skipGlobalErrorToast: true },
        );
      }

      return { saved, submitAfterSave };
    },

    onSuccess: async ({ submitAfterSave }) => {
      await refresh();

      toast.success(
        submitAfterSave
          ? "Journal submitted for approval."
          : mode === "edit"
            ? "Journal updated."
            : "Journal saved as draft.",
      );

      closeForm();
    },

    onError: (error) => {
      if (error?.message === "__VALIDATION__") return;

      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save journal", {
        description:
          details.summary ||
          details.message ||
          error?.response?.data?.detail ||
          "Check the journal and try again.",
      });
    },
  });

  const workflowMutation = useMutation({
    mutationFn: async ({ journal, action, body }) =>
      api.post(`/finance/journals/${journal.id}/${action}/`, body || {}, {
        skipGlobalErrorToast: true,
      }),

    onSuccess: async (_response, variables) => {
      await refresh();

      const labels = {
        submit: "Journal submitted for approval.",
        approve: "Journal approved.",
        reject: "Journal rejected.",
        post: "Journal posted to the General Ledger.",
        duplicate: "Journal duplicated as a new draft.",
        reverse: "Reversal journal created and posted.",
      };

      toast.success(labels[variables.action] || "Journal updated.");
      setConfirmState(null);
      setRejectReason("");
      setReverseNarration("");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update journal", {
        description:
          details.summary || details.message || error?.response?.data?.detail,
      });
    },
  });

  const runAction = (journal, action) => {
    if (action === "reject") {
      setRejectReason("");
      setConfirmState({ journal, action });
      return;
    }

    if (action === "reverse") {
      setReverseDate(today());
      setReverseNarration(`Reversal of ${journal.entry_number}`);
      setConfirmState({ journal, action });
      return;
    }

    setConfirmState({ journal, action });
  };

  const confirmAction = () => {
    if (!confirmState) return;

    const { journal, action } = confirmState;

    if (action === "reject" && !rejectReason.trim()) {
      toast.error("Enter a rejection reason.");
      return;
    }

    workflowMutation.mutate({
      journal,
      action,
      body:
        action === "reject"
          ? { reason: rejectReason.trim() }
          : action === "reverse"
            ? {
                reversal_date: reverseDate,
                narration: reverseNarration.trim(),
              }
            : {},
    });
  };

  const exportRegister = async () => {
    try {
      const response = await api.get("/finance/journals/export/", {
        params: {
          ...branchParams,
          search: filters.search || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          status: filters.status || undefined,
        },
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "journal-register.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
      toast.error("Unable to export journal register.");
    }
  };

  if (mode !== "list") {
    return (
      <JournalForm
        mode={mode}
        form={form}
        setForm={setForm}
        activeJournal={activeJournal}
        readOnly={readOnly}
        branches={branches}
        accounts={accounts}
        approvers={approvers}
        totals={totals}
        difference={difference}
        balanced={balanced}
        files={files}
        setFiles={setFiles}
        updateLine={updateLine}
        closeForm={closeForm}
        saveMutation={saveMutation}
        user={user}
      />
    );
  }

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Journal Entries"
        subtitle="Create, approve, post, and review balanced journal vouchers."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              type="button"
              onClick={openCreate}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Draft" value={summary.draft || 0} tone="slate" />
        <SummaryCard
          label="Pending Approval"
          value={summary.pending_approval || 0}
          tone="amber"
        />
        <SummaryCard
          label="Posted"
          value={summary.posted || 0}
          tone="emerald"
        />
        <SummaryCard
          label="Rejected"
          value={summary.rejected || 0}
          tone="red"
        />
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_auto]">
          <div>
            <Label>Search</Label>
            <Input
              className="mt-2"
              placeholder="JV no., narration, account"
              value={filters.search}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  search: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>From Date</Label>
            <Input
              className="mt-2"
              type="date"
              value={filters.date_from}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  date_from: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>To Date</Label>
            <Input
              className="mt-2"
              type="date"
              value={filters.date_to}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  date_to: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>Status</Label>
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3"
              value={filters.status}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  status: e.target.value,
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFilters({
                  search: "",
                  date_from: "",
                  date_to: "",
                  status: "",
                })
              }
            >
              Clear
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Journal Register</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manual and system-generated vouchers for the selected branch.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={exportRegister}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "JV No.",
                  "Date",
                  "Type",
                  "Narration",
                  "Debit Total",
                  "Credit Total",
                  "Status",
                  "Approved By",
                  "Posted By",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {journals.map((journal) => (
                <tr
                  key={journal.id}
                  className="border-b transition hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-bold text-blue-600">
                    {journal.entry_number}
                  </td>
                  <td className="px-4 py-3">{journal.entry_date}</td>
                  <td className="px-4 py-3">
                    {journal.voucher_type_display || journal.voucher_type}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3">
                    {journal.description}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(journal.total_debit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(journal.total_credit)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={journal.status} />
                  </td>
                  <td className="px-4 py-3">
                    {journal.approved_by_name || "—"}
                  </td>
                  <td className="px-4 py-3">{journal.posted_by_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <IconAction
                        title="View"
                        onClick={() => openExisting(journal, "view")}
                      >
                        <Eye className="h-4 w-4" />
                      </IconAction>

                      {canEdit(journal.status) && (
                        <IconAction
                          title="Edit"
                          onClick={() => openExisting(journal, "edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconAction>
                      )}

                      <IconAction
                        title="Duplicate"
                        onClick={() => runAction(journal, "duplicate")}
                      >
                        <Copy className="h-4 w-4" />
                      </IconAction>

                      {canSubmit(journal.status) && (
                        <IconAction
                          title="Submit for Approval"
                          onClick={() => runAction(journal, "submit")}
                        >
                          <Send className="h-4 w-4 text-blue-600" />
                        </IconAction>
                      )}

                      {canApprove(journal.status) && (
                        <>
                          <IconAction
                            title="Approve"
                            onClick={() => runAction(journal, "approve")}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </IconAction>

                          <IconAction
                            title="Reject"
                            onClick={() => runAction(journal, "reject")}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </IconAction>
                        </>
                      )}

                      {canPost(journal.status) && (
                        <IconAction
                          title="Post Entry"
                          onClick={() => runAction(journal, "post")}
                        >
                          <FileText className="h-4 w-4 text-violet-600" />
                        </IconAction>
                      )}

                      {canReverse(journal.status) && (
                        <IconAction
                          title="Reverse"
                          onClick={() => runAction(journal, "reverse")}
                        >
                          <RotateCcw className="h-4 w-4 text-amber-600" />
                        </IconAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!journals.length && (
                <tr>
                  <td
                    colSpan="10"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No journal entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmState && (
        <WorkflowModal
          state={confirmState}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          reverseDate={reverseDate}
          setReverseDate={setReverseDate}
          reverseNarration={reverseNarration}
          setReverseNarration={setReverseNarration}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmAction}
          pending={workflowMutation.isPending}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    slate: "text-slate-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tones[tone] || ""}`}>{value}</p>
    </div>
  );
}

function IconAction({ title, onClick, children }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={title}
      onClick={onClick}
      className="h-8 w-8"
    >
      {children}
    </Button>
  );
}

function ToggleRow({ title, description, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-5 border-b py-3 text-left last:border-b-0 disabled:cursor-default"
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function JournalForm({
  mode,
  form,
  setForm,
  activeJournal,
  readOnly,
  branches,
  accounts,
  approvers,
  totals,
  difference,
  balanced,
  files,
  setFiles,
  updateLine,
  closeForm,
  saveMutation,
  user,
}) {
  const title =
    mode === "create"
      ? "New Journal Entry"
      : mode === "edit"
        ? `Edit ${activeJournal?.entry_number || "Journal"}`
        : activeJournal?.entry_number || "Journal Entry";

  const status = activeJournal?.status || "DRAFT";

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title={title}
        subtitle="The voucher can be posted only when debit and credit totals are equal and approval is complete."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <Button type="button" variant="outline" onClick={closeForm}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        }
      />

      {readOnly && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          This journal is read-only. Only Draft and Rejected journals can be
          edited.
        </div>
      )}

      {activeJournal?.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <span className="font-semibold">Rejection reason:</span>{" "}
          {activeJournal.rejection_reason}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Section title="01 Voucher Details" note="Required fields are marked *">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="JV Number">
              <Input
                value={activeJournal?.entry_number || "Auto-generated on save"}
                disabled
              />
            </Field>

            <Field label="Posting Date *">
              <Input
                type="date"
                disabled={readOnly}
                value={form.entry_date}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    entry_date: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Document Date *">
              <Input
                type="date"
                disabled={readOnly}
                value={form.document_date}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    document_date: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Branch *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.branch}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    branch: e.target.value,
                    lines:
                      String(current.branch || "") ===
                      String(e.target.value || "")
                        ? current.lines
                        : current.lines.map((line) => ({
                            ...line,
                            account: "",
                          })),
                  }))
                }
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name ||
                      branch.name ||
                      branch.code ||
                      `Branch ${branch.id}`}
                  </option>
                ))}
              </select>

              {!readOnly && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Changing the branch clears selected accounts so you can choose
                  accounts available for the new branch.
                </p>
              )}
            </Field>

            <Field label="External Reference">
              <Input
                disabled={readOnly}
                placeholder="Invoice / cheque / receipt no."
                value={form.reference}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    reference: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Currency *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.currency}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    currency: e.target.value,
                  }))
                }
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
              </select>
            </Field>

            <Field label="Exchange Rate">
              <Input
                type="number"
                min="0.000001"
                step="0.000001"
                disabled={readOnly}
                value={form.exchange_rate}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    exchange_rate: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Source">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.source}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    source: e.target.value,
                  }))
                }
              >
                <option value="MANUAL">Manual</option>
                <option value="SYSTEM">System-generated</option>
              </select>
            </Field>

            <div className="md:col-span-2 xl:col-span-4">
              <Label>Journal Type *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {JOURNAL_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        voucher_type: value,
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      form.voucher_type === value
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "bg-background text-muted-foreground"
                    } disabled:cursor-default`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <Label>Header Narration *</Label>
              <Textarea
                disabled={readOnly}
                rows={3}
                className="mt-2"
                placeholder="Explain the purpose of this journal entry"
                value={form.description}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </Section>

        <Section
          title="02 Entry Lines"
          note="Enter either debit or credit on each line, not both."
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[1.35fr_1.15fr_0.85fr_0.85fr_0.62fr_0.62fr_44px] gap-2 px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <div>Account</div>
                <div>Description</div>
                <div>Cost Center</div>
                <div>Project</div>
                <div className="text-right">Debit</div>
                <div className="text-right">Credit</div>
                <div />
              </div>

              <div className="space-y-2">
                {form.lines.map((line, index) => (
                  <div
                    key={line.id || index}
                    className="grid grid-cols-[1.35fr_1.15fr_0.85fr_0.85fr_0.62fr_0.62fr_44px] items-center gap-2"
                  >
                    <select
                      disabled={readOnly}
                      className="h-10 rounded-md border bg-background px-3"
                      value={line.account}
                      onChange={(e) =>
                        updateLine(index, "account", e.target.value)
                      }
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} — {account.name}
                        </option>
                      ))}
                    </select>

                    <Input
                      disabled={readOnly}
                      placeholder="Line description"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                    />

                    <Input
                      disabled={readOnly}
                      placeholder="Cost center"
                      value={line.cost_center}
                      onChange={(e) =>
                        updateLine(index, "cost_center", e.target.value)
                      }
                    />

                    <Input
                      disabled={readOnly}
                      placeholder="Project"
                      value={line.project}
                      onChange={(e) =>
                        updateLine(index, "project", e.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={readOnly}
                      className="text-right"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) =>
                        updateLine(index, "debit", e.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={readOnly}
                      className="text-right"
                      placeholder="Credit"
                      value={line.credit}
                      onChange={(e) =>
                        updateLine(index, "credit", e.target.value)
                      }
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={readOnly || form.lines.length <= 2}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          lines: current.lines.filter(
                            (_, rowIndex) => rowIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  lines: [...current.lines, blankLine()],
                }))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TotalCard label="Total Debit" value={money(totals.debit)} />
            <TotalCard label="Total Credit" value={money(totals.credit)} />
            <TotalCard label="Difference" value={money(difference)} />
            <TotalCard
              label="Status"
              value={balanced ? "Balanced" : "Not Balanced"}
              good={balanced}
            />
          </div>
        </Section>

        <Section title="03 Supporting Documents" note="Optional">
          {readOnly ? (
            <div className="space-y-2">
              {(activeJournal?.attachments || []).map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.file_url || attachment.file}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  {attachment.original_name || "Attachment"}
                </a>
              ))}

              {!activeJournal?.attachments?.length && (
                <p className="text-sm text-muted-foreground">
                  No supporting documents attached.
                </p>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition hover:bg-muted/20">
              <Upload className="h-8 w-8 text-blue-600" />
              <p className="mt-3 font-semibold">
                Click to attach supporting documents
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Invoices, cheque scans, approvals, PDFs, images, or
                spreadsheets.
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
          )}

          {!!files.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file) => (
                <span
                  key={`${file.name}-${file.size}`}
                  className="rounded-full bg-muted px-3 py-1 text-xs"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="04 Recurring & Reversing" note="Optional automation">
          <ToggleRow
            title="Save as recurring template"
            description="Create future draft journals using the same lines and narration."
            checked={form.is_recurring_template}
            disabled={readOnly}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                is_recurring_template: value,
              }))
            }
          />

          {form.is_recurring_template && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Frequency">
                <select
                  disabled={readOnly}
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={form.recurrence_frequency}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      recurrence_frequency: e.target.value,
                    }))
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </Field>

              <Field label="Start Date">
                <Input
                  type="date"
                  disabled={readOnly}
                  value={form.recurrence_start_date}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      recurrence_start_date: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="End Date">
                <Input
                  type="date"
                  disabled={readOnly}
                  value={form.recurrence_end_date}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      recurrence_end_date: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <ToggleRow
              title="Create reversing entry"
              description="Prepare this journal to be reversed on a future date."
              checked={form.is_reversing}
              disabled={readOnly}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  is_reversing: value,
                }))
              }
            />
          </div>

          {form.is_reversing && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Reverse On">
                <Input
                  type="date"
                  disabled={readOnly}
                  value={form.reversal_date}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      reversal_date: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Reversal Narration">
                <Input
                  disabled={readOnly}
                  placeholder="Automatic reversal of this journal"
                  value={form.reversal_narration}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      reversal_narration: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="05 Approval" note="Approval is required before posting">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Approval Workflow">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approval_workflow}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    approval_workflow: e.target.value,
                  }))
                }
              >
                <option value="ACCOUNTANT_FINANCE_MANAGER">
                  Standard — Accountant → Finance Manager
                </option>
              </select>
            </Field>

            <Field label="Notify Approver">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approver}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    approver: e.target.value,
                  }))
                }
              >
                <option value="">Select approver</option>
                {approvers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name ||
                      person.name ||
                      person.email ||
                      person.username}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approval_priority}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    approval_priority: e.target.value,
                  }))
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </Field>

            <div className="md:col-span-3">
              <Label>Approval Comments</Label>
              <Textarea
                disabled={readOnly}
                rows={2}
                className="mt-2"
                placeholder="Optional message to the approver"
                value={form.approval_comments}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    approval_comments: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </Section>

        <Section
          title="06 Audit Trail"
          note="Read-only and recorded automatically"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AuditCard
              label="Created By"
              value={
                activeJournal?.created_by_name ||
                (mode === "create"
                  ? user?.full_name || user?.email || "Current user"
                  : "—")
              }
              meta={activeJournal?.created_at || "Recorded when saved"}
            />

            <AuditCard
              label="Last Modified"
              value={activeJournal?.updated_by_name || "—"}
              meta={activeJournal?.updated_at || "—"}
            />

            <AuditCard
              label="Approved By"
              value={activeJournal?.approved_by_name || "Pending"}
              meta={activeJournal?.approved_at || "—"}
            />

            <AuditCard
              label="Posted By"
              value={activeJournal?.posted_by_name || "Pending"}
              meta={activeJournal?.posted_at || "—"}
            />
          </div>
        </Section>

        <div className="flex flex-col gap-3 bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Posting remains disabled until the journal is balanced and approved.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              {readOnly ? "Close" : "Cancel"}
            </Button>

            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({ submitAfterSave: false })
                  }
                >
                  Save Draft
                </Button>

                <Button
                  type="button"
                  disabled={saveMutation.isPending || !balanced}
                  onClick={() => saveMutation.mutate({ submitAfterSave: true })}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="border-b p-5 md:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TotalCard({ label, value, good }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-black ${good ? "text-emerald-600" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function AuditCard({ label, value, meta }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-semibold">{detailValue(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detailValue(meta)}</p>
    </div>
  );
}

function WorkflowModal({
  state,
  rejectReason,
  setRejectReason,
  reverseDate,
  setReverseDate,
  reverseNarration,
  setReverseNarration,
  onClose,
  onConfirm,
  pending,
}) {
  const { journal, action } = state;

  const configs = {
    submit: {
      title: "Submit Journal for Approval?",
      description:
        "The journal will become read-only until it is approved or rejected.",
      button: "Submit for Approval",
      className: "bg-blue-600 text-white hover:bg-blue-700",
    },
    approve: {
      title: "Approve Journal Entry?",
      description: "Approval confirms the voucher is ready for final posting.",
      button: "Approve Journal",
      className: "bg-emerald-600 text-white hover:bg-emerald-700",
    },
    reject: {
      title: "Reject Journal Entry?",
      description:
        "Enter a reason. The journal will return to an editable Rejected state.",
      button: "Reject Journal",
      className: "bg-red-600 text-white hover:bg-red-700",
    },
    post: {
      title: "Post Journal to General Ledger?",
      description:
        "Posting updates account balances. A posted journal cannot be edited.",
      button: "Post Entry",
      className: "bg-violet-600 text-white hover:bg-violet-700",
    },
    duplicate: {
      title: "Duplicate Journal Entry?",
      description:
        "A new Draft voucher will be created with the same accounts and values.",
      button: "Duplicate",
      className: "bg-blue-600 text-white hover:bg-blue-700",
    },
    reverse: {
      title: "Reverse Posted Journal?",
      description:
        "A new posted reversal voucher will be created with debit and credit values swapped.",
      button: "Create Reversal",
      className: "bg-amber-600 text-white hover:bg-amber-700",
    },
  };

  const config = configs[action];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="p-6">
          <h3 className="text-xl font-bold">{config.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {config.description}
          </p>

          <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">JV Number</span>
              <span className="font-semibold">{journal.entry_number}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Current Status</span>
              <StatusBadge status={journal.status} />
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Value</span>
              <span className="font-semibold">
                {money(journal.total_debit)}
              </span>
            </div>
          </div>

          {action === "reject" && (
            <div className="mt-4">
              <Label>Rejection Reason *</Label>
              <Textarea
                autoFocus
                rows={4}
                className="mt-2"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this journal is being rejected"
              />
            </div>
          )}

          {action === "reverse" && (
            <div className="mt-4 grid gap-4">
              <Field label="Reversal Date">
                <Input
                  type="date"
                  value={reverseDate}
                  onChange={(e) => setReverseDate(e.target.value)}
                />
              </Field>

              <Field label="Reversal Narration">
                <Input
                  value={reverseNarration}
                  onChange={(e) => setReverseNarration(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={pending}
            className={config.className}
            onClick={onConfirm}
          >
            {pending ? "Processing..." : config.button}
          </Button>
        </div>
      </div>
    </div>
  );
}
