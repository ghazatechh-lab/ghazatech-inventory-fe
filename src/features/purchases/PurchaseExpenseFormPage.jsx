import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Paperclip, Save, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyText } from "@/components/common/CurrencyText";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { normalizeApiResponse } from "./purchaseUi";

const ENDPOINT = "/purchases/expenses/";

const VAT_RATE = 5;

const DEFAULT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DEFAULT_PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "PETTY_CASH", label: "Petty Cash" },
  { value: "OTHER", label: "Other" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(number(value).toFixed(2));
}

function calculateVat(amount) {
  return roundMoney((number(amount) * VAT_RATE) / 100);
}

function normalizeList(value) {
  const normalized = normalizeApiResponse(value);

  if (Array.isArray(normalized)) {
    return normalized;
  }

  if (Array.isArray(normalized?.results)) {
    return normalized.results;
  }

  if (Array.isArray(normalized?.data)) {
    return normalized.data;
  }

  return [];
}

function createInitialForm(branchId) {
  return {
    expense_number: "",
    branch: branchId ? String(branchId) : "",
    category: "",
    description: "",
    vendor_name: "",
    expense_date: today(),
    amount: "",
    payment_method: "",
    bank_account: "",
    cash_register: "",
    reference_number: "",
    status: "PENDING",
    notes: "",
    attachments: [],
  };
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h2 className="font-semibold">{title}</h2>

        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function extractErrors(error) {
  const details = getApiErrorDetails?.(error);

  const body = normalizeApiResponse(error?.response?.data);

  if (details?.message) {
    return {
      general: details.message,
    };
  }

  if (!body) {
    return {
      general: error?.message || "The submitted data could not be processed.",
    };
  }

  if (typeof body === "string") {
    return {
      general: body,
    };
  }

  if (body.detail || body.message) {
    return {
      general: body.detail || body.message,
    };
  }

  const result = {};

  Object.entries(body).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      result[field] = value.join(" ");
    } else if (value && typeof value === "object") {
      result[field] = Object.values(value).flat().join(" ");
    } else {
      result[field] = String(value);
    }
  });

  return result;
}

