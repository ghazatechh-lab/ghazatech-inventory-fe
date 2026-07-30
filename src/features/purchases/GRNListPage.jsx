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

export default function GRNListPage() {
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
    queryKey: ["/purchases/grn/", params],
    queryFn: async () => {
      const response = await api.get("/purchases/grn/", {
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
      key: "grn_number",
      header: "GRN #",
      cell: (row) => (
        <Link
          className="font-medium text-blue-600 hover:underline"
          to={`/purchases/grn/${row.id}`}
        >
          {row.grn_number || `GRN ${row.id}`}
        </Link>
      ),
    },
    {
      key: "po_number",
      header: "Purchase Order",
      cell: (row) => row.po_number || "—",
    },
    {
      key: "supplier_name",
      header: "Supplier",
      cell: (row) => row.supplier_name || "—",
    },
    {
      key: "branch_name",
      header: "Branch",
      cell: (row) => row.branch_name || "—",
    },
    {
      key: "received_date",
      header: "Received Date",
      cell: (row) =>
        row.received_date ? <DateText value={row.received_date} /> : "—",
    },
    {
      key: "item_count",
      header: "Items",
      align: "right",
      cell: (row) => row.item_count ?? row.items?.length ?? 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status || (row.is_confirmed ? "CONFIRMED" : "DRAFT")}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <ListingRowActions
          viewTo={`/purchases/grn/${row.id}`}
          editTo={`/purchases/grn/${row.id}/edit`}
          deleteUrl={`/purchases/grn/${row.id}/`}
          queryKey="purchases-grn"
          itemLabel={row.grn_number || "GRN"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Received Notes"
        subtitle="Manage purchase receipts, QC, accepted quantities, and uploaded documents."
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
              <Link to="/purchases/grn/new">
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
          placeholder="Search goods received notes"
        />
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">
                Unable to load goods received notes
              </p>
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
