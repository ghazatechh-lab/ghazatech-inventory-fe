import React from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingRowActions } from "@/components/common/ListingRowActions";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const PAGE_SIZE = 12;

function normalizePayload(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (
      Array.isArray(current.results) ||
      Object.prototype.hasOwnProperty.call(current, "count")
    ) {
      break;
    }

    if (current.data !== undefined && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  if (Array.isArray(current)) {
    return {
      count: current.length,
      results: current,
    };
  }

  if (current && typeof current === "object") {
    const results = Array.isArray(current.results)
      ? current.results
      : Array.isArray(current.data)
        ? current.data
        : [];

    return {
      ...current,
      count: Number(current.count) || Number(current.total) || results.length,
      results,
    };
  }

  return {
    count: 0,
    results: [],
  };
}

function getErrorDetails(error) {
  const response = error?.response;

  return {
    message:
      response?.data?.message ||
      response?.data?.detail ||
      error?.message ||
      "Unable to load shipments.",
    status: response?.status,
    response: response?.data,
    requestUrl: response?.config?.url,
    requestParams: response?.config?.params,
  };
}

export default function ShipmentListPage() {
  const { branchId, branchParams } = useActiveBranchFilter();

  const [search, setSearch] = React.useState("");

  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const params = React.useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      shipment_type: "PURCHASE",
      ...(debouncedSearch
        ? {
            search: debouncedSearch,
          }
        : {}),
      ...(branchParams || {}),
      ...(branchId && String(branchId) !== "all"
        ? {
            branch: branchId,
          }
        : {}),
    }),
    [page, debouncedSearch, branchParams, branchId],
  );

  const query = useQuery({
    queryKey: ["shipments", "purchase-list", params],

    queryFn: async () => {
      console.group("[ShipmentListPage] API request");
      console.log("Endpoint:", "/shipments/");
      console.log("Parameters:", params);

      try {
        const response = await api.get("/shipments/", {
          params,
          skipGlobalErrorToast: true,
        });

        console.log("Raw Axios response:", response);
        console.log("Raw response.data:", response?.data);

        const normalized = normalizePayload(response);

        console.log("Normalized payload:", normalized);
        console.log("Shipment rows:", normalized.results);
        console.groupEnd();

        return normalized;
      } catch (error) {
        console.error("Shipment list request failed:", error);
        console.error("Backend response:", error?.response?.data);
        console.groupEnd();
        throw error;
      }
    },

    placeholderData: keepPreviousData,

    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  React.useEffect(() => {
    console.log("[ShipmentListPage] Component mounted", {
      branchId,
      branchParams,
    });

    return () => {
      console.log("[ShipmentListPage] Component unmounted");
    };
  }, [branchId, branchParams]);

  React.useEffect(() => {
    console.log("[ShipmentListPage] Query state", {
      status: query.status,
      fetchStatus: query.fetchStatus,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      data: query.data,
      error: query.error,
    });
  }, [
    query.status,
    query.fetchStatus,
    query.isLoading,
    query.isFetching,
    query.data,
    query.error,
  ]);

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = Array.isArray(payload.results) ? payload.results : [];

  const total = Number(payload.count) || rows.length;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const errorDetails = query.isError ? getErrorDetails(query.error) : null;

  const columns = [
    {
      key: "shipment_number",
      header: "Shipment #",
      cell: (row) => (
        <Link
          to={`/shipments/${row.id}`}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {row.shipment_number || `Shipment ${row.id}`}
        </Link>
      ),
    },
    {
      key: "purchase_order",
      header: "Purchase Order",
      cell: (row) =>
        row.po_number ||
        row.purchase_order?.po_number ||
        row.purchase_order_number ||
        "—",
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row) =>
        row.supplier_name ||
        row.supplier?.supplier_name ||
        row.supplier?.name ||
        "—",
    },
    {
      key: "branch",
      header: "Branch",
      cell: (row) => {
        const code = row.branch_code || row.branch?.branch_code;

        const name = row.branch_name || row.branch?.branch_name;

        return code ? `${code}${name ? ` — ${name}` : ""}` : name || "—";
      },
    },
    {
      key: "courier",
      header: "Courier",
      cell: (row) => row.courier || row.shipment_method || "—",
    },
    {
      key: "tracking_number",
      header: "Tracking #",
      cell: (row) => row.tracking_number || "—",
    },
    {
      key: "shipment_date",
      header: "Shipment Date",
      cell: (row) =>
        row.shipment_date ? <DateText value={row.shipment_date} /> : "—",
    },
    {
      key: "expected_date",
      header: "Expected",
      cell: (row) =>
        row.expected_date ? <DateText value={row.expected_date} /> : "—",
    },
    {
      key: "items",
      header: "Products",
      align: "right",
      cell: (row) => row.item_count ?? row.items?.length ?? 0,
    },
    {
      key: "quantity",
      header: "Received Qty",
      align: "right",
      cell: (row) =>
        row.total_received_quantity ??
        (row.items || []).reduce(
          (sum, item) => sum + Number(item.received_quantity || 0),
          0,
        ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (row) => <CurrencyText value={row.total_shipment_value || 0} />,
    },
    {
      key: "qc_status",
      header: "QC",
      cell: (row) => <StatusBadge status={row.qc_status || "PENDING"} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status || "DRAFT"} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <ListingRowActions
          viewTo={`/shipments/${row.id}`}
          editTo={`/shipments/${row.id}/edit`}
          deleteUrl={`/shipments/${row.id}/`}
          queryKey="shipments"
          itemLabel={row.shipment_number || "shipment"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Shipments"
        subtitle="Inbound supplier shipments and received product details."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button asChild>
              <Link to="/shipments/new">
                <Plus className="mr-2 h-4 w-4" />
                Log Shipment
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search shipment, PO, supplier, courier, product, or tracking number"
        />
      </div>

      {errorDetails && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">Shipment API request failed</p>

              <p className="mt-1 text-sm">{errorDetails.message}</p>

              <div className="mt-3 space-y-1 font-mono text-xs">
                <p>Status: {errorDetails.status || "No response"}</p>
                <p>URL: {errorDetails.requestUrl || "/shipments/"}</p>
                <p className="break-all">
                  Params: {JSON.stringify(errorDetails.requestParams || params)}
                </p>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Backend response
                </summary>

                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/10 p-3 text-xs">
                  {JSON.stringify(errorDetails.response, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={[
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
                      column.align === "right" ? "text-right" : "text-left",
                    ].join(" ")}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        "px-4 py-4",
                        column.align === "right" ? "text-right" : "text-left",
                      ].join(" ")}
                    >
                      {column.cell
                        ? column.cell(row)
                        : (row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}

              {!query.isLoading && !query.isError && !rows.length && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-12 text-center text-muted-foreground"
                  >
                    The API returned no shipment records for the current
                    filters.
                  </td>
                </tr>
              )}

              {query.isLoading && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-12 text-center text-muted-foreground"
                  >
                    Loading shipments...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
          <p className="text-sm text-muted-foreground">
            Showing {rows.length} of {total} shipments
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm">
              Page {page} of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || query.isFetching}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
