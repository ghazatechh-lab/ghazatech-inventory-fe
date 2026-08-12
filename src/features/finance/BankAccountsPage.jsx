import React from "react";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Download,
  Landmark,
  Plus,
  Printer,
  RefreshCw,
  WalletCards,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { extractRows, money, today } from "./accountingUtils";

const num = (v) => Number(v || 0);
const normalize = (v) => String(v || "").toUpperCase();

const blankAccount = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  bank_name: "",
  account_name: "",
  account_number: "",
  iban_number: "",
  account_type: "BANK",
  currency: "AED",
  chart_account: "",
  opening_balance: "0",
  statement_balance: "0",
  is_active: true,
});

const blankEntry = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  bank_account: "",
  transaction_date: today(),
  transaction_type: "PAYMENT",
  particulars: "",
  receipt_amount: "0",
  payment_amount: "0",
  reference: "",
});

const blankTransfer = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  from_account: "",
  to_account: "",
  transfer_date: today(),
  amount: "",
  notes: "",
});

export default function BankAccountsPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [tab, setTab] = React.useState("accounts");
  const [modal, setModal] = React.useState(null);
  const [account, setAccount] = React.useState(() => blankAccount(branchId));
  const [entry, setEntry] = React.useState(() => blankEntry(branchId));
  const [transfer, setTransfer] = React.useState(() => blankTransfer(branchId));
  const [filters, setFilters] = React.useState({
    bank_account: "",
    date_from: "",
    date_to: "",
    reconciliation_status: "",
  });

  const branchesQ = useQuery({
    queryKey: ["bankcash-branches"],
    queryFn: () =>
      api.get("/branches/", {
        params: { page_size: 500 },
      }),
    staleTime: 60000,
  });

  const glQ = useQuery({
    queryKey: ["bankcash-gl", account.branch],
    queryFn: () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: account.branch || undefined,
          account_type: "ASSET",
          is_active: true,
          page_size: 1000,
        },
      }),
    enabled: Boolean(account.branch),
  });

  const accountsQ = useQuery({
    queryKey: ["bankcash-accounts", branchParams],
    queryFn: () =>
      api.get("/finance/bank-accounts/", {
        params: {
          ...branchParams,
          page_size: 1000,
        },
      }),
    staleTime: 0,
  });

  const txQ = useQuery({
    queryKey: ["bankcash-transactions", branchParams, filters],
    queryFn: () =>
      api.get("/finance/bank-transactions/", {
        params: {
          ...branchParams,
          bank_account: filters.bank_account || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          reconciliation_status: filters.reconciliation_status || undefined,
          page_size: 2000,
        },
      }),
    staleTime: 0,
  });

  const transfersQ = useQuery({
    queryKey: ["bankcash-transfers", branchParams],
    queryFn: () =>
      api.get("/finance/fund-transfers/", {
        params: {
          ...branchParams,
          page_size: 1000,
        },
      }),
    staleTime: 0,
  });

  const summaryQ = useQuery({
    queryKey: ["bankcash-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/bank-accounts/summary/", {
          params: branchParams,
        }),
      ),
    staleTime: 0,
  });

  const branches = extractRows(branchesQ.data);
  const glAccounts = extractRows(glQ.data);
  const accounts = extractRows(accountsQ.data);
  const transactions = extractRows(txQ.data);
  const transfers = extractRows(transfersQ.data);
  const summary = summaryQ.data || {};

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["bankcash-accounts"] }),
      qc.invalidateQueries({ queryKey: ["bankcash-transactions"] }),
      qc.invalidateQueries({ queryKey: ["bankcash-transfers"] }),
      qc.invalidateQueries({ queryKey: ["bankcash-summary"] }),
    ]);
  };

  const handleError = (error) => {
    const d = getApiErrorDetails(error);
    toast.error(d.title || "Unable to save", {
      description: d.summary || d.message || error?.response?.data?.detail,
    });
  };

  const accountMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/bank-accounts/",
        {
          ...account,
          branch: Number(account.branch),
          chart_account: account.chart_account
            ? Number(account.chart_account)
            : null,
          opening_balance: num(account.opening_balance),
          current_balance: num(account.opening_balance),
          statement_balance: num(account.statement_balance),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Bank / cash account created.");
      setModal(null);
      setAccount(blankAccount(branchId));
    },
    onError: handleError,
  });

  const entryMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/bank-transactions/",
        {
          ...entry,
          branch: Number(entry.branch),
          bank_account: Number(entry.bank_account),
          receipt_amount: num(entry.receipt_amount),
          payment_amount: num(entry.payment_amount),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Cashbook entry recorded.");
      setModal(null);
      setEntry(blankEntry(branchId));
    },
    onError: handleError,
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/fund-transfers/",
        {
          ...transfer,
          branch: Number(transfer.branch),
          from_account: Number(transfer.from_account),
          to_account: Number(transfer.to_account),
          amount: num(transfer.amount),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Fund transfer completed.");
      setModal(null);
      setTransfer(blankTransfer(branchId));
    },
    onError: handleError,
  });

  const reconcileMutation = useMutation({
    mutationFn: (id) =>
      api.post(
        `/finance/bank-transactions/${id}/reconcile/`,
        {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Transaction reconciled.");
    },
    onError: handleError,
  });

  const exportCashbook = async () => {
    try {
      const response = await api.get("/finance/bank-transactions/export/", {
        params: {
          ...branchParams,
          bank_account: filters.bank_account || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          reconciliation_status: filters.reconciliation_status || undefined,
        },
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "bank-cashbook.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to export cashbook.");
    }
  };

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Bank & Cash"
        subtitle="Manage bank accounts, cashbook entries, reconciliation, and internal fund transfers."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button variant="outline" onClick={exportCashbook}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Bank Balance"
          value={money(summary.bank_balance || 0)}
          icon={<Landmark className="h-5 w-5" />}
        />
        <Kpi
          label="Cash Balance"
          value={money(summary.cash_balance || 0)}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <Kpi
          label="Unreconciled"
          value={money(summary.unreconciled_amount || 0)}
          icon={<RefreshCw className="h-5 w-5" />}
          tone="amber"
        />
        <Kpi
          label="Active Accounts"
          value={summary.active_accounts || 0}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["accounts", "Bank Accounts"],
          ["cashbook", "Cashbook"],
          ["reconciliation", "Reconciliation"],
          ["transfers", "Fund Transfers"],
        ]}
      />

      {tab === "accounts" && (
        <AccountsTab
          accounts={accounts}
          onNew={() => {
            setAccount(blankAccount(branchId));
            setModal("account");
          }}
        />
      )}

      {tab === "cashbook" && (
        <CashbookTab
          accounts={accounts}
          transactions={transactions}
          filters={filters}
          setFilters={setFilters}
          onNew={() => {
            setEntry(blankEntry(branchId));
            setModal("entry");
          }}
        />
      )}

      {tab === "reconciliation" && (
        <ReconciliationTab
          rows={transactions.filter(
            (t) => normalize(t.reconciliation_status) !== "RECONCILED",
          )}
          onReconcile={(id) => reconcileMutation.mutate(id)}
        />
      )}

      {tab === "transfers" && (
        <TransfersTab
          rows={transfers}
          onNew={() => {
            setTransfer(blankTransfer(branchId));
            setModal("transfer");
          }}
        />
      )}

      {modal === "account" && (
        <AccountModal
          form={account}
          setForm={setAccount}
          branches={branches}
          glAccounts={glAccounts}
          onClose={() => setModal(null)}
          onSave={() => accountMutation.mutate()}
          pending={accountMutation.isPending}
        />
      )}

      {modal === "entry" && (
        <EntryModal
          form={entry}
          setForm={setEntry}
          branches={branches}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSave={() => entryMutation.mutate()}
          pending={entryMutation.isPending}
        />
      )}

      {modal === "transfer" && (
        <TransferModal
          form={transfer}
          setForm={setTransfer}
          branches={branches}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSave={() => transferMutation.mutate()}
          pending={transferMutation.isPending}
        />
      )}
    </div>
  );
}

