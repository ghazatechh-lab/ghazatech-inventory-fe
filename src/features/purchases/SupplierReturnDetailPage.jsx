import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Printer,
  RefreshCcw,
  Send,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  AttachmentList,
  DetailField,
  DetailSection,
  normalizeApiResponse,
  renderDate,
  renderMoney,
  renderStatus,
} from "./purchaseUi";

export default function SupplierReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["supplier-return", id],
    queryFn: async () =>
      normalizeApiResponse(
        await api.get(`/purchases/supplier-returns/${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const workflowMutation = useMutation({
    mutationFn: async ({ action, status }) => {
      if (action === "approve") {
        return unwrap(
          await api.post(
            `/purchases/supplier-returns/${id}/approve/`,
            {},
            { skipGlobalErrorToast: true },
          ),
        );
      }

      return unwrap(
        await api.post(
          `/purchases/supplier-returns/${id}/update-status/`,
          { status },
          { skipGlobalErrorToast: true },
        ),
      );
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["supplier-return", id] }),
        queryClient.invalidateQueries({ queryKey: ["supplier-returns"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["vendor-credits"] }),
      ]);
      toast.success(
        `Return updated to ${String(saved.status || "").replaceAll("_", " ")}.`,
      );
      query.refetch();
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to update supplier return", {
        description: details.summary || details.message,
      });
    },
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const record = query.data;

  if (query.isError || !record) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/purchases/supplier-returns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
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

  const status = record.status || "DRAFT";
  const canEdit = ["DRAFT", "REJECTED"].includes(status);
  const canSubmit = ["DRAFT", "REJECTED"].includes(status);
  const canApprove = status === "PENDING_APPROVAL";
  const canIssueCredit = status === "APPROVED";

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title={record.return_number || `Return ${id}`}
        subtitle="Review the return, complete approval, and finalize the vendor credit workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/supplier-returns")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            {canEdit ? (
              <Button asChild variant="outline">
                <Link to={`/purchases/supplier-returns/${id}/edit`}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
            ) : null}
            {canSubmit ? (
              <Button
                onClick={() =>
                  workflowMutation.mutate({ status: "PENDING_APPROVAL" })
                }
                disabled={workflowMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" /> Submit for Approval
              </Button>
            ) : null}
            {canApprove ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    workflowMutation.mutate({ status: "REJECTED" })
                  }
                  disabled={workflowMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button
                  onClick={() => workflowMutation.mutate({ action: "approve" })}
                  disabled={workflowMutation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Return
                </Button>
              </>
            ) : null}
            {canIssueCredit ? (
              <Button
                onClick={() =>
                  workflowMutation.mutate({ status: "CREDIT_ISSUED" })
                }
                disabled={workflowMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Credit Issued
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">
            Current workflow status:
          </span>
          {renderStatus(status)}
          <span className="text-sm text-muted-foreground">
            Draft → Pending Approval → Approved → Credit Issued
          </span>
        </div>
      </div>

      <DetailSection title="Return Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Return Number" value={record.return_number} />
          <DetailField label="GRN" value={record.grn_number} />
          <DetailField label="Purchase Order" value={record.po_number} />
          <DetailField label="Supplier" value={record.supplier_name} />
          <DetailField label="Branch" value={record.branch_name} />
          <DetailField
            label="Return Date"
            value={renderDate(record.return_date)}
          />
          <DetailField
            label="Reason"
            value={record.reason_display || record.reason}
          />
          <DetailField
            label="Resolution"
            value={record.resolution_display || record.resolution}
          />
          <DetailField
            label="Net Return"
            value={renderMoney(record.subtotal ?? record.net_amount ?? 0)}
          />
          <DetailField
            label="VAT Reversal"
            value={renderMoney(record.vat_amount ?? record.tax_amount ?? 0)}
          />
          <DetailField
            label="Total Amount"
            value={renderMoney(record.total_amount)}
          />
          <DetailField label="Status" value={renderStatus(status)} />
        </div>
      </DetailSection>

      <DetailSection title={`Returned Items (${record.items?.length || 0})`}>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Product",
                  "SKU",
                  "Quantity",
                  "Tax Treatment",
                  "VAT Rate",
                  "Net Amount",
                  "VAT Amount",
                  "Total",
                  "Reason",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(record.items || []).map((item) => {
                const quantity = Number(item.quantity || 0);
                const unitPrice = Number(
                  item.unit_price ?? item.unit_cost ?? 0,
                );
                const taxTreatment = String(
                  item.tax_treatment ?? item.vat_treatment ?? "STANDARD_VAT",
                ).toUpperCase();
                const vatRate =
                  taxTreatment === "STANDARD_VAT"
                    ? Number(item.vat_percentage || 0)
                    : 0;
                const netAmount =
                  Number(item.net_amount) || quantity * unitPrice;
                const vatAmount =
                  Number(item.vat_amount) || (netAmount * vatRate) / 100;
                const lineTotal =
                  Number(item.line_total) || netAmount + vatAmount;

                const treatmentLabel =
                  taxTreatment === "STANDARD_VAT"
                    ? "Standard VAT"
                    : taxTreatment === "ZERO_VAT"
                      ? "Zero VAT"
                      : "Non-VAT";

                return (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-4 font-medium">
                      {item.product_name || "—"}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      {item.sku || "—"}
                    </td>
                    <td className="px-4 py-4 font-semibold">{quantity}</td>
                    <td className="px-4 py-4">{treatmentLabel}</td>
                    <td className="px-4 py-4">{vatRate}%</td>
                    <td className="px-4 py-4">{renderMoney(netAmount)}</td>
                    <td className="px-4 py-4">{renderMoney(vatAmount)}</td>
                    <td className="px-4 py-4 font-semibold">
                      {renderMoney(lineTotal)}
                    </td>
                    <td className="px-4 py-4">{item.reason || "—"}</td>
                  </tr>
                );
              })}
              {!record.items?.length ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No returned items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DetailSection>

      <DetailSection title="Attachments">
        <AttachmentList attachments={record.attachments || []} />
      </DetailSection>
    </div>
  );
}
