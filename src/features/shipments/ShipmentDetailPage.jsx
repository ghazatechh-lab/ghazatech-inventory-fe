import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  Package,
  Printer,
  RefreshCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

function unwrapResponse(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || typeof current !== "object") {
      break;
    }

    if (current.id !== undefined || current.shipment_number) {
      break;
    }

    if (current.data !== undefined && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  return current;
}

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <div className="mt-1 break-words text-sm font-medium">
      {value === undefined || value === null || value === "" ? "—" : value}
    </div>
  </div>
);

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log("[ShipmentDetailPage] Component mounted", {
      shipmentId: id,
    });
  }, [id]);

  const query = useQuery({
    queryKey: ["shipment", "detail", id],

    queryFn: async () => {
      const endpoint = `/shipments/${id}/`;

      console.group("[ShipmentDetailPage] API request");
      console.log("Endpoint:", endpoint);

      try {
        const response = await api.get(endpoint, {
          skipGlobalErrorToast: true,
        });

        console.log("Raw Axios response:", response);
        console.log("Raw response.data:", response?.data);

        const shipment = unwrapResponse(response);

        console.log("Normalized shipment:", shipment);
        console.log("Shipment items:", shipment?.items);
        console.log("Tracking logs:", shipment?.tracking_logs);
        console.groupEnd();

        return shipment;
      } catch (error) {
        console.error("Shipment detail request failed:", error);
        console.error("Backend response:", error?.response?.data);
        console.groupEnd();
        throw error;
      }
    },

    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    console.log("[ShipmentDetailPage] Query state", {
      status: query.status,
      fetchStatus: query.fetchStatus,
      data: query.data,
      error: query.error,
    });
  }, [query.status, query.fetchStatus, query.data, query.error]);

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center">
        Loading shipment...
      </div>
    );
  }

  const shipment = query.data;

  if (query.isError || !shipment) {
    const body = query.error?.response?.data;

    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/shipments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />

            <div>
              <p className="font-semibold">Unable to load shipment details</p>
              <p className="mt-1 text-sm">
                {body?.message || body?.detail || query.error?.message}
              </p>

              <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/10 p-3 text-xs">
                {JSON.stringify(body, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = Array.isArray(shipment.items) ? shipment.items : [];

  const logs = Array.isArray(shipment.tracking_logs)
    ? shipment.tracking_logs
    : [];

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title={shipment.shipment_number || `Shipment ${id}`}
        subtitle="Complete shipment and received-product information."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/shipments")}>
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
              <Link to={`/shipments/${id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{shipment.shipment_number}</h2>

          <div className="flex gap-2">
            <StatusBadge status={shipment.qc_status || "PENDING"} />
            <StatusBadge status={shipment.status || "DRAFT"} />
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Purchase Order"
            value={
              shipment.purchase_order ? (
                <Link
                  to={`/purchases/orders/${shipment.purchase_order}`}
                  className="text-blue-600 hover:underline"
                >
                  {shipment.po_number || "View purchase order"}
                </Link>
              ) : (
                shipment.po_number
              )
            }
          />
          <Field
            label="Supplier"
            value={shipment.supplier_name || shipment.supplier?.supplier_name}
          />
          <Field
            label="Branch"
            value={
              shipment.branch_code
                ? `${shipment.branch_code} — ${shipment.branch_name || ""}`
                : shipment.branch_name
            }
          />
          <Field
            label="Shipment Type"
            value={shipment.shipment_type_display || shipment.shipment_type}
          />
          <Field
            label="Shipment Date"
            value={
              shipment.shipment_date ? (
                <DateText value={shipment.shipment_date} />
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Expected Date"
            value={
              shipment.expected_date ? (
                <DateText value={shipment.expected_date} />
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Received Date"
            value={
              shipment.received_date ? (
                <DateText value={shipment.received_date} />
              ) : (
                "—"
              )
            }
          />
          <Field label="Received By" value={shipment.received_by_name} />
          <Field label="Courier" value={shipment.courier} />
          <Field label="Tracking Number" value={shipment.tracking_number} />
          <Field label="Container Number" value={shipment.container_number} />
          <Field label="Warehouse" value={shipment.warehouse} />
          <Field
            label="Supplier Invoice"
            value={shipment.supplier_invoice_number}
          />
          <Field label="Delivery Note" value={shipment.delivery_note_number} />
          <Field label="Delivery Address" value={shipment.delivery_address} />
          <Field label="Notes" value={shipment.notes} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Received Products ({items.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Product",
                  "Variant",
                  "Expected",
                  "Received",
                  "Accepted",
                  "Rejected",
                  "Condition",
                  "Rack",
                  "Unit Cost",
                  "VAT",
                  "Total",
                  "Serial / Batch",
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
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {item.product_name ||
                            item.product?.product_name ||
                            "Product"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {item.sku || item.product?.sku || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {item.variant_name || item.variant?.display_name || "—"}
                  </td>
                  <td className="px-4 py-4">{item.expected_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.received_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.accepted_quantity ?? 0}</td>
                  <td className="px-4 py-4">{item.rejected_quantity ?? 0}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.condition || "GOOD"} />
                  </td>
                  <td className="px-4 py-4">
                    {item.rack_code ||
                      item.rack_name ||
                      item.rack?.rack_code ||
                      "—"}
                  </td>
                  <td className="px-4 py-4">
                    <CurrencyText value={item.unit_cost || 0} />
                  </td>
                  <td className="px-4 py-4">
                    {Number(item.vat_percentage || 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-4">
                    <CurrencyText
                      value={
                        item.total_cost ||
                        Number(item.received_quantity || 0) *
                          Number(item.unit_cost || 0)
                      }
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p>Serial: {item.serial_number || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch: {item.batch_number || "—"}
                    </p>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td
                    colSpan="12"
                    className="p-12 text-center text-muted-foreground"
                  >
                    The shipment API returned no item records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Tracking History ({logs.length})</h2>

        <div className="mt-4 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border-l-2 pl-4">
              <StatusBadge status={log.status} />
              <p className="mt-2 text-sm">{log.location || "—"}</p>
              <p className="text-sm text-muted-foreground">
                {log.remarks || "—"}
              </p>
            </div>
          ))}

          {!logs.length && (
            <p className="text-sm text-muted-foreground">
              No tracking records.
            </p>
          )}
        </div>
      </section>

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">
          Shipment API debug data
        </summary>

        <pre className="mt-4 max-h-[600px] overflow-auto rounded-xl bg-muted p-4 text-xs">
          {JSON.stringify(shipment, null, 2)}
        </pre>
      </details>
    </div>
  );
}
