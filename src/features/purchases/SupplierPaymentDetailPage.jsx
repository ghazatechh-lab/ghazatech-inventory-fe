import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  Printer,
  RefreshCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
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

export default function SupplierPaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["SupplierPaymentDetailPage", id],
    queryFn: async () =>
      normalizeApiResponse(
        await api.get(`/purchases/supplier-payments/${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
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
          onClick={() => navigate("/purchases/supplier-payments")}
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
    <div className="space-y-6">
      <PageHeader
        title={record.payment_number || `Payment ${id}`}
        subtitle="Complete document information and related records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/supplier-payments")}
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
              <Link to={`/purchases/supplier-payments/${id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <DetailSection title="Payment Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Payment Number" value={record.payment_number} />
          <DetailField label="Supplier" value={record.supplier_name} />
          <DetailField
            label="Payment Date"
            value={renderDate(record.payment_date)}
          />
          <DetailField label="Amount" value={renderMoney(record.amount)} />
          <DetailField
            label="Payment Method"
            value={record.payment_method_display || record.payment_method}
          />
          <DetailField label="Reference" value={record.reference_number} />
          <DetailField
            label="Status"
            value={renderStatus(record.status || "POSTED")}
          />
          <DetailField label="Paid By" value={record.paid_by_name} />
        </div>
      </DetailSection>

      <DetailSection
        title={`Bill Allocations (${record.allocations?.length || 0})`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {["Bill", "Allocated Amount", "Notes"].map((label) => (
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
              {(record.allocations || []).map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-4">
                    {item.bill_number || item.bill || "—"}
                  </td>
                  <td className="px-4 py-4">{renderMoney(item.amount)}</td>
                  <td className="px-4 py-4">{item.notes || "—"}</td>
                </tr>
              ))}
              {!record.allocations?.length ? (
                <tr>
                  <td
                    colSpan="3"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No allocations.
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

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">Raw API data</summary>
        <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-muted p-4 text-xs">
          {JSON.stringify(record, null, 2)}
        </pre>
      </details>
    </div>
  );
}
