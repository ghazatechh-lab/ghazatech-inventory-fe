import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  Printer,
  RefreshCcw,
  Save,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AttachmentList,
  DetailField,
  DetailSection,
  normalizeApiResponse,
  renderDate,
  renderMoney,
  renderStatus,
} from "./purchaseUi";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_TRANSITIONS = {
  PENDING: ["APPROVED", "PAID", "REJECTED", "CANCELLED"],
  APPROVED: ["PAID", "REJECTED", "CANCELLED"],
  PAID: [],
  REJECTED: ["PENDING", "CANCELLED"],
  CANCELLED: ["PENDING"],
};

export default function PurchaseExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [reason, setReason] = React.useState("");

  const query = useQuery({
    queryKey: ["PurchaseExpenseDetailPage", id],
    queryFn: async () =>
      normalizeApiResponse(
        await api.get(`/purchases/expenses/${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const record = query.data;
  const currentStatus = record?.status || "PENDING";

  React.useEffect(() => {
    if (!record) return;
    setSelectedStatus(record.status || "PENDING");
    setReason(record.rejection_reason || "");
  }, [record]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        `/purchases/expenses/${id}/update-status/`,
        {
          status: selectedStatus,
          reason: selectedStatus === "REJECTED" ? reason.trim() : "",
        },
        { skipGlobalErrorToast: true },
      );
      return normalizeApiResponse(response);
    },
    onSuccess: async (updated) => {
      toast.success(
        `Purchase expense status updated to ${
          STATUS_OPTIONS.find((item) => item.value === updated?.status)
            ?.label ||
          updated?.status ||
          selectedStatus
        }.`,
      );
      queryClient.setQueryData(["PurchaseExpenseDetailPage", id], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-expenses"] }),
        queryClient.invalidateQueries({
          queryKey: ["purchase-expense-summary"],
        }),
      ]);
      setReason(updated?.rejection_reason || "");
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error);
      const message =
        details?.message ||
        error?.response?.data?.status ||
        error?.response?.data?.reason ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to update the purchase expense status.";
      toast.error(message);
    },
  });

  const availableStatuses = React.useMemo(() => {
    const next = STATUS_TRANSITIONS[currentStatus] || [];
    return STATUS_OPTIONS.filter(
      (item) => item.value === currentStatus || next.includes(item.value),
    );
  }, [currentStatus]);

  const canUpdate =
    Boolean(selectedStatus) &&
    selectedStatus !== currentStatus &&
    !updateStatusMutation.isPending &&
    (selectedStatus !== "REJECTED" || Boolean(reason.trim()));

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (query.isError || !record) {
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
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Unable to load details</p>
              <p className="mt-1 text-sm">
                {query.error?.response?.data?.detail ||
                  query.error?.response?.data?.message ||
                  query.error?.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title={record.expense_number || `Expense ${id}`}
        subtitle="Complete document information and related records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/purchase-expenses")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button asChild>
              <Link to={`/purchases/purchase-expenses/${id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <DetailSection title="Update Status">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Purchase Expense Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {selectedStatus === "REJECTED"
                ? "Rejection Reason *"
                : "Status Note"}
            </Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                selectedStatus === "REJECTED"
                  ? "Enter the reason for rejecting this expense"
                  : "Optional note"
              }
              disabled={selectedStatus !== "REJECTED"}
              rows={2}
            />
          </div>

          <Button
            onClick={() => updateStatusMutation.mutate()}
            disabled={!canUpdate}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </div>

        {currentStatus === "PAID" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Paid expenses are final and cannot be moved to another status.
          </p>
        ) : null}
      </DetailSection>

      <DetailSection title="Expense Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Expense Number" value={record.expense_number} />
          <DetailField
            label="Expense Date"
            value={renderDate(record.expense_date)}
          />
          <DetailField
            label="Category"
            value={record.category_display || record.category}
          />
          <DetailField label="Branch" value={record.branch_name} />
          <DetailField
            label="Vendor / Payee"
            value={record.vendor_name || record.supplier_name}
          />
          <DetailField label="Purchase Order" value={record.po_number} />
          <DetailField
            label="Payment Method"
            value={record.payment_method_display || record.payment_method}
          />
          <DetailField label="Reference" value={record.reference_number} />
          <DetailField label="Amount" value={renderMoney(record.amount)} />
          <DetailField
            label="Tax Amount"
            value={renderMoney(record.tax_amount)}
          />
          <DetailField
            label="Status"
            value={renderStatus(record.status || "PENDING")}
          />
          <DetailField label="Description" value={record.description} />
          <DetailField
            label="Approved By"
            value={record.approved_by_name || record.approved_by}
          />
          <DetailField
            label="Approved At"
            value={renderDate(record.approved_at)}
          />
          <DetailField
            label="Rejected By"
            value={record.rejected_by_name || record.rejected_by}
          />
          <DetailField
            label="Rejection Reason"
            value={record.rejection_reason}
          />
        </div>
      </DetailSection>

      <DetailSection title="Attachments">
        <AttachmentList attachments={record.attachments || []} />
      </DetailSection>

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">Raw API data</summary>
        <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-muted p-4 text-xs">
          {JSON.stringify(record, null, 2)}
        </pre>
      </details>
    </div>
  );
}
