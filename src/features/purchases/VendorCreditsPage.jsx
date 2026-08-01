import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Plus,
  Save,
  Send,
  Trash2,
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

const emptyLine = () => ({
  description: "",
  gl_account: "",
  quantity: 1,
  unit_price: 0,
  tax_percentage: 0,
});

const createForm = (branchId) => ({
  credit_number: "",
  supplier: "",
  supplier_return: "",
  purchase_order: "",
  supplier_bill: "",
  branch: branchId ? String(branchId) : "",
  credit_date: today(),
  currency: "AED",
  reference_number: "",
  reason: "RETURN",
  notes: "",
  internal_memo: "",
  status: "DRAFT",
  items: [emptyLine()],
  applications: [],
});

const reasonOptions = [
  {
    value: "RETURN",
    label: "Return",
  },
  {
    value: "DAMAGED_GOODS",
    label: "Damaged goods",
  },
  {
    value: "OVERBILLING",
    label: "Overbilling",
  },
  {
    value: "PRICE_ADJUSTMENT",
    label: "Price adjustment",
  },
  {
    value: "FREIGHT_ADJUSTMENT",
    label: "Freight adjustment",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

function SummaryCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-950 dark:text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-xs text-muted-foreground">{label}</p>

      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function VendorCreditsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();

  const isNewRoute = location.pathname.endsWith("/new");
  const isEditRoute = location.pathname.endsWith("/edit") && Boolean(routeId);

  const { branchId, branchParams } = useActiveBranchFilter();

  const [mode, setMode] = React.useState(() =>
    isNewRoute || isEditRoute ? "form" : "list",
  );

  const [editingId, setEditingId] = React.useState(() =>
    isEditRoute ? routeId : null,
  );

  const [form, setForm] = React.useState(() => createForm(branchId));

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState({});

  const [statusFilter, setStatusFilter] = React.useState("ALL");

  React.useEffect(() => {
    if (isEditRoute) {
      setEditingId(routeId);
      setMode("form");
      return;
    }

    if (isNewRoute) {
      setEditingId(null);
      setForm(createForm(branchId));
      setFiles([]);
      setErrors({});
      setMode("form");
      return;
    }

    setEditingId(null);
    setFiles([]);
    setErrors({});
    setMode("list");
  }, [isEditRoute, isNewRoute, routeId, branchId]);

  const { query, q, setQ, page, setPage } = useListQuery(
    "vendor-credits",
    "/purchases/vendor-credits/",
    {
      ...branchParams,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    },
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["vendor-credit-summary", branchParams],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/vendor-credits/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse, isLoading: optionsLoading } = useQuery({
    queryKey: ["vendor-credit-form-options", form.branch, form.supplier],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/vendor-credits/form-options/", {
          params: {
            branch: form.branch || undefined,

            supplier: form.supplier || undefined,
          },
        }),
      ),

    enabled: mode === "form",
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["vendor-credit", editingId],

    queryFn: async () =>
      unwrap(await api.get(`/purchases/vendor-credits/${editingId}/`)),

    enabled: mode === "form" && Boolean(editingId),

    staleTime: 0,
  });

  const summary = summaryResponse || {
    all_count: 0,
    open_count: 0,
    partial_count: 0,
    applied_count: 0,
    void_count: 0,
    open_balance: 0,
  };

  const optionLists = React.useMemo(() => {
    const options = optionsResponse || {};

    return {
      suppliers: normalizeList(options.suppliers),
      supplierReturns: normalizeList(options.supplier_returns),
      purchaseOrders: normalizeList(options.purchase_orders),
      supplierBills: normalizeList(options.supplier_bills),
      glAccounts: normalizeList(options.gl_accounts),
      openBills: normalizeList(
        options.open_bills?.length
          ? options.open_bills
          : options.supplier_bills,
      ),
      defaultInventoryAccountId: options.default_inventory_account_id || null,
    };
  }, [optionsResponse]);

  const {
    suppliers,
    supplierReturns,
    purchaseOrders,
    supplierBills,
    glAccounts,
    openBills,
    defaultInventoryAccountId,
  } = optionLists;

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      credit_number: existing.credit_number || "",

      supplier: String(existing.supplier?.id || existing.supplier || ""),

      supplier_return: existing.supplier_return
        ? String(existing.supplier_return?.id || existing.supplier_return)
        : "",

      purchase_order: existing.purchase_order
        ? String(existing.purchase_order?.id || existing.purchase_order)
        : "",

      supplier_bill: existing.supplier_bill
        ? String(existing.supplier_bill?.id || existing.supplier_bill)
        : "",

      branch: String(existing.branch?.id || existing.branch || ""),

      credit_date: existing.credit_date || today(),

      currency: existing.currency || "AED",

      reference_number: existing.reference_number || "",

      reason: existing.reason || "RETURN",

      notes: existing.notes || "",

      internal_memo: existing.internal_memo || "",

      status: existing.status || "DRAFT",

      items: (existing.items || []).map((item) => ({
        id: item.id,
        description: item.description || "",
        gl_account: item.gl_account ? String(item.gl_account) : "",
        quantity: number(item.quantity),
        unit_price: number(item.unit_price),
        tax_percentage: number(item.tax_percentage),
      })),

      applications: (existing.applications || []).map((application) => ({
        id: application.id,
        bill: String(application.bill?.id || application.bill),
        bill_number: application.bill_number || "",
        due_date: application.due_date || "",
        open_balance: number(application.open_balance),
        amount: number(application.amount),
      })),
    });
  }, [existing]);

  React.useEffect(() => {
    if (mode !== "form" || !form.supplier) {
      return;
    }

    setForm((current) => {
      const nextApplications = openBills.map((bill) => {
        const existingApplication = current.applications.find(
          (item) => String(item.bill) === String(bill.id),
        );

        return (
          existingApplication || {
            bill: String(bill.id),
            bill_number: bill.bill_number,
            due_date: bill.due_date,
            open_balance: number(bill.balance_due),
            amount: 0,
          }
        );
      });

      const unchanged =
        current.applications.length === nextApplications.length &&
        current.applications.every((application, index) => {
          const next = nextApplications[index];

          return (
            String(application.bill) === String(next?.bill) &&
            number(application.amount) === number(next?.amount) &&
            number(application.open_balance) === number(next?.open_balance) &&
            String(application.bill_number || "") ===
              String(next?.bill_number || "") &&
            String(application.due_date || "") === String(next?.due_date || "")
          );
        });

      if (unchanged) {
        return current;
      }

      return {
        ...current,
        applications: nextApplications,
      };
    });
  }, [openBills, form.supplier, mode]);

  const selectedSupplierReturn = React.useMemo(
    () =>
      supplierReturns.find(
        (item) => String(item.id) === String(form.supplier_return),
      ),
    [supplierReturns, form.supplier_return],
  );

  const selectedSupplier = React.useMemo(
    () => suppliers.find((item) => String(item.id) === String(form.supplier)),
    [suppliers, form.supplier],
  );

  const supplierDisplayName =
    existing?.supplier_name ||
    selectedSupplierReturn?.supplier_name ||
    selectedSupplier?.supplier_name ||
    selectedSupplier?.name ||
    "";

  const calculatedItems = React.useMemo(
    () =>
      form.items.map((item) => {
        const subtotal = number(item.quantity) * number(item.unit_price);

        const tax = (subtotal * number(item.tax_percentage)) / 100;

        return {
          ...item,
          subtotal,
          tax_amount: tax,
          line_total: subtotal + tax,
        };
      }),
    [form.items],
  );

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  const taxAmount = calculatedItems.reduce(
    (sum, item) => sum + item.tax_amount,
    0,
  );

  const totalCredit = calculatedItems.reduce(
    (sum, item) => sum + item.line_total,
    0,
  );

  const totalApplied = form.applications.reduce(
    (sum, item) => sum + number(item.amount),
    0,
  );

  const remainingCredit = Math.max(0, totalCredit - totalApplied);

  const normalizedStatus = String(form.status || "DRAFT").toUpperCase();

  const isDraft =
    !editingId ||
    !["OPEN", "PARTIALLY_APPLIED", "FULLY_APPLIED", "VOID"].includes(
      normalizedStatus,
    );

  const canEditDocument = !editingId || normalizedStatus === "DRAFT";

  const isLegacyPending = Boolean(editingId) && normalizedStatus === "PENDING";

  const canApproveDocument =
    Boolean(editingId) &&
    !["OPEN", "PARTIALLY_APPLIED", "FULLY_APPLIED", "VOID"].includes(
      normalizedStatus,
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

  const updateApplication = (billId, value) => {
    setForm((current) => ({
      ...current,

      applications: current.applications.map((application) =>
        String(application.bill) === String(billId)
          ? {
              ...application,
              amount: value,
            }
          : application,
      ),
    }));

    setErrors((current) => ({
      ...current,
      applications: "",
    }));
  };

  const selectReturn = (value) => {
    const supplierReturn = supplierReturns.find(
      (item) => String(item.id) === String(value),
    );

    if (!supplierReturn) {
      setForm((current) => ({
        ...current,
        supplier_return: "",
        supplier: "",
        purchase_order: "",
        supplier_bill: "",
        reference_number: "",
        applications: [],
      }));
      return;
    }

    setForm((current) => ({
      ...current,

      supplier_return: String(supplierReturn.id),

      supplier: String(supplierReturn.supplier_id),

      branch: String(supplierReturn.branch_id),

      purchase_order: supplierReturn.purchase_order_id
        ? String(supplierReturn.purchase_order_id)
        : "",

      reference_number: supplierReturn.return_number,

      reason: "RETURN",

      notes: supplierReturn.details || supplierReturn.notes || current.notes,

      items: (supplierReturn.items || []).map((item) => ({
        description: `${item.product_name}${
          item.quantity ? ` — ${item.quantity} unit(s)` : ""
        }`,

        gl_account: defaultInventoryAccountId
          ? String(defaultInventoryAccountId)
          : "",

        quantity: number(item.quantity),

        unit_price: number(item.unit_price),

        tax_percentage: 0,
      })),
    }));
  };

  const openNew = React.useCallback(() => {
    navigate("/purchases/vendor-credits/new");
  }, [navigate]);

  const openExisting = React.useCallback(
    (row) => {
      navigate(`/purchases/vendor-credits/${row.id}`);
    },
    [navigate],
  );

  const openEdit = React.useCallback(
    (row) => {
      navigate(`/purchases/vendor-credits/${row.id}/edit`);
    },
    [navigate],
  );

  const closeForm = React.useCallback(() => {
    setEditingId(null);
    setFiles([]);
    setErrors({});
    navigate("/purchases/vendor-credits");
  }, [navigate]);

  const validate = () => {
    const next = {};

    if (!form.supplier_return) {
      next.supplier_return = "Source return is required.";
    }

    if (!form.supplier) {
      next.supplier =
        "Vendor could not be resolved from the selected source return.";
    }

    if (!form.credit_date) {
      next.credit_date = "Credit date is required.";
    }

    if (!form.reason) {
      next.reason = "Reason is required.";
    }

    if (!form.items.length) {
      next.items = "Add at least one credit line.";
    }

    const invalidLine = calculatedItems.some(
      (item) =>
        !item.description ||
        number(item.quantity) <= 0 ||
        number(item.unit_price) < 0,
    );

    if (invalidLine) {
      next.items =
        "Every line requires a description, positive quantity, and valid unit price.";
    }

    const invalidApplication = form.applications.some(
      (item) =>
        number(item.amount) < 0 ||
        number(item.amount) > number(item.open_balance),
    );

    if (invalidApplication || totalApplied > totalCredit) {
      next.applications =
        "Applied credit cannot exceed a bill balance or the total available credit.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async ({ shouldApprove = false }) => {
      const payload = {
        supplier: Number(form.supplier),

        supplier_return: Number(form.supplier_return),

        purchase_order: form.purchase_order
          ? Number(form.purchase_order)
          : null,

        supplier_bill: form.supplier_bill ? Number(form.supplier_bill) : null,

        branch: form.branch ? Number(form.branch) : null,

        credit_date: form.credit_date,
        currency: form.currency,
        reference_number: form.reference_number,
        reason: form.reason,
        notes: form.notes,
        internal_memo: form.internal_memo,
        status: "DRAFT",

        items: calculatedItems.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          description: item.description,

          gl_account: item.gl_account || null,

          quantity: number(item.quantity),

          unit_price: number(item.unit_price),

          tax_percentage: number(item.tax_percentage),
        })),

        applications: form.applications
          .filter((item) => number(item.amount) > 0)
          .map((item) => ({
            ...(item.id
              ? {
                  id: item.id,
                }
              : {}),

            bill: Number(item.bill),

            amount: number(item.amount),
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

      /*
       * Approval of an existing vendor credit must not PATCH the record first.
       * Non-draft and legacy records are rejected by the serializer with:
       * "Only draft vendor credits can be edited."
       *
       * Existing records are therefore approved directly through the dedicated
       * status action. Draft changes should be saved separately before approval.
       */
      if (shouldApprove && editingId) {
        return api.post(
          `/purchases/vendor-credits/${editingId}/update-status/`,
          {
            status: "OPEN",
          },
          {
            skipGlobalErrorToast: true,
          },
        );
      }

      const response = editingId
        ? await api.patch(
            `/purchases/vendor-credits/${editingId}/`,
            data,
            config,
          )
        : await api.post("/purchases/vendor-credits/", data, config);

      const saved = unwrap(response);

      if (!saved?.id) {
        throw new Error("Vendor credit was saved but its ID was not returned.");
      }

      if (shouldApprove) {
        return api.post(
          `/purchases/vendor-credits/${saved.id}/update-status/`,
          {
            status: "OPEN",
          },
          {
            skipGlobalErrorToast: true,
          },
        );
      }

      return response;
    },

    onSuccess: async (response, variables) => {
      const saved = unwrap(response);
      const wasApproved = Boolean(variables?.shouldApprove);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["vendor-credits"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["vendor-credit-summary"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
      ]);

      toast.success(
        wasApproved
          ? "Vendor credit approved successfully."
          : "Vendor credit saved as draft.",
      );

      closeForm();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      const body = error?.response?.data;
      const payload = body?.data || body || {};
      const nextErrors = {};

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        Object.entries(payload).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            nextErrors[field] = value.join(" ");
          } else if (value && typeof value === "object") {
            nextErrors[field] = Object.values(value).flat().join(" ");
          } else if (value) {
            nextErrors[field] = String(value);
          }
        });
      }

      setErrors((current) => ({
        ...current,
        ...nextErrors,
      }));

      toast.error(details.title || "Unable to save vendor credit", {
        description:
          details.summary ||
          details.message ||
          nextErrors.status ||
          nextErrors.items ||
          nextErrors.applications ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const approveCredit = useMutation({
    mutationFn: async (creditId) =>
      unwrap(
        await api.post(
          `/purchases/vendor-credits/${creditId}/update-status/`,
          {
            status: "OPEN",
          },
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async (approved) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["vendor-credits"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["vendor-credit-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["vendor-credit", approved?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
      ]);

      toast.success("Vendor credit approved successfully.");

      if (editingId) {
        navigate(`/purchases/vendor-credits/${editingId}`);
      }
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to approve vendor credit", {
        description:
          details.summary ||
          details.message ||
          "Only draft or pending vendor credits can be approved.",
      });
    },
  });

  const submit = (shouldApprove) => {
    if (!validate()) return;

    save.mutate({
      shouldApprove: Boolean(shouldApprove),
    });
  };

  const addFiles = (event) => {
    const incoming = Array.from(event.target.files || []);

    const valid = incoming.filter(
      (file) =>
        file.size <= 10 * 1024 * 1024 &&
        [".pdf", ".jpg", ".jpeg", ".png", ".eml"].some((extension) =>
          file.name.toLowerCase().endsWith(extension),
        ),
    );

    if (valid.length !== incoming.length) {
      toast.error("Only PDF, JPG, PNG and EML files up to 10 MB are allowed.");
    }

    setFiles((current) => [...current, ...valid]);

    event.target.value = "";
  };

  const columns = [
    {
      key: "credit_number",
      header: "Credit #",
      sortKey: "credit_number",
      sortType: "text",

      cell: (row) => (
        <button
          type="button"
          onClick={() => openExisting(row)}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {row.credit_number || "—"}
        </button>
      ),
    },
    {
      key: "supplier_name",
      header: "Vendor",
      sortKey: "supplier__supplier_name",
      sortType: "text",
    },
    {
      key: "credit_date",
      header: "Date",
      sortKey: "credit_date",
      sortType: "date",

      cell: (row) =>
        row.credit_date ? <DateText value={row.credit_date} /> : "—",
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
      key: "reference_number",
      header: "Reference",
      sortKey: "reference_number",
      sortType: "text",
    },
    {
      key: "total_amount",
      header: "Total",
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
      key: "applied_amount",
      header: "Applied",
      sortKey: "applied_amount",
      sortType: "currency",
      align: "right",

      cell: (row) => (
        <CurrencyText
          value={row.applied_amount}
          currency={row.currency || "AED"}
        />
      ),
    },
    {
      key: "remaining_amount",
      header: "Remaining",
      sortKey: "remaining_amount",
      sortType: "currency",
      align: "right",

      cell: (row) => (
        <CurrencyText
          value={row.remaining_amount}
          currency={row.currency || "AED"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      sortType: "status",

      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openExisting(row)}
          >
            View
          </Button>
          {!["OPEN", "PARTIALLY_APPLIED", "FULLY_APPLIED", "VOID"].includes(
            String(row.status || "").toUpperCase(),
          ) ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openEdit(row)}
              >
                Edit
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => approveCredit.mutate(row.id)}
                disabled={approveCredit.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (mode === "list") {
    const payload = query.data || {
      results: [],
      count: 0,
    };

    const rows = payload.results || [];

    const tabs = [
      {
        value: "ALL",
        label: "All",
        count: summary.all_count,
      },
      {
        value: "OPEN",
        label: "Open",
        count: summary.open_count,
      },
      {
        value: "PARTIALLY_APPLIED",
        label: "Partially applied",
        count: summary.partial_count,
      },
      {
        value: "FULLY_APPLIED",
        label: "Fully applied",
        count: summary.applied_count,
      },
      {
        value: "VOID",
        label: "Void",
        count: summary.void_count,
      },
    ];

    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          title="Vendor Credits"
          subtitle="Credit notes received from suppliers and applied against open bills"
          actions={
            <div className="flex gap-2">
              <Button type="button" variant="outline">
                Export
              </Button>

              <Button
                type="button"
                onClick={openNew}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Vendor Credit
              </Button>
            </div>
          }
        />

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Vendor credits reduce Accounts Payable and may be applied
            immediately across one or more open supplier bills.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Open Credit Balance"
            tone="success"
            value={<CurrencyText value={summary.open_balance} />}
          />

          <SummaryCard label="Open Credits" value={summary.open_count || 0} />

          <SummaryCard
            label="Partially Applied"
            tone="warning"
            value={summary.partial_count || 0}
          />

          <SummaryCard
            label="Fully Applied"
            value={summary.applied_count || 0}
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={
                  statusFilter === tab.value
                    ? "rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    : "rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5"
                }
              >
                {tab.label} <span className="ml-1">{tab.count || 0}</span>
              </button>
            ))}
          </div>

          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search credit number, vendor or reference"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No vendor credits"
          emptyDescription="Create a vendor credit for returns, overbilling, or price adjustments."
        />
      </div>
    );
  }

  if (editingId && existingLoading) {
    return <div className="card-surface p-6">Loading vendor credit...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={editingId ? "Edit Vendor Credit" : "New Vendor Credit"}
        subtitle="Record supplier credit and apply it against open bills"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Credits
            </Button>

            {canApproveDocument ? (
              <Button
                type="button"
                onClick={() => approveCredit.mutate(editingId)}
                disabled={approveCredit.isPending || save.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {approveCredit.isPending
                  ? "Approving..."
                  : "Approve Vendor Credit"}
              </Button>
            ) : null}
          </div>
        }
      />

      {!canEditDocument ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {isLegacyPending
            ? "This is a legacy pending vendor credit. It cannot be edited, but it can be approved directly."
            : `This vendor credit is already ${form.status}. Only draft credits can be edited.`}
        </div>
      ) : null}

      <section className="card-surface p-5">
        <h2 className="font-semibold">Credit Details</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label>Vendor *</Label>

            <Input
              value={supplierDisplayName || "Select a source return"}
              className="mt-2"
              disabled
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Vendor is automatically selected from the source return.
            </p>

            {errors.supplier ? (
              <p className="mt-1 text-xs text-red-500">{errors.supplier}</p>
            ) : null}
          </div>

          <div>
            <Label>Credit date *</Label>

            <Input
              type="date"
              value={form.credit_date}
              onChange={(event) =>
                updateForm("credit_date", event.target.value)
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label>Currency</Label>

            <Select
              value={form.currency}
              onValueChange={(value) => updateForm("currency", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Source Return *</Label>

            <Select value={form.supplier_return} onValueChange={selectReturn}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select supplier return" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {supplierReturns.map((supplierReturn) => (
                  <SelectItem
                    key={supplierReturn.id}
                    value={String(supplierReturn.id)}
                  >
                    {supplierReturn.return_number}
                    {" · "}
                    {supplierReturn.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.supplier_return ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.supplier_return}
              </p>
            ) : null}
          </div>

          <div>
            <Label>Reference Bill / PO</Label>

            <Input
              value={form.reference_number}
              onChange={(event) =>
                updateForm("reference_number", event.target.value)
              }
              placeholder="Bill, PO or external credit reference"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Reason</Label>

            <Select
              value={form.reason}
              onValueChange={(value) => updateForm("reason", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Credit number</Label>

            <Input
              value={form.credit_number || "Automatically generated"}
              className="mt-2"
              disabled
            />
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="font-semibold">Line Items</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Assign an accounting destination for every credit line.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, emptyLine()],
              }))
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="min-w-[950px]">
            <div className="grid grid-cols-[minmax(260px,1fr)_190px_80px_110px_90px_130px_38px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Description</span>
              <span>GL Account</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Tax %</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            <div className="space-y-2">
              {calculatedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-[minmax(260px,1fr)_190px_80px_110px_90px_130px_38px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
                >
                  <Input
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, {
                        description: event.target.value,
                      })
                    }
                    placeholder="Credit line description"
                  />

                  <Select
                    value={item.gl_account || "__none__"}
                    onValueChange={(value) =>
                      updateItem(index, {
                        gl_account: value === "__none__" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      <SelectItem value="__none__">No account</SelectItem>

                      {glAccounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, {
                        quantity: event.target.value,
                      })
                    }
                    className="text-right"
                  />

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(event) =>
                      updateItem(index, {
                        unit_price: event.target.value,
                      })
                    }
                    className="text-right"
                  />

                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.tax_percentage}
                    onChange={(event) =>
                      updateItem(index, {
                        tax_percentage: event.target.value,
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

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: current.items.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="mt-3 text-sm text-red-500">{errors.items}</p>
            )}

            <div className="ml-auto mt-6 max-w-xs space-y-2 rounded-xl border bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>

                <CurrencyText value={subtotal} currency={form.currency} />
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>

                <CurrencyText value={taxAmount} currency={form.currency} />
              </div>

              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total Credit</span>

                <CurrencyText value={totalCredit} currency={form.currency} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">Apply to Open Bills</h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Apply some or all of this credit to unpaid supplier bills.
          </p>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            {form.applications.map((application) => (
              <div
                key={application.bill}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(200px,1fr)_180px_160px] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {application.bill_number}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {application.due_date || "—"}
                  </p>
                </div>

                <div className="text-sm md:text-right">
                  <span className="text-muted-foreground">Open balance </span>

                  <CurrencyText
                    value={application.open_balance}
                    currency={form.currency}
                  />
                </div>

                <Input
                  type="number"
                  min="0"
                  max={application.open_balance}
                  step="0.01"
                  value={application.amount}
                  onChange={(event) =>
                    updateApplication(application.bill, event.target.value)
                  }
                  className="text-right"
                />
              </div>
            ))}
          </div>

          {!form.supplier && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a vendor to load open bills.
            </p>
          )}

          {form.supplier && !form.applications.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This vendor has no open bills.
            </p>
          )}

          {errors.applications && (
            <p className="mt-3 text-sm text-red-500">{errors.applications}</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm dark:border-blue-500/30">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              Remaining Credit Balance
            </p>

            <p className="mt-2 text-3xl font-bold">
              <CurrencyText value={remainingCredit} currency={form.currency} />
            </p>

            <p className="mt-1 text-sm text-blue-100">
              Available to apply against future supplier bills
            </p>
          </div>

          <span className="w-fit rounded-lg border border-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            {remainingCredit > 0 ? "Open" : "Fully Applied"}
          </span>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Accounting Preview</h2>

        <div className="mt-4 rounded-xl border border-dashed bg-slate-50 p-4 font-mono text-sm dark:border-white/10 dark:bg-white/[0.025]">
          <div className="flex justify-between gap-4">
            <span>
              Dr Accounts Payable —{" "}
              {selectedSupplier?.supplier_name || "Selected Vendor"}
            </span>

            <CurrencyText value={totalCredit} currency={form.currency} />
          </div>

          <div className="mt-2 flex justify-between gap-4 pl-5 text-muted-foreground">
            <span>Cr Inventory / Expense — per line account</span>

            <CurrencyText value={totalCredit} currency={form.currency} />
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-semibold">Notes & Attachments</h2>

        <div className="mt-4">
          <Label>Internal memo</Label>

          <Textarea
            rows={4}
            value={form.internal_memo}
            onChange={(event) =>
              updateForm("internal_memo", event.target.value)
            }
            placeholder="Internal explanation, approval note, or supplier correspondence summary"
            className="mt-2"
          />
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">
          <UploadCloud className="h-7 w-7 text-blue-500" />

          <span className="mt-2 text-sm font-medium">
            Drop files or browse to attach supporting documents
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            RMA, receiving report, supplier email, PDF, JPG, PNG or EML up to 10
            MB
          </span>

          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.eml"
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
                  size="icon"
                  variant="ghost"
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
        <h2 className="font-semibold">Approval</h2>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          Approval is handled by the logged-in user when
          <strong> Save and Approve</strong> is selected. The backend records
          the approver, approval date, and posted time.
        </div>
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
          disabled={save.isPending || !canEditDocument}
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>

        {canApproveDocument ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => approveCredit.mutate(editingId)}
            disabled={approveCredit.isPending || save.isPending}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {approveCredit.isPending ? "Approving..." : "Approve Credit"}
          </Button>
        ) : null}

        <Button
          type="button"
          onClick={() => submit(true)}
          disabled={save.isPending || approveCredit.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Send className="mr-2 h-4 w-4" />
          {save.isPending
            ? "Processing..."
            : editingId
              ? "Approve Credit"
              : "Save and Approve"}
        </Button>
      </div>
    </div>
  );
}
