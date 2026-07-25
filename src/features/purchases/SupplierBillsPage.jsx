import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Plus,
  Save,
  Send,
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
import { StatusBadge } from "@/components/common/StatusBadge";

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

const addDays = (dateValue, days) => {
  if (!dateValue) return "";

  const value = new Date(`${dateValue}T00:00:00`);
  value.setDate(value.getDate() + Number(days || 0));

  return value.toISOString().slice(0, 10);
};

const formatSize = (bytes) => {
  const value = Number(bytes || 0);

  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

function MetricCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-950 dark:text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-xs text-slate-500">{label}</p>

      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

const createInitialForm = (branchId) => ({
  bill_number: "",
  supplier_invoice_number: "",
  purchase_order: "",
  grn: "",
  supplier: "",
  branch: branchId ? String(branchId) : "",
  bill_date: today(),
  due_date: "",
  payment_terms_days: 0,
  currency: "AED",
  discount_amount: 0,
  paid_amount: 0,
  status: "DRAFT",
  notes: "",
  items: [],
});

export default function SupplierBillsPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [mode, setMode] = React.useState("list");

  const [editingId, setEditingId] = React.useState(null);

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState(() => createInitialForm(branchId));

  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-bills",
    "/purchases/bills/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["supplier-bills-summary", branchParams],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/bills/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse, isLoading: optionsLoading } = useQuery({
    queryKey: ["supplier-bill-form-options", form.branch],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/bills/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),

    enabled: mode === "form",
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["supplier-bill", editingId],

    queryFn: async () =>
      unwrap(await api.get(`/purchases/bills/${editingId}/`)),

    enabled: mode === "form" && Boolean(editingId),

    staleTime: 0,
  });

  const summary = summaryResponse || {
    total_payable: 0,
    overdue: 0,
    bills_this_month: 0,
  };

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const options = optionsResponse || {};

  const purchaseOrders = normalizeList(options.purchase_orders);

  const grns = normalizeList(options.grns);

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      bill_number: existing.bill_number || "",

      supplier_invoice_number: existing.supplier_invoice_number || "",

      purchase_order: String(
        existing.purchase_order?.id || existing.purchase_order || "",
      ),

      grn: String(existing.grn?.id || existing.grn || ""),

      supplier: String(existing.supplier?.id || existing.supplier || ""),

      branch: String(existing.branch?.id || existing.branch || ""),

      bill_date: existing.bill_date || today(),

      due_date: existing.due_date || "",

      payment_terms_days: existing.payment_terms_days || 0,

      currency: existing.currency || "AED",

      discount_amount: existing.discount_amount || 0,

      paid_amount: existing.paid_amount || 0,

      status: existing.status || "DRAFT",

      notes: existing.notes || "",

      items: (existing.items || []).map((item) => ({
        id: item.id,

        grn_item: String(item.grn_item?.id || item.grn_item || ""),

        product: String(item.product?.id || item.product || ""),

        variant: item.variant ? String(item.variant?.id || item.variant) : "",

        product_name: item.product_name || "",

        sku: item.sku || "",

        received_quantity: number(item.received_quantity),

        bill_quantity: number(item.bill_quantity),

        unit_cost: number(item.unit_cost),

        discount_amount: number(item.discount_amount),

        vat_percentage: number(item.vat_percentage),
      })),
    });
  }, [existing]);

  const selectedPO = React.useMemo(
    () =>
      purchaseOrders.find(
        (item) => String(item.id) === String(form.purchase_order),
      ),
    [purchaseOrders, form.purchase_order],
  );

  const selectedGRN = React.useMemo(
    () => grns.find((item) => String(item.id) === String(form.grn)),
    [grns, form.grn],
  );

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

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,

      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));

    setErrors((current) => ({
      ...current,
      items: "",
    }));
  };

  const openNewForm = () => {
    setEditingId(null);
    setFiles([]);
    setErrors({});
    setForm(createInitialForm(branchId));
    setMode("form");
  };

  const openEditForm = (row) => {
    setEditingId(row.id);
    setFiles([]);
    setErrors({});
    setMode("form");
  };

  const closeForm = () => {
    setMode("list");
    setEditingId(null);
    setFiles([]);
    setErrors({});
  };

  const selectPO = (value) => {
    const order = purchaseOrders.find(
      (item) => String(item.id) === String(value),
    );

    if (!order) return;

    setForm((current) => ({
      ...current,

      purchase_order: String(order.id),

      supplier: String(order.supplier_id),

      branch: String(order.branch_id),

      currency: order.currency || "AED",

      grn: "",
      items: [],
    }));
  };

  const selectGRN = (value) => {
    const grn = grns.find((item) => String(item.id) === String(value));

    if (!grn) return;

    setForm((current) => ({
      ...current,

      grn: String(grn.id),

      purchase_order: String(grn.purchase_order_id),

      supplier: String(grn.supplier_id),

      branch: String(grn.branch_id),

      payment_terms_days: number(grn.payment_terms_days),

      due_date: addDays(current.bill_date, grn.payment_terms_days),

      currency: grn.currency || "AED",

      items: (grn.items || []).map((item) => ({
        grn_item: String(item.id),

        product: String(item.product_id),

        variant: item.variant_id ? String(item.variant_id) : "",

        product_name: item.product_name || "",

        sku: item.sku || "",

        received_quantity: number(item.accepted_quantity),

        bill_quantity: number(item.accepted_quantity),

        unit_cost: number(item.unit_cost),

        discount_amount: 0,

        vat_percentage: number(item.vat_percentage ?? 5),
      })),
    }));
  };

  const calculatedItems = React.useMemo(
    () =>
      form.items.map((item) => {
        const gross = number(item.bill_quantity) * number(item.unit_cost);

        const discount = number(item.discount_amount);

        const taxable = Math.max(0, gross - discount);

        const vat = (taxable * number(item.vat_percentage)) / 100;

        return {
          ...item,
          gross,
          vat_amount: vat,
          line_total: taxable + vat,
        };
      }),
    [form.items],
  );

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.gross, 0);

  const lineDiscounts = calculatedItems.reduce(
    (sum, item) => sum + number(item.discount_amount),
    0,
  );

  const vatAmount = calculatedItems.reduce(
    (sum, item) => sum + item.vat_amount,
    0,
  );

  const totalAmount =
    subtotal - lineDiscounts - number(form.discount_amount) + vatAmount;

  const balanceDue = Math.max(0, totalAmount - number(form.paid_amount));

  const quantityMatches =
    calculatedItems.length > 0 &&
    calculatedItems.every(
      (item) => number(item.bill_quantity) === number(item.received_quantity),
    );

  const invoiceAttached =
    files.length > 0 || (existing?.attachments || []).length > 0;

  const creditWithinLimit = selectedGRN
    ? number(selectedGRN.supplier_outstanding) + totalAmount <=
        number(selectedGRN.supplier_credit_limit) ||
      number(selectedGRN.supplier_credit_limit) === 0
    : true;

  const matchStatus =
    quantityMatches && invoiceAttached && creditWithinLimit
      ? "MATCHED"
      : "UNMATCHED";

  const validate = () => {
    const next = {};

    if (!form.purchase_order) {
      next.purchase_order = "Purchase order is required.";
    }

    if (!form.grn) {
      next.grn = "Confirmed GRN is required.";
    }

    if (!form.supplier_invoice_number) {
      next.supplier_invoice_number = "Supplier invoice number is required.";
    }

    if (!form.bill_date) {
      next.bill_date = "Bill date is required.";
    }

    if (!form.due_date) {
      next.due_date = "Due date is required.";
    }

    if (!form.items.length) {
      next.items = "No GRN items are available.";
    }

    const invalid = calculatedItems.some(
      (item) =>
        number(item.bill_quantity) <= 0 ||
        number(item.bill_quantity) > number(item.received_quantity) ||
        number(item.unit_cost) < 0,
    );

    if (invalid) {
      next.items =
        "Bill quantity must be greater than zero and cannot exceed accepted GRN quantity.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async ({ submitForApproval }) => {
      const payload = {
        ...form,

        bill_number: form.bill_number || undefined,

        purchase_order: Number(form.purchase_order),

        grn: Number(form.grn),

        supplier: Number(form.supplier),

        branch: Number(form.branch),

        subtotal,
        vat_amount: vatAmount,

        total_amount: totalAmount,

        balance_due: balanceDue,

        match_status: matchStatus,

        status: submitForApproval
          ? matchStatus === "MATCHED"
            ? "UNPAID"
            : "UNMATCHED"
          : "DRAFT",

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          grn_item: Number(item.grn_item),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          received_quantity: number(item.received_quantity),

          bill_quantity: number(item.bill_quantity),

          unit_cost: number(item.unit_cost),

          discount_amount: number(item.discount_amount),

          vat_percentage: number(item.vat_percentage),
        })),
      };

      const data = new FormData();

      data.append("payload", JSON.stringify(payload));

      files.forEach((file) => data.append("attachments", file));

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        skipGlobalErrorToast: true,
      };

      return editingId
        ? api.patch(`/purchases/bills/${editingId}/`, data, config)
        : api.post("/purchases/bills/", data, config);
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
      ]);

      toast.success(
        saved.status === "UNPAID"
          ? "Supplier bill matched and approved for payment."
          : saved.status === "UNMATCHED"
            ? "Bill saved but remains unmatched."
            : "Supplier bill saved as draft.",
      );

      closeForm();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save supplier bill", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const submit = (submitForApproval) => {
    if (!validate()) return;

    save.mutate({
      submitForApproval,
    });
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
        key: "bill_number",
        header: "Bill No.",
        sortKey: "bill_number",
        sortType: "text",

        cell: (row) => (
          <button
            type="button"
            onClick={() => openEditForm(row)}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.bill_number || "—"}
          </button>
        ),
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "grn_number",
        header: "GRN Ref",
        sortKey: "grn__grn_number",
        sortType: "text",
      },
      {
        key: "bill_date",
        header: "Bill Date",
        sortKey: "bill_date",
        sortType: "date",

        cell: (row) =>
          row.bill_date ? <DateText value={row.bill_date} /> : "—",
      },
      {
        key: "due_date",
        header: "Due Date",
        sortKey: "due_date",
        sortType: "date",

        cell: (row) => (row.due_date ? <DateText value={row.due_date} /> : "—"),
      },
      {
        key: "total_amount",
        header: "Amount",
        sortKey: "total_amount",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <CurrencyText
            value={row.total_amount}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "balance_due",
        header: "Balance",
        sortKey: "balance_due",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <CurrencyText
            value={row.balance_due}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",

        cell: (row) => (
          <StatusBadge status={row.display_status || row.status} />
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right",

        cell: (row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openEditForm(row)}
          >
            Open
          </Button>
        ),
      },
    ],
    [],
  );

  if (mode === "list") {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          title="Supplier Bills"
          subtitle="Invoices received from suppliers, matched to GRNs"
          actions={
            <Button
              type="button"
              onClick={openNewForm}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Bill
            </Button>
          }
        />

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Three-way match: PO → GRN → Bill before approval for payment. Tracks
            due date, aging, partial payments and outstanding balance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Payable"
            value={<CurrencyText value={summary.total_payable} />}
          />

          <MetricCard
            label="Overdue"
            tone="danger"
            value={<CurrencyText value={summary.overdue} />}
          />

          <MetricCard
            label="Bills This Month"
            value={summary.bills_this_month || 0}
          />
        </div>

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search bill number, supplier, PO or GRN"
        />

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No supplier bills"
          emptyDescription="Record a supplier invoice against a confirmed GRN."
        />
      </div>
    );
  }

  if (editingId && existingLoading) {
    return <div className="card-surface p-6">Loading supplier bill...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={editingId ? "Edit Bill" : "Record Bill"}
        subtitle="Log a supplier invoice and match it against the PO and GRN before approval"
        actions={
          <Button type="button" variant="outline" onClick={closeForm}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bills
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Three-way match</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              This bill must reconcile with its PO and GRN before payment
              approval.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>PO reference *</Label>

                <Select
                  value={form.purchase_order}
                  onValueChange={selectPO}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select PO" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {purchaseOrders.map((order) => (
                      <SelectItem key={order.id} value={String(order.id)}>
                        {order.po_number}
                        {" · "}
                        {order.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.purchase_order && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.purchase_order}
                  </p>
                )}
              </div>

              <div>
                <Label>GRN reference *</Label>

                <Select
                  value={form.grn}
                  onValueChange={selectGRN}
                  disabled={!form.purchase_order}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select confirmed GRN" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {grns
                      .filter(
                        (grn) =>
                          !form.purchase_order ||
                          String(grn.purchase_order_id) ===
                            String(form.purchase_order),
                      )
                      .map((grn) => (
                        <SelectItem key={grn.id} value={String(grn.id)}>
                          {grn.grn_number}
                          {" · "}
                          {grn.total_accepted_quantity}
                          {" units"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {errors.grn && (
                  <p className="mt-1 text-xs text-red-500">{errors.grn}</p>
                )}
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Bill details</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Supplier invoice no. *</Label>

                <Input
                  value={form.supplier_invoice_number}
                  onChange={(event) =>
                    updateForm("supplier_invoice_number", event.target.value)
                  }
                  placeholder="e.g. INV-88213"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Bill date *</Label>

                <Input
                  type="date"
                  value={form.bill_date}
                  onChange={(event) => {
                    const value = event.target.value;

                    updateForm("bill_date", value);

                    updateForm(
                      "due_date",
                      addDays(value, form.payment_terms_days),
                    );
                  }}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Due date *</Label>

                <Input
                  type="date"
                  min={form.bill_date}
                  value={form.due_date}
                  onChange={(event) =>
                    updateForm("due_date", event.target.value)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Supplier</Label>

                <Input
                  value={
                    selectedGRN?.supplier_name ||
                    selectedPO?.supplier_name ||
                    ""
                  }
                  readOnly
                  className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
                />
              </div>

              <div>
                <Label>Payment terms</Label>

                <Input
                  value={`Net ${form.payment_terms_days || 0}`}
                  readOnly
                  className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
                />
              </div>

              <div>
                <Label>Currency</Label>

                <Input
                  value={form.currency}
                  readOnly
                  className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
                />
              </div>
            </div>
          </section>

          <section className="card-surface overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="font-semibold">Bill line items</h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Items are selected automatically from the confirmed GRN.
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[850px]">
                <div className="grid grid-cols-[minmax(260px,1fr)_120px_110px_110px_130px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Item</span>
                  <span className="text-right">Received Qty</span>
                  <span className="text-right">Bill Qty</span>
                  <span className="text-right">Unit Cost</span>
                  <span className="text-right">Total</span>
                </div>

                <div className="space-y-2">
                  {calculatedItems.map((item, index) => (
                    <div
                      key={item.id || item.grn_item || index}
                      className="grid grid-cols-[minmax(260px,1fr)_120px_110px_110px_130px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.product_name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {item.sku || "No SKU"}
                        </p>

                        {number(item.bill_quantity) !==
                          number(item.received_quantity) && (
                          <p className="mt-1 text-[11px] text-red-500">
                            Bill quantity differs from GRN.
                          </p>
                        )}
                      </div>

                      <div className="text-right text-sm">
                        {item.received_quantity}
                      </div>

                      <Input
                        type="number"
                        min="0"
                        max={item.received_quantity}
                        value={item.bill_quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            bill_quantity: event.target.value,
                          })
                        }
                        className="text-right"
                      />

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(event) =>
                          updateItem(index, {
                            unit_cost: event.target.value,
                          })
                        }
                        className="text-right"
                      />

                      <div className="text-right font-medium">
                        <CurrencyText
                          value={item.line_total}
                          currency={form.currency}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {!form.items.length && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Select a confirmed GRN to load accepted items automatically.
                  </p>
                )}

                {errors.items && (
                  <p className="mt-3 text-sm text-red-500">{errors.items}</p>
                )}

                <div className="ml-auto mt-6 max-w-xs space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>

                    <CurrencyText value={subtotal} currency={form.currency} />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>

                    <CurrencyText value={vatAmount} currency={form.currency} />
                  </div>

                  <div className="flex justify-between border-t pt-3 font-semibold">
                    <span>Total</span>

                    <CurrencyText
                      value={totalAmount}
                      currency={form.currency}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <Label>Notes</Label>

            <Textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Bill remarks, variance reasons or approval notes"
              className="mt-3"
            />
          </section>

          <section className="card-surface p-5">
            <Label>Supplier invoice attachment</Label>

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">
              <UploadCloud className="h-7 w-7 text-blue-500" />

              <span className="mt-2 text-sm font-medium">
                Browse to upload invoice
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
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => submit(false)}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>

            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={save.isPending}
              onClick={() => submit(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Bill summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked PO</span>

                <span className="font-medium">
                  {selectedPO?.po_number || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked GRN</span>

                <span className="font-medium">
                  {selectedGRN?.grn_number || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Bill amount</span>

                <CurrencyText value={totalAmount} currency={form.currency} />
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance due</span>

                <CurrencyText value={balanceDue} currency={form.currency} />
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Status</span>

                <StatusBadge status={matchStatus} />
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Approval requires</h2>

            <div className="mt-4 space-y-3">
              {[
                {
                  ok: quantityMatches,
                  title: "Quantity match",
                },
                {
                  ok: invoiceAttached,
                  title: "Invoice attached",
                },
                {
                  ok: creditWithinLimit,
                  title: "Credit limit check",
                },
              ].map((check) => (
                <div
                  key={check.title}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}

                  <p className="text-sm font-medium">{check.title}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