export default function PurchaseExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const [errors, setErrors] = React.useState({});

  const [existingAttachments, setExistingAttachments] = React.useState([]);

  const optionsQuery = useQuery({
    queryKey: ["purchase-expense-form-options", form.branch],

    queryFn: async () => {
      const response = await api.get(`${ENDPOINT}form-options/`, {
        params: {
          branch: form.branch || undefined,
        },
        skipGlobalErrorToast: true,
      });

      return normalizeApiResponse(response);
    },

    staleTime: 0,
    retry: false,
  });

  const existingQuery = useQuery({
    queryKey: ["purchase-expense", id],

    queryFn: async () => {
      const response = await api.get(`${ENDPOINT}${id}/`, {
        skipGlobalErrorToast: true,
      });

      return normalizeApiResponse(response);
    },

    enabled: isEdit,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const options = optionsQuery.data || {};

  const categories = normalizeList(options.categories);

  const branches = normalizeList(options.branches);

  const bankAccounts = normalizeList(options.bank_accounts);

  const cashRegisters = normalizeList(options.cash_registers);

  const statusOptions = normalizeList(options.statuses).length
    ? normalizeList(options.statuses)
    : DEFAULT_STATUS_OPTIONS;

  const paymentMethodOptions = normalizeList(options.payment_methods).length
    ? normalizeList(options.payment_methods)
    : DEFAULT_PAYMENT_METHOD_OPTIONS;

  React.useEffect(() => {
    if (isEdit || !branchId) {
      return;
    }

    setForm((current) => ({
      ...current,
      branch: current.branch || String(branchId),
    }));
  }, [branchId, isEdit]);

  React.useEffect(() => {
    const existing = existingQuery.data;

    if (!isEdit || !existing) {
      return;
    }

    setForm({
      expense_number: existing.expense_number || "",

      branch: existing.branch
        ? String(existing.branch.id || existing.branch)
        : "",

      category: existing.category || "",

      description: existing.description || "",

      vendor_name: existing.vendor_name || "",

      expense_date: existing.expense_date || today(),

      amount: existing.amount ?? "",

      payment_method: existing.payment_method || "",

      bank_account: existing.bank_account
        ? String(existing.bank_account.id || existing.bank_account)
        : "",

      cash_register: existing.cash_register
        ? String(existing.cash_register.id || existing.cash_register)
        : "",

      reference_number: existing.reference_number || "",

      status: existing.status || "PENDING",

      notes: existing.notes || "",

      attachments: [],
    });

    setExistingAttachments(
      Array.isArray(existing.attachments) ? existing.attachments : [],
    );
  }, [existingQuery.data, isEdit]);

  const amount = roundMoney(form.amount);

  // Fixed UAE VAT for Purchase Expense.
  // User cannot manually change this value.
  const taxAmount = calculateVat(amount);

  const grandTotal = roundMoney(amount + taxAmount);

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "payment_method") {
        if (value !== "BANK_TRANSFER") {
          next.bank_account = "";
        }

        if (!["CASH", "PETTY_CASH"].includes(value)) {
          next.cash_register = "";
        }
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [field]: undefined,
      general: undefined,
    }));
  }

  function handleFiles(event) {
    const files = Array.from(event.target.files || []);

    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, ...files],
    }));

    event.target.value = "";
  }

  function removeNewAttachment(index) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter(
        (_, fileIndex) => fileIndex !== index,
      ),
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.branch) {
      nextErrors.branch = "Select a branch.";
    }

    if (!form.category) {
      nextErrors.category = "Select a category.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (!form.expense_date) {
      nextErrors.expense_date = "Expense date is required.";
    }

    if (!form.amount || number(form.amount) <= 0) {
      nextErrors.amount = "Amount must be greater than zero.";
    }

    if (!form.payment_method) {
      nextErrors.payment_method = "Select a payment method.";
    }

    if (form.payment_method === "BANK_TRANSFER" && !form.bank_account) {
      nextErrors.bank_account = "Select a bank account.";
    }

    if (
      ["CASH", "PETTY_CASH"].includes(form.payment_method) &&
      !form.cash_register
    ) {
      nextErrors.cash_register = "Select a cash register.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Please correct the highlighted fields.");
      }

      const expenseAmount = roundMoney(form.amount);

      const fixedVatAmount = calculateVat(expenseAmount);

      const payload = {
        branch: Number(form.branch),

        category: form.category,

        description: form.description.trim(),

        vendor_name: form.vendor_name.trim(),

        expense_date: form.expense_date,

        amount: expenseAmount,

        // Always fixed 5%.
        tax_amount: fixedVatAmount,

        payment_method: form.payment_method,

        bank_account: form.bank_account ? Number(form.bank_account) : null,

        cash_register: form.cash_register ? Number(form.cash_register) : null,

        reference_number: form.reference_number.trim(),

        status: form.status || "PENDING",

        notes: form.notes.trim(),
      };

      const hasFiles = form.attachments.length > 0;

      if (hasFiles) {
        const multipart = new FormData();

        multipart.append("payload", JSON.stringify(payload));

        form.attachments.forEach((file) => {
          multipart.append("attachments", file);
        });

        if (isEdit) {
          return api.put(`${ENDPOINT}${id}/`, multipart, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            skipGlobalErrorToast: true,
          });
        }

        return api.post(ENDPOINT, multipart, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          skipGlobalErrorToast: true,
        });
      }

      if (isEdit) {
        return api.put(`${ENDPOINT}${id}/`, payload, {
          skipGlobalErrorToast: true,
        });
      }

      return api.post(ENDPOINT, payload, {
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async (response) => {
      const saved = normalizeApiResponse(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["purchase-expenses"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["purchase-expense-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["purchase-expense", id],
        }),
      ]);

      toast.success(
        isEdit
          ? "Purchase expense updated successfully."
          : "Purchase expense created successfully.",
      );

      navigate(
        saved?.id
          ? `/purchases/purchase-expenses/${saved.id}`
          : "/purchases/purchase-expenses",
      );
    },

    onError: (error) => {
      const apiErrors = extractErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(
        apiErrors.general || "The submitted data could not be processed.",
      );
    },
  });

  if (isEdit && existingQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading purchase expense...
      </div>
    );
  }

  if (isEdit && existingQuery.isError) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/purchases/purchase-expenses")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load the purchase expense.
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-module-page purchase-workspace space-y-6 pb-10">
      <PageHeader
        title={isEdit ? "Edit Purchase Expense" : "New Purchase Expense"}
        subtitle="Record purchase-related expenses with fixed 5% VAT."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchases/purchase-expenses")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {isEdit ? "Update Expense" : "Create Expense"}
            </Button>
          </div>
        }
      />

      {errors.general ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.general}
        </div>
      ) : null}

      {optionsQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Unable to load expense form options. Check the backend endpoint:{" "}
          <code>/api/purchases/expenses/form-options/</code>
        </div>
      ) : null}

      <Section
        title="Expense Information"
        description="Enter the branch, category, payee, date, and expense amount."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Expense Number</Label>

            <Input
              className="mt-2"
              value={form.expense_number || "Automatically generated"}
              disabled
            />
          </div>

          <div>
            <Label>Branch *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.branch}
              onChange={(event) => updateField("branch", event.target.value)}
            >
              <option value="">Select branch</option>

              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.branch_code ? `${branch.branch_code} — ` : ""}
                  {branch.branch_name || branch.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.branch} />
          </div>

          <div>
            <Label>Category *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
            >
              <option value="">Select category</option>

              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <FieldError message={errors.category} />
          </div>

          <div>
            <Label>Expense Date *</Label>

            <Input
              className="mt-2"
              type="date"
              value={form.expense_date}
              onChange={(event) =>
                updateField("expense_date", event.target.value)
              }
            />

            <FieldError message={errors.expense_date} />
          </div>

          <div className="md:col-span-2">
            <Label>Description *</Label>

            <Input
              className="mt-2"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Describe the expense"
            />

            <FieldError message={errors.description} />
          </div>

          <div>
            <Label>Vendor / Payee</Label>

            <Input
              className="mt-2"
              value={form.vendor_name}
              onChange={(event) =>
                updateField("vendor_name", event.target.value)
              }
              placeholder="Vendor or payee name"
            />
          </div>

          <div>
            <Label>Reference Number</Label>

            <Input
              className="mt-2"
              value={form.reference_number}
              onChange={(event) =>
                updateField("reference_number", event.target.value)
              }
              placeholder="Receipt, invoice, or reference"
            />
          </div>

          <div>
            <Label>Expense Amount *</Label>

            <Input
              className="mt-2"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
            />

            <FieldError message={errors.amount} />
          </div>

          <div>
            <Label>VAT (Fixed 5%)</Label>

            <Input
              className="mt-2 bg-muted/40 font-medium"
              value={taxAmount.toFixed(2)}
              disabled
              readOnly
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Automatically calculated at 5% of the expense amount.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Payment Information"
        description="Select how the purchase expense was paid."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Payment Method *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.payment_method}
              onChange={(event) =>
                updateField("payment_method", event.target.value)
              }
            >
              <option value="">Select payment method</option>

              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <FieldError message={errors.payment_method} />
          </div>

          <div>
            <Label>Status</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Bank Account</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
              value={form.bank_account}
              disabled={form.payment_method !== "BANK_TRANSFER"}
              onChange={(event) =>
                updateField("bank_account", event.target.value)
              }
            >
              <option value="">Select bank account</option>

              {bankAccounts.map((account) => (
                <option key={account.id} value={String(account.id)}>
                  {account.account_name || account.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.bank_account} />
          </div>

          <div>
            <Label>Cash Register</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
              value={form.cash_register}
              disabled={!["CASH", "PETTY_CASH"].includes(form.payment_method)}
              onChange={(event) =>
                updateField("cash_register", event.target.value)
              }
            >
              <option value="">Select cash register</option>

              {cashRegisters.map((register) => (
                <option key={register.id} value={String(register.id)}>
                  {register.name || `Cash Register #${register.id}`}
                </option>
              ))}
            </select>

            <FieldError message={errors.cash_register} />
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Notes">
          <Label>Additional Notes</Label>

          <Textarea
            className="mt-2 min-h-32"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Add any supporting notes"
          />
        </Section>

        <Section title="Expense Summary">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expense Amount</span>

              <CurrencyText value={amount} />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (5%)</span>

              <CurrencyText value={taxAmount} />
            </div>

            <div className="flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>

              <CurrencyText value={grandTotal} />
            </div>
          </div>
        </Section>
      </div>

      <Section
        title="Attachments"
        description="Attach receipts, invoices, or supporting documents."
      >
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground transition hover:bg-muted/30">
          <Paperclip className="h-4 w-4" />
          Add attachments
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
        </label>

        {existingAttachments.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Existing attachments
            </p>

            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id || attachment.file_url}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {attachment.original_name ||
                  attachment.file_name ||
                  "Attachment"}
              </div>
            ))}
          </div>
        ) : null}

        {form.attachments.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              New attachments
            </p>

            {form.attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="truncate text-sm">{file.name}</span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeNewAttachment(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
