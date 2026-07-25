import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, useListQuery } from "@/hooks/useListQuery";
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
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

function SummaryCard({ label, children, accent = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-xs text-slate-500">{label}</p>
      <div
        className={`mt-1 text-xl font-semibold ${
          accent
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-950 dark:text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function POListPage() {
  const { branchParams } = useActiveBranchFilter();

  const { query, page, setPage, getFilter, setFilter } = useListQuery(
    "purchase-orders",
    "/purchases/orders/",
    branchParams,
  );

  const status = getFilter("status");
  const supplier = getFilter("supplier");

  const { data: supplierResponse } = useQuery({
    queryKey: ["supplier-options", "purchase-orders"],
    queryFn: async () =>
      unwrap(
        await api.get("/suppliers/", {
          params: {
            page_size: 500,
            is_active: true,
            ordering: "supplier_name",
          },
        }),
      ),
  });

  const suppliers = React.useMemo(
    () => normalizeList(supplierResponse),
    [supplierResponse],
  );

  const summaryParams = React.useMemo(
    () => ({
      ...branchParams,
      supplier: supplier || undefined,
      status: status || undefined,
    }),
    [branchParams, supplier, status],
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["purchase-orders-summary", summaryParams],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/orders/summary/", {
          params: summaryParams,
        }),
      ),
  });

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const summary = summaryResponse || {
    open_po_count: 0,
    open_po_value: 0,
    completed_this_month: 0,
  };

  const columns = React.useMemo(
    () => [
      {
        key: "po_number",
        header: "PO No.",
        sortKey: "po_number",
        sortType: "text",
        cell: (row) => (
          <span className="font-numeric font-semibold text-slate-950 dark:text-white">
            {row.po_number || "—"}
          </span>
        ),
      },
      {
        key: "supplier_name",
        header: "Supplier",
        sortKey: "supplier__supplier_name",
        sortType: "text",
        cell: (row) => row.supplier_name || "—",
      },
      {
        key: "order_date",
        header: "Order Date",
        sortKey: "order_date",
        sortType: "date",
        cell: (row) =>
          row.order_date ? <DateText value={row.order_date} /> : "—",
      },
      {
        key: "expected_delivery_date",
        header: "Expected",
        sortKey: "expected_delivery_date",
        sortType: "date",
        cell: (row) =>
          row.expected_delivery_date ? (
            <DateText value={row.expected_delivery_date} />
          ) : (
            "—"
          ),
      },
      {
        key: "item_count",
        header: "Items",
        sortType: "quantity",
        align: "right",
        cell: (row) => row.item_count ?? row.items?.length ?? 0,
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
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        statusOrder: [
          "DRAFT",
          "PENDING_APPROVAL",
          "APPROVED",
          "PARTIALLY_RECEIVED",
          "RECEIVED",
          "CANCELLED",
        ],
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right",
        cell: (row) => (
          <Button asChild size="sm" variant="outline" className="min-w-20">
            <Link to={`/purchases/orders/${row.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Purchase Orders"
        subtitle="Orders raised against suppliers, tracked to delivery"
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/purchases/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Link>
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Each PO tracks line items with quantity and unit cost, expected
          delivery date, approval workflow, linked shipments, and receipt
          status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Open POs">{summary.open_po_count || 0}</SummaryCard>

        <SummaryCard label="Value in Open POs" accent>
          <CurrencyText value={summary.open_po_value || 0} />
        </SummaryCard>

        <SummaryCard label="Completed This Month">
          <span className="text-emerald-600 dark:text-emerald-400">
            {summary.completed_this_month || 0}
          </span>
        </SummaryCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status || "all"}
          onValueChange={(value) =>
            setFilter("status", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-44 bg-white dark:bg-slate-950">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_RECEIVED">
              Partially received
            </SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={supplier || "all"}
          onValueChange={(value) =>
            setFilter("supplier", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-64 bg-white dark:bg-slate-950">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.supplier_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No purchase orders"
        emptyDescription="Create the first purchase order or change the filters."
      />
    </div>
  );
}
