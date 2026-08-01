import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { ListingRowActions } from "@/components/common/ListingRowActions";
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

const DEFAULT_EXPENSE_CATEGORIES = [
  { value: "RENT_UTILITIES", label: "Rent & Utilities" },
  { value: "OFFICE", label: "Office" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PROFESSIONAL_FEES", label: "Professional Fees" },
  { value: "TRAVEL", label: "Travel" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
];

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const normalizeCategories = (value) =>
  toList(value)
    .map((item) => ({
      id: item.id,
      value: String(item.value ?? item.code ?? ""),
      label: item.label ?? item.name ?? item.value ?? item.code ?? "",
    }))
    .filter((item) => item.value && item.label);

function Metric({ label, value, subtitle }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function PurchaseExpensesPage() {
  const navigate = useNavigate();
  const { branchParams } = useActiveBranchFilter();
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  const { query, q, setQ, page, setPage } = useListQuery(
    "purchase-expenses",
    "/purchases/expenses/",
    {
      ...branchParams,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
    },
  );

  const { data: summary = {} } = useQuery({
    queryKey: ["purchase-expense-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/expenses/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: categoryResponse } = useQuery({
    queryKey: ["purchase-expense-categories"],
    queryFn: async () =>
      unwrap(await api.get("/purchases/expenses/categories/")),
    staleTime: 5 * 60 * 1000,
  });

  const categories = React.useMemo(() => {
    const merged = [
      ...normalizeCategories(categoryResponse),
      ...DEFAULT_EXPENSE_CATEGORIES,
    ];
    const seen = new Set();

    return merged.filter((category) => {
      if (seen.has(category.value)) return false;
      seen.add(category.value);
      return true;
    });
  }, [categoryResponse]);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, setPage]);

  const columns = React.useMemo(
    () => [
      {
        key: "expense_number",
        header: "Expense",
        sortKey: "expense_number",
        sortType: "text",
        cell: (row) => (
          <Link
            to={`/purchases/purchase-expenses/${row.id}`}
            className="block text-left"
          >
            <div className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              {row.expense_number || `Expense ${row.id}`}
            </div>
            <div className="max-w-[260px] truncate text-xs text-muted-foreground">
              {row.description || "No description"}
            </div>
          </Link>
        ),
      },
      {
        key: "category_display",
        header: "Category",
        sortKey: "category",
        sortType: "text",
        cell: (row) => row.category_display || row.category || "—",
      },
      {
        key: "branch_name",
        header: "Branch",
        sortKey: "branch__branch_name",
        sortType: "text",
        cell: (row) =>
          row.branch_name || row.branch?.branch_name || row.branch?.name || "—",
      },
      {
        key: "expense_date",
        header: "Date",
        sortKey: "expense_date",
        sortType: "date",
        cell: (row) =>
          row.expense_date ? <DateText value={row.expense_date} /> : "—",
      },
      {
        key: "vendor_name",
        header: "Vendor / Paid To",
        sortKey: "vendor_name",
        sortType: "text",
        cell: (row) => row.vendor_name || row.supplier_name || "—",
      },
      {
        key: "payment_method_display",
        header: "Payment Method",
        sortKey: "payment_method",
        sortType: "text",
        cell: (row) => row.payment_method_display || row.payment_method || "—",
      },
      {
        key: "amount",
        header: "Amount",
        sortKey: "amount",
        sortType: "currency",
        align: "right",
        cell: (row) => (
          <CurrencyText value={row.amount || row.total_amount || 0} />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.status || "PENDING"} />,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (row) => (
          <ListingRowActions
            viewTo={`/purchases/purchase-expenses/${row.id}`}
            editTo={`/purchases/purchase-expenses/${row.id}/edit`}
            deleteUrl={`/purchases/expenses/${row.id}/`}
            queryKey="purchase-expenses"
            itemLabel={row.expense_number || "purchase expense"}
          />
        ),
      },
    ],
    [],
  );

  const payload = query.data || { results: [], count: 0 };
  const rows = Array.isArray(payload)
    ? payload
    : payload.results || payload.data?.results || payload.data || [];
  const total = Number(payload.count ?? payload.data?.count ?? rows.length);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Expenses"
        subtitle="Non-stock operating costs across branches"
        actions={
          <Button
            onClick={() => navigate("/purchases/purchase-expenses/new")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Expense
          </Button>
        }
      />

      <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Track rent, utilities, transport, maintenance, office, and
          miscellaneous expenses.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="This Month"
          value={<CurrencyText value={summary.this_month_total || 0} />}
          subtitle={`${summary.this_month_count || 0} expense(s)`}
        />
        <Metric
          label="Pending Approval"
          value={<CurrencyText value={summary.pending_total || 0} />}
          subtitle={`${summary.pending_count || 0} awaiting review`}
        />
        <Metric
          label="Paid This Month"
          value={<CurrencyText value={summary.paid_this_month || 0} />}
          subtitle={`${summary.paid_count || 0} settled`}
        />
        <Metric
          label="Top Category"
          value={summary.top_category || "—"}
          subtitle={
            summary.top_category ? (
              <CurrencyText value={summary.top_category_total || 0} />
            ) : (
              "No data"
            )
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"].map(
          (status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {status.replaceAll("_", " ")}
            </Button>
          ),
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_240px]">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search description, vendor, expense number"
        />

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
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
        total={total}
        onPageChange={setPage}
        emptyTitle="No purchase expenses"
        emptyDescription="Log the first operating expense."
      />
    </div>
  );
}
