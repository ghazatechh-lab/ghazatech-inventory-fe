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

const ENDPOINT_CANDIDATES = [
  "/purchases/purchase-expenses/",
  "/purchases/expenses/",
];

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

async function requestFromAvailableEndpoint(params) {
  let lastError = null;

  for (const endpoint of ENDPOINT_CANDIDATES) {
    try {
      const response = await api.get(endpoint, {
        params,
        skipGlobalErrorToast: true,
      });

      return {
        payload: normalizeResponse(response),
        endpoint,
      };
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Purchase expense endpoint was not found.");
}

export default function PurchaseExpenseListPage() {
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
    queryKey: ["purchase-expenses", params],
    queryFn: () => requestFromAvailableEndpoint(params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const payload = query.data?.payload || {};
  const activeEndpoint = query.data?.endpoint || ENDPOINT_CANDIDATES[0];

  const rows = getRows(payload);
  const total = Number(payload?.count ?? payload?.total ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Expenses"
        subtitle="Manage freight, customs, handling, and other purchasing costs."
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
              <Link to="/purchases/purchase-expenses/new">
                <Plus className="mr-2 h-4 w-4" />
                New Purchase Expense
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by expense number, category, supplier, or reference"
        />
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load purchase expenses</p>

              <p className="mt-1 text-sm">
                {query.error?.response?.data?.detail ||
                  query.error?.response?.data?.message ||
                  query.error?.message}
              </p>

              {query.error?.response?.status === 404 ? (
                <p className="mt-2 font-mono text-xs">
                  Tried: {ENDPOINT_CANDIDATES.join(" and ")}
                </p>
              ) : null}
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
                  Expense Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                  Amount
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
                      to={`/purchases/purchase-expenses/${row.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.expense_number || `Expense ${row.id}`}
                    </Link>
                  </td>

                  <td className="px-4 py-4">
                    {row.expense_date ? (
                      <DateText value={row.expense_date} />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {row.category_display || row.category || "—"}
                  </td>

                  <td className="px-4 py-4">
                    {row.branch_name ||
                      row.branch?.branch_name ||
                      row.branch?.name ||
                      "—"}
                  </td>

                  <td className="px-4 py-4">
                    {row.supplier_name ||
                      row.supplier?.supplier_name ||
                      row.supplier?.name ||
                      "—"}
                  </td>

                  <td className="px-4 py-4">
                    {row.payment_method_display || row.payment_method || "—"}
                  </td>

                  <td className="px-4 py-4 text-right font-medium">
                    <CurrencyText value={row.amount || row.total_amount || 0} />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge status={row.status || "DRAFT"} />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <ListingRowActions
                      viewTo={`/purchases/purchase-expenses/${row.id}`}
                      editTo={`/purchases/purchase-expenses/${row.id}/edit`}
                      deleteUrl={`${activeEndpoint}${row.id}/`}
                      queryKey="purchase-expenses"
                      itemLabel={row.expense_number || "purchase expense"}
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
                    Loading purchase expenses...
                  </td>
                </tr>
              ) : null}

              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-12 text-center text-muted-foreground"
                  >
                    No purchase expenses found.
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
