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

export default function GRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["GRNDetailPage", id],
    queryFn: async () =>
      normalizeApiResponse(
        await api.get(`/purchases/grn/${id}/`, {
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
        <Button variant="outline" onClick={() => navigate("/purchases/grn")}>
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
        title={record.grn_number || `GRN ${id}`}
        subtitle="Complete document information and related records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/grn")}
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
              <Link to={`/purchases/grn/${id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <DetailSection title="GRN Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="GRN Number" value={record.grn_number} />
          <DetailField label="Purchase Order" value={record.po_number} />
          <DetailField label="Supplier" value={record.supplier_name} />
          <DetailField label="Branch" value={record.branch_name} />
          <DetailField
            label="Received Date"
            value={renderDate(record.received_date)}
          />
          <DetailField label="Received By" value={record.received_by_name} />
          <DetailField
            label="Status"
            value={renderStatus(
              record.status || (record.is_confirmed ? "CONFIRMED" : "DRAFT"),
            )}
          />
          <DetailField
            label="Confirmed At"
            value={renderDate(record.confirmed_at)}
          />
        </div>
      </DetailSection>

      <DetailSection title={`Received Items (${record.items?.length || 0})`}>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Product",
                  "SKU",
                  "Variant",
                  "Ordered",
                  "Received",
                  "Accepted",
                  "Rejected",
                  "Rack",
                  "QC",
                  "Unit Cost",
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
                  <td className="px-4 py-4">{item.variant_name || "—"}</td>
                  <td className="px-4 py-4">
                    {item.ordered_quantity ?? item.purchase_order_quantity ?? 0}
                  </td>
                  <td className="px-4 py-4">{item.received_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.accepted_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.rejected_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.rack_code || "—"}</td>
                  <td className="px-4 py-4">
                    {renderStatus(
                      item.quality_status || item.qc_status || "PENDING",
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {renderMoney(item.unit_cost || item.unit_price)}
                  </td>
                </tr>
              ))}
              {!record.items?.length ? (
                <tr>
                  <td
                    colSpan="10"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No GRN items returned by API.
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
