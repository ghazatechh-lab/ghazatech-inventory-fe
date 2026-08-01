import { useMemo } from "react";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  PackageMinus,
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

const formatSize = (bytes) => {
  const value = Number(bytes || 0);

  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

const createForm = (branchId) => ({
  return_number: "",
  grn: "",
  supplier: "",
  branch: branchId ? String(branchId) : "",
  return_date: today(),
  reason: "DAMAGED_IN_TRANSIT",
  details: "",
  resolution: "SUPPLIER_CREDIT_NOTE",
  status: "DRAFT",
  notes: "",
  items: [],
});

const reasonButtons = [
  {
    value: "DAMAGED_IN_TRANSIT",
    label: "Damaged in transit",
  },
  {
    value: "QUALITY_ISSUE",
    label: "Quality issue",
  },
  {
    value: "WRONG_ITEM",
    label: "Wrong item shipped",
  },
  {
    value: "EXCESS_QUANTITY",
    label: "Excess quantity",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const getAllowedReturnStatuses = (status) => {
  const transitions = {
    DRAFT: [
      { value: "DRAFT", label: "Draft" },
      { value: "PENDING_APPROVAL", label: "Pending Approval" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
    PENDING_APPROVAL: [
      { value: "PENDING_APPROVAL", label: "Pending Approval" },
      { value: "APPROVED", label: "Approve" },
      { value: "REJECTED", label: "Rejected" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
    APPROVED: [
      { value: "APPROVED", label: "Approved" },
      { value: "CREDIT_ISSUED", label: "Credit Issued" },
    ],
    CREDIT_ISSUED: [{ value: "CREDIT_ISSUED", label: "Credit Issued" }],
    REJECTED: [{ value: "REJECTED", label: "Rejected" }],
    CANCELLED: [{ value: "CANCELLED", label: "Cancelled" }],
  };

  return (
    transitions[status] || [
      { value: status, label: String(status || "").replaceAll("_", " ") },
    ]
  );
};

export default function SupplierReturnsPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [mode, setMode] = React.useState("list");

  const [editingId, setEditingId] = React.useState(null);

  const [form, setForm] = React.useState(() => createForm(branchId));

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-returns",
    "/purchases/supplier-returns/",
    branchParams,
  );

  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery({
    queryKey: ["supplier-return-form-options"],

    queryFn: async () => {
      const response = await api.get(
        "/purchases/supplier-returns/form-options/",
        {
          skipGlobalErrorToast: true,
        },
      );

      const unwrapped = unwrap(response);

      console.log("Supplier Return GRN raw API response:", response?.data);
      console.log("Supplier Return GRN unwrapped response:", unwrapped);

      return unwrapped;
    },

    enabled: mode === "form",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["supplier-return", editingId],

    queryFn: async () =>
      unwrap(await api.get(`/purchases/supplier-returns/${editingId}/`)),

    enabled: mode === "form" && Boolean(editingId),

    staleTime: 0,
  });

  const options = useMemo(() => optionsResponse || {}, [optionsResponse]);

  const grns = React.useMemo(() => {
    const candidates = [
      options?.grns,
      options?.data?.grns,
      options?.results,
      options?.data?.results,
      optionsResponse,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeList(candidate);
      if (normalized.length) return normalized;
    }

    return [];
  }, [options, optionsResponse]);

  const canViewRestricted = Boolean(
    options?.can_view_restricted ?? options?.data?.can_view_restricted ?? false,
  );

  const canReturnRestricted = Boolean(
    options?.can_return_restricted ??
    options?.data?.can_return_restricted ??
    false,
  );

  React.useEffect(() => {
    console.log("Supplier Return normalized GRNs:", grns);

    if (optionsError) {
      console.error(
        "Supplier Return GRN options error:",
        optionsError?.response?.data || optionsError,
      );
    }
  }, [grns, optionsError]);

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      return_number: existing.return_number || "",

      grn: String(existing.grn?.id || existing.grn || ""),

      supplier: String(existing.supplier?.id || existing.supplier || ""),

      branch: String(existing.branch?.id || existing.branch || ""),

      return_date: existing.return_date || today(),

      reason: existing.reason || "DAMAGED_IN_TRANSIT",

      details: existing.details || "",

      resolution: existing.resolution || "SUPPLIER_CREDIT_NOTE",

      status: existing.status || "DRAFT",

      notes: existing.notes || "",

      items: (existing.items || []).map((item) => ({
        id: item.id,

        grn_item: item.grn_item
          ? String(item.grn_item?.id || item.grn_item)
          : "",

        product: String(item.product?.id || item.product || ""),

        variant: item.variant ? String(item.variant?.id || item.variant) : "",

        product_name: item.product_name || "",

        sku: item.sku || "",

        received_quantity: number(item.received_quantity),
        available_regular_quantity: number(
          item.available_regular_quantity ?? item.regular_quantity,
        ),
        available_restricted_quantity: number(
          item.available_restricted_quantity ?? item.restricted_quantity,
        ),
        regular_quantity: number(item.regular_quantity),
        restricted_quantity: number(item.restricted_quantity),
        quantity:
          number(item.regular_quantity) + number(item.restricted_quantity),

        unit_price: number(item.unit_price),

        selected:
          number(item.regular_quantity) + number(item.restricted_quantity) > 0,

        reason: item.reason || "",
      })),
    });
  }, [existing]);

  const selectedGRN = React.useMemo(
    () => grns.find((item) => String(item.id) === String(form.grn)),
    [grns, form.grn],
  );

  const selectedItems = form.items.filter(
    (item) =>
      item.selected &&
      number(item.regular_quantity) + number(item.restricted_quantity) > 0,
  );

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + number(item.quantity) * number(item.unit_price),
    0,
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

  const selectGRN = (value) => {
    const grn = grns.find((item) => String(item.id) === String(value));

    if (!grn) return;

    setForm((current) => ({
      ...current,

      grn: String(grn.id),

      supplier: String(grn.supplier_id),

      branch: String(grn.branch_id),

      items: (grn.items || []).map((item) => ({
        grn_item: String(item.id),

        product: String(item.product_id),

        variant: item.variant_id ? String(item.variant_id) : "",

        product_name: item.product_name || "",

        sku: item.sku || "",

        received_quantity: number(item.accepted_quantity),
        available_regular_quantity: number(
          item.available_regular_quantity ?? item.accepted_regular_quantity,
        ),
        available_restricted_quantity: number(
          item.available_restricted_quantity ??
            item.accepted_restricted_quantity,
        ),
        regular_quantity: 0,
        restricted_quantity: 0,
        quantity: 0,

        unit_price: number(item.unit_price),

        selected: false,
        reason: "",
      })),
    }));
  };

  const openNew = () => {
    setEditingId(null);
    setForm(createForm(branchId));
    setFiles([]);
    setErrors({});
    setMode("form");
  };

  const openExisting = (row) => {
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

  const validate = () => {
    const next = {};

    if (!form.grn) {
      next.grn = "Confirmed GRN is required.";
    }

    if (!form.reason) {
      next.reason = "Return reason is required.";
    }

    if (!form.resolution) {
      next.resolution = "Resolution is required.";
    }

    if (!selectedItems.length) {
      next.items = "Select at least one item to return.";
    }

    const invalid = selectedItems.some((item) => {
      const regular = number(item.regular_quantity);
      const restricted = number(item.restricted_quantity);
      return (
        regular + restricted <= 0 ||
        regular > number(item.available_regular_quantity) ||
        restricted > number(item.available_restricted_quantity) ||
        (restricted > 0 && !canReturnRestricted)
      );
    });

    if (invalid) {
      next.items =
        "Return quantities must be within the available regular and restricted balances.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const updateStatus = useMutation({
    mutationFn: async ({ row, nextStatus }) => {
      if (nextStatus === row.status) {
        return row;
      }

      if (nextStatus === "APPROVED") {
        return unwrap(
          await api.post(
            `/purchases/supplier-returns/${row.id}/approve/`,
            {},
            { skipGlobalErrorToast: true },
          ),
        );
      }

      return unwrap(
        await api.post(
          `/purchases/supplier-returns/${row.id}/update-status/`,
          { status: nextStatus },
          { skipGlobalErrorToast: true },
        ),
      );
    },

    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: ["supplier-returns"],
      });

      toast.success(
        `Return status updated to ${String(saved.status || "")
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase())}.`,
      );
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to update return status", {
        description:
          details.summary ||
          details.message ||
          "The selected status transition is not allowed.",
      });
    },
  });

  const save = useMutation({
    mutationFn: async ({ submitForApproval }) => {
      const payload = {
        ...form,

        return_number: form.return_number || undefined,

        grn: Number(form.grn),

        supplier: Number(form.supplier),

        branch: Number(form.branch),

        total_amount: totalAmount,

        status: submitForApproval ? "PENDING_APPROVAL" : "DRAFT",

        items: selectedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          grn_item: item.grn_item ? Number(item.grn_item) : null,

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          received_quantity:
            number(item.regular_quantity) + number(item.restricted_quantity),

          regular_quantity: number(item.regular_quantity),
          restricted_quantity: number(item.restricted_quantity),
          quantity:
            number(item.regular_quantity) + number(item.restricted_quantity),

          unit_price: number(item.unit_price),

          reason: item.reason || form.details || "",
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
        ? api.patch(`/purchases/supplier-returns/${editingId}/`, data, config)
        : api.post("/purchases/supplier-returns/", data, config);
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["supplier-returns"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["stock-overview"],
        }),
      ]);

      toast.success(
        saved.status === "PENDING_APPROVAL"
          ? "Supplier return submitted for approval."
          : "Supplier return saved as draft.",
      );

      closeForm();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save supplier return", {
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
        key: "return_number",
        header: "Return No.",
        sortKey: "return_number",
        sortType: "text",

        cell: (row) => (
          <button
            type="button"
            onClick={() => openExisting(row)}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.return_number || "—"}
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
        key: "return_date",
        header: "Date",
        sortKey: "return_date",
        sortType: "date",

        cell: (row) =>
          row.return_date ? <DateText value={row.return_date} /> : "—",
      },
      {
        key: "reason_display",
        header: "Reason",
        sortKey: "reason",
        sortType: "text",

        cell: (row) =>
          row.reason_display ||
          String(row.reason || "")
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      },
      {
        key: "item_count",
        header: "Items",
        sortType: "quantity",
        align: "right",
      },
      {
        key: "total_amount",
        header: "Value",
        sortKey: "total_amount",
        sortType: "currency",
        align: "right",

        cell: (row) => <CurrencyText value={row.total_amount} />,
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",

        cell: (row) => {
          const statusOptions = getAllowedReturnStatuses(row.status);
          const isLocked = statusOptions.length <= 1;

          return (
            <div
              className="min-w-[180px]"
              onClick={(event) => event.stopPropagation()}
            >
              <Select
                value={row.status}
                disabled={
                  isLocked ||
                  (updateStatus.isPending &&
                    updateStatus.variables?.row?.id === row.id)
                }
                onValueChange={(nextStatus) =>
                  updateStatus.mutate({
                    row,
                    nextStatus,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    <StatusBadge status={row.status} />
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
      },
    ],
    [updateStatus],
  );

  if (mode === "list") {
    const payload = query.data || {
      results: [],
      count: 0,
    };

    const rows = payload.results || [];

    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          title="Supplier Returns"
          subtitle="Goods sent back to suppliers — damaged, wrong, or rejected items"
          actions={
            <Button
              type="button"
              onClick={openNew}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          }
        />

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Linked to the original GRN. On approval, accepted return quantities
            create a stock OUT movement and generate a supplier credit or
            next-bill adjustment.
          </p>
        </div>

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search return number, supplier, GRN or reason"
        />

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No supplier returns"
          emptyDescription="Create a return for damaged, incorrect, or excess received goods."
        />
      </div>
    );
  }

  if (editingId && existingLoading) {
    return <div className="card-surface p-6">Loading supplier return...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={editingId ? "Edit Return" : "New Return"}
        subtitle="Send goods back to a supplier — damaged, wrong, or rejected items"
        actions={
          <Button type="button" variant="outline" onClick={closeForm}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Returns
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Linked GRN</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Returns must reference the original goods received note.
            </p>

            <div className="mt-4">
              <Label>GRN reference *</Label>

              <Select
                value={form.grn}
                onValueChange={selectGRN}
                disabled={optionsLoading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select confirmed GRN" />
                </SelectTrigger>

                <SelectContent className="max-h-72">
                  {grns.map((grn) => (
                    <SelectItem key={grn.id} value={String(grn.id)}>
                      {grn.grn_number}
                      {" — "}
                      {grn.supplier_name}
                      {" — "}
                      {grn.received_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {optionsError && (
                <p className="mt-2 text-xs text-red-500">
                  Unable to load confirmed GRNs. Check the browser console and
                  backend logs.
                </p>
              )}

              {!optionsLoading && !optionsError && grns.length === 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  No confirmed GRNs with returnable quantities are available.
                </p>
              )}

              {errors.grn && (
                <p className="mt-1 text-xs text-red-500">{errors.grn}</p>
              )}

              {selectedGRN && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-white/10 dark:bg-white/[0.025]">
                  <span className="font-medium">
                    {selectedGRN.grn_number}
                    {" · "}
                    {selectedGRN.supplier_name}
                    {" · "}
                    {selectedGRN.branch_name}
                    {" · "}
                    {selectedGRN.receipt_status}
                  </span>

                  <span className="text-blue-600 dark:text-blue-400">
                    Linked PO: {selectedGRN.po_number}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Reason for return</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Why these items are going back.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {reasonButtons.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => updateForm("reason", reason.value)}
                  className={
                    form.reason === reason.value
                      ? "rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-medium text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                  }
                >
                  {reason.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label>
                Details{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>

              <Textarea
                rows={4}
                value={form.details}
                onChange={(event) => updateForm("details", event.target.value)}
                placeholder="e.g. Outer casing on 2 units cracked, likely from rough handling during transit"
                className="mt-2"
              />
            </div>
          </section>

          <section className="card-surface overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="font-semibold">Items to return</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter regular and restricted quantities separately. Approval
                deducts each quantity from its matching stock balance.
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[980px]">
                <div
                  className={`grid gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
                    canViewRestricted
                      ? "grid-cols-[36px_minmax(240px,1fr)_110px_110px_110px_110px_120px]"
                      : "grid-cols-[36px_minmax(300px,1fr)_130px_130px_120px]"
                  }`}
                >
                  <span />
                  <span>Item</span>
                  <span className="text-right">Available Regular</span>
                  <span className="text-right">Return Regular</span>
                  {canViewRestricted && (
                    <>
                      <span className="text-right">Available Restricted</span>
                      <span className="text-right">Return Restricted</span>
                    </>
                  )}
                  <span className="text-right">Value</span>
                </div>

                <div className="space-y-1">
                  {form.items.map((item, index) => {
                    const totalReturn =
                      number(item.regular_quantity) +
                      number(item.restricted_quantity);
                    const lineValue = totalReturn * number(item.unit_price);

                    return (
                      <div
                        key={item.grn_item || index}
                        className={`grid items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5 ${
                          canViewRestricted
                            ? "grid-cols-[36px_minmax(240px,1fr)_110px_110px_110px_110px_120px]"
                            : "grid-cols-[36px_minmax(300px,1fr)_130px_130px_120px]"
                        } ${item.selected ? "" : "opacity-60"}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.selected)}
                          onChange={(event) =>
                            updateItem(index, {
                              selected: event.target.checked,
                              regular_quantity: event.target.checked
                                ? Math.min(
                                    1,
                                    number(item.available_regular_quantity),
                                  )
                                : 0,
                              restricted_quantity: 0,
                              quantity: event.target.checked
                                ? Math.min(
                                    1,
                                    number(item.available_regular_quantity),
                                  )
                                : 0,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />

                        <div>
                          <p className="text-sm font-medium">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.sku || "No SKU"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Total return: {totalReturn}
                          </p>
                        </div>

                        <div className="text-right text-sm">
                          {item.available_regular_quantity}
                        </div>

                        <Input
                          type="number"
                          min="0"
                          max={item.available_regular_quantity}
                          value={item.regular_quantity}
                          disabled={!item.selected}
                          onChange={(event) => {
                            const regular = Math.max(
                              0,
                              Math.min(
                                number(event.target.value),
                                number(item.available_regular_quantity),
                              ),
                            );
                            updateItem(index, {
                              regular_quantity: regular,
                              quantity:
                                regular + number(item.restricted_quantity),
                            });
                          }}
                          className="text-right"
                        />

                        {canViewRestricted && (
                          <>
                            <div className="text-right text-sm">
                              {item.available_restricted_quantity}
                            </div>

                            <Input
                              type="number"
                              min="0"
                              max={item.available_restricted_quantity}
                              value={item.restricted_quantity}
                              disabled={!item.selected || !canReturnRestricted}
                              onChange={(event) => {
                                const restricted = Math.max(
                                  0,
                                  Math.min(
                                    number(event.target.value),
                                    number(item.available_restricted_quantity),
                                  ),
                                );
                                updateItem(index, {
                                  restricted_quantity: restricted,
                                  quantity:
                                    number(item.regular_quantity) + restricted,
                                });
                              }}
                              className="text-right"
                              title={
                                canReturnRestricted
                                  ? "Restricted quantity to return"
                                  : "You do not have permission to return restricted stock"
                              }
                            />
                          </>
                        )}

                        <div className="text-right font-medium">
                          <CurrencyText value={lineValue} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!form.items.length && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Select a confirmed GRN to load received items.
                  </p>
                )}

                {errors.items && (
                  <p className="mt-3 text-sm text-red-500">{errors.items}</p>
                )}

                <div className="mt-5 flex justify-end gap-8 border-t pt-4 font-semibold">
                  <span>Return value</span>
                  <CurrencyText value={totalAmount} />
                </div>
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Resolution</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              How this return will be settled once approved.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => updateForm("resolution", "SUPPLIER_CREDIT_NOTE")}
                className={
                  form.resolution === "SUPPLIER_CREDIT_NOTE"
                    ? "rounded-lg border border-violet-400 bg-violet-50 p-4 text-left dark:bg-violet-500/10"
                    : "rounded-lg border p-4 text-left"
                }
              >
                <p className="text-sm font-semibold">Supplier credit note</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Reduces this supplier's outstanding balance by the return
                  value.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateForm("resolution", "ADJUST_NEXT_BILL")}
                className={
                  form.resolution === "ADJUST_NEXT_BILL"
                    ? "rounded-lg border border-violet-400 bg-violet-50 p-4 text-left dark:bg-violet-500/10"
                    : "rounded-lg border p-4 text-left"
                }
              >
                <p className="text-sm font-semibold">Adjust next bill</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Deducts the return value from the next bill raised for this
                  supplier.
                </p>
              </button>
            </div>
          </section>

          <section className="card-surface p-5">
            <Label>Attachments</Label>

            <p className="mt-1 text-xs text-muted-foreground">
              Photos of damage or defect — required for approval when
              applicable.
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

          <section className="card-surface p-5">
            <Label>Additional notes</Label>

            <Textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Internal notes for procurement or warehouse"
              className="mt-3"
            />
          </section>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
              disabled={save.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={save.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>

            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => submit(true)}
              disabled={save.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Return summary</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {form.return_number || "Auto Return"}
              {" · "}
              {form.status}
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Supplier</span>

                <span className="text-right font-medium">
                  {selectedGRN?.supplier_name || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked GRN</span>

                <span className="font-medium">
                  {selectedGRN?.grn_number || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason</span>

                <span className="text-right font-medium">
                  {reasonButtons.find((item) => item.value === form.reason)
                    ?.label || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>

                <span className="font-medium">{selectedItems.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Return value</span>

                <CurrencyText value={totalAmount} />
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Status</span>

                <StatusBadge
                  status={
                    form.status === "DRAFT" ? "PENDING_APPROVAL" : form.status
                  }
                />
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">What happens next</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Runs automatically once approved.
            </p>

            <div className="mt-4 space-y-4">
              {[
                {
                  icon: CheckCircle2,
                  title: "Return created",
                  detail: "Draft or approval request recorded",
                },
                {
                  icon: AlertTriangle,
                  title: "Pending approval",
                  detail: "Warehouse or procurement sign-off",
                },
                {
                  icon: PackageMinus,
                  title: "Stock OUT movement",
                  detail: "Returned quantity removed from branch inventory",
                },
                {
                  icon: CheckCircle2,
                  title: "Credit issued / adjusted",
                  detail: "Based on the selected resolution",
                },
              ].map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                      {index === 0 ? <Icon className="h-4 w-4" /> : index + 1}
                    </div>

                    <div>
                      <p className="text-sm font-medium">{step.title}</p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
