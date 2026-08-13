import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  PackageCheck,
  Printer,
  RefreshCcw,
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

const normalizeList = (value) => {
  const normalized = normalizeApiResponse(value);

  if (Array.isArray(normalized)) return normalized;
  if (Array.isArray(normalized?.results)) return normalized.results;
  if (Array.isArray(normalized?.data)) return normalized.data;
  if (Array.isArray(normalized?.data?.results)) {
    return normalized.data.results;
  }

  return [];
};

const getRelationId = (value, fallback) => {
  if (fallback !== undefined && fallback !== null && fallback !== "") {
    return fallback;
  }

  if (value && typeof value === "object") {
    return value.id ?? "";
  }

  return value ?? "";
};

export default function GRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const record = query.data;

  const purchaseOrderId = getRelationId(
    record?.purchase_order,
    record?.purchase_order_id,
  );

  const shipmentQuery = useQuery({
    queryKey: ["grn-linked-shipment", purchaseOrderId],
    queryFn: async () =>
      unwrap(
        await api.get("/shipments/", {
          params: {
            purchase_order: purchaseOrderId,
            shipment_type: "PURCHASE",
            page_size: 20,
            ordering: "-id",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(purchaseOrderId),
    staleTime: 0,
    retry: false,
  });

  const linkedShipment = React.useMemo(() => {
    const shipments = normalizeList(shipmentQuery.data);
    return shipments[0] || null;
  }, [shipmentQuery.data]);

  const confirmShipment = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          `/purchases/grn/${id}/confirm-shipment/`,
          {},
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async (shipment) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["grn-linked-shipment"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["shipments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["GRNDetailPage", id],
        }),
      ]);

      toast.success(
        `Shipment ${shipment?.shipment_number || ""} confirmed successfully.`,
      );
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to confirm shipment", {
        description: details.summary || details.message || "Please try again.",
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

  const grnConfirmed =
    Boolean(record.is_confirmed) ||
    String(record.status || "").toUpperCase() === "CONFIRMED";

  const shipmentStatus = String(linkedShipment?.status || "").toUpperCase();

  const shipmentConfirmed = ["RECEIVED", "COMPLETED", "DELIVERED"].includes(
    shipmentStatus,
  );

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
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

            <Button
              variant="outline"
              onClick={async () => {
                await Promise.all([query.refetch(), shipmentQuery.refetch()]);
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            {linkedShipment ? (
              <Button variant="outline" asChild>
                <Link to={`/shipments/${linkedShipment.id}`}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  View Shipment
                </Link>
              </Button>
            ) : null}

            {grnConfirmed && linkedShipment && !shipmentConfirmed ? (
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => confirmShipment.mutate()}
                disabled={confirmShipment.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {confirmShipment.isPending
                  ? "Confirming..."
                  : "Confirm Shipment"}
              </Button>
            ) : null}

            {!grnConfirmed ? (
              <Button asChild>
                <Link to={`/purchases/grn/${id}/edit`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
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

      <DetailSection title="Shipment Log">
        {shipmentQuery.isLoading ? (
          <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
            Loading linked shipment...
          </div>
        ) : linkedShipment ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField
              label="Shipment Number"
              value={linkedShipment.shipment_number}
            />

            <DetailField
              label="Shipment Status"
              value={renderStatus(linkedShipment.status || "DRAFT")}
            />

            <DetailField
              label="Shipment Date"
              value={renderDate(linkedShipment.shipment_date)}
            />

            <DetailField
              label="Received Date"
              value={renderDate(linkedShipment.received_date)}
            />

            <DetailField
              label="Method"
              value={linkedShipment.shipment_method || "Purchase Receipt"}
            />

            <DetailField
              label="Warehouse"
              value={linkedShipment.warehouse || "—"}
            />

            <DetailField
              label="Received By"
              value={linkedShipment.received_by_name || "—"}
            />

            <DetailField
              label="QC Status"
              value={renderStatus(linkedShipment.qc_status || "PENDING")}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Shipment log has not been generated for this GRN.
          </div>
        )}
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

                  <td className="px-4 py-4">
                    {item.rejected_quantity ?? item.damaged_quantity ?? 0}
                  </td>

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
