import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Check,
  FileText,
  Loader2,
  Paperclip,
  Save,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const ENDPOINT = "/purchases/supplier-payments/";

const PAYMENT_METHODS = [
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "CHEQUE",
    label: "Cheque",
  },
  {
    value: "CARD",
    label: "Card",
  },
  {
    value: "ONLINE",
    label: "Online Payment",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value) {
  const valueNumber = Number(value || 0);

  return Number.isFinite(valueNumber) ? valueNumber : 0;
}

function normalizeResponse(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (current.id !== undefined || Array.isArray(current.results)) {
      break;
    }

    if (current.data !== undefined && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  return current;
}

function normalizeList(value) {
  const current = normalizeResponse(value);

  if (Array.isArray(current)) {
    return current;
  }

  if (Array.isArray(current?.results)) {
    return current.results;
  }

  if (Array.isArray(current?.data)) {
    return current.data;
  }

  return [];
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getApiErrors(error) {
  const response = normalizeResponse(error?.response?.data);

  if (!response) {
    return {
      general: error?.message || "Unable to save supplier payment.",
    };
  }

  if (typeof response === "string") {
    return {
      general: response,
    };
  }

  if (response.detail || response.message) {
    return {
      general: response.detail || response.message,
    };
  }

  const errors = {};

  Object.entries(response).forEach(([field, message]) => {
    if (Array.isArray(message)) {
      errors[field] = message.join(" ");
    } else if (message && typeof message === "object") {
      errors[field] = JSON.stringify(message);
    } else {
      errors[field] = String(message);
    }
  });

  return errors;
}

function createInitialForm(branchId) {
  return {
    payment_number: "",
    supplier: "",
    branch: branchId ? String(branchId) : "",
    payment_date: today(),
    payment_method: "BANK_TRANSFER",
    bank_account: "",
    cash_register: "",
    reference_number: "",
    cheque_number: "",
    cheque_date: "",
    amount: 0,
    currency: "AED",
    notes: "",
    allocations: [],
  };
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

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export default function SupplierPaymentFormPage() {
  const { id } = useParams();

  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const existingQuery = useQuery({
    queryKey: ["supplier-payment", id],

    queryFn: async () =>
      normalizeResponse(
        await api.get(`${ENDPOINT}${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),

    enabled: isEdit,

    staleTime: 0,
    retry: false,
  });

  const suppliersQuery = useQuery({
    queryKey: ["supplier-payment-suppliers"],

    queryFn: async () =>
      normalizeList(
        await api.get("/suppliers/", {
          params: {
            page_size: 500,
            is_active: true,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 30_000,
  });

  const branchesQuery = useQuery({
    queryKey: ["supplier-payment-branches"],

    queryFn: async () =>
      normalizeList(
        await api.get("/branches/", {
          params: {
            page_size: 500,
            is_active: true,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 30_000,
  });

  const bankAccountsQuery = useQuery({
    queryKey: ["supplier-payment-bank-accounts", form.branch],

    queryFn: async () =>
      normalizeList(
        await api.get("/finance/bank-accounts/", {
          params: {
            page_size: 500,

            branch: form.branch || undefined,

            is_active: true,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    enabled: form.payment_method === "BANK_TRANSFER",

    staleTime: 15_000,
  });

  const cashRegistersQuery = useQuery({
    queryKey: ["supplier-payment-cash-registers", form.branch],

    queryFn: async () =>
      normalizeList(
        await api.get("/finance/cash-registers/", {
          params: {
            page_size: 500,

            branch: form.branch || undefined,

            is_active: true,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    enabled: form.payment_method === "CASH",

    staleTime: 15_000,
  });

  const billsQuery = useQuery({
    queryKey: ["supplier-payment-open-bills", form.supplier, form.branch],

    queryFn: async () =>
      normalizeList(
        await api.get("/purchases/supplier-bills/", {
          params: {
            page_size: 500,

            supplier: form.supplier || undefined,

            branch: form.branch || undefined,
          },

          skipGlobalErrorToast: true,
        }),
      ),

    enabled: Boolean(form.supplier),

    staleTime: 0,
    retry: false,
  });

  const suppliers = suppliersQuery.data || [];

  const branches = branchesQuery.data || [];

  const bankAccounts = bankAccountsQuery.data || [];

  const cashRegisters = cashRegistersQuery.data || [];

  const openBills = React.useMemo(
    () =>
      (billsQuery.data || []).filter((bill) => {
        const balance = numberValue(bill.balance_due);

        const status = String(
          bill.status || bill.payment_status || "",
        ).toUpperCase();

        return balance > 0 && !["PAID", "CANCELLED", "VOID"].includes(status);
      }),
    [billsQuery.data],
  );

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

    const allocations = Array.isArray(existing.allocations)
      ? existing.allocations.map((allocation) => ({
          id: allocation.id,

          bill: String(allocation.bill?.id || allocation.bill || ""),

          bill_number:
            allocation.bill_number || allocation.bill?.bill_number || "",

          due_date: allocation.due_date || allocation.bill?.due_date || "",

          balance_due: numberValue(
            allocation.open_balance ??
              allocation.bill?.balance_due ??
              allocation.balance_due,
          ),

          selected: true,

          amount: numberValue(allocation.amount),
        }))
      : [];

    setForm({
      payment_number: existing.payment_number || "",

      supplier: existing.supplier
        ? String(existing.supplier.id || existing.supplier)
        : "",

      branch: existing.branch
        ? String(existing.branch.id || existing.branch)
        : "",

      payment_date: existing.payment_date || today(),

      payment_method: existing.payment_method || "BANK_TRANSFER",

      bank_account: existing.bank_account
        ? String(existing.bank_account.id || existing.bank_account)
        : "",

      cash_register: existing.cash_register
        ? String(existing.cash_register.id || existing.cash_register)
        : "",

      reference_number: existing.reference_number || "",

      cheque_number: existing.cheque_number || "",

      cheque_date: existing.cheque_date || "",

      amount: numberValue(existing.amount),

      currency: existing.currency || "AED",

      notes: existing.notes || "",

      allocations,
    });
  }, [existingQuery.data, isEdit]);

  React.useEffect(() => {
    if (!form.supplier) {
      setForm((current) => ({
        ...current,
        allocations: [],
      }));

      return;
    }

    setForm((current) => {
      const existingMap = new Map(
        current.allocations.map((allocation) => [
          String(allocation.bill),
          allocation,
        ]),
      );

      const allocations = openBills.map((bill) => {
        const existing = existingMap.get(String(bill.id));

        return {
          id: existing?.id,

          bill: String(bill.id),

          bill_number: bill.bill_number,

          supplier_invoice_number: bill.supplier_invoice_number,

          bill_date: bill.bill_date,

          due_date: bill.due_date,

          total_amount: numberValue(bill.total_amount),

          balance_due: numberValue(bill.balance_due),

          selected: existing?.selected || numberValue(existing?.amount) > 0,

          amount: numberValue(existing?.amount),
        };
      });

      return {
        ...current,
        allocations,
      };
    });
  }, [openBills, form.supplier]);

  const selectedAllocations = React.useMemo(
    () =>
      form.allocations.filter(
        (allocation) =>
          allocation.selected && numberValue(allocation.amount) > 0,
      ),
    [form.allocations],
  );

  const totalAllocated = React.useMemo(
    () =>
      selectedAllocations.reduce(
        (total, allocation) => total + numberValue(allocation.amount),
        0,
      ),
    [selectedAllocations],
  );

  React.useEffect(() => {
    setForm((current) => ({
      ...current,

      amount: totalAllocated,
    }));
  }, [totalAllocated]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
      general: undefined,
    }));
  }

  function selectBill(billId, selected) {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) =>
        String(allocation.bill) === String(billId)
          ? {
              ...allocation,

              selected,

              amount: selected
                ? numberValue(allocation.amount) > 0
                  ? allocation.amount
                  : allocation.balance_due
                : 0,
            }
          : allocation,
      ),
    }));

    setErrors((current) => ({
      ...current,
      allocations: undefined,
      general: undefined,
    }));
  }

  function updateAllocation(billId, value) {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) =>
        String(allocation.bill) === String(billId)
          ? {
              ...allocation,

              selected: numberValue(value) > 0,

              amount: value,
            }
          : allocation,
      ),
    }));

    setErrors((current) => ({
      ...current,
      allocations: undefined,
      general: undefined,
    }));
  }

  function allocateAll() {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) => ({
        ...allocation,

        selected: true,

        amount: allocation.balance_due,
      })),
    }));
  }

  function clearAllocations() {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) => ({
        ...allocation,

        selected: false,
        amount: 0,
      })),
    }));
  }

  function addFiles(event) {
    const incoming = Array.from(event.target.files || []);

    const validFiles = incoming.filter((file) => {
      const name = file.name.toLowerCase();

      const validExtension = [".pdf", ".jpg", ".jpeg", ".png"].some(
        (extension) => name.endsWith(extension),
      );

      return validExtension && file.size <= 10 * 1024 * 1024;
    });

    if (validFiles.length !== incoming.length) {
      toast.error("Only PDF, JPG and PNG files up to 10 MB are allowed.");
    }

    setFiles((current) => [...current, ...validFiles]);

    event.target.value = "";
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.branch) {
      nextErrors.branch = "Select a branch.";
    }

    if (!form.supplier) {
      nextErrors.supplier = "Select a supplier.";
    }

    if (!form.payment_date) {
      nextErrors.payment_date = "Payment date is required.";
    }

    if (totalAllocated <= 0) {
      nextErrors.allocations =
        "Allocate an amount to at least one supplier bill.";
    }

    const invalidAllocation = selectedAllocations.find(
      (allocation) =>
        numberValue(allocation.amount) <= 0 ||
        numberValue(allocation.amount) > numberValue(allocation.balance_due),
    );

    if (invalidAllocation) {
      nextErrors.allocations =
        "Allocation must be greater than zero and cannot exceed the bill balance.";
    }

    if (form.payment_method === "BANK_TRANSFER" && !form.bank_account) {
      nextErrors.bank_account =
        "Select the bank account used for this payment.";
    }

    if (form.payment_method === "CASH" && !form.cash_register) {
      nextErrors.cash_register =
        "Select the cash register used for this payment.";
    }

    if (form.payment_method === "CHEQUE") {
      if (!form.cheque_number.trim()) {
        nextErrors.cheque_number = "Cheque number is required.";
      }

      if (!form.cheque_date) {
        nextErrors.cheque_date = "Cheque date is required.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Please correct the highlighted fields.");
      }

      const payload = {
        supplier: Number(form.supplier),

        branch: Number(form.branch),

        payment_date: form.payment_date,

        payment_method: form.payment_method,

        bank_account: form.bank_account ? Number(form.bank_account) : null,

        cash_register: form.cash_register ? Number(form.cash_register) : null,

        reference_number: form.reference_number.trim(),

        cheque_number:
          form.payment_method === "CHEQUE" ? form.cheque_number.trim() : "",

        cheque_date: form.payment_method === "CHEQUE" ? form.cheque_date : null,

        amount: Number(totalAllocated.toFixed(2)),

        currency: form.currency,

        notes: form.notes,

        allocations: selectedAllocations.map((allocation) => ({
          ...(allocation.id
            ? {
                id: allocation.id,
              }
            : {}),

          bill: Number(allocation.bill),

          amount: Number(numberValue(allocation.amount).toFixed(2)),
        })),
      };

      const formData = new FormData();

      formData.append("payload", JSON.stringify(payload));

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      if (isEdit) {
        return api.put(`${ENDPOINT}${id}/`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },

          skipGlobalErrorToast: true,
        });
      }

      return api.post(ENDPOINT, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async (response) => {
      const saved = normalizeResponse(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["supplier-payments"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["SupplierPaymentListPage"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-payment"],
        }),
      ]);

      toast.success(
        isEdit
          ? "Supplier payment updated successfully."
          : "Supplier payment recorded successfully.",
      );

      navigate(
        saved?.id
          ? `/purchases/supplier-payments/${saved.id}`
          : "/purchases/supplier-payments",
      );
    },

    onError: (error) => {
      const apiErrors = getApiErrors(error);

      setErrors((current) => ({
        ...current,
        ...apiErrors,
      }));

      toast.error(apiErrors.general || "Unable to save supplier payment.");
    },
  });

  if (isEdit && existingQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading supplier payment...
      </div>
    );
  }

  if (isEdit && existingQuery.isError) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/purchases/supplier-payments")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load the supplier payment.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={isEdit ? "Edit Supplier Payment" : "New Supplier Payment"}
        subtitle="Record a payment and allocate it against one or more outstanding supplier bills."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchases/supplier-payments")}
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

              {isEdit ? "Update Payment" : "Record Payment"}
            </Button>
          </div>
        }
      />

      {errors.general ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.general}
        </div>
      ) : null}

      <Section
        title="Payment Information"
        description="Select the supplier, payment date, method, and source account."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Payment Number</Label>

            <Input
              className="mt-2"
              value={form.payment_number || "Automatically generated"}
              disabled
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Generated automatically by the backend.
            </p>
          </div>

          <div>
            <Label htmlFor="branch">Branch *</Label>

            <select
              id="branch"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.branch}
              onChange={(event) => {
                const value = event.target.value;

                setForm((current) => ({
                  ...current,

                  branch: value,

                  supplier: "",

                  bank_account: "",

                  cash_register: "",

                  allocations: [],
                }));
              }}
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
            <Label htmlFor="supplier">Supplier *</Label>

            <select
              id="supplier"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.supplier}
              onChange={(event) => {
                const value = event.target.value;

                setForm((current) => ({
                  ...current,

                  supplier: value,

                  allocations: [],
                }));
              }}
            >
              <option value="">Select supplier</option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={String(supplier.id)}>
                  {supplier.supplier_name || supplier.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.supplier} />
          </div>

          <div>
            <Label htmlFor="payment_date">Payment Date *</Label>

            <Input
              id="payment_date"
              className="mt-2"
              type="date"
              value={form.payment_date}
              onChange={(event) =>
                updateField("payment_date", event.target.value)
              }
            />

            <FieldError message={errors.payment_date} />
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method *</Label>

            <select
              id="payment_method"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.payment_method}
              onChange={(event) => {
                const value = event.target.value;

                setForm((current) => ({
                  ...current,

                  payment_method: value,

                  bank_account:
                    value === "BANK_TRANSFER" ? current.bank_account : "",

                  cash_register: value === "CASH" ? current.cash_register : "",

                  cheque_number:
                    value === "CHEQUE" ? current.cheque_number : "",

                  cheque_date: value === "CHEQUE" ? current.cheque_date : "",
                }));
              }}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {form.payment_method === "BANK_TRANSFER" ? (
            <div>
              <Label htmlFor="bank_account">Bank Account *</Label>

              <select
                id="bank_account"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.bank_account}
                onChange={(event) =>
                  updateField("bank_account", event.target.value)
                }
              >
                <option value="">Select bank account</option>

                {bankAccounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.account_name ||
                      account.bank_name ||
                      account.account_number ||
                      `Account ${account.id}`}
                  </option>
                ))}
              </select>

              <FieldError message={errors.bank_account} />
            </div>
          ) : null}

          {form.payment_method === "CASH" ? (
            <div>
              <Label htmlFor="cash_register">Cash Register *</Label>

              <select
                id="cash_register"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.cash_register}
                onChange={(event) =>
                  updateField("cash_register", event.target.value)
                }
              >
                <option value="">Select cash register</option>

                {cashRegisters.map((register) => (
                  <option key={register.id} value={String(register.id)}>
                    {register.register_name ||
                      register.name ||
                      `Register ${register.id}`}
                  </option>
                ))}
              </select>

              <FieldError message={errors.cash_register} />
            </div>
          ) : null}

          {form.payment_method === "CHEQUE" ? (
            <>
              <div>
                <Label htmlFor="cheque_number">Cheque Number *</Label>

                <Input
                  id="cheque_number"
                  className="mt-2"
                  value={form.cheque_number}
                  onChange={(event) =>
                    updateField("cheque_number", event.target.value)
                  }
                />

                <FieldError message={errors.cheque_number} />
              </div>

              <div>
                <Label htmlFor="cheque_date">Cheque Date *</Label>

                <Input
                  id="cheque_date"
                  className="mt-2"
                  type="date"
                  value={form.cheque_date}
                  onChange={(event) =>
                    updateField("cheque_date", event.target.value)
                  }
                />

                <FieldError message={errors.cheque_date} />
              </div>
            </>
          ) : null}

          <div>
            <Label htmlFor="reference_number">Reference Number</Label>

            <Input
              id="reference_number"
              className="mt-2"
              value={form.reference_number}
              onChange={(event) =>
                updateField("reference_number", event.target.value)
              }
              placeholder="Transaction or receipt reference"
            />
          </div>

          <div>
            <Label>Payment Amount</Label>

            <div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
              <CurrencyText
                value={totalAllocated}
                currency={form.currency || "AED"}
              />
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Calculated from bill allocations.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Bill Allocations"
        description="Select one or more outstanding supplier bills and enter the amount to pay against each."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {selectedAllocations.length} bill
              {selectedAllocations.length === 1 ? "" : "s"} selected
            </p>

            <FieldError message={errors.allocations} />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={allocateAll}
              disabled={!form.supplier || !openBills.length}
            >
              <Check className="mr-2 h-4 w-4" />
              Allocate All
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearAllocations}
            >
              Clear
            </Button>
          </div>
        </div>

        {!form.supplier ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Select a supplier to load outstanding bills.
          </div>
        ) : billsQuery.isLoading ? (
          <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
            Loading outstanding bills...
          </div>
        ) : !form.allocations.length ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No outstanding supplier bills were found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-[950px] w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-14 px-4 py-3 text-left">Select</th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                    Bill
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                    Supplier Invoice
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                    Bill Date
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                    Due Date
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                    Bill Total
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                    Balance Due
                  </th>

                  <th className="w-44 px-4 py-3 text-right text-xs font-semibold uppercase">
                    Payment Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {form.allocations.map((allocation) => (
                  <tr
                    key={allocation.bill}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={allocation.selected}
                        onChange={(event) =>
                          selectBill(allocation.bill, event.target.checked)
                        }
                        className="h-4 w-4"
                      />
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {allocation.bill_number || `Bill ${allocation.bill}`}
                    </td>

                    <td className="px-4 py-4">
                      {allocation.supplier_invoice_number || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {allocation.bill_date ? (
                        <DateText value={allocation.bill_date} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {allocation.due_date ? (
                        <DateText value={allocation.due_date} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <CurrencyText
                        value={allocation.total_amount}
                        currency={form.currency || "AED"}
                      />
                    </td>

                    <td className="px-4 py-4 text-right font-medium">
                      <CurrencyText
                        value={allocation.balance_due}
                        currency={form.currency || "AED"}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min="0"
                        max={allocation.balance_due}
                        step="0.01"
                        className="text-right"
                        disabled={!allocation.selected}
                        value={allocation.amount}
                        onChange={(event) =>
                          updateAllocation(allocation.bill, event.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-4 text-right font-semibold"
                  >
                    Total Payment
                  </td>

                  <td className="px-4 py-4 text-right text-lg font-bold">
                    <CurrencyText
                      value={totalAllocated}
                      currency={form.currency || "AED"}
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Attachments"
          description="Upload payment receipts, cheque copies, or bank-transfer evidence."
        >
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center hover:bg-muted/30">
            <Paperclip className="h-7 w-7 text-muted-foreground" />

            <p className="mt-3 text-sm font-medium">Select payment files</p>

            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, JPEG, or PNG. Maximum 10 MB per file.
            </p>

            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={addFiles}
            />
          </label>

          {files.length ? (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <FieldError message={errors.attachments} />
        </Section>

        <Section
          title="Payment Summary"
          description="Review the allocation before recording the payment."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Supplier</span>

              <span className="font-medium">
                {suppliers.find(
                  (supplier) => String(supplier.id) === String(form.supplier),
                )?.supplier_name || "Not selected"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Selected Bills</span>

              <span className="font-medium">{selectedAllocations.length}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Method</span>

              <span className="font-medium">
                {PAYMENT_METHODS.find(
                  (method) => method.value === form.payment_method,
                )?.label || form.payment_method}
              </span>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Payment</span>

                <span className="text-2xl font-bold">
                  <CurrencyText
                    value={totalAllocated}
                    currency={form.currency || "AED"}
                  />
                </span>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Banknote className="mt-0.5 h-5 w-5 text-muted-foreground" />

                <p className="text-sm text-muted-foreground">
                  Saving this payment will update the paid amount, balance, and
                  payment status of each selected supplier bill.
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Notes">
        <Label htmlFor="notes">Payment Notes</Label>

        <Textarea
          id="notes"
          className="mt-2 min-h-28"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Additional payment notes"
        />
      </Section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link to="/purchases/supplier-payments">Cancel</Link>
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

          {isEdit ? "Update Supplier Payment" : "Record Supplier Payment"}
        </Button>
      </div>
    </div>
  );
}
