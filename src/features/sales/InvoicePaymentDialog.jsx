import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Save, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText } from "@/components/common/CurrencyText";

const today = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const paymentMethods = [
  ["BANK_TRANSFER", "Bank Transfer"],
  ["CARD", "Card"],
  ["CASH", "Cash"],
  ["CHEQUE", "Cheque"],
];

export default function InvoicePaymentDialog({
  invoice,
  open,
  onClose,
  onSaved,
}) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = React.useState({});
  const [form, setForm] = React.useState({
    payment_date: today(),
    amount: "",
    payment_method: "BANK_TRANSFER",
    bank_account: "",
    cash_register: "",
    reference_number: "",
    status: "PAID",
    notes: "",
  });

  React.useEffect(() => {
    if (!open || !invoice) return;

    setErrors({});
    setForm({
      payment_date: today(),
      amount: String(number(invoice.balance_due).toFixed(2)),
      payment_method: "BANK_TRANSFER",
      bank_account: "",
      cash_register: "",
      reference_number: "",
      status: "PAID",
      notes: "",
    });
  }, [open, invoice]);

  const branchId =
    typeof invoice?.branch === "object"
      ? invoice.branch?.id
      : invoice?.branch || invoice?.branch_id;

  const { data: optionsResponse, isLoading: optionsLoading } = useQuery({
    queryKey: ["invoice-payment-form-options", branchId],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/payments/form-options/", {
          params: { branch: branchId || undefined },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: open && Boolean(branchId),
    staleTime: 0,
  });

  const options = optionsResponse || {};
  const bankAccounts = normalizeList(options.bank_accounts);
  const cashRegisters = normalizeList(options.cash_registers);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const next = {};
    const amount = number(form.amount);
    const balance = number(invoice?.balance_due);

    if (!form.payment_date) {
      next.payment_date = "Payment date is required.";
    }

    if (amount <= 0) {
      next.amount = "Payment amount must be greater than zero.";
    } else if (amount > balance) {
      next.amount = "Payment cannot exceed the invoice balance.";
    }

    if (form.payment_method === "CASH" && !form.cash_register) {
      next.cash_register = "Select a cash register.";
    }

    if (
      ["BANK_TRANSFER", "CARD", "CHEQUE"].includes(form.payment_method) &&
      !form.bank_account
    ) {
      next.bank_account = "Select a bank account.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!validate()) {
        throw new Error("Please correct the highlighted payment fields.");
      }

      return api.post(
        "/sales/payments/",
        {
          invoice: Number(invoice.id),
          payment_date: form.payment_date,
          amount: number(form.amount),
          payment_method: form.payment_method,
          bank_account: form.bank_account ? Number(form.bank_account) : null,
          cash_register: form.cash_register ? Number(form.cash_register) : null,
          reference_number: form.reference_number.trim() || null,
          status: form.status,
          notes: form.notes.trim(),
        },
        { skipGlobalErrorToast: true },
      );
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-invoice", String(invoice.id)],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sales-invoice", invoice.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["sales-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-payments"] }),
        queryClient.invalidateQueries({
          queryKey: ["sales-payments-summary"],
        }),
      ]);

      toast.success("Payment recorded successfully.");

      if (onSaved) {
        await onSaved();
      }

      onClose();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to record payment", {
        description:
          details.summary ||
          details.message ||
          error?.message ||
          "Please review the payment details.",
      });
    },
  });

  if (!open || !invoice) return null;

  const balanceDue = number(invoice.balance_due);
  const paymentStatus = String(invoice.payment_status || "").toUpperCase();

  if (paymentStatus === "PAID" || balanceDue <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/55">
      <div className="flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Record Invoice Payment</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice.invoice_number} · {invoice.customer_name || "Customer"}
            </p>
          </div>

          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={save.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-3 dark:bg-white/[0.025]">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Invoice Total
              </p>
              <div className="mt-1 font-semibold">
                <CurrencyText
                  value={invoice.total_amount}
                  currency={invoice.currency || "AED"}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Already Paid
              </p>
              <div className="mt-1 font-semibold text-emerald-600">
                <CurrencyText
                  value={invoice.paid_amount}
                  currency={invoice.currency || "AED"}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Balance Due
              </p>
              <div className="mt-1 font-semibold text-red-600">
                <CurrencyText
                  value={invoice.balance_due}
                  currency={invoice.currency || "AED"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.payment_date}
                onChange={(event) => update("payment_date", event.target.value)}
              />
              {errors.payment_date && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.payment_date}
                </p>
              )}
            </div>

            <div>
              <Label>Amount Received *</Label>
              <Input
                type="number"
                min="0.01"
                max={balanceDue}
                step="0.01"
                className="mt-2"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => update("amount", balanceDue.toFixed(2))}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Pay full remaining balance
          </button>

          <div>
            <Label>Payment Method *</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {paymentMethods.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      payment_method: value,
                      bank_account:
                        value === "CASH" ? "" : current.bank_account,
                      cash_register:
                        value === "CASH" ? current.cash_register : "",
                    }));
                    setErrors((current) => ({
                      ...current,
                      bank_account: "",
                      cash_register: "",
                    }));
                  }}
                  className={
                    form.payment_method === value
                      ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "rounded-lg border px-3 py-2.5 text-sm"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.payment_method === "CASH" ? (
            <div>
              <Label>Cash Register *</Label>
              <Select
                value={form.cash_register || "__none__"}
                onValueChange={(value) =>
                  update("cash_register", value === "__none__" ? "" : value)
                }
                disabled={optionsLoading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select cash register" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select cash register</SelectItem>
                  {cashRegisters.map((register) => (
                    <SelectItem key={register.id} value={String(register.id)}>
                      {register.name ||
                        register.register_name ||
                        `Cash Register #${register.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cash_register && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.cash_register}
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label>Bank Account *</Label>
              <Select
                value={form.bank_account || "__none__"}
                onValueChange={(value) =>
                  update("bank_account", value === "__none__" ? "" : value)
                }
                disabled={optionsLoading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select bank account</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.account_name ||
                        account.name ||
                        `Bank Account #${account.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_account && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.bank_account}
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Reference / Transaction #</Label>
            <Input
              className="mt-2"
              value={form.reference_number}
              onChange={(event) =>
                update("reference_number", event.target.value)
              }
              placeholder="e.g. TRF-88213"
            />
          </div>

          <div>
            <Label>Payment Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => update("status", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID">Paid / Cleared</SelectItem>
                <SelectItem value="PENDING">Pending Clearance</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Only cleared payments reduce the invoice balance.
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={4}
              className="mt-2"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Optional payment note"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? "Saving..." : "Record Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
