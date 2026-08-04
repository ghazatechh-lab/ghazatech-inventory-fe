import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Plus, RefreshCcw } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingRowActions } from "@/components/common/ListingRowActions";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { normalizeApiResponse, rowsFromPayload } from "./purchaseUi";

const PAGE_SIZE = 12;

export default function SupplierPaymentListPage() {
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
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [page, debouncedSearch],
  );

  const query = useQuery({
    queryKey: ["/purchases/supplier-payments/", params],
    queryFn: async () => {
      const response = await api.get("/purchases/supplier-payments/", {
        params,
        skipGlobalErrorToast: true,
      });
      return normalizeApiResponse(response);
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const payload = query.data || {};
  const rows = rowsFromPayload(payload);
  const total = Number(payload.count || payload.total || rows.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    {
      key: "payment_number",
      header: "Payment #",
      cell: (row) => (
        <Link
          className="font-medium text-blue-600 hover:underline"
          to={`/purchases/supplier-payments/${row.id}`}
        >
          {row.payment_number || `Payment ${row.id}`}
        </Link>
      ),
    },
    {
      key: "supplier_name",
      header: "Supplier",
      cell: (row) => row.supplier_name || "—",
    },
    {
      key: "payment_date",
      header: "Date",
      cell: (row) =>
        row.payment_date ? <DateText value={row.payment_date} /> : "—",
    },
    {
      key: "payment_method",
      header: "Method",
      cell: (row) => row.payment_method_display || row.payment_method || "—",
    },
    {
      key: "reference_number",
      header: "Reference",
      cell: (row) => row.reference_number || "—",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => <CurrencyText value={row.amount} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status || "POSTED"} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <ListingRowActions
          viewTo={`/purchases/supplier-payments/${row.id}`}
          editTo={`/purchases/supplier-payments/${row.id}/edit`}
          deleteUrl={`/purchases/supplier-payments/${row.id}/`}
          queryKey="supplier-payments"
          itemLabel={row.payment_number || "payment"}
        />
      ),
    },
  ];

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title="Supplier Payments"
        subtitle="Track supplier payments, allocations, payment methods, and supporting files."
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
              <Link to="/purchases/supplier-payments/new">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search supplier payments"
        />
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Unable to load supplier payments</p>
              <p className="mt-1 text-sm">
                {query.error?.response?.data?.detail ||
                  query.error?.response?.data?.message ||
                  query.error?.message}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${column.align === "right" ? "text-right" : "text-left"}`}
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
                      className={`px-4 py-4 ${column.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {column.cell
                        ? column.cell(row)
                        : (row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}

              {query.isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-12 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : null}

              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <p className="text-sm text-muted-foreground">
            Showing {rows.length} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