function AccountsTab({ accounts, onNew }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-5">
        <div>
          <h2 className="text-lg font-bold">Bank & Cash Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Operating bank, petty cash and cash-on-hand accounts.
          </p>
        </div>

        <Button onClick={onNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <SimpleTable
        headers={[
          "Account",
          "Bank",
          "Type",
          "Account No.",
          "IBAN",
          "Currency",
          "Book Balance",
          "Statement Balance",
          "Status",
        ]}
        rows={accounts.map((a) => [
          a.account_name,
          a.bank_name || "Cash",
          a.account_type_display || a.account_type,
          a.account_number || "—",
          a.iban_number || "—",
          a.currency || "AED",
          money(a.current_balance),
          money(a.statement_balance),
          <StatusBadge status={a.is_active ? "ACTIVE" : "INACTIVE"} />,
        ])}
      />
    </div>
  );
}

function CashbookTab({ accounts, transactions, filters, setFilters, onNew }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-[1fr_.8fr_.8fr_.8fr_auto]">
        <Field label="Account">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.bank_account}
            onChange={(e) =>
              setFilters((x) => ({
                ...x,
                bank_account: e.target.value,
              }))
            }
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="From Date">
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((x) => ({
                ...x,
                date_from: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="To Date">
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((x) => ({
                ...x,
                date_to: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Reconciliation">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.reconciliation_status}
            onChange={(e) =>
              setFilters((x) => ({
                ...x,
                reconciliation_status: e.target.value,
              }))
            }
          >
            <option value="">All</option>
            <option value="UNMATCHED">Unmatched</option>
            <option value="RECONCILED">Reconciled</option>
          </select>
        </Field>

        <div className="flex items-end">
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <SimpleTable
        headers={[
          "Voucher",
          "Date",
          "Account",
          "Type",
          "Particulars",
          "Reference",
          "Receipt",
          "Payment",
          "Running Balance",
          "Reconciliation",
        ]}
        rows={transactions.map((t) => [
          t.voucher_number,
          t.transaction_date,
          t.bank_account_name,
          t.transaction_type_display || t.transaction_type,
          t.particulars,
          t.reference || "—",
          num(t.receipt_amount) ? money(t.receipt_amount) : "—",
          num(t.payment_amount) ? money(t.payment_amount) : "—",
          money(t.running_balance),
          <StatusBadge status={t.reconciliation_status} />,
        ])}
      />
    </div>
  );
}

function ReconciliationTab({ rows, onReconcile }) {
  return (
    <SimpleTable
      headers={[
        "Voucher",
        "Date",
        "Account",
        "Reference",
        "Amount",
        "Status",
        "Action",
      ]}
      rows={rows.map((t) => [
        t.voucher_number,
        t.transaction_date,
        t.bank_account_name,
        t.reference || "—",
        money(num(t.receipt_amount) || num(t.payment_amount)),
        <StatusBadge status={t.reconciliation_status} />,
        <Button size="sm" variant="outline" onClick={() => onReconcile(t.id)}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark Reconciled
        </Button>,
      ])}
    />
  );
}

function TransfersTab({ rows, onNew }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onNew}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      <SimpleTable
        headers={[
          "Reference",
          "Date",
          "From",
          "To",
          "Amount",
          "Status",
          "Notes",
        ]}
        rows={rows.map((t) => [
          t.reference_number,
          t.transfer_date,
          t.from_account_name,
          t.to_account_name,
          money(t.amount),
          <StatusBadge status={t.status || "POSTED"} />,
          t.notes || "—",
        ])}
      />
    </div>
  );
}

function AccountModal({
  form,
  setForm,
  branches,
  glAccounts,
  onClose,
  onSave,
  pending,
}) {
  return (
    <Modal title="Add Bank / Cash Account" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.branch}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                branch: e.target.value,
                chart_account: "",
              }))
            }
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name || b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Account Type">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.account_type}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                account_type: e.target.value,
              }))
            }
          >
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
          </select>
        </Field>

        <Field label="Bank Name">
          <Input
            value={form.bank_name}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                bank_name: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Account Name">
          <Input
            value={form.account_name}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                account_name: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Account Number">
          <Input
            value={form.account_number}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                account_number: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="IBAN">
          <Input
            value={form.iban_number}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                iban_number: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Currency">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.currency}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                currency: e.target.value,
              }))
            }
          >
            <option>AED</option>
            <option>USD</option>
          </select>
        </Field>

        <Field label="GL Account">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.chart_account}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                chart_account: e.target.value,
              }))
            }
          >
            <option value="">Select GL account</option>
            {glAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Opening Balance">
          <Input
            type="number"
            value={form.opening_balance}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                opening_balance: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Statement Balance">
          <Input
            type="number"
            value={form.statement_balance}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                statement_balance: e.target.value,
              }))
            }
          />
        </Field>
      </div>

      <Footer
        pending={pending}
        onClose={onClose}
        onSave={onSave}
        label="Create Account"
      />
    </Modal>
  );
}

