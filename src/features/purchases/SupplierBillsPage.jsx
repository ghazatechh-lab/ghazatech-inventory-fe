import React from "react";
import { Link } from "react-router-dom";
import { FilterX, Info, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { useSupplierUrlFilter } from "@/hooks/useSupplierUrlFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

function MetricCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-950 dark:text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-xs text-slate-500">{label}</p>

      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function SupplierBillsPage() {
  const {
    supplierId: supplierFilter,
    supplierParams,
    setSupplierId,
    clearSupplierFilter,
  } = useSupplierUrlFilter();

  const { branchParams } = useActiveBranchFilter();

  const { data: suppliersResponse } = useQuery({
    queryKey: ["supplier-bill-filter-suppliers"],

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

  const selectedFilterSupplier = React.useMemo(
    () =>
      suppliers.find(
        (supplier) => String(supplier.id) === String(supplierFilter),
      ),
    [suppliers, supplierFilter],
  );

  const listParams = React.useMemo(
    () => ({
      ...branchParams,
      ...supplierParams,
    }),
    [branchParams, supplierParams],
  );

  const { query, q, setQ, page, setPage } = useListQuery(
    "supplier-bills",
    "/purchases/supplier-bills/",
    listParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["supplier-bills-summary", listParams],

    queryFn: async () =>
      unwrap(
        await api.get("/purchases/supplier-bills/summary/", {
          params: listParams,
          skipGlobalErrorToast: true,
        }),
      ),

    staleTime: 0,
    retry: false,
  });

  const summary = summaryResponse || {
    total_payable: 0,
    overdue: 0,
    bills_this_month: 0,
  };

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const updateSupplierFilter = (value) => {
    setSupplierId(value === "all" ? "" : value);
    setPage(1);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "bill_number",
        header: "Bill No.",
        sortKey: "bill_number",
        sortType: "text",

        cell: (row) => (
          <Link
            to={`/purchases/supplier-bills/${row.id}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.bill_number || "—"}
          </Link>
        ),
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "grn_number",
        header: "GRN Ref",
        sortKey: "grn__grn_number",
        sortType: "text",
      },
      {
        key: "bill_date",
        header: "Bill Date",
        sortKey: "bill_date",
        sortType: "date",

        cell: (row) =>
          row.bill_date ? <DateText value={row.bill_date} /> : "—",
      },
      {
        key: "due_date",
        header: "Due Date",
        sortKey: "due_date",
        sortType: "date",

        cell: (row) => (row.due_date ? <DateText value={row.due_date} /> : "—"),
      },
      {
        key: "total_amount",
        header: "Amount",
        sortKey: "total_amount",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <CurrencyText
            value={row.total_amount}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "balance_due",
        header: "Balance",
        sortKey: "balance_due",
        sortType: "currency",
        align: "right",

        cell: (row) => (
          <CurrencyText
            value={row.balance_due}
            currency={row.currency || "AED"}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",

        cell: (row) => (
          <StatusBadge status={row.display_status || row.status} />
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right",

        cell: (row) => (
          <div className="flex justify-end gap-2">
            <Button asChild type="button" size="sm" variant="outline">
              <Link to={`/purchases/supplier-bills/${row.id}`}>View</Link>
            </Button>

            <Button asChild type="button" size="sm" variant="outline">
              <Link to={`/purchases/supplier-bills/${row.id}/edit`}>Edit</Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="purchase-module-page purchase-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title="Supplier Bills"
        subtitle="Invoices received from suppliers, matched to GRNs"
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link
              to={
                supplierFilter
                  ? `/purchases/supplier-bills/new?supplier=${encodeURIComponent(
                      supplierFilter,
                    )}`
                  : "/purchases/supplier-bills/new"
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Bill
            </Link>
          </Button>
        }
      />

      {supplierFilter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <span>
            Showing bills for{" "}
            <strong>
              {selectedFilterSupplier?.supplier_name ||
                `supplier ID ${supplierFilter}`}
            </strong>
            .
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              clearSupplierFilter();
              setPage(1);
            }}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Clear Supplier Filter
          </Button>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />

        <p>
          Three-way match: PO → GRN → Bill before approval for payment. Tracks
          due date, aging, partial payments and outstanding balance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total Payable"
          value={<CurrencyText value={summary.total_payable} />}
        />

        <MetricCard
          label="Overdue"
          tone="danger"
          value={<CurrencyText value={summary.overdue} />}
        />

        <MetricCard
          label="Bills This Month"
          value={summary.bills_this_month || 0}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search bill number, supplier, PO or GRN"
          />
        </div>

        <div className="w-full md:w-72">
          <Select
            value={supplierFilter || "all"}
            onValueChange={updateSupplierFilter}
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

        {supplierFilter ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearSupplierFilter();
              setPage(1);
            }}
          >
            Clear Filter
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No supplier bills"
        emptyDescription={
          supplierFilter
            ? "No bills were found for this supplier."
            : "Record a supplier invoice against a confirmed GRN."
        }
      />
    </div>
  );
}
