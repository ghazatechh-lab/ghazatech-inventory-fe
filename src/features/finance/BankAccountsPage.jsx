import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, Modal, Field } from "./FinanceSectionUI";
import { extractRows, money, today } from "./accountingUtils";

const blankAccount = {
  branch: "",
  bank_name: "",
  account_name: "",
  account_number: "",
  iban_number: "",
  opening_balance: "0",
  current_balance: "0",
  is_active: true,
};
const blankCash = {
  branch: "",
  bank_account: "",
  voucher_number: `CV-${Date.now()}`,
  transaction_date: today(),
  transaction_type: "PAYMENT",
  particulars: "",
  receipt_amount: "0",
  payment_amount: "0",
  reference: "",
};
const blankTransfer = {
  branch: "",
  reference_number: `FT-${Date.now()}`,
  from_account: "",
  to_account: "",
  transfer_date: today(),
  amount: "",
  notes: "",
};

export default function BankAccountsPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("accounts"),
    [modal, setModal] = React.useState(null),
    [account, setAccount] = React.useState(blankAccount),
    [cash, setCash] = React.useState(blankCash),
    [transfer, setTransfer] = React.useState(blankTransfer);
  React.useEffect(() => {
    if (branchId) {
      setAccount((v) => ({ ...v, branch: String(branchId) }));
      setCash((v) => ({ ...v, branch: String(branchId) }));
      setTransfer((v) => ({ ...v, branch: String(branchId) }));
    }
  }, [branchId]);
  const accountsQ = useQuery({
    queryKey: ["bank-accounts", branchId],
    queryFn: () =>
      api.get("/finance/bank-accounts/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const txQ = useQuery({
    queryKey: ["bank-transactions", branchId],
    queryFn: () =>
      api.get("/finance/bank-transactions/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const accounts = extractRows(accountsQ.data),
    tx = extractRows(txQ.data);
  const save = (endpoint, payload, success) =>
    api
      .post(endpoint, payload, { skipGlobalErrorToast: true })
      .then(async (r) => {
        await qc.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey.some((k) => String(k).startsWith("bank-")),
        });
        await Promise.all([accountsQ.refetch(), txQ.refetch()]);
        toast.success(success);
        setModal(null);
        return r;
      })
      .catch((e) => {
        const d = getApiErrorDetails(e);
        toast.error(d.title || "Unable to save", {
          description: d.summary || d.message,
        });
        throw e;
      });
  const mutation = useMutation({
    mutationFn: ({ endpoint, payload, success }) =>
      save(endpoint, payload, success),
  });
  const balance = tx.reduce(
    (s, r) => s + Number(r.receipt_amount || 0) - Number(r.payment_amount || 0),
    0,
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank & Cash"
        subtitle="Bank accounts, cashbook, reconciliation, and internal fund transfers."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "accounts", label: "Bank Accounts" },
          { value: "cashbook", label: "Cashbook" },
          { value: "reconciliation", label: "Bank Reconciliation" },
          { value: "transfer", label: "Fund Transfer" },
        ]}
      />
      {tab === "accounts" && (
        <>
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setModal("account")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Bank Account
            </Button>
          </div>
          <Table
            headers={[
              "Account",
              "Bank",
              "IBAN",
              "Branch",
              "Book Balance",
              "Status",
            ]}
            rows={accounts.map((a) => [
              a.account_name,
              a.bank_name,
              a.iban_number || "—",
              a.branch_name,
              money(a.current_balance),
              a.is_active ? "Active" : "Inactive",
            ])}
          />
        </>
      )}
      {tab === "cashbook" && (
        <>
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setModal("cash")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Cash Entry
            </Button>
          </div>
          <Table
            headers={[
              "Date",
              "Voucher No.",
              "Particulars",
              "Receipts",
              "Payments",
              "Balance",
            ]}
            rows={tx.map((r) => [
              r.transaction_date,
              r.voucher_number,
              r.particulars,
              money(r.receipt_amount),
              money(r.payment_amount),
              money(r.running_balance),
            ])}
            footer={[
              "Closing balance",
              "",
              "",
              money(tx.reduce((s, r) => s + Number(r.receipt_amount || 0), 0)),
              money(tx.reduce((s, r) => s + Number(r.payment_amount || 0), 0)),
              money(balance),
            ]}
          />
        </>
      )}
      {tab === "reconciliation" && (
        <>
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="text-lg font-semibold">
              Bank Reconciliation Statement
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <p>Book balance</p>
              <p className="text-right font-mono">
                {money(
                  accounts.reduce(
                    (s, a) => s + Number(a.current_balance || 0),
                    0,
                  ),
                )}
              </p>
              <p>Unmatched bank items</p>
              <p className="text-right font-mono">
                {money(
                  tx
                    .filter((r) => r.reconciliation_status !== "MATCHED")
                    .reduce(
                      (s, r) =>
                        s +
                        Number(r.receipt_amount || 0) -
                        Number(r.payment_amount || 0),
                      0,
                    ),
                )}
              </p>
            </div>
          </div>
          <Table
            headers={[
              "Date",
              "Description",
              "Amount",
              "Bank Stmt",
              "Book",
              "Status",
            ]}
            rows={tx.map((r) => [
              r.transaction_date,
              r.particulars,
              money(
                Number(r.receipt_amount || 0) - Number(r.payment_amount || 0),
              ),
              r.is_bank_statement ? "✓" : "—",
              r.is_book_entry ? "✓" : "—",
              r.reconciliation_status,
            ])}
          />
        </>
      )}
      {tab === "transfer" && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="From Account">
              <Select
                value={transfer.from_account}
                onChange={(v) =>
                  setTransfer((x) => ({ ...x, from_account: v }))
                }
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.account_name,
                }))}
              />
            </Field>
            <Field label="To Account">
              <Select
                value={transfer.to_account}
                onChange={(v) => setTransfer((x) => ({ ...x, to_account: v }))}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.account_name,
                }))}
              />
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                value={transfer.amount}
                onChange={(e) =>
                  setTransfer((x) => ({ ...x, amount: e.target.value }))
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={transfer.transfer_date}
                onChange={(e) =>
                  setTransfer((x) => ({ ...x, transfer_date: e.target.value }))
                }
              />
            </Field>
          </div>
          <Button
            className="mt-5 bg-slate-900 text-white"
            onClick={() =>
              mutation.mutate({
                endpoint: "/finance/fund-transfers/",
                payload: {
                  ...transfer,
                  branch: Number(transfer.branch),
                  from_account: Number(transfer.from_account),
                  to_account: Number(transfer.to_account),
                  amount: Number(transfer.amount),
                },
                success: "Fund transfer recorded.",
              })
            }
          >
            Record Transfer
          </Button>
        </div>
      )}
      <Modal
        open={modal === "account"}
        onClose={() => setModal(null)}
        title="New Bank Account"
        eyebrow="Finance & Accounting · Bank & Cash"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              className="bg-slate-900 text-white"
              onClick={() =>
                mutation.mutate({
                  endpoint: "/finance/bank-accounts/",
                  payload: {
                    ...account,
                    branch: Number(account.branch),
                    opening_balance: Number(account.opening_balance),
                    current_balance: Number(
                      account.current_balance || account.opening_balance,
                    ),
                  },
                  success: "Bank account added.",
                })
              }
            >
              Save Account
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {[
            ["Bank Name", "bank_name"],
            ["Account Name", "account_name"],
            ["Account Number", "account_number"],
            ["IBAN", "iban_number"],
            ["Opening Balance", "opening_balance"],
            ["Current Balance", "current_balance"],
          ].map(([l, k]) => (
            <Field key={k} label={l}>
              <Input
                type={k.includes("balance") ? "number" : "text"}
                value={account[k]}
                onChange={(e) =>
                  setAccount((x) => ({ ...x, [k]: e.target.value }))
                }
              />
            </Field>
          ))}
        </div>
      </Modal>
      <Modal
        open={modal === "cash"}
        onClose={() => setModal(null)}
        title="New Cash Entry"
        eyebrow="Finance & Accounting · Cashbook"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              className="bg-slate-900 text-white"
              onClick={() =>
                mutation.mutate({
                  endpoint: "/finance/bank-transactions/",
                  payload: {
                    ...cash,
                    branch: Number(cash.branch),
                    bank_account: Number(cash.bank_account),
                    receipt_amount: Number(cash.receipt_amount),
                    payment_amount: Number(cash.payment_amount),
                  },
                  success: "Cash entry recorded.",
                })
              }
            >
              Save Entry
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <Field label="Bank / Cash Account">
            <Select
              value={cash.bank_account}
              onChange={(v) => setCash((x) => ({ ...x, bank_account: v }))}
              options={accounts.map((a) => ({
                value: a.id,
                label: a.account_name,
              }))}
            />
          </Field>
          <Field label="Voucher Number">
            <Input
              value={cash.voucher_number}
              onChange={(e) =>
                setCash((x) => ({ ...x, voucher_number: e.target.value }))
              }
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={cash.transaction_date}
              onChange={(e) =>
                setCash((x) => ({ ...x, transaction_date: e.target.value }))
              }
            />
          </Field>
          <Field label="Particulars">
            <Input
              value={cash.particulars}
              onChange={(e) =>
                setCash((x) => ({ ...x, particulars: e.target.value }))
              }
            />
          </Field>
          <Field label="Receipt">
            <Input
              type="number"
              value={cash.receipt_amount}
              onChange={(e) =>
                setCash((x) => ({ ...x, receipt_amount: e.target.value }))
              }
            />
          </Field>
          <Field label="Payment">
            <Input
              type="number"
              value={cash.payment_amount}
              onChange={(e) =>
                setCash((x) => ({ ...x, payment_amount: e.target.value }))
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
function Select({ value, onChange, options }) {
  return (
    <select
      className="h-10 w-full rounded-md border bg-background px-3"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
function Table({ headers, rows, footer }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {r.map((v, j) => (
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
        {footer && (
          <tfoot className="font-semibold">
            <tr>
              {footer.map((v, i) => (
                <td key={i} className="px-4 py-3">
                  {v}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
