import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Info,
  Plus,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
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

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSize = (bytes) => {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

const initialForm = (branchId) => ({
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
  notes: "",
  allocations: [],
});

export default function SupplierPaymentsPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [mode, setMode] = React.useState("list");

  const [form, setForm] = React.useState(() => initialForm(branchId));

  const [errors, setErrors] = React.useState({});

  const [files, setFiles] = React.useState([]);

  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-payments",
    "/purchases/payments/",
    branchParams,
  );

  const { data: optionsResponse } = useQuery({
    queryKey: ["supplier-payment-options", form.branch, form.supplier],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/payments/form-options/", {
          params: {
            branch: form.branch || undefined,

            supplier: form.supplier || undefined,
          },
        }),
      ),

    enabled: mode === "form",
  });

  const options = optionsResponse || {};

  const suppliers = normalizeList(options.suppliers);

  const bills = normalizeList(options.bills);

  const bankAccounts = normalizeList(options.bank_accounts);

  const cashRegisters = normalizeList(options.cash_registers);

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  React.useEffect(() => {
    if (mode !== "form" || !form.supplier) {
      return;
    }

    setForm((current) => ({
      ...current,

      allocations: bills.map((bill) => {
        const existing = current.allocations.find(
          (item) => String(item.bill) === String(bill.id),
        );

        return (
          existing || {
            bill: String(bill.id),

            bill_number: bill.bill_number,

            due_date: bill.due_date,

            balance_due: number(bill.balance_due),

            status: bill.display_status || bill.status,

            selected: false,
            amount: 0,
          }
        );
      }),
    }));
  }, [bills, form.supplier, mode]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const toggleBill = (billId, selected) => {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) =>
        String(allocation.bill) === String(billId)
          ? {
              ...allocation,
              selected,
              amount: selected
                ? allocation.amount > 0
                  ? allocation.amount
                  : allocation.balance_due
                : 0,
            }
          : allocation,
      ),
    }));

    setErrors((current) => ({
      ...current,
      allocations: "",
    }));
  };

  const updateAllocation = (billId, value) => {
    setForm((current) => ({
      ...current,

      allocations: current.allocations.map((allocation) =>
        String(allocation.bill) === String(billId)
          ? {
              ...allocation,
              selected: number(value) > 0,
              amount: value,
            }
          : allocation,
      ),
    }));

    setErrors((current) => ({
      ...current,
      allocations: "",
    }));
  };

  const selectedAllocations = form.allocations.filter(
    (item) => item.selected && number(item.amount) > 0,
  );

  const totalAllocated = selectedAllocations.reduce(
    (sum, item) => sum + number(item.amount),
    0,
  );

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      amount: totalAllocated,
    }));
  }, [totalAllocated]);

  const validate = () => {
    const next = {};

    if (!form.supplier) {
      next.supplier = "Supplier is required.";
    }

    if (!form.payment_date) {
      next.payment_date = "Payment date is required.";
    }

    if (totalAllocated <= 0) {
      next.allocations = "Allocate an amount to at least one supplier bill.";
    }

    const invalid = selectedAllocations.some(
      (item) =>
        number(item.amount) < 0 ||
        number(item.amount) > number(item.balance_due),
    );

    if (invalid) {
      next.allocations = "Allocation cannot exceed the bill balance.";
    }

    if (form.payment_method === "BANK_TRANSFER" && !form.bank_account) {
      next.bank_account = "Bank account is required.";
    }

    if (form.payment_method === "CASH" && !form.cash_register) {
      next.cash_register = "Cash register is required.";
    }

    if (form.payment_method === "CHEQUE" && !form.cheque_number) {
      next.cheque_number = "Cheque number is required.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,

        supplier: Number(form.supplier),

        branch: Number(form.branch),

        bank_account: form.bank_account ? Number(form.bank_account) : null,

        cash_register: form.cash_register ? Number(form.cash_register) : null,

        amount: totalAllocated,

        allocations: selectedAllocations.map((item) => ({
          bill: Number(item.bill),

          amount: number(item.amount),
        })),
      };

      const data = new FormData();

      data.append("payload", JSON.stringify(payload));

      files.forEach((file) => data.append("attachments", file));

      return api.post("/purchases/payments/", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["supplier-payments"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
      ]);

      toast.success("Supplier payment recorded.");

      setMode("list");
      setForm(initialForm(branchId));
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to record payment", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    save.mutate();
  };

  const addFiles = (event) => {
    const incoming = Array.from(event.target.files || []);

    const valid = incoming.filter(
      (file) =>
        file.size <= 10 * 1024 * 1024 &&
        [".pdf", ".jpg", ".jpeg", ".png"].some((extension) =>
          file.name.toLowerCase().endsWith(extension),
        ),
    );

    if (valid.length !== incoming.length) {
      toast.error("Only PDF, JPG and PNG files up to 10 MB are allowed.");
    }

    setFiles((current) => [...current, ...valid]);

    event.target.value = "";
  };

  const columns = React.useMemo(
    () => [
      {
        key: "payment_number",
        header: "Payment No.",
        sortKey: "payment_number",
        sortType: "text",
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "bill_reference",
        header: "Bill Ref",

        cell: (row) =>
          row.bill_reference ||
          row.allocations
            ?.map((item) => item.bill_number)
            .filter(Boolean)
            .join(", ") ||
          "—",
      },
      {
        key: "payment_date",
        header: "Date",
        sortKey: "payment_date",
        sortType: "date",

        cell: (row) =>
          row.payment_date ? <DateText value={row.payment_date} /> : "—",
      },
      {
        key: "payment_method",
        header: "Method",
        sortKey: "payment_method",
        sortType: "text",

        cell: (row) => String(row.payment_method || "").replace(/_/g, " "),
      },
      {
        key: "amount",
        header: "Amount",
        sortKey: "amount",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <CurrencyText value={row.amount} currency={row.currency || "AED"} />
        ),
      },
      {
        key: "reference_number",
        header: "Reference",
        sortKey: "reference_number",
        sortType: "text",
      },
    ],
    [],
  );

  if (mode === "list") {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          title="Supplier Payments"
          subtitle="Outgoing payments made against supplier bills"
          actions={
            <Button
              type="button"
              onClick={() => {
                setForm(initialForm(branchId));
                setErrors({});
                setFiles([]);
                setMode("form");
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          }
        />

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Each payment can settle one bill or be split across several. Records
            payment method, account, reference and bill allocations.
          </p>
        </div>

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search payment number, supplier, bill or reference"
        />

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No supplier payments"
          emptyDescription="Record the first payment against an unpaid supplier bill."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <PageHeader
        title="Record Supplier Payment"
        subtitle="Allocate one payment across one or more supplier bills"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("list")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        }
      />

      <section className="card-surface p-5">
        <h2 className="font-semibold">Payment details</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Who this payment goes to and how much is being paid
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Supplier *</Label>

            <Select
              value={form.supplier}
              onValueChange={(value) => {
                updateForm("supplier", value);

                setForm((current) => ({
                  ...current,
                  allocations: [],
                }));
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>

              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment date *</Label>

            <Input
              type="date"
              value={form.payment_date}
              onChange={(event) =>
                updateForm("payment_date", event.target.value)
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label>Payment amount *</Label>

            <div className="mt-2 flex h-10 items-center rounded-md border border-input bg-background">
              <span className="border-r px-3 text-sm text-muted-foreground">
                AED
              </span>

              <div className="flex-1 px-3 text-right font-semibold">
                {totalAllocated.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <Label>Payment method *</Label>

            <div className="mt-2 flex flex-wrap gap-2">
              {[
                {
                  value: "BANK_TRANSFER",
                  label: "Bank Transfer",
                },
                {
                  value: "CHEQUE",
                  label: "Cheque",
                },
                {
                  value: "CASH",
                  label: "Cash",
                },
              ].map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => updateForm("payment_method", method.value)}
                  className={
                    form.payment_method === method.value
                      ? "rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                  }
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Reference number *</Label>

            <Input
              value={form.reference_number}
              onChange={(event) =>
                updateForm("reference_number", event.target.value)
              }
              placeholder="Transaction ID / cheque no."
              className="mt-2"
            />
          </div>

          <div>
            <Label>Paid from *</Label>

            {form.payment_method === "CASH" ? (
              <Select
                value={form.cash_register}
                onValueChange={(value) => updateForm("cash_register", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select cash register" />
                </SelectTrigger>

                <SelectContent>
                  {cashRegisters.map((register) => (
                    <SelectItem key={register.id} value={String(register.id)}>
                      {register.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={form.bank_account}
                onValueChange={(value) => updateForm("bank_account", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>

                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {form.payment_method === "CHEQUE" && (
            <>
              <div>
                <Label>Cheque number *</Label>

                <Input
                  value={form.cheque_number}
                  onChange={(event) =>
                    updateForm("cheque_number", event.target.value)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Cheque date</Label>

                <Input
                  type="date"
                  value={form.cheque_date}
                  onChange={(event) =>
                    updateForm("cheque_date", event.target.value)
                  }
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">Bills to settle</h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Select one bill or split this payment across several open bills
          </p>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[36px_minmax(180px,1fr)_130px_140px_140px_150px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Bill No.</span>
              <span>Due Date</span>
              <span className="text-right">Balance</span>
              <span>Status</span>
              <span className="text-right">Amount to Pay</span>
            </div>

            <div className="space-y-1">
              {form.allocations.map((allocation) => (
                <div
                  key={allocation.bill}
                  className="grid grid-cols-[36px_minmax(180px,1fr)_130px_140px_140px_150px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(allocation.selected)}
                    onChange={(event) =>
                      toggleBill(allocation.bill, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium">
                    {allocation.bill_number}
                  </span>

                  <span className="text-sm">{allocation.due_date || "—"}</span>

                  <div className="text-right">
                    <CurrencyText value={allocation.balance_due} />
                  </div>

                  <StatusBadge status={allocation.status} />

                  <Input
                    type="number"
                    min="0"
                    max={allocation.balance_due}
                    step="0.01"
                    value={allocation.amount}
                    disabled={!allocation.selected}
                    onChange={(event) =>
                      updateAllocation(allocation.bill, event.target.value)
                    }
                    className="text-right"
                  />
                </div>
              ))}
            </div>

            {!form.supplier && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a supplier to load open bills.
              </p>
            )}

            {form.supplier && !form.allocations.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No unpaid or partially paid bills are available.
              </p>
            )}

            {errors.allocations && (
              <p className="mt-3 text-sm text-red-500">{errors.allocations}</p>
            )}

            <div className="mt-5 flex justify-between border-t pt-4 font-semibold">
              <span>Total allocated across bills</span>

              <CurrencyText value={totalAllocated} />
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <Label>Attachments</Label>

        <p className="mt-1 text-xs text-muted-foreground">
          Payment advice, bank slip or cheque copy
        </p>

        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">
          <UploadCloud className="h-7 w-7 text-blue-500" />

          <span className="mt-2 text-sm font-medium">
            Drag files here or browse to upload
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            PDF, JPG, PNG up to 10 MB
          </span>

          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={addFiles}
          />
        </label>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <FileText className="h-5 w-5 text-blue-500" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>

                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-surface p-5">
        <Label>Notes</Label>

        <Textarea
          rows={4}
          value={form.notes}
          onChange={(event) => updateForm("notes", event.target.value)}
          placeholder="Payment remarks"
          className="mt-3"
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMode("list")}
          disabled={save.isPending}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />

          {save.isPending ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </div>
  );
}
