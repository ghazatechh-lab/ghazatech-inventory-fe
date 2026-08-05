import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  PackageMinus,
  Save,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const asNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSize = (bytes) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
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
  { value: "DAMAGED_IN_TRANSIT", label: "Damaged in transit" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
  { value: "WRONG_ITEM", label: "Wrong item shipped" },
  { value: "EXCESS_QUANTITY", label: "Excess quantity" },
  { value: "OTHER", label: "Other" },
];

export default function SupplierReturnsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const supplierFilter = searchParams.get("supplier") || "";
  const { branchId } = useActiveBranchFilter();
  const editingId = id || null;

  const [form, setForm] = React.useState(() => createForm(branchId));
  const [files, setFiles] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [grnSearch, setGrnSearch] = React.useState("");

  const optionsQuery = useQuery({
    queryKey: ["supplier-return-form-options", branchId, supplierFilter],
    queryFn: async () => {
      const response = await api.get(
        "/purchases/supplier-returns/form-options/",
        {
          params: {
            branch: branchId || undefined,
            supplier: supplierFilter || undefined,
          },
          skipGlobalErrorToast: true,
        },
      );
      return unwrap(response);
    },
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const existingQuery = useQuery({
    queryKey: ["supplier-return", editingId],
    queryFn: async () =>
      unwrap(
        await api.get(`/purchases/supplier-returns/${editingId}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(editingId),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const options = React.useMemo(
    () => optionsQuery.data || {},
    [optionsQuery.data],
  );
  const grns = React.useMemo(() => {
    const candidates = [
      options?.grns,
      options?.data?.grns,
      options?.results,
      options?.data?.results,
      options,
    ];
    for (const candidate of candidates) {
      const list = normalizeList(candidate);
      if (list.length) return list;
    }
    return [];
  }, [options]);

  const filteredGrns = React.useMemo(() => {
    const search = grnSearch.trim().toLowerCase();

    const supplierScopedGrns = supplierFilter
      ? grns.filter(
          (grn) =>
            String(grn.supplier_id || grn.supplier?.id || "") ===
            String(supplierFilter),
        )
      : grns;

    if (!search) {
      return supplierScopedGrns;
    }

    return supplierScopedGrns.filter((grn) =>
      [
        grn.grn_number,
        grn.supplier_name,
        grn.po_number,
        grn.branch_name,
        grn.received_date,
        grn.supplier_invoice_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [grns, grnSearch, supplierFilter]);

  const canViewRestricted = Boolean(
    options?.can_view_restricted ?? options?.data?.can_view_restricted ?? false,
  );
  const canReturnRestricted = Boolean(
    options?.can_return_restricted ??
    options?.data?.can_return_restricted ??
    false,
  );

  React.useEffect(() => {
    if (!existingQuery.data) return;
    const existing = existingQuery.data;

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
        grn_item: String(item.grn_item?.id || item.grn_item || ""),
        product: String(item.product?.id || item.product || ""),
        variant: item.variant ? String(item.variant?.id || item.variant) : "",
        product_name: item.product_name || "",
        sku: item.sku || "",
        available_regular_quantity: asNumber(
          item.available_regular_quantity ?? item.regular_quantity,
        ),
        available_restricted_quantity: asNumber(
          item.available_restricted_quantity ?? item.restricted_quantity,
        ),
        regular_quantity: asNumber(item.regular_quantity),
        restricted_quantity: asNumber(item.restricted_quantity),
        quantity:
          asNumber(item.regular_quantity) + asNumber(item.restricted_quantity),
        unit_price: asNumber(item.unit_price),
        selected:
          asNumber(item.regular_quantity) + asNumber(item.restricted_quantity) >
          0,
        reason: item.reason || "",
      })),
    });
  }, [existingQuery.data]);

  const selectedGRN = React.useMemo(
    () => grns.find((item) => String(item.id) === String(form.grn)),
    [grns, form.grn],
  );

  const selectedItems = React.useMemo(
    () =>
      form.items.filter(
        (item) =>
          item.selected &&
          asNumber(item.regular_quantity) + asNumber(item.restricted_quantity) >
            0,
      ),
    [form.items],
  );

  const totalAmount = React.useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) =>
          sum +
          (asNumber(item.regular_quantity) +
            asNumber(item.restricted_quantity)) *
            asNumber(item.unit_price),
        0,
      ),
    [selectedItems],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setErrors((current) => ({ ...current, items: "" }));
  };

  const selectGRN = (value) => {
    setGrnSearch("");

    const grn = grns.find((item) => String(item.id) === String(value));
    if (!grn) return;

    setForm((current) => ({
      ...current,
      grn: String(grn.id),
      supplier: String(
        grn.supplier_id || grn.supplier?.id || grn.supplier || "",
      ),
      branch: String(grn.branch_id || grn.branch?.id || grn.branch || ""),
      items: (grn.items || []).map((item) => ({
        grn_item: String(item.id),
        product: String(
          item.product_id || item.product?.id || item.product || "",
        ),
        variant: item.variant_id
          ? String(item.variant_id)
          : item.variant
            ? String(item.variant?.id || item.variant)
            : "",
        product_name: item.product_name || "",
        sku: item.sku || "",
        available_regular_quantity: asNumber(
          item.available_regular_quantity ?? item.accepted_regular_quantity,
        ),
        available_restricted_quantity: asNumber(
          item.available_restricted_quantity ??
            item.accepted_restricted_quantity,
        ),
        regular_quantity: 0,
        restricted_quantity: 0,
        quantity: 0,
        unit_price: asNumber(item.unit_price),
        selected: false,
        reason: "",
      })),
    }));
    setErrors((current) => ({ ...current, grn: "", items: "" }));
  };

  const clearSupplierFilter = () => {
    const next = new URLSearchParams(searchParams);

    next.delete("supplier");
    setSearchParams(next, { replace: true });
  };

  const validate = () => {
    const next = {};
    if (!form.grn) next.grn = "Confirmed GRN is required.";
    if (!form.reason) next.reason = "Return reason is required.";
    if (!form.resolution) next.resolution = "Resolution is required.";
    if (!selectedItems.length)
      next.items = "Select at least one item to return.";

    const invalid = selectedItems.some((item) => {
      const regular = asNumber(item.regular_quantity);
      const restricted = asNumber(item.restricted_quantity);
      return (
        regular + restricted <= 0 ||
        regular > asNumber(item.available_regular_quantity) ||
        restricted > asNumber(item.available_restricted_quantity) ||
        (restricted > 0 && !canReturnRestricted)
      );
    });

    if (invalid) {
      next.items =
        "Return quantities must stay within the available regular and restricted balances.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
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
          ...(item.id ? { id: item.id } : {}),
          grn_item: item.grn_item ? Number(item.grn_item) : null,
          product: Number(item.product),
          variant: item.variant ? Number(item.variant) : null,
          received_quantity:
            asNumber(item.regular_quantity) +
            asNumber(item.restricted_quantity),
          regular_quantity: asNumber(item.regular_quantity),
          restricted_quantity: asNumber(item.restricted_quantity),
          quantity:
            asNumber(item.regular_quantity) +
            asNumber(item.restricted_quantity),
          unit_price: asNumber(item.unit_price),
          reason: item.reason || form.details || "",
        })),
      };

      const data = new FormData();
      data.append("payload", JSON.stringify(payload));
      files.forEach((file) => data.append("attachments", file));

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
        skipGlobalErrorToast: true,
      };

      return editingId
        ? api.patch(`/purchases/supplier-returns/${editingId}/`, data, config)
        : api.post("/purchases/supplier-returns/", data, config);
    },
    onSuccess: async (response) => {
      const saved = unwrap(response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["supplier-returns"] }),
        queryClient.invalidateQueries({
          queryKey: ["/purchases/supplier-returns/"],
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-overview"] }),
      ]);

      toast.success(
        saved.status === "PENDING_APPROVAL"
          ? "Supplier return submitted for approval."
          : "Supplier return saved as draft.",
      );
      navigate(`/purchases/supplier-returns/${saved.id || editingId}`);
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
    saveMutation.mutate({ submitForApproval });
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

  if (existingQuery.isLoading) {
    return (
      <div className="purchase-module-page purchase-workspace">
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          Loading supplier return...
        </div>
      </div>
    );
  }

  if (editingId && (existingQuery.isError || !existingQuery.data)) {
    return (
      <div className="purchase-module-page purchase-workspace space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/purchases/supplier-returns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Returns
        </Button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load this supplier return.
        </div>
      </div>
    );
  }

  const isEditable = !editingId || ["DRAFT", "REJECTED"].includes(form.status);

  return (
    <div className="purchase-module-page purchase-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={editingId ? "Edit Supplier Return" : "New Supplier Return"}
        subtitle="Link the return to a confirmed GRN, select quantities, and submit it for approval."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/purchases/supplier-returns")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Returns
          </Button>
        }
      />

      {supplierFilter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <span>
            Showing confirmed GRNs for supplier ID{" "}
            <strong>{supplierFilter}</strong>.
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearSupplierFilter}
          >
            Clear Supplier Filter
          </Button>
        </div>
      ) : null}

      {!isEditable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This return is currently{" "}
          <strong>{form.status.replaceAll("_", " ")}</strong> and can no longer
          be edited. Open its detail page to continue the workflow.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Linked GRN</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Returns must reference the original confirmed goods received note.
            </p>

            <div className="mt-4">
              <Label>GRN reference *</Label>
              <Select
                value={form.grn}
                onValueChange={selectGRN}
                disabled={
                  !isEditable || optionsQuery.isLoading || Boolean(editingId)
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select confirmed GRN" />
                </SelectTrigger>
                <SelectContent className="max-h-80 p-0">
                  <div
                    className="sticky top-0 z-10 border-b bg-popover p-2"
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Input
                      autoFocus
                      value={grnSearch}
                      onChange={(event) => setGrnSearch(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Search GRN, supplier, PO or branch"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1">
                    {filteredGrns.length ? (
                      filteredGrns.map((grn) => (
                        <SelectItem key={grn.id} value={String(grn.id)}>
                          <div>
                            <div className="font-medium">{grn.grn_number}</div>
                            <div className="text-xs text-muted-foreground">
                              {[
                                grn.supplier_name,
                                grn.po_number,
                                grn.branch_name,
                                grn.received_date,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No GRNs match your search.
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>

              {optionsQuery.isError ? (
                <p className="mt-2 text-xs text-red-500">
                  Unable to load confirmed GRNs.
                </p>
              ) : null}
              {!optionsQuery.isLoading &&
              !optionsQuery.isError &&
              !grns.length &&
              !editingId ? (
                <p className="mt-2 text-xs text-amber-600">
                  {supplierFilter
                    ? "No confirmed GRNs with returnable quantities are available for this supplier."
                    : "No confirmed GRNs with returnable quantities are available."}
                </p>
              ) : null}
              {errors.grn ? (
                <p className="mt-1 text-xs text-red-500">{errors.grn}</p>
              ) : null}

              {selectedGRN ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/35 px-4 py-3 text-xs">
                  <span className="font-medium">
                    {selectedGRN.grn_number} · {selectedGRN.supplier_name} ·{" "}
                    {selectedGRN.branch_name}
                  </span>
                  <span className="text-blue-600">
                    Linked PO: {selectedGRN.po_number || "—"}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Reason for return</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Record why the goods are being returned.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {reasonButtons.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => updateForm("reason", reason.value)}
                  className={
                    form.reason === reason.value
                      ? "rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-medium text-violet-700"
                      : "rounded-full border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
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
                disabled={!isEditable}
                onChange={(event) => updateForm("details", event.target.value)}
                placeholder="Describe the damage, defect, incorrect item, or excess quantity."
                className="mt-2"
              />
            </div>
          </section>

          <section className="card-surface overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">Items to return</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Return quantities cannot exceed the remaining returnable balance
                on the GRN.
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[900px]">
                <div
                  className={`grid gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
                    canViewRestricted
                      ? "grid-cols-[36px_minmax(240px,1fr)_110px_110px_110px_110px_120px]"
                      : "grid-cols-[36px_minmax(300px,1fr)_130px_130px_120px]"
                  }`}
                >
                  <span />
                  <span>Item</span>
                  <span className="text-right">Available regular</span>
                  <span className="text-right">Return regular</span>
                  {canViewRestricted ? (
                    <>
                      <span className="text-right">Available restricted</span>
                      <span className="text-right">Return restricted</span>
                    </>
                  ) : null}
                  <span className="text-right">Value</span>
                </div>

                <div className="space-y-1">
                  {form.items.map((item, index) => {
                    const totalReturn =
                      asNumber(item.regular_quantity) +
                      asNumber(item.restricted_quantity);
                    const lineValue = totalReturn * asNumber(item.unit_price);

                    return (
                      <div
                        key={item.grn_item || item.id || index}
                        className={`grid items-center gap-3 border-b py-2 last:border-b-0 ${
                          canViewRestricted
                            ? "grid-cols-[36px_minmax(240px,1fr)_110px_110px_110px_110px_120px]"
                            : "grid-cols-[36px_minmax(300px,1fr)_130px_130px_120px]"
                        } ${item.selected ? "" : "opacity-60"}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.selected)}
                          disabled={!isEditable}
                          onChange={(event) => {
                            const defaultRegular = event.target.checked
                              ? Math.min(
                                  1,
                                  asNumber(item.available_regular_quantity),
                                )
                              : 0;
                            updateItem(index, {
                              selected: event.target.checked,
                              regular_quantity: defaultRegular,
                              restricted_quantity: 0,
                              quantity: defaultRegular,
                            });
                          }}
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
                          disabled={!isEditable || !item.selected}
                          onChange={(event) => {
                            const regular = Math.max(
                              0,
                              Math.min(
                                asNumber(event.target.value),
                                asNumber(item.available_regular_quantity),
                              ),
                            );
                            updateItem(index, {
                              regular_quantity: regular,
                              quantity:
                                regular + asNumber(item.restricted_quantity),
                            });
                          }}
                          className="text-right"
                        />

                        {canViewRestricted ? (
                          <>
                            <div className="text-right text-sm">
                              {item.available_restricted_quantity}
                            </div>
                            <Input
                              type="number"
                              min="0"
                              max={item.available_restricted_quantity}
                              value={item.restricted_quantity}
                              disabled={
                                !isEditable ||
                                !item.selected ||
                                !canReturnRestricted
                              }
                              onChange={(event) => {
                                const restricted = Math.max(
                                  0,
                                  Math.min(
                                    asNumber(event.target.value),
                                    asNumber(
                                      item.available_restricted_quantity,
                                    ),
                                  ),
                                );
                                updateItem(index, {
                                  restricted_quantity: restricted,
                                  quantity:
                                    asNumber(item.regular_quantity) +
                                    restricted,
                                });
                              }}
                              className="text-right"
                            />
                          </>
                        ) : null}

                        <div className="text-right font-medium">
                          <CurrencyText value={lineValue} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!form.items.length ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Select a confirmed GRN to load returnable items.
                  </p>
                ) : null}
                {errors.items ? (
                  <p className="mt-3 text-sm text-red-500">{errors.items}</p>
                ) : null}

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
              Select how the approved return should be financially settled.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                {
                  value: "SUPPLIER_CREDIT_NOTE",
                  title: "Supplier credit note",
                  description:
                    "Create vendor credit that can reduce outstanding supplier bills.",
                },
                {
                  value: "ADJUST_NEXT_BILL",
                  title: "Adjust next bill",
                  description:
                    "Carry the approved return value forward to the supplier's next bill.",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => updateForm("resolution", option.value)}
                  className={
                    form.resolution === option.value
                      ? "rounded-lg border border-violet-400 bg-violet-50 p-4 text-left"
                      : "rounded-lg border p-4 text-left hover:bg-muted/40"
                  }
                >
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="card-surface p-5">
            <Label>Attachments</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Add photos or documents supporting the return request.
            </p>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/25 px-6 py-7 text-center hover:border-blue-400">
              <UploadCloud className="h-7 w-7 text-blue-500" />
              <span className="mt-2 text-sm font-medium">Browse to upload</span>
              <span className="mt-1 text-xs text-muted-foreground">
                PDF, JPG, PNG up to 10 MB
              </span>
              <input
                type="file"
                multiple
                disabled={!isEditable}
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={addFiles}
              />
            </label>

            {files.length ? (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
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
            ) : null}
          </section>

          <section className="card-surface p-5">
            <Label>Additional notes</Label>
            <Textarea
              rows={4}
              value={form.notes}
              disabled={!isEditable}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Internal notes for procurement or warehouse"
              className="mt-3"
            />
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/purchases/supplier-returns")}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            {isEditable ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submit(false)}
                  disabled={saveMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  onClick={() => submit(true)}
                  disabled={saveMutation.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  navigate(`/purchases/supplier-returns/${editingId}`)
                }
              >
                Open Return Details
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Return summary</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.return_number || "Auto-generated number"}
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Supplier</span>
                <span className="text-right font-medium">
                  {selectedGRN?.supplier_name ||
                    existingQuery.data?.supplier_name ||
                    "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Linked GRN</span>
                <span className="font-medium">
                  {selectedGRN?.grn_number ||
                    existingQuery.data?.grn_number ||
                    "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{selectedItems.length}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Return value</span>
                <CurrencyText value={totalAmount} />
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={form.status || "DRAFT"} />
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Correct workflow</h2>
            <div className="mt-4 space-y-4">
              {[
                {
                  icon: Save,
                  title: "Draft",
                  detail: "Return request is prepared and can still be edited.",
                },
                {
                  icon: Send,
                  title: "Pending approval",
                  detail: "Warehouse or procurement reviews the request.",
                },
                {
                  icon: PackageMinus,
                  title: "Approved",
                  detail:
                    "Stock OUT movement is created for approved quantities.",
                },
                {
                  icon: CheckCircle2,
                  title: "Credit issued",
                  detail:
                    "Vendor credit or next-bill adjustment completes the return.",
                },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {index + 1}. {step.title}
                      </p>
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
