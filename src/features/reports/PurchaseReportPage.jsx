import React from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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
import { DataTable } from "@/components/common/DataTable";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MetricCard } from "@/components/sales/MetricCard";
import { LoadingState } from "@/components/common/States";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const downloadCsv = (rows) => {
  const content = [
    [
      "PO Number",
      "Date",
      "Supplier",
      "Branch",
      "Subtotal",
      "VAT",
      "Total",
      "Status",
      "Payment Status",
    ],
    ...rows.map((row) => [
      row.po_number,
      row.date,
      row.supplier,
      row.branch,
      row.subtotal,
      row.vat_amount,
      row.total,
      row.status,
      row.payment_status,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "purchase-report.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function PurchaseReportPage() {
  const { branchParams } = useActiveBranchFilter();
  const [filters, setFilters] = React.useState({
    date_from: "",
    date_to: "",
    status: "ALL",
  });

  const requestParams = React.useMemo(
    () => ({
      ...branchParams,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      status: filters.status === "ALL" ? undefined : filters.status,
    }),
    [branchParams, filters],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchase-report", requestParams],
    queryFn: async () =>
      unwrap(
        await api.get("/reports/purchases/", {
          params: requestParams,
        }),
      ),
  });

  if (isLoading) return <LoadingState />;

  const summary = data?.summary || {};
  const rows = data?.rows || [];

  return (
    <div className="reports-module-page reports-workspace space-y-5">
      <PageHeader
        title="Purchase Reports"
        subtitle="Purchase order value, supplier activity, and outstanding payables"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadCsv(rows)}
            disabled={!rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Purchase Orders" value={summary.orders || 0} />
        <MetricCard
          label="Purchase Value"
          value={<CurrencyText value={summary.purchase_value || 0} />}
        />
        <MetricCard
          label="Approved / Received"
          value={summary.approved_orders || 0}
        />
        <MetricCard
          label="Outstanding Payables"
          value={<CurrencyText value={summary.outstanding_payables || 0} />}
        />
      </div>

      <section className="card-surface grid gap-3 p-4 md:grid-cols-3">
        <Input
          type="date"
          value={filters.date_from}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              date_from: event.target.value,
            }))
          }
        />

        <Input
          type="date"
          value={filters.date_to}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              date_to: event.target.value,
            }))
          }
        />

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_RECEIVED">
              Partially Received
            </SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {isError ? (
        <section className="card-surface p-6">
          <p className="text-sm text-muted-foreground">
            Unable to load the purchase report.
          </p>
          <Button className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </section>
      ) : (
        <DataTable
          columns={[
            {
              key: "po_number",
              header: "PO #",
              cell: (row) => (
                <span className="font-medium">{row.po_number}</span>
              ),
            },
            {
              key: "date",
              header: "Date",
              cell: (row) => (row.date ? <DateText value={row.date} /> : "—"),
            },
            {
              key: "supplier",
              header: "Supplier",
            },
            {
              key: "branch",
              header: "Branch",
            },
            {
              key: "total",
              header: "Amount",
              align: "right",
              cell: (row) => <CurrencyText value={row.total} />,
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "payment_status",
              header: "Payment",
              cell: (row) => <StatusBadge status={row.payment_status} />,
            },
          ]}
          data={rows}
          total={rows.length}
          page={1}
        />
      )}
    </div>
  );
}
