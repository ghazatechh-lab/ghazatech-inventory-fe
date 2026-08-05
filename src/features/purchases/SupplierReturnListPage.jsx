import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Eye, FilterX, Plus, RefreshCcw } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { useSupplierUrlFilter } from "@/hooks/useSupplierUrlFilter";
import { normalizeApiResponse, rowsFromPayload } from "./purchaseUi";

const PAGE_SIZE = 12;

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

export default function SupplierReturnListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { supplierId, supplierParams, setSupplierId, clearSupplierFilter } =
    useSupplierUrlFilter();

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

  React.useEffect(() => {
    setPage(1);
  }, [supplierId]);

  const { data: suppliersResponse } = useQuery({
    queryKey: ["supplier-return-filter-suppliers"],

    queryFn: async () =>
      unwrap(
        await api.get("/suppliers/", {
          params: {
            page_size: 500,
            is_active: true,
            ordering: "supplier_name",
          },
          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 30_000,
    retry: false,
  });

  const suppliers = React.useMemo(
    () => normalizeList(suppliersResponse),
    [suppliersResponse],
  );

  const selectedSupplier = React.useMemo(
    () =>
      suppliers.find((supplier) => String(supplier.id) === String(supplierId)),
    [suppliers, supplierId],
  );

  const params = React.useMemo(
    () => ({
      ...branchParams,
      ...supplierParams,
      page,
      page_size: PAGE_SIZE,
      ...(debouncedSearch
        ? {
            search: debouncedSearch,
          }
        : {}),
    }),
    [branchParams, supplierParams, page, debouncedSearch],
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

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
              <Link
                to={
                  supplierId
                    ? `/purchases/supplier-returns/new?supplier=${encodeURIComponent(
                        supplierId,
                      )}`
                    : "/purchases/supplier-returns/new"
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                New Return
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Correct flow: create from a confirmed GRN → submit for approval →
        approve stock OUT → issue vendor credit or adjust the next bill.
      </div>

      {supplierId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <span>
            Showing returns for{" "}
            <strong>
              {selectedSupplier?.supplier_name || `supplier ID ${supplierId}`}
            </strong>
            .
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearSupplierFilter}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Clear Supplier Filter
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search return number, supplier, GRN, reason or status"
          />

          <Select
            value={supplierId || "all"}
            onValueChange={(value) =>
              setSupplierId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>

            <SelectContent className="max-h-72">
              <SelectItem value="all">All suppliers</SelectItem>

              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.supplier_name || supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <table className="w-full min-w-[1120px] text-sm">
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
                    <CurrencyText
                      value={row.total_amount}
                      currency={row.currency || "AED"}
                    />
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
                    colSpan={9}
                    className="p-12 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : null}

              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-12 text-center text-muted-foreground"
                  >
                    {supplierId
                      ? "No returns found for this supplier."
                      : "No supplier returns found."}
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