function EntryModal({
  form,
  setForm,
  branches,
  accounts,
  onClose,
  onSave,
  pending,
}) {
  const isReceipt = form.transaction_type === "RECEIPT";

  return (
    <Modal title="New Cashbook Entry" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.branch}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                branch: e.target.value,
                bank_account: "",
              }))
            }
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name || b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Account">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.bank_account}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                bank_account: e.target.value,
              }))
            }
          >
            <option value="">Select account</option>
            {accounts
              .filter(
                (a) =>
                  !form.branch ||
                  String(a.branch?.id || a.branch) === String(form.branch),
              )
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Date">
          <Input
            type="date"
            value={form.transaction_date}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                transaction_date: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Type">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.transaction_type}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                transaction_type: e.target.value,
                receipt_amount: "0",
                payment_amount: "0",
              }))
            }
          >
            <option value="RECEIPT">Receipt</option>
            <option value="PAYMENT">Payment</option>
            <option value="BANK_CHARGE">Bank Charge</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </Field>

        <Field label="Particulars">
          <Input
            value={form.particulars}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                particulars: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Reference">
          <Input
            value={form.reference}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                reference: e.target.value,
              }))
            }
          />
        </Field>

        <Field label={isReceipt ? "Receipt Amount" : "Payment Amount"}>
          <Input
            type="number"
            value={isReceipt ? form.receipt_amount : form.payment_amount}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                [isReceipt ? "receipt_amount" : "payment_amount"]:
                  e.target.value,
              }))
            }
          />
        </Field>
      </div>

      <Footer
        pending={pending}
        onClose={onClose}
        onSave={onSave}
        label="Record Entry"
      />
    </Modal>
  );
}

