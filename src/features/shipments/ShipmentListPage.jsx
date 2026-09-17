import React from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Info,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  Truck,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
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

function ShipmentSummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>

        <div
          className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
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

  const pageReceived = rows.filter((row) =>
    ["RECEIVED", "COMPLETED"].includes(String(row.status || "").toUpperCase()),
  ).length;

  const pageItems = rows.reduce(
    (sum, row) => sum + Number(row.item_count ?? row.items?.length ?? 0),
    0,
  );

  const pageValue = rows.reduce(
    (sum, row) => sum + Number(row.total_shipment_value || 0),
    0,
  );

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
        "â€”",
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row) =>
        row.supplier_name ||
        row.supplier?.supplier_name ||
        row.supplier?.name ||
        "â€”",
    },
    {
      key: "branch",
      header: "Branch",
      cell: (row) => {
        const code = row.branch_code || row.branch?.branch_code;

        const name = row.branch_name || row.branch?.branch_name;

        return code ? `${code}${name ? ` â€” ${name}` : ""}` : name || "â€”";
      },
    },
    {
      key: "courier",
      header: "Courier",
      cell: (row) => row.courier || row.shipment_method || "â€”",
    },
    {
      key: "tracking_number",
      header: "Tracking #",
      cell: (row) => row.tracking_number || "â€”",
    },
    {
      key: "shipment_date",
      header: "Shipment Date",
      cell: (row) =>
        row.shipment_date ? <DateText value={row.shipment_date} /> : "â€”",
    },
    {
      key: "expected_date",
      header: "Expected",
      cell: (row) =>
        row.expected_date ? <DateText value={row.expected_date} /> : "â€”",
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
    <div className="supplier-module-page purchase-module-page min-h-full text-slate-900 dark:text-white">
      <div className="supplier-topbar">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Purchases /{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              Purchase Shipments
            </span>
          </p>

          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search anything..."
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] space-y-6 px-5 py-6 lg:px-7">
        <section className="supplier-hero supplier-list-hero">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="supplier-hero-content flex min-w-0 items-start gap-4">
              <span className="supplier-hero-icon shrink-0">
                <Truck className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="supplier-eyebrow supplier-list-eyebrow">
                  Purchase management
                </p>

                <h1 className="supplier-hero-title supplier-list-title mt-1">
                  Purchase Shipments
                </h1>

                <p className="supplier-hero-description supplier-list-description mt-2 max-w-3xl">
                  Track inbound supplier shipments, purchase-order receipts,
                  received quantities, quality checks, rack placement and GRN
                  readiness.
                  {branchId && String(branchId) !== "all"
                    ? " Showing shipments for the selected branch."
                    : " Showing shipments from all branches."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={query.isFetching}
                onClick={() => query.refetch()}
                className="h-11 rounded-xl px-5 font-semibold"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button
                asChild
                className="supplier-hero-action h-11 rounded-xl bg-amber-400 px-5 font-extrabold text-slate-950 shadow-lg shadow-black/15 hover:bg-amber-300"
              >
                <Link to="/shipments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Shipment
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Purchase shipments are linked to approved purchase orders and track
            received, accepted and rejected quantities before GRN creation.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ShipmentSummaryCard
            icon={Truck}
            label="Total Shipments"
            value={total}
            hint="For the current branch/filter"
          />
          <ShipmentSummaryCard
            icon={PackageCheck}
            label="Received"
            value={pageReceived}
            hint="On the current page"
            tone="green"
          />
          <ShipmentSummaryCard
            icon={Boxes}
            label="Products"
            value={pageItems}
            hint="Items on the current page"
            tone="blue"
          />
          <ShipmentSummaryCard
            icon={CircleDollarSign}
            label="Shipment Value"
            value={<CurrencyText value={pageValue} />}
            hint="Current page value"
            tone="amber"
          />
        </section>

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
                    Params:{" "}
                    {JSON.stringify(errorDetails.requestParams || params)}
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

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
                  <tr
                    key={row.id}
                    className="border-b transition hover:bg-slate-50/80 last:border-b-0 dark:hover:bg-white/[0.03]"
                  >
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
                          : (row[column.key] ?? "â€”")}
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
      </main>
    </div>
  );
}

