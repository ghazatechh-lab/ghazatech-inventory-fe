import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Plus, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { extractRows, money, today } from "./accountingUtils";

const blankLine = () => ({
  account: "",
  description: "",
  debit: "",
  credit: "",
});

const blankForm = () => ({
  entry_number: `JV-${Date.now()}`,
  entry_date: today(),
  branch: "",
  voucher_type: "MANUAL",
  reference: "",
  description: "",
  attachment: null,

  is_recurring_template: false,
  recurrence_frequency: "",

  is_reversing: false,
  reversal_date: "",

  approval_workflow: "ACCOUNTANT_FINANCE_MANAGER",
  approver: "",

  status: "DRAFT",
  lines: [blankLine(), blankLine()],
});

const getUserDisplayName = (user) =>
  user?.full_name ||
  user?.name ||
  [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "Current user";

export default function JournalEntriesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [form, setForm] = React.useState(blankForm);

  React.useEffect(() => {
    if (branchId) {
      setForm((current) => ({
        ...current,
        branch: String(branchId),
      }));
    }
  }, [branchId]);

  const accountsQuery = useQuery({
    queryKey: ["journal-account-options", branchId],

    queryFn: async () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: branchId || undefined,
          is_active: true,
          page_size: 1000,
          ordering: "code",
        },
      }),
  });

  const branchesQuery = useQuery({
    queryKey: ["journal-branches"],

    queryFn: async () =>
      api.get("/branches/", {
        params: {
          page_size: 500,
        },
      }),
  });

  const usersQuery = useQuery({
    queryKey: ["journal-approver-options"],

    queryFn: async () => api.get("/auth/users/form-options/"),

    staleTime: 60_000,
  });

  const journalsQuery = useQuery({
    queryKey: ["journal-register", branchId],

    queryFn: async () =>
      api.get("/finance/journals/", {
        params: {
          ...branchParams,
          page_size: 500,
          ordering: "-entry_date,-id",
        },
      }),

    staleTime: 0,
    refetchOnMount: "always",
  });

  const accounts = extractRows(accountsQuery.data);

  const branches = extractRows(branchesQuery.data);

  const journals = extractRows(journalsQuery.data);

  const approvers = React.useMemo(() => {
    const response = usersQuery.data?.data ?? usersQuery.data;

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.users)) {
      return response.users;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    if (Array.isArray(response?.data?.users)) {
      return response.data.users;
    }

    if (Array.isArray(response?.data?.results)) {
      return response.data.results;
    }

    return [];
  }, [usersQuery.data]);

  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (result, line) => ({
          debit: result.debit + Number(line.debit || 0),

          credit: result.credit + Number(line.credit || 0),
        }),
        {
          debit: 0,
          credit: 0,
        },
      ),
    [form.lines],
  );

  const balanced =
    totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.005;

  const openNewJournal = () => {
    setForm({
      ...blankForm(),
      branch: branchId ? String(branchId) : "",
    });

    setOpen(true);
  };

  const closeModal = () => {
    if (save.isPending) {
      return;
    }

    setOpen(false);
  };

  const save = useMutation({
    mutationFn: async ({ postImmediately }) => {
      const payload = {
        entry_number: form.entry_number.trim(),

        entry_date: form.entry_date,

        branch: Number(form.branch),

        voucher_type: form.voucher_type,

        reference: form.reference.trim(),

        description: form.description.trim(),

        is_recurring_template: Boolean(form.is_recurring_template),

        recurrence_frequency: form.is_recurring_template
          ? form.recurrence_frequency
          : "",

        is_reversing: Boolean(form.is_reversing),

        reversal_date:
          form.is_reversing && form.reversal_date ? form.reversal_date : null,

        approval_workflow: form.approval_workflow,

        approver: form.approver ? Number(form.approver) : null,

        status: postImmediately ? "APPROVED" : "DRAFT",

        lines: form.lines.map((line) => ({
          account: Number(line.account),

          description: line.description.trim(),

          debit: Number(line.debit || 0),

          credit: Number(line.credit || 0),
        })),
      };

      const response = await api.post("/finance/journals/", payload, {
        skipGlobalErrorToast: true,
      });

      const journal = response?.data?.data || response?.data || response;

      if (postImmediately) {
        await api.post(
          `/finance/journals/${journal.id}/post/`,
          {},
          {
            skipGlobalErrorToast: true,
          },
        );
      }

      return response;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["journal-register"],
        exact: false,
      });

      await journalsQuery.refetch();

      toast.success(
        variables.postImmediately
          ? "Journal posted successfully."
          : "Journal saved as draft.",
      );

      setOpen(false);

      setForm({
        ...blankForm(),
        branch: branchId ? String(branchId) : "",
      });
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save journal", {
        description:
          details.summary ||
          details.message ||
          error?.response?.data?.detail ||
          "Check the journal fields and entry lines.",
      });
    },
  });

  const updateLine = (index, key, value) => {
    setForm((current) => ({
      ...current,

      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [key]: value,
            }
          : line,
      ),
    }));
  };

  const submit = (postImmediately) => {
    if (
      !form.entry_number.trim() ||
      !form.branch ||
      !form.entry_date ||
      !form.description.trim()
    ) {
      toast.error("JV number, date, branch, and narration are required.");
      return;
    }

    if (
      form.lines.some(
        (line) =>
          !line.account ||
          (Number(line.debit || 0) <= 0 && Number(line.credit || 0) <= 0),
      )
    ) {
      toast.error(
        "Select an account and enter a debit or credit amount on every line.",
      );
      return;
    }

    if (!balanced) {
      toast.error("Total debit must equal total credit.");
      return;
    }

    if (form.is_recurring_template && !form.recurrence_frequency) {
      toast.error("Select a recurrence frequency.");
      return;
    }

    if (form.is_reversing && !form.reversal_date) {
      toast.error("Select a reversal date.");
      return;
    }

    save.mutate({
      postImmediately,
    });
  };

  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle="Create, approve, post, and review balanced journal vouchers."
        actions={
          <div className="flex gap-2">
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
              onClick={openNewJournal}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="text-xl font-semibold">Journal Register</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Manual and system-generated vouchers for the selected branch.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "JV No.",
                  "Date",
                  "Type",
                  "Narration",
                  "Debit",
                  "Credit",
                  "Status",
                  "Approved By",
                  "Posted By",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {journals.map((journal) => (
                <tr key={journal.id} className="border-b">
                  <td className="px-4 py-3 font-medium">
                    {journal.entry_number}
                  </td>

                  <td className="px-4 py-3">{journal.entry_date}</td>

                  <td className="px-4 py-3">
                    {journal.voucher_type_display || journal.voucher_type}
                  </td>

                  <td className="px-4 py-3">{journal.description}</td>

                  <td className="px-4 py-3">{money(journal.total_debit)}</td>

                  <td className="px-4 py-3">{money(journal.total_credit)}</td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {journal.status_display || journal.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {journal.approved_by_name || "Pending"}
                  </td>

                  <td className="px-4 py-3">
                    {journal.posted_by_name || "Pending"}
                  </td>
                </tr>
              ))}

              {!journals.length && (
                <tr>
                  <td
                    colSpan="9"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No journal entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Finance & Accounting · Journal Entries
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  New Journal Voucher
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Every voucher must balance before it can be posted.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <section className="border-b p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">01 Voucher details</h3>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Draft — not posted
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>JV Number *</Label>

                  <Input
                    className="mt-2"
                    value={form.entry_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        entry_number: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Date *</Label>

                  <Input
                    className="mt-2"
                    type="date"
                    value={form.entry_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        entry_date: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Branch *</Label>

                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.branch}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select branch</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name || branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Reference</Label>

                  <Input
                    className="mt-2"
                    placeholder="Invoice / Cheque no."
                    value={form.reference}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reference: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-4">
                  <Label>Voucher Type *</Label>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "MANUAL",
                      "SALES",
                      "PURCHASE",
                      "RECEIPT",
                      "PAYMENT",
                      "CONTRA",
                      "SYSTEM",
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            voucher_type: type,
                          }))
                        }
                        className={`rounded-full border px-4 py-2 text-sm ${
                          form.voucher_type === type
                            ? "bg-slate-900 text-white"
                            : "bg-background"
                        }`}
                      >
                        {type
                          .toLowerCase()
                          .replace(/^./, (value) => value.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-4">
                  <Label>Narration *</Label>

                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="border-b p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">02 Entry lines</h3>

                <span className="text-sm text-muted-foreground">
                  Debit total must equal credit total
                </span>
              </div>

              <div className="space-y-3">
                {form.lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1.5fr_1.3fr_0.8fr_0.8fr_auto]"
                  >
                    <select
                      className="h-10 rounded-md border bg-background px-3"
                      value={line.account}
                      onChange={(event) =>
                        updateLine(index, "account", event.target.value)
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
                      placeholder="Description"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, "description", event.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(event) =>
                        updateLine(index, "debit", event.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Credit"
                      value={line.credit}
                      onChange={(event) =>
                        updateLine(index, "credit", event.target.value)
                      }
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={form.lines.length <= 2}
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

              <div className="mt-5 flex flex-wrap justify-end gap-6 border-t pt-4 font-mono">
                <span>Debit: {money(totals.debit)}</span>

                <span>Credit: {money(totals.credit)}</span>

                <span
                  className={
                    balanced
                      ? "font-semibold text-green-700"
                      : "font-semibold text-red-600"
                  }
                >
                  {balanced ? "Balanced ✓" : "Not balanced"}
                </span>
              </div>
            </section>

            <section className="border-b p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  03 Supporting document
                </h3>

                <span className="text-sm text-muted-foreground">Optional</span>
              </div>

              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-8 text-sm">
                <FileUp className="mr-2 h-5 w-5" />

                {form.attachment
                  ? form.attachment.name
                  : "Attach an invoice, cheque scan, or approval email"}

                <input
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,

                      attachment: event.target.files?.[0] || null,
                    }))
                  }
                />
              </label>
            </section>

            <section className="border-b p-6">
              <h3 className="mb-4 text-lg font-semibold">
                04 Recurring & reversing
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <p className="font-medium">Save as recurring template</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate future draft vouchers using the same lines and
                      narration.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={form.is_recurring_template}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        is_recurring_template: event.target.checked,
                      }))
                    }
                  />
                </div>

                {form.is_recurring_template && (
                  <div>
                    <Label>Recurrence frequency *</Label>

                    <select
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                      value={form.recurrence_frequency}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          recurrence_frequency: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select frequency</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <p className="font-medium">Mark as reversing entry</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Create an offsetting voucher on the selected future date.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={form.is_reversing}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        is_reversing: event.target.checked,
                      }))
                    }
                  />
                </div>

                {form.is_reversing && (
                  <div>
                    <Label>Reversal date *</Label>

                    <Input
                      className="mt-2"
                      type="date"
                      value={form.reversal_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          reversal_date: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="border-b p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">05 Approval</h3>

                <span className="text-sm text-muted-foreground">
                  Multi-level, before posting
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Approval Workflow</Label>

                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.approval_workflow}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        approval_workflow: event.target.value,
                      }))
                    }
                  >
                    <option value="NONE">No approval required</option>

                    <option value="ACCOUNTANT_FINANCE_MANAGER">
                      Standard — Accountant → Finance Manager
                    </option>

                    <option value="BRANCH_MANAGER_FINANCE_MANAGER">
                      Branch Manager → Finance Manager
                    </option>

                    <option value="FINANCE_MANAGER_ADMIN">
                      Finance Manager → Admin
                    </option>
                  </select>
                </div>

                <div>
                  <Label>Notify Approver</Label>

                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={form.approver}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        approver: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select approver</option>

                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>
                        {getUserDisplayName(approver)}
                        {approver.role_name ? ` — ${approver.role_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">06 Audit trail</h3>

                <span className="text-sm text-muted-foreground">
                  Read-only, recorded automatically
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Created by
                  </p>

                  <p className="mt-2 font-medium">{getUserDisplayName(user)}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Recorded when saved
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Approved by
                  </p>

                  <p className="mt-2 font-medium">Pending</p>

                  <p className="mt-1 text-xs text-muted-foreground">—</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Posted by
                  </p>

                  <p className="mt-2 font-medium">Pending</p>

                  <p className="mt-1 text-xs text-muted-foreground">—</p>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
              <p className="text-sm text-muted-foreground">
                {!balanced
                  ? "Posting is disabled until total debit equals total credit."
                  : form.approval_workflow !== "NONE" && !form.approver
                    ? "Select an approver before posting."
                    : "Voucher is ready to save or post."}
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => submit(false)}
                >
                  Save as Draft
                </Button>

                <Button
                  type="button"
                  disabled={
                    save.isPending ||
                    !balanced ||
                    (form.approval_workflow !== "NONE" && !form.approver)
                  }
                  onClick={() => submit(true)}
                  className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
                >
                  Post Entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
