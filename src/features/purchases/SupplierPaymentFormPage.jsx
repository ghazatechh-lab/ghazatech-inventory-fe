import React from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Check,
  FileText,
  Loader2,
  Paperclip,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const BANK_BACKED_METHODS = ["BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE"];

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
  const [searchParams] = useSearchParams();

  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();
  const requestedBillId = searchParams.get("bill") || "";
  const requestedSupplierId = searchParams.get("supplier") || "";
  const requestedBranchId = searchParams.get("branch") || "";
  const prefillAppliedRef = React.useRef(false);

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const [supplierSearch, setSupplierSearch] = React.useState("");

  const [financeDialog, setFinanceDialog] = React.useState(null);

  const [bankForm, setBankForm] = React.useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    iban_number: "",
    opening_balance: "0",
  });

  React.useEffect(() => {
    if (isEdit) return;
    if (!requestedSupplierId && !requestedBranchId) return;
    setForm((current) => ({
      ...current,
      supplier: requestedSupplierId || current.supplier,
      branch: requestedBranchId || current.branch,
    }));
  }, [isEdit, requestedSupplierId, requestedBranchId]);

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

  const paymentOptionsQuery = useQuery({
    queryKey: ["supplier-payment-form-options", form.branch, form.supplier],

    queryFn: async () =>
      normalizeResponse(
        await api.get(`${ENDPOINT}form-options/`, {
          params: {
            branch: form.branch || undefined,
            supplier: form.supplier || undefined,
          },
          skipGlobalErrorToast: true,
        }),
      ),

    enabled: Boolean(form.branch),
    staleTime: 15_000,
    retry: false,
  });

  const bankAccountsQuery = useQuery({
    queryKey: ["supplier-payment-bank-accounts", form.branch],
    queryFn: async () =>
      normalizeList(
        await api.get("/finance/bank-accounts/", {
          params: {
            branch: form.branch,
            is_active: true,
            page_size: 500,
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(form.branch),
    staleTime: 0,
    retry: false,
  });

  const cashRegistersQuery = useQuery({
    queryKey: ["supplier-payment-cash-registers", form.branch],
    queryFn: async () =>
      normalizeList(
        await api.get("/finance/cash-register/", {
          params: {
            branch: form.branch,
            status: "OPEN",
            page_size: 500,
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(form.branch),
    staleTime: 0,
    retry: false,
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

  const suppliers = React.useMemo(
    () => suppliersQuery.data || [],
    [suppliersQuery.data],
  );

  const filteredSuppliers = React.useMemo(() => {
    const search = supplierSearch.trim().toLowerCase();

    if (!search) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.supplier_name,
        supplier.name,
        supplier.supplier_code,
        supplier.contact_person,
        supplier.email,
        supplier.phone,
        supplier.phone_number,
        supplier.trn_number,
        supplier.tax_registration_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [suppliers, supplierSearch]);

  const branches = branchesQuery.data || [];

  const bankAccounts = React.useMemo(() => {
    const combined = [
      ...(Array.isArray(paymentOptionsQuery.data?.bank_accounts)
        ? paymentOptionsQuery.data.bank_accounts
        : []),
      ...(bankAccountsQuery.data || []),
    ];

    return Array.from(
      new Map(
        combined.map((account) => [String(account.id), account]),
      ).values(),
    );
  }, [paymentOptionsQuery.data, bankAccountsQuery.data]);

  const cashRegisters = React.useMemo(() => {
    const combined = [
      ...(Array.isArray(paymentOptionsQuery.data?.cash_registers)
        ? paymentOptionsQuery.data.cash_registers
        : []),
      ...(cashRegistersQuery.data || []),
    ];

    return Array.from(
      new Map(
        combined.map((register) => [String(register.id), register]),
      ).values(),
    );
  }, [paymentOptionsQuery.data, cashRegistersQuery.data]);

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

  React.useEffect(() => {
    if (
      isEdit ||
      prefillAppliedRef.current ||
      !requestedBillId ||
      !form.allocations.length
    )
      return;
    if (
      !form.allocations.some(
        (allocation) => String(allocation.bill) === String(requestedBillId),
      )
    )
      return;
    prefillAppliedRef.current = true;
    setForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation) =>
        String(allocation.bill) === String(requestedBillId)
          ? {
              ...allocation,
              selected: true,
              amount: numberValue(allocation.balance_due),
            }
          : allocation,
      ),
    }));
  }, [isEdit, requestedBillId, form.allocations]);

  const createBankAccountMutation = useMutation({
    mutationFn: async () => {
      if (!form.branch) {
        throw new Error("Select a branch before adding a bank account.");
      }

      return normalizeResponse(
        await api.post(
          "/finance/bank-accounts/",
          {
            branch: Number(form.branch),
            bank_name: bankForm.bank_name.trim(),
            account_name: bankForm.account_name.trim(),
            account_number: bankForm.account_number.trim(),
            iban_number: bankForm.iban_number.trim(),
            opening_balance: numberValue(bankForm.opening_balance),
            current_balance: numberValue(bankForm.opening_balance),
            is_active: true,
          },
          { skipGlobalErrorToast: true },
        ),
      );
    },
    onSuccess: async (created) => {
      await Promise.all([
        bankAccountsQuery.refetch(),
        paymentOptionsQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }),
      ]);
      setForm((current) => ({
        ...current,
        bank_account: created?.id ? String(created.id) : current.bank_account,
      }));
      setFinanceDialog(null);
      setBankForm({
        bank_name: "",
        account_name: "",
        account_number: "",
        iban_number: "",
        opening_balance: "0",
      });
      toast.success("Bank account added and selected.");
    },
    onError: (error) => {
      const details = getApiErrors(error);
      toast.error(
        details.general ||
          Object.values(details)[0] ||
          "Unable to add bank account.",
      );
    },
  });

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

    if (
      BANK_BACKED_METHODS.includes(form.payment_method) &&
      !form.bank_account
    ) {
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
    <div className="purchase-module-page purchase-workspace space-y-6 pb-10">
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

      {paymentOptionsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load bank accounts and cash registers. Check the backend
          form-options endpoint.
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

            <Select
              value={form.supplier}
              onValueChange={(value) => {
                setForm((current) => ({
                  ...current,

                  supplier: value,

                  allocations: [],
                }));

                setSupplierSearch("");
                setErrors((current) => ({
                  ...current,
                  supplier: undefined,
                  general: undefined,
                }));
              }}
              disabled={suppliersQuery.isLoading}
            >
              <SelectTrigger id="supplier" className="mt-2">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>

              <SelectContent className="max-h-80 p-0">
                <div
                  className="sticky top-0 z-10 border-b bg-popover p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={supplierSearch}
                    onChange={(event) => setSupplierSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="Search supplier name, code or contact"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredSuppliers.length ? (
                    filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        <div>
                          <div>{supplier.supplier_name || supplier.name}</div>

                          {(supplier.supplier_code ||
                            supplier.contact_person) && (
                            <div className="text-xs text-muted-foreground">
                              {[supplier.supplier_code, supplier.contact_person]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No suppliers match your search.
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>

            {suppliersQuery.isLoading ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Loading suppliers...
              </p>
            ) : null}

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

                  bank_account: BANK_BACKED_METHODS.includes(value)
                    ? current.bank_account
                    : "",

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

          {BANK_BACKED_METHODS.includes(form.payment_method) ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bank_account">
                  {form.payment_method === "ONLINE"
                    ? "Online Payment Bank Account *"
                    : "Bank Account *"}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!form.branch}
                  onClick={() => setFinanceDialog("bank")}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Bank Account
                </Button>
              </div>

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
                    {[
                      account.account_name,
                      account.bank_name,
                      account.account_number,
                    ]
                      .filter(Boolean)
                      .join(" — ") || `Account ${account.id}`}
                  </option>
                ))}
              </select>

              {paymentOptionsQuery.isLoading || bankAccountsQuery.isLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Loading bank accounts...
                </p>
              ) : bankAccounts.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600">
                  No active bank accounts are available for the selected branch.
                </p>
              ) : null}

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
                    {register.name ||
                      register.register_name ||
                      `${register.branch_name || "Cash Register"} — ${register.register_date || register.id}`}
                  </option>
                ))}
              </select>

              {paymentOptionsQuery.isLoading || cashRegistersQuery.isLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Loading cash registers...
                </p>
              ) : cashRegisters.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600">
                  No open cash registers are available for the selected branch.
                </p>
              ) : null}

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

      {financeDialog === "bank" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">Add Bank Account</h2>
                <p className="text-sm text-muted-foreground">
                  The new account will be created for the selected branch and
                  loaded automatically.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFinanceDialog(null)}
              >
                ×
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Bank Name *</Label>
                <Input
                  value={bankForm.bank_name}
                  onChange={(e) =>
                    setBankForm((v) => ({ ...v, bank_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Account Name *</Label>
                <Input
                  value={bankForm.account_name}
                  onChange={(e) =>
                    setBankForm((v) => ({ ...v, account_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Account Number *</Label>
                <Input
                  value={bankForm.account_number}
                  onChange={(e) =>
                    setBankForm((v) => ({
                      ...v,
                      account_number: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>IBAN Number</Label>
                <Input
                  value={bankForm.iban_number}
                  onChange={(e) =>
                    setBankForm((v) => ({ ...v, iban_number: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bankForm.opening_balance}
                  onChange={(e) =>
                    setBankForm((v) => ({
                      ...v,
                      opening_balance: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinanceDialog(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  createBankAccountMutation.isPending ||
                  !bankForm.bank_name.trim() ||
                  !bankForm.account_name.trim() ||
                  !bankForm.account_number.trim()
                }
                onClick={() => createBankAccountMutation.mutate()}
              >
                {createBankAccountMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add and Select
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