function TransferModal({
  form,
  setForm,
  branches,
  accounts,
  onClose,
  onSave,
  pending,
}) {
  const available = accounts.filter(
    (a) =>
      !form.branch || String(a.branch?.id || a.branch) === String(form.branch),
  );

  return (
    <Modal title="Internal Fund Transfer" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.branch}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                branch: e.target.value,
                from_account: "",
                to_account: "",
              }))
            }
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name || b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Transfer Date">
          <Input
            type="date"
            value={form.transfer_date}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                transfer_date: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="From Account">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.from_account}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                from_account: e.target.value,
              }))
            }
          >
            <option value="">Select source</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} — {money(a.current_balance)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="To Account">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={form.to_account}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                to_account: e.target.value,
              }))
            }
          >
            <option value="">Select destination</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount">
          <Input
            type="number"
            value={form.amount}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                amount: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                notes: e.target.value,
              }))
            }
          />
        </Field>
      </div>

      <Footer
        pending={pending}
        onClose={onClose}
        onSave={onSave}
        label="Transfer Funds"
      />
    </Modal>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5">
      {items.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
            value === v
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((v, j) => (
                <td key={j} className="px-4 py-3">
                  {v ?? "—"}
                </td>
              ))}
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td
                colSpan={headers.length}
                className="p-10 text-center text-muted-foreground"
              >
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-background p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer({ pending, onClose, onSave, label }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>

      <Button disabled={pending} onClick={onSave}>
        {pending ? "Saving..." : label}
      </Button>
    </div>
  );
}

function Kpi({ label, value, icon, tone }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p
        className={`mt-2 text-2xl font-black ${
          tone === "amber" ? "text-amber-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
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
