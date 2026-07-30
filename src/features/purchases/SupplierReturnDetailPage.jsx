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

export default function SupplierReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["SupplierReturnDetailPage", id],
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
        title={record.return_number || `Return ${id}`}
        subtitle="Complete document information and related records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/supplier-returns")}
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
              <Link to={`/purchases/supplier-returns/${id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

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
            label="Total Amount"
            value={renderMoney(record.total_amount)}
          />
          <DetailField
            label="Status"
            value={renderStatus(record.status || "DRAFT")}
          />
        </div>
      </DetailSection>

      <DetailSection title={`Returned Items (${record.items?.length || 0})`}>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Product",
                  "SKU",
                  "Quantity",
                  "Unit Price",
                  "Line Total",
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
              {(record.items || []).map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-4 font-medium">
                    {item.product_name || "—"}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {item.sku || "—"}
                  </td>
                  <td className="px-4 py-4">{item.quantity ?? 0}</td>
                  <td className="px-4 py-4">{renderMoney(item.unit_price)}</td>
                  <td className="px-4 py-4">{renderMoney(item.line_total)}</td>
                  <td className="px-4 py-4">{item.reason || "—"}</td>
                </tr>
              ))}
              {!record.items?.length ? (
                <tr>
                  <td
                    colSpan="6"
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

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">Raw API data</summary>
        <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-muted p-4 text-xs">
          {JSON.stringify(record, null, 2)}
        </pre>
      </details>
    </div>
  );
}
