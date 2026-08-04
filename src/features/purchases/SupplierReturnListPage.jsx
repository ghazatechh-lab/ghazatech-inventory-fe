import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Eye, Plus, RefreshCcw } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { normalizeApiResponse, rowsFromPayload } from "./purchaseUi";

const PAGE_SIZE = 12;

export default function SupplierReturnListPage() {
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
    queryKey: ["supplier-returns", params],
    queryFn: async () => {
      const response = await api.get("/purchases/supplier-returns/", {
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

  return (
    <div className="purchase-module-page purchase-workspace space-y-6">
      <PageHeader
        title="Supplier Returns"
        subtitle="Create returns from confirmed GRNs, approve stock deductions, and complete vendor credit settlement."
        actions={
          <div className="flex flex-wrap gap-2">
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
              <Link to="/purchases/supplier-returns/new">
                <Plus className="mr-2 h-4 w-4" />
                New Return
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Correct flow: create from a confirmed GRN → submit for approval →
        approve stock OUT → issue vendor credit or adjust the next bill.
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search return number, supplier, GRN, reason or status"
        />
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Unable to load supplier returns</p>
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
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Return #",
                  "GRN",
                  "Supplier",
                  "Date",
                  "Reason",
                  "Items",
                  "Amount",
                  "Status",
                  "Action",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-muted/25"
                >
                  <td className="px-4 py-4">
                    <Link
                      className="font-semibold text-blue-600 hover:underline"
                      to={`/purchases/supplier-returns/${row.id}`}
                    >
                      {row.return_number || `Return ${row.id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{row.grn_number || "—"}</td>
                  <td className="px-4 py-4">{row.supplier_name || "—"}</td>
                  <td className="px-4 py-4">
                    {row.return_date ? (
                      <DateText value={row.return_date} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {row.reason_display || row.reason || "—"}
                  </td>
                  <td className="px-4 py-4">
                    {row.item_count ?? row.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-4">
                    <CurrencyText value={row.total_amount} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status || "DRAFT"} />
                  </td>
                  <td className="px-4 py-4">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/purchases/supplier-returns/${row.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}

              {query.isLoading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-12 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : null}
              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-12 text-center text-muted-foreground"
                  >
                    No supplier returns found.
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
