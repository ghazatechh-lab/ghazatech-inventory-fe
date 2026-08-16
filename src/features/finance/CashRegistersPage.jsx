import React from "react";
import {
  Banknote,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/StatusBadge";
import { extractRows, money, today } from "./accountingUtils";

const emptyForm = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  register_date: today(),
  opening_balance: "0",
  status: "OPEN",
});

const registerToForm = (register) => ({
  branch: register?.branch ? String(register.branch) : "",
  register_date: register?.register_date || today(),
  opening_balance: String(register?.opening_balance ?? "0"),
  status: String(register?.status || "OPEN").toUpperCase(),
});

export default function CashRegistersPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [viewRegister, setViewRegister] = React.useState(null);
  const [editRegister, setEditRegister] = React.useState(null);
  const [form, setForm] = React.useState(() => emptyForm(branchId));

  React.useEffect(() => {
    if (!createOpen && !editRegister) {
      setForm(emptyForm(branchId));
    }
  }, [branchId, createOpen, editRegister]);

  const branchesQuery = useQuery({
    queryKey: ["cash-register-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
    staleTime: 60000,
  });

  const registersQuery = useQuery({
    queryKey: ["cash-registers", branchParams],
    queryFn: () =>
      api.get("/finance/cash-register/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });

  const branches = extractRows(branchesQuery.data);
  const registers = extractRows(registersQuery.data);

  const refreshRegisters = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
    await queryClient.invalidateQueries({ queryKey: ["cash-register"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/cash-register/",
        {
          branch: Number(form.branch),
          register_date: form.register_date,
          opening_balance: Number(form.opening_balance || 0),
          total_cash_sales: 0,
          total_cash_expenses: 0,
          closing_balance: Number(form.opening_balance || 0),
          status: "OPEN",
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refreshRegisters();
      toast.success("Cash register created.");
      setCreateOpen(false);
      setForm(emptyForm(branchId));
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details?.title || "Unable to create cash register", {
        description:
          details?.summary || details?.message || error?.response?.data?.detail,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const previousOpening = Number(editRegister?.opening_balance || 0);
      const previousClosing = Number(editRegister?.closing_balance || 0);
      const newOpening = Number(form.opening_balance || 0);
      const adjustedClosing = previousClosing - previousOpening + newOpening;

      return api.patch(
        `/finance/cash-register/${editRegister.id}/`,
        {
          branch: Number(form.branch),
          register_date: form.register_date,
          opening_balance: newOpening,
          closing_balance: adjustedClosing,
          status: form.status,
        },
        { skipGlobalErrorToast: true },
      );
    },
    onSuccess: async () => {
      await refreshRegisters();
      toast.success("Cash register updated.");
      setEditRegister(null);
      setForm(emptyForm(branchId));
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details?.title || "Unable to update cash register", {
        description:
          details?.summary || details?.message || error?.response?.data?.detail,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (register) =>
      api.delete(`/finance/cash-register/${register.id}/`, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async () => {
      await refreshRegisters();
      toast.success("Cash register deleted.");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error("Cash register cannot be deleted", {
        description:
          error?.response?.data?.detail ||
          details?.summary ||
          details?.message ||
          "This cash register may already be used in a transaction.",
      });
    },
  });

  const canSave = Boolean(form.branch && form.register_date);

  const branchName = (register) =>
    register?.branch_name ||
    branches.find((b) => Number(b.id) === Number(register?.branch))
      ?.branch_name ||
    (register?.branch ? `Branch ${register.branch}` : "—");

  const handleDelete = (register) => {
    const confirmed = window.confirm(
      "Delete this cash register? This is only allowed if it has never been used in any payment or expense.",
    );
    if (confirmed) deleteMutation.mutate(register);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Registers"
        subtitle="Create and manage branch cash registers used for cash receipts and payments."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => registersQuery.refetch()}
              disabled={registersQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${registersQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => {
                setForm(emptyForm(branchId));
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Open Cash Register
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Registers</p>
          <p className="mt-2 text-2xl font-semibold">{registers.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Open Registers</p>
          <p className="mt-2 text-2xl font-semibold">
            {
              registers.filter((r) => String(r.status).toUpperCase() === "OPEN")
                .length
            }
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:col-span-2">
          <p className="text-sm text-muted-foreground">Current Cash Balance</p>
          <p className="mt-2 text-2xl font-semibold">
            {money(
              registers
                .filter((r) => String(r.status).toUpperCase() === "OPEN")
                .reduce((sum, r) => sum + Number(r.closing_balance || 0), 0),
            )}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Cash Register List</h2>
          <p className="text-sm text-muted-foreground">
            Registers that have already been used in accounting transactions
            cannot be deleted.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3 text-right">Opening</th>
                <th className="px-5 py-3 text-right">Cash Sales</th>
                <th className="px-5 py-3 text-right">Cash Expenses</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registers.map((register) => (
                <tr key={register.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4">{register.register_date || "—"}</td>
                  <td className="px-5 py-4">{branchName(register)}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {money(register.opening_balance)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {money(register.total_cash_sales)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {money(register.total_cash_expenses)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">
                    {money(register.closing_balance)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={register.status || "OPEN"} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="View cash register"
                        onClick={() => setViewRegister(register)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit cash register"
                        onClick={() => {
                          setEditRegister(register);
                          setForm(registerToForm(register));
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete cash register"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(register)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!registersQuery.isLoading && registers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No cash registers found. Click “Open Cash Register” to
                    create one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen ? (
        <RegisterFormModal
          title="Open Cash Register"
          description="Opening balance is the physical cash available when this register starts."
          form={form}
          setForm={setForm}
          branches={branches}
          showStatus={false}
          saving={createMutation.isPending}
          saveLabel="Create Cash Register"
          onClose={() => setCreateOpen(false)}
          onSave={() => createMutation.mutate()}
          canSave={canSave}
        />
      ) : null}

      {editRegister ? (
        <RegisterFormModal
          title="Edit Cash Register"
          description="Update the register details. Transaction totals are maintained by the system."
          form={form}
          setForm={setForm}
          branches={branches}
          showStatus
          saving={updateMutation.isPending}
          saveLabel="Save Changes"
          onClose={() => setEditRegister(null)}
          onSave={() => updateMutation.mutate()}
          canSave={canSave}
        />
      ) : null}

      {viewRegister ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-background shadow-xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">Cash Register Details</h2>
                <p className="text-sm text-muted-foreground">
                  View the register balance and activity totals.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setViewRegister(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Detail label="Branch" value={branchName(viewRegister)} />
              <Detail
                label="Register Date"
                value={viewRegister.register_date || "—"}
              />
              <Detail
                label="Opening Balance"
                value={money(viewRegister.opening_balance)}
              />
              <Detail
                label="Cash Sales"
                value={money(viewRegister.total_cash_sales)}
              />
              <Detail
                label="Cash Expenses"
                value={money(viewRegister.total_cash_expenses)}
              />
              <Detail
                label="Current Balance"
                value={money(viewRegister.closing_balance)}
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge status={viewRegister.status || "OPEN"} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewRegister(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setForm(registerToForm(viewRegister));
                  setEditRegister(viewRegister);
                  setViewRegister(null);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RegisterFormModal({
  title,
  description,
  form,
  setForm,
  branches,
  showStatus,
  saving,
  saveLabel,
  onClose,
  onSave,
  canSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 p-5">
          <div>
            <Label htmlFor="cash-branch">Branch *</Label>
            <select
              id="cash-branch"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.branch}
              onChange={(e) =>
                setForm((v) => ({ ...v, branch: e.target.value }))
              }
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.branch_name || branch.name || branch.branch_code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="cash-register-date">Register Date *</Label>
            <Input
              id="cash-register-date"
              type="date"
              className="mt-2"
              value={form.register_date}
              onChange={(e) =>
                setForm((v) => ({ ...v, register_date: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="cash-opening">Opening Balance</Label>
            <div className="relative mt-2">
              <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cash-opening"
                type="number"
                min="0"
                step="0.01"
                className="pl-9"
                value={form.opening_balance}
                onChange={(e) =>
                  setForm((v) => ({ ...v, opening_balance: e.target.value }))
                }
              />
            </div>
          </div>

          {showStatus ? (
            <div>
              <Label htmlFor="cash-status">Status</Label>
              <select
                id="cash-status"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((v) => ({ ...v, status: e.target.value }))
                }
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Close a register instead of deleting it when it has accounting
                history.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Enter 0 if there is no physical cash in the register yet.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave || saving} onClick={onSave}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
