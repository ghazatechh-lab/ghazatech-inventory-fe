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

const PAGE_SIZE = 12;
const ENDPOINT = "/purchases/vendor-credits/";

function normalizeResponse(value) {
  let current = value;

  for (let index = 0; index < 6; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (
      Array.isArray(current.results) ||
      Object.prototype.hasOwnProperty.call(current, "count") ||
      Object.prototype.hasOwnProperty.call(current, "id")
    ) {
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

function getRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export default function VendorCreditListPage() {
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
    queryKey: ["vendor-credits", params],
    queryFn: async () => {
      const response = await api.get(ENDPOINT, {
        params,
        skipGlobalErrorToast: true,
      });

      return normalizeResponse(response);
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const payload = query.data || {};
  const rows = getRows(payload);
  const total = Number(payload?.count ?? payload?.total ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Credits"
        subtitle="Track supplier credits, applications, and available credit balances."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${
                  query.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button asChild>
              <Link to="/purchases/vendor-credits/new">
                <Plus className="mr-2 h-4 w-4" />
                New Vendor Credit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by credit number, supplier, or reference"
        />
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load vendor credits</p>

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
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Credit Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Reason
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                  Applied
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                  Remaining
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4">
                    <Link
                      to={`/purchases/vendor-credits/${row.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.credit_number || `Credit ${row.id}`}
                    </Link>
                  </td>

                  <td className="px-4 py-4">
                    {row.supplier_name ||
                      row.supplier?.supplier_name ||
                      row.supplier?.name ||
                      "—"}
                  </td>

                  <td className="px-4 py-4">
                    {row.credit_date ? (
                      <DateText value={row.credit_date} />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {row.reason_display || row.reason || "—"}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <CurrencyText value={row.total_amount || 0} />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <CurrencyText value={row.applied_amount || 0} />
                  </td>

                  <td className="px-4 py-4 text-right font-medium">
                    <CurrencyText
                      value={
                        row.remaining_amount ??
                        Number(row.total_amount || 0) -
                          Number(row.applied_amount || 0)
                      }
                    />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge status={row.status || "DRAFT"} />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <ListingRowActions
                      viewTo={`/purchases/vendor-credits/${row.id}`}
                      editTo={`/purchases/vendor-credits/${row.id}/edit`}
                      deleteUrl={`${ENDPOINT}${row.id}/`}
                      queryKey="vendor-credits"
                      itemLabel={row.credit_number || "vendor credit"}
                    />
                  </td>
                </tr>
              ))}

              {query.isLoading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-12 text-center text-muted-foreground"
                  >
                    Loading vendor credits...
                  </td>
                </tr>
              ) : null}

              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-12 text-center text-muted-foreground"
                  >
                    No vendor credits found.
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                setPage((current) => Math.min(totalPages, current + 1))
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
