import React from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  Eye,
  Pencil,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

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

const reasons = [
  ["DAMAGED", "Damaged / Defective"],
  ["WRONG_ITEM", "Wrong Item Shipped"],
  ["CUSTOMER_REQUEST", "Customer Changed Mind"],
  ["QUALITY_ISSUE", "Quality Issue"],
  ["OTHER", "Other"],
];

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  sales_order: "",
  invoice: "",
  customer: "",
  return_date: today(),
  reason: "DAMAGED",
  resolution: "REFUND",
  status: "DRAFT",
  notes: "",
  items: [],
});

const isEditableReturnStatus = (status) =>
  ["DRAFT", "REJECTED"].includes(String(status || "").toUpperCase());

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});
  const [mode, setMode] = React.useState("create");
  const [activeReturn, setActiveReturn] = React.useState(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [workflowTarget, setWorkflowTarget] = React.useState(null);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const readOnly =
    mode === "view" ||
    (Boolean(activeReturn) && !isEditableReturnStatus(activeReturn.status));

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-returns",
    "/sales/returns/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-returns-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/returns/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-return-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/returns/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),
    enabled: open && Boolean(form.branch),
    staleTime: 0,
  });

  const { data: orderDetail } = useQuery({
    queryKey: ["sales-return-order", form.sales_order],
    queryFn: async () =>
      unwrap(
        await api.get(`/sales/returns/order-options/${form.sales_order}/`),
      ),
    enabled: open && Boolean(form.sales_order),
    staleTime: 0,
  });

  const summary = summaryResponse || {};
  const options = optionsResponse || {};
  const orders = normalizeList(options.sales_orders);
  const payload = query.data || { results: [], count: 0 };

  /*
   * New returns always follow the global top-bar branch.
   * If the branch changes while the modal is open, reset branch-dependent
   * selections so data from one branch cannot be submitted under another.
   */
  React.useEffect(() => {
    const nextBranch =
      branchId === null || branchId === undefined || branchId === ""
        ? ""
        : String(branchId);

    setForm((current) => {
      if (String(current.branch || "") === nextBranch) {
        return current;
      }

      return {
        ...createForm(nextBranch),
        return_date: current.return_date || today(),
      };
    });

    setErrors({});
  }, [branchId]);

  React.useEffect(() => {
    if (!orderDetail) return;

    setForm((current) => ({
      ...current,
      branch: orderDetail.branch_id
        ? String(orderDetail.branch_id)
        : current.branch,
      customer: orderDetail.customer_id ? String(orderDetail.customer_id) : "",
      invoice: orderDetail.invoice_id ? String(orderDetail.invoice_id) : "",
      items: (orderDetail.items || []).map((item) => ({
        sales_order_item: item.id,
        product: item.product_id,
        variant: item.variant_id || null,
        description: item.description || item.product_name,
        ordered_quantity: number(item.ordered_quantity),
        already_returned_quantity: number(item.already_returned_quantity),
        available_quantity: number(item.available_quantity),
        returned_quantity: number(item.available_quantity),
        unit_price: number(item.unit_price),
        condition: "SELLABLE",
        selected: number(item.available_quantity) > 0,
      })),
    }));
  }, [orderDetail]);

  const selectedItems = form.items.filter(
    (item) => item.selected && number(item.returned_quantity) > 0,
  );

  const subtotal = selectedItems.reduce(
    (sum, item) =>
      sum + number(item.returned_quantity) * number(item.unit_price),
    0,
  );

  const vatAmount = subtotal * 0.05;
  const total = subtotal + vatAmount;

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

  const validate = () => {
    const next = {};

    if (!form.branch) {
      next.branch = "Select a specific branch from the top branch filter.";
    }

    if (!form.sales_order) {
      next.sales_order = "Sales Order is required.";
    }

    if (!form.return_date) {
      next.return_date = "Return date is required.";
    }

    if (!selectedItems.length) {
      next.items = "Select at least one item.";
    }

    if (
      selectedItems.some(
        (item) =>
          number(item.returned_quantity) <= 0 ||
          number(item.returned_quantity) > number(item.available_quantity),
      )
    ) {
      next.items = "Return quantity must be within the remaining quantity.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (status) =>
      api.post(
        "/sales/returns/",
        {
          branch: form.branch ? Number(form.branch) : null,
          sales_order: Number(form.sales_order),
          invoice: form.invoice ? Number(form.invoice) : null,
          customer: form.customer ? Number(form.customer) : null,
          return_date: form.return_date,
          reason: form.reason,
          resolution: form.resolution,
          status,
          notes: form.notes,
          subtotal,
          vat_amount: vatAmount,
          total_amount: total,
          items: selectedItems.map((item) => ({
            sales_order_item: item.sales_order_item,
            product: item.product,
            variant: item.variant,
            ordered_quantity: item.ordered_quantity,
            returned_quantity: number(item.returned_quantity),
            condition: item.condition,
            unit_price: item.unit_price,
          })),
        },
        {
          skipGlobalErrorToast: true,
        },
      ),

    onSuccess: async (_response, status) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-returns"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sales-returns-summary"],
        }),
      ]);

      toast.success(
        status === "DRAFT" ? "Return saved as draft." : "Return submitted.",
      );

      setOpen(false);
      setForm(createForm(branchId));
      setErrors({});
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save return", {
        description:
          details.summary ||
          details.message ||
          "Please review the return details.",
      });
    },
  });

  const submit = (status) => {
    if (!validate()) return;
    mutation.mutate(status);
  };

  const exportRows = async () => {
    try {
      const response = await api.get("/sales/returns/export/", {
        params: branchParams,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sales-returns.csv";
      anchor.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Unable to export sales returns.");
    }
  };

  const openNewReturn = () => {
    if (!branchId) {
      toast.error("Select a specific branch from the top branch filter first.");
      return;
    }

    setForm(createForm(branchId));
    setErrors({});
    setOpen(true);
  };

  const closeModal = () => {
    if (mutation.isPending) return;

    setOpen(false);
    setErrors({});
  };

  const refreshReturns = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] }),
      queryClient.invalidateQueries({ queryKey: ["sales-returns-summary"] }),
    ]);
  };

  const openExisting = async (row, requestedMode) => {
    try {
      const detail = unwrap(await api.get(`/sales/returns/${row.id}/`));
      const nextMode =
        requestedMode === "edit" && !isEditableReturnStatus(detail.status)
          ? "view"
          : requestedMode;

      setMode(nextMode);
      setActiveReturn(detail);
      setForm({
        branch: String(detail.branch?.id || detail.branch || ""),
        sales_order: String(detail.sales_order?.id || detail.sales_order || ""),
        invoice: detail.invoice
          ? String(detail.invoice?.id || detail.invoice)
          : "",
        customer: detail.customer
          ? String(detail.customer?.id || detail.customer)
          : "",
        return_date: detail.return_date || today(),
        reason: detail.reason || "DAMAGED",
        resolution:
          detail.resolution === "CREDIT_NOTE"
            ? "REFUND"
            : detail.resolution || "REFUND",
        status: detail.status || "DRAFT",
        notes: detail.notes || "",
        items: (detail.items || []).map((item) => ({
          sales_order_item: item.sales_order_item?.id || item.sales_order_item,
          product: item.product?.id || item.product,
          variant: item.variant?.id || item.variant || null,
          description: item.description || item.product_name || "",
          ordered_quantity: number(item.ordered_quantity),
          already_returned_quantity: 0,
          available_quantity: number(item.returned_quantity),
          returned_quantity: number(item.returned_quantity),
          unit_price: number(item.unit_price),
          condition: item.condition || "SELLABLE",
          selected: number(item.returned_quantity) > 0,
        })),
      });
      setErrors({});
      setOpen(true);
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to open return", {
        description: details.summary || details.message,
      });
    }
  };

  const workflowMutation = useMutation({
    mutationFn: async ({ id, action, data }) =>
      api.post(`/sales/returns/${id}/${action}/`, data || {}, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async (_response, variables) => {
      await refreshReturns();
      const messages = {
        submit: "Return submitted for approval.",
        approve: "Return approved.",
        reject: "Return rejected.",
        complete: "Return completed.",
        cancel: "Return cancelled.",
      };
      toast.success(messages[variables.action] || "Sales return updated.");
      setRejectOpen(false);
      setRejectReason("");
      setConfirmAction(null);
      setWorkflowTarget(null);
      setOpen(false);
      setActiveReturn(null);
      setMode("create");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update return", {
        description: details.summary || details.message,
      });
    },
  });

  const runWorkflow = (row, action) => {
    setWorkflowTarget(row);
    setConfirmAction(action);
  };

  const closeWorkflowConfirm = () => {
    if (workflowMutation.isPending) return;
    setConfirmAction(null);
    setWorkflowTarget(null);
  };

  const confirmWorkflowAction = () => {
    if (!workflowTarget || !confirmAction) return;

    workflowMutation.mutate({
      id: workflowTarget.id,
      action: confirmAction,
    });
  };

  const workflowConfirmContent = React.useMemo(() => {
    const configs = {
      submit: {
        title: "Submit Sales Return?",
        description:
          "This return will be sent for approval. Editing will be locked until it is rejected or returned to draft.",
        confirmLabel: "Submit for Approval",
        iconClass:
          "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
        buttonClass: "bg-blue-600 text-white hover:bg-blue-700",
        icon: Send,
      },
      approve: {
        title: "Approve Sales Return?",
        description:
          "Approving confirms that the return has been reviewed and accepted. It can then be completed.",
        confirmLabel: "Approve Return",
        iconClass:
          "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
        buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700",
        icon: CheckCircle2,
      },
      complete: {
        title: "Complete Sales Return?",
        description:
          "Completing the return marks this workflow as finished. Completed returns become read-only.",
        confirmLabel: "Complete Return",
        iconClass:
          "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
        buttonClass: "bg-violet-600 text-white hover:bg-violet-700",
        icon: CheckCircle2,
      },
      cancel: {
        title: "Cancel Sales Return?",
        description:
          "The return will be cancelled and removed from the active workflow. This action should only be used when the return is no longer required.",
        confirmLabel: "Cancel Return",
        iconClass:
          "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
        buttonClass: "bg-amber-600 text-white hover:bg-amber-700",
        icon: AlertTriangle,
      },
    };

    return configs[confirmAction] || null;
  }, [confirmAction]);

  const startReject = (row) => {
    setWorkflowTarget(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = () => {
    if (!workflowTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Enter a rejection reason.");
      return;
    }
    workflowMutation.mutate({
      id: workflowTarget.id,
      action: "reject",
      data: { reason: rejectReason.trim() },
    });
  };

  const columns = [
    {
      key: "return_number",
      header: "Return #",
    },
    {
      key: "customer_name",
      header: "Customer",
    },
    {
      key: "order_number",
      header: "Related Order",
    },
    {
      key: "return_date",
      header: "Date",
      cell: (row) => <DateText value={row.return_date} />,
    },
    {
      key: "total_amount",
      header: "Amount",
      align: "right",
      cell: (row) => <CurrencyText value={row.total_amount} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="View"
            onClick={() => openExisting(row, "view")}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {isEditableReturnStatus(row.status) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Edit"
              onClick={() => openExisting(row, "edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {isEditableReturnStatus(row.status) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Submit for approval"
              onClick={() => runWorkflow(row, "submit")}
            >
              <Send className="h-4 w-4 text-blue-500" />
            </Button>
          )}

          {row.status === "PENDING_APPROVAL" && (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Approve"
                onClick={() => runWorkflow(row, "approve")}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Reject"
                onClick={() => startReject(row)}
              >
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}

          {row.status === "APPROVED" && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Complete"
              onClick={() => runWorkflow(row, "complete")}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </Button>
          )}

          {!["COMPLETED", "CANCELLED"].includes(row.status) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Cancel"
              onClick={() => runWorkflow(row, "cancel")}
            >
              <Ban className="h-4 w-4 text-amber-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="sales-module-page sales-workspace mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden pb-10">
      <PageHeader
        title="Sales Returns"
        subtitle="Goods returned by customers pending inspection or refund"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              onClick={openNewReturn}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Returns" value={summary.open_returns || 0} />

        <MetricCard
          label="Value (MTD)"
          value={<CurrencyText value={summary.value_mtd || 0} />}
        />

        <MetricCard label="Restocked" value={summary.restocked || 0} />

        <MetricCard
          label="Avg. Resolution"
          value={`${summary.avg_resolution_days || 0} days`}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Sales Returns</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Goods returned by customers pending inspection or refund
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search return, customer, order"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
        />
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[2px] sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-background shadow-2xl dark:border-white/10">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b bg-background px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  {mode === "create"
                    ? "New Return"
                    : mode === "edit"
                      ? `Edit ${activeReturn?.return_number || "Return"}`
                      : activeReturn?.return_number || "Sales Return"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {readOnly
                    ? "Read-only sales return details."
                    : "Return number is generated automatically."}
                </p>

                {activeReturn && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Current Status
                    </span>
                    <StatusBadge status={activeReturn.status} />
                  </div>
                )}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={closeModal}
                disabled={mutation.isPending}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
              {errors.branch && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {errors.branch}
                </div>
              )}

              {activeReturn && !isEditableReturnStatus(activeReturn.status) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                  <p className="font-semibold">This return is read-only.</p>
                  <p className="mt-1 text-xs leading-5">
                    {String(activeReturn.status || "").replaceAll("_", " ")}{" "}
                    returns cannot be edited. Only Draft and Rejected returns
                    can be changed.
                  </p>
                </div>
              )}

              <section className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <div className="mb-4">
                  <h3 className="font-semibold">Return information</h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select the related sales order and return date.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Related Order *</Label>

                    <Select
                      value={form.sales_order}
                      onValueChange={(value) => {
                        updateForm("sales_order", value);

                        setForm((current) => ({
                          ...current,
                          sales_order: value,
                          invoice: "",
                          customer: "",
                          items: [],
                        }));
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select order" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={String(order.id)}>
                            {order.order_number}
                            {" — "}
                            {order.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {errors.sales_order && (
                      <p className="mt-1.5 text-xs text-red-500">
                        {errors.sales_order}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Return Date *</Label>

                    <Input
                      type="date"
                      disabled={readOnly}
                      value={form.return_date}
                      onChange={(event) =>
                        updateForm("return_date", event.target.value)
                      }
                      className="mt-2"
                    />

                    {errors.return_date && (
                      <p className="mt-1.5 text-xs text-red-500">
                        {errors.return_date}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {orderDetail && (
                <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-white/[0.025]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer
                    </p>

                    <p className="mt-1 font-semibold">
                      {orderDetail.customer_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Order Total
                    </p>

                    <div className="mt-1 font-semibold">
                      <CurrencyText value={orderDetail.order_total} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Related Invoice
                    </p>

                    <p className="mt-1 font-semibold">
                      {orderDetail.invoice_number || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Already Returned
                    </p>

                    <div className="mt-1 font-semibold">
                      <CurrencyText
                        value={orderDetail.already_returned_value || 0}
                      />
                    </div>
                  </div>
                </div>
              )}

              <section className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <Label>Reason</Label>

                <div className="mt-3 flex flex-wrap gap-2">
                  {reasons.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateForm("reason", value)}
                      className={
                        form.reason === value
                          ? "rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-full border border-slate-200 px-4 py-2 text-sm transition hover:border-blue-300 dark:border-white/10"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <Label>Items to Return</Label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Select items and enter the quantity being returned.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="overflow-x-auto">
                    <div className="min-w-[860px]">
                      <div className="grid grid-cols-[42px_minmax(260px,1fr)_110px_120px_150px_140px] gap-3 border-b bg-slate-50 px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-white/10 dark:bg-white/[0.025]">
                        <span />
                        <span>Item</span>
                        <span className="text-right">Ordered Qty</span>
                        <span className="text-right">Qty Returned</span>
                        <span>Condition</span>
                        <span className="text-right">Line Total</span>
                      </div>

                      {form.items.length ? (
                        form.items.map((item, index) => (
                          <div
                            key={item.sales_order_item || index}
                            className="grid grid-cols-[42px_minmax(260px,1fr)_110px_120px_150px_140px] items-center gap-3 border-b px-3 py-3 last:border-b-0 dark:border-white/10"
                          >
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={item.selected}
                                disabled={number(item.available_quantity) <= 0}
                                onChange={(event) =>
                                  updateItem(index, {
                                    selected: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 cursor-pointer"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.description}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                AED {number(item.unit_price).toFixed(2)} / unit
                              </p>

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Remaining returnable: {item.available_quantity}
                              </p>
                            </div>

                            <div className="text-right">
                              {item.ordered_quantity}
                            </div>

                            <Input
                              type="number"
                              min="0"
                              max={item.available_quantity}
                              step="1"
                              value={item.returned_quantity}
                              onChange={(event) =>
                                updateItem(index, {
                                  returned_quantity: event.target.value,
                                })
                              }
                              disabled={readOnly || !item.selected}
                              className="h-10 text-right"
                            />

                            <Select
                              disabled={readOnly || !item.selected}
                              value={item.condition}
                              onValueChange={(value) =>
                                updateItem(index, {
                                  condition: value,
                                })
                              }
                              disabled={!item.selected}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectItem value="SELLABLE">
                                  Sellable
                                </SelectItem>

                                <SelectItem value="DAMAGED">Damaged</SelectItem>

                                <SelectItem value="DEFECTIVE">
                                  Defective
                                </SelectItem>

                                <SelectItem value="SCRAP">Scrap</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="text-right font-semibold">
                              <CurrencyText
                                value={
                                  number(item.returned_quantity) *
                                  number(item.unit_price)
                                }
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Select a Sales Order to load returnable items.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errors.items && (
                  <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                )}
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Resolution</Label>

                  <Select
                    disabled={readOnly}
                    value={form.resolution}
                    onValueChange={(value) => updateForm("resolution", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="REFUND">Refund</SelectItem>

                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>

                      <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>

                  {activeReturn ? (
                    <div className="mt-2 flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/[0.025]">
                      <StatusBadge status={activeReturn.status} />
                    </div>
                  ) : (
                    <Select
                      value={form.status}
                      onValueChange={(value) => updateForm("status", value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>

                        <SelectItem value="PENDING_APPROVAL">
                          Pending Approval
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </section>

              <section>
                <Label>Notes</Label>

                <Textarea
                  disabled={readOnly}
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  className="mt-2"
                  placeholder="Add a note about the condition or reason for return"
                />
              </section>

              <section className="ml-auto max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.025]">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Subtotal Returned
                    </span>

                    <CurrencyText value={subtotal} />
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">VAT</span>

                    <CurrencyText value={vatAmount} />
                  </div>

                  <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                    <span>Total Return Value</span>

                    <CurrencyText value={total} />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {readOnly ? (
                <Button type="button" variant="outline" onClick={closeModal}>
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => submit("DRAFT")}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Saving..." : "Save as Draft"}
                  </Button>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={() => submit("PENDING_APPROVAL")}
                      disabled={mutation.isPending}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {mutation.isPending ? "Submitting..." : "Submit Return"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {confirmAction && workflowTarget && workflowConfirmContent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeWorkflowConfirm();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${workflowConfirmContent.iconClass}`}
                >
                  {React.createElement(workflowConfirmContent.icon, {
                    className: "h-6 w-6",
                  })}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {workflowConfirmContent.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {workflowConfirmContent.description}
                  </p>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={closeWorkflowConfirm}
                  disabled={workflowMutation.isPending}
                  className="-mr-2 -mt-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.025]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Return Number</span>
                  <span className="font-semibold">
                    {workflowTarget.return_number || `#${workflowTarget.id}`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="truncate font-medium">
                    {workflowTarget.customer_name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Current Status</span>
                  <StatusBadge status={workflowTarget.status} />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Return Value</span>
                  <span className="font-semibold">
                    <CurrencyText value={workflowTarget.total_amount || 0} />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/[0.025]">
              <Button
                type="button"
                variant="outline"
                onClick={closeWorkflowConfirm}
                disabled={workflowMutation.isPending}
              >
                Keep Current Status
              </Button>

              <Button
                type="button"
                onClick={confirmWorkflowAction}
                disabled={workflowMutation.isPending}
                className={workflowConfirmContent.buttonClass}
              >
                {workflowMutation.isPending
                  ? "Processing..."
                  : workflowConfirmContent.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Reject Sales Return</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the reason for rejecting {workflowTarget?.return_number}.
            </p>

            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="mt-4"
              placeholder="Reason for rejection"
              autoFocus
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectOpen(false);
                  setWorkflowTarget(null);
                }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={confirmReject}
                disabled={workflowMutation.isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
