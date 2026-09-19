import React from "react";
import {
  CheckSquare2,
  Download,
  History,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { SalesHeroHeader } from "@/components/sales/SalesHeroHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

const escapeCsv = (value) => {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const formatPrintDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
};

const DIRHAM_PRINT_SVG = `<svg class="dirham-svg" viewBox="0 0 108 94" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 13.00 4.00 L 17.00 13.00 L 17.00 33.00 L 6.00 34.00 L 4.00 32.00 L 4.00 36.00 L 9.00 42.00 L 17.00 43.00 L 16.00 51.00 L 4.00 50.00 L 7.00 58.00 L 17.00 60.00 L 17.00 81.00 L 13.00 89.00 L 55.00 89.00 L 71.00 84.00 L 81.00 76.00 L 90.00 59.00 L 100.00 59.00 L 103.00 61.00 L 102.00 55.00 L 99.00 52.00 L 90.00 50.00 L 90.00 43.00 L 100.00 42.00 L 103.00 44.00 L 102.00 38.00 L 96.00 34.00 L 89.00 34.00 L 82.00 19.00 L 73.00 11.00 L 65.00 7.00 L 52.00 4.00 Z M 29.00 85.00 L 29.00 60.00 L 30.00 59.00 L 73.00 59.00 L 74.00 60.00 L 74.00 64.00 L 73.00 65.00 L 73.00 67.00 L 71.00 70.00 L 71.00 72.00 L 68.00 75.00 L 68.00 76.00 L 64.00 80.00 L 63.00 80.00 L 61.00 82.00 L 60.00 82.00 L 57.00 84.00 L 55.00 84.00 L 54.00 85.00 L 49.00 85.00 L 48.00 86.00 L 30.00 86.00 Z M 29.00 43.00 L 30.00 42.00 L 75.00 42.00 L 76.00 43.00 L 76.00 50.00 L 75.00 51.00 L 30.00 51.00 L 29.00 50.00 Z M 29.00 8.00 L 30.00 7.00 L 46.00 7.00 L 47.00 8.00 L 53.00 8.00 L 54.00 9.00 L 56.00 9.00 L 57.00 10.00 L 59.00 10.00 L 60.00 11.00 L 61.00 11.00 L 64.00 14.00 L 65.00 14.00 L 70.00 20.00 L 70.00 21.00 L 73.00 26.00 L 73.00 28.00 L 74.00 29.00 L 74.00 32.00 L 75.00 33.00 L 74.00 34.00 L 30.00 34.00 L 29.00 33.00 Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`;

const formatAmount = (value, currency = "AED") => {
  const amount = Number(value || 0);
  const code = String(currency || "AED").toUpperCase();

  if (code === "AED") {
    return `<span class="currency-inline">${DIRHAM_PRINT_SVG}<span>${amount.toLocaleString(
      "en-AE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}</span></span>`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
};

export default function InvoiceListPage() {
  const { branchParams } = useActiveBranchFilter();
  const [selectedInvoices, setSelectedInvoices] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-invoices",
    "/sales/invoices/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-invoices-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/invoices/summary/", {
          params: branchParams,
        }),
      ),
  });

  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const selectedRows = React.useMemo(
    () => Object.values(selectedInvoices),
    [selectedInvoices],
  );

  const selectedCount = selectedRows.length;

  const currentPageIds = React.useMemo(
    () => rows.map((row) => String(row.id)),
    [rows],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => Boolean(selectedInvoices[id]));

  const someCurrentPageSelected =
    !allCurrentPageSelected &&
    currentPageIds.some((id) => Boolean(selectedInvoices[id]));

  const toggleInvoice = React.useCallback((row) => {
    const key = String(row.id);

    setSelectedInvoices((current) => {
      const next = { ...current };

      if (next[key]) {
        delete next[key];
      } else {
        next[key] = row;
      }

      return next;
    });
  }, []);

  const toggleCurrentPage = React.useCallback(() => {
    setSelectedInvoices((current) => {
      const next = { ...current };
      const shouldSelect = !rows.every((row) => next[String(row.id)]);

      rows.forEach((row) => {
        const key = String(row.id);

        if (shouldSelect) {
          next[key] = row;
        } else {
          delete next[key];
        }
      });

      return next;
    });
  }, [rows]);

  const clearSelection = React.useCallback(() => {
    setSelectedInvoices({});
  }, []);

  const exportInvoices = async () => {
    const response = await api.get("/sales/invoices/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sales-invoices.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportSelectedInvoices = () => {
    if (!selectedRows.length) {
      toast.error("Select at least one invoice to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Customer",
      "Issue Date",
      "Due Date",
      "Currency",
      "Total Amount",
      "Payment Status",
      "Historical",
      "Historical Reference",
    ];

    const lines = selectedRows.map((row) =>
      [
        row.invoice_number,
        row.customer_name,
        row.invoice_date,
        row.due_date,
        row.currency || "AED",
        row.total_amount,
        row.payment_status,
        row.is_historical ? "Yes" : "No",
        row.historical_reference || "",
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [headers.map(escapeCsv).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `selected-sales-invoices-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);

    toast.success(`${selectedRows.length} invoice(s) exported.`);
  };

  const printSelectedInvoices = () => {
    if (!selectedRows.length) {
      toast.error("Select at least one invoice to print.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=760");

    if (!printWindow) {
      toast.error("Unable to open the print window. Please allow pop-ups.");
      return;
    }

    const total = selectedRows.reduce(
      (sum, row) => sum + Number(row.total_amount || 0),
      0,
    );

    const tableRows = selectedRows
      .map(
        (row) => `
          <tr>
            <td>${row.invoice_number || "—"}</td>
            <td>${row.customer_name || "—"}</td>
            <td>${formatPrintDate(row.invoice_date)}</td>
            <td>${formatPrintDate(row.due_date)}</td>
            <td class="amount">${formatAmount(
              row.total_amount,
              row.currency || "AED",
            )}</td>
            <td>${row.payment_status || "—"}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Selected Sales Invoices</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              background: #fff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 18px;
              border-bottom: 2px solid #0f172a;
            }
            h1 { margin: 0; font-size: 24px; }
            .muted { margin-top: 6px; color: #64748b; font-size: 12px; }
            .count {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 14px;
              font-size: 12px;
              font-weight: 700;
            }
            table { width: 100%; border-collapse: collapse; }
            th {
              padding: 10px 8px;
              border-bottom: 1px solid #94a3b8;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .04em;
              color: #475569;
            }
            td {
              padding: 11px 8px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .amount { text-align: right; white-space: nowrap; }
            .currency-inline {
              display: inline-flex;
              align-items: center;
              justify-content: flex-end;
              gap: 4px;
              white-space: nowrap;
            }
            .dirham-svg {
              width: 12px;
              height: 12px;
              flex: 0 0 auto;
            }
            .summary {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
              font-size: 13px;
              font-weight: 700;
            }
            @media print {
              body { padding: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>GHAZA COMPUTER — Sales Invoices</h1>
              <div class="muted">Selected invoice printout · ${new Date().toLocaleString()}</div>
            </div>
            <div class="count">${selectedRows.length} invoice(s)</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th style="text-align:right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="summary">Combined value: ${formatAmount(total, "AED")}</div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const columns = React.useMemo(
    () => [
      {
        key: "select",
        header: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label="Select all invoices on this page"
              checked={allCurrentPageSelected}
              ref={(element) => {
                if (element) {
                  element.indeterminate = someCurrentPageSelected;
                }
              }}
              onChange={toggleCurrentPage}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
            />
          </div>
        ),
        sortable: false,
        headerClassName: "w-12 text-center",
        className: "w-12 text-center",
        cell: (row) => (
          <div
            className="flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              aria-label={`Select invoice ${row.invoice_number || row.id}`}
              checked={Boolean(selectedInvoices[String(row.id)])}
              onChange={() => toggleInvoice(row)}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
            />
          </div>
        ),
      },
      {
        key: "invoice_number",
        header: "Invoice #",
        sortKey: "invoice_number",
        sortType: "text",
        cell: (row) => (
          <div>
            <Link
              to={`/sales/invoices/${row.id}`}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {row.invoice_number}
            </Link>

            {row.is_historical ? (
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Previous
                </span>
                {row.historical_reference ? (
                  <p className="mt-1 max-w-[180px] truncate text-[11px] text-muted-foreground">
                    Ref: {row.historical_reference}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "customer_name",
        header: "Customer",
        sortKey: "customer__customer_name",
        sortType: "text",
      },
      {
        key: "invoice_date",
        header: "Issue Date",
        sortKey: "invoice_date",
        sortType: "date",
        cell: (row) =>
          row.invoice_date ? <DateText value={row.invoice_date} /> : "—",
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
        key: "payment_status",
        header: "Status",
        sortKey: "payment_status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.payment_status} />,
      },
    ],
    [
      allCurrentPageSelected,
      selectedInvoices,
      someCurrentPageSelected,
      toggleCurrentPage,
      toggleInvoice,
    ],
  );

  return (
    <div className="sales-module-page sales-workspace w-full space-y-5">
      <SalesHeroHeader
        title="Invoices"
        subtitle="Issued invoices and their payment status"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportInvoices}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              <Link to="/sales/invoices/new?historical=1">
                <History className="mr-2 h-4 w-4" />
                Add Previous Invoice
              </Link>
            </Button>

            <Button
              asChild
              className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <Link to="/sales/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding"
          value={<CurrencyText value={summary.outstanding || 0} />}
          subtitle={`${summary.outstanding_count || 0} invoice(s)`}
        />
        <MetricCard
          label="Overdue"
          tone="danger"
          value={<CurrencyText value={summary.overdue || 0} />}
          subtitle={`${summary.overdue_count || 0} overdue invoice(s)`}
        />
        <MetricCard
          label="Paid (MTD)"
          tone="success"
          value={<CurrencyText value={summary.paid_this_month || 0} />}
          subtitle={
            summary.paid_change
              ? `+${summary.paid_change}%`
              : "Month-to-date collections"
          }
        />
        <MetricCard
          label="Avg. Days to Pay"
          value={`${summary.avg_days_to_pay || 0} days`}
          subtitle="Average invoice settlement time"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Invoices</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Current and previous invoices with their payment status
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search invoice, customer, order, or status"
            />
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="flex flex-col gap-3 border-b border-blue-200 bg-blue-50/80 px-5 py-3 dark:border-blue-500/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <CheckSquare2 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                  {selectedCount} invoice{selectedCount === 1 ? "" : "s"}{" "}
                  selected
                </p>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                  Selection is kept while you move between invoice pages.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportSelectedInvoices}
                className="bg-background"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={printSelectedInvoices}
                className="bg-background"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Selected
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearSelection}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
          emptyTitle="No invoices"
          emptyDescription="Create a new invoice or add a previous invoice for accounting history."
        />
      </section>
    </div>
  );
}
