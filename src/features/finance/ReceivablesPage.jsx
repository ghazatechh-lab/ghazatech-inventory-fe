import React from "react";
import { Download, Eye, Printer, RefreshCcw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";

const n = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractRows = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const agingBucket = (invoice) => {
  if (n(invoice.balance_due) <= 0) return "PAID";

  if (!invoice.due_date) return "CURRENT";

  const due = new Date(`${invoice.due_date}T00:00:00`);
  const current = new Date(`${today()}T00:00:00`);
  const days = Math.floor((current - due) / 86400000);

  if (days <= 0) return "CURRENT";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_PLUS";
};

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const downloadCsv = (rows) => {
  const content = [
    [
      "Invoice No.",
      "Customer",
      "Invoice Date",
      "Due Date",
      "Invoice Total",
      "Paid",
      "Balance",
      "Payment Status",
    ],
    ...rows.map((invoice) => [
      invoice.invoice_number,
      invoice.customer_name,
      invoice.invoice_date,
      invoice.due_date,
      invoice.total_amount,
      invoice.paid_amount,
      invoice.balance_due,
      invoice.payment_status || invoice.status,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "accounts-receivable.csv";
  anchor.click();

  URL.revokeObjectURL(url);
};

export default function ReceivablesPage() {
  const { branchParams } = useActiveBranchFilter();

  const [tab, setTab] = React.useState("invoices");
  const [filters, setFilters] = React.useState({
    search: "",
    status: "ALL",
    date_from: "",
    date_to: "",
  });

  const {
    data: invoiceResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["accounting-receivables-sales-invoices", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/invoices/", {
          params: {
            ...branchParams,
            page_size: 1000,
            ordering: "-invoice_date,-id",
          },
        }),
      ),
    staleTime: 0,
  });

  const invoices = extractRows(invoiceResponse);

  const filteredInvoices = React.useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const status = String(
        invoice.payment_status || invoice.status || "",
      ).toUpperCase();

      if (filters.status !== "ALL" && status !== filters.status) {
        return false;
      }

      if (
        filters.date_from &&
        invoice.invoice_date &&
        invoice.invoice_date < filters.date_from
      ) {
        return false;
      }

      if (
        filters.date_to &&
        invoice.invoice_date &&
        invoice.invoice_date > filters.date_to
      ) {
        return false;
      }

      if (!search) return true;

      return [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_po_number,
        invoice.sales_order_number,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    });
  }, [invoices, filters]);

  const summary = React.useMemo(
    () =>
      invoices.reduce(
        (result, invoice) => {
          const total = n(invoice.total_amount);
          const paid = n(invoice.paid_amount);
          const balance = n(invoice.balance_due);

          result.invoiced += total;
          result.received += paid;
          result.outstanding += balance;

          if (balance > 0 && invoice.due_date && invoice.due_date < today()) {
            result.overdue += balance;
          }

          return result;
        },
        {
          invoiced: 0,
          received: 0,
          outstanding: 0,
          overdue: 0,
        },
      ),
    [invoices],
  );

  const aging = React.useMemo(() => {
    const result = {
      CURRENT: 0,
      "1_30": 0,
      "31_60": 0,
      "61_90": 0,
      "90_PLUS": 0,
    };

    invoices.forEach((invoice) => {
      const balance = n(invoice.balance_due);

      if (balance <= 0) return;

      const bucket = agingBucket(invoice);

      if (result[bucket] !== undefined) {
        result[bucket] += balance;
      }
    });

    return result;
  }, [invoices]);

  const agingByCustomer = React.useMemo(() => {
    const customers = new Map();

    invoices.forEach((invoice) => {
      const balance = n(invoice.balance_due);

      if (balance <= 0) return;

      const customerKey =
        invoice.customer_id ||
        (typeof invoice.customer === "object"
          ? invoice.customer?.id
          : invoice.customer) ||
        invoice.customer_name ||
        "unknown";

      if (!customers.has(customerKey)) {
        customers.set(customerKey, {
          customer_id: customerKey,
          customer_name: invoice.customer_name || "Customer",
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
          total: 0,
        });
      }

      const row = customers.get(customerKey);
      const bucket = agingBucket(invoice);

      if (bucket === "CURRENT") row.current += balance;
      if (bucket === "1_30") row.days_1_30 += balance;
      if (bucket === "31_60") row.days_31_60 += balance;
      if (bucket === "61_90") row.days_61_90 += balance;
      if (bucket === "90_PLUS") row.days_90_plus += balance;

      row.total += balance;
    });

    return Array.from(customers.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Customer receivables generated automatically from Sales Invoices."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={() => downloadCsv(filteredInvoices)}
              disabled={!filteredInvoices.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5 shadow-sm">
        {[
          ["invoices", "Customer Invoices"],
          ["aging", "Aging Report"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${
              tab === value
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <InvoicesTab
          summary={summary}
          filters={filters}
          setFilters={setFilters}
          invoices={filteredInvoices}
          isLoading={isLoading}
        />
      )}

      {tab === "aging" && <AgingTab aging={aging} rows={agingByCustomer} />}

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        Accounts Receivable is generated from <strong>Sales → Invoices</strong>.
        Create invoices and record customer payments from the Sales module. This
        Accounting page is for receivable monitoring and aging only.
      </div>
    </div>
  );
}

function InvoicesTab({ summary, filters, setFilters, invoices, isLoading }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total Invoiced"
          value={<CurrencyText value={summary.invoiced} />}
          meta="Sales invoice value"
        />

        <Kpi
          label="Outstanding"
          value={<CurrencyText value={summary.outstanding} />}
          meta="Amount customers still owe"
          tone="amber"
        />

        <Kpi
          label="Received"
          value={<CurrencyText value={summary.received} />}
          meta="Payments already received"
          tone="green"
        />

        <Kpi
          label="Overdue"
          value={<CurrencyText value={summary.overdue} />}
          meta="Past-due receivables"
          tone="red"
        />
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.5fr_.9fr_.9fr_.9fr_auto]">
        <Field label="Search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Customer, invoice no., PO reference"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="From Date">
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
        </Field>

        <Field label="To Date">
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
        </Field>

        <Field label="Payment Status">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
          >
            <option value="ALL">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
        </Field>

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                search: "",
                status: "ALL",
                date_from: "",
                date_to: "",
              })
            }
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold">Customer Invoices</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sales invoices, payment progress, due dates, and customer balances.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Invoice No.",
                  "Customer",
                  "Invoice Date",
                  "Due Date",
                  "Invoice Amount",
                  "Paid",
                  "Balance",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    Loading Accounts Receivable...
                  </td>
                </tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-bold text-blue-600">
                      {invoice.invoice_number}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {invoice.customer_name || "Walk-in Customer"}
                    </td>

                    <td className="px-4 py-3">
                      {invoice.invoice_date ? (
                        <DateText value={invoice.invoice_date} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {invoice.due_date ? (
                        <DateText value={invoice.due_date} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <CurrencyText
                        value={invoice.total_amount}
                        currency={invoice.currency || "AED"}
                      />
                    </td>

                    <td className="px-4 py-3 text-right text-emerald-600">
                      <CurrencyText
                        value={invoice.paid_amount}
                        currency={invoice.currency || "AED"}
                      />
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      <CurrencyText
                        value={invoice.balance_due}
                        currency={invoice.currency || "AED"}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          invoice.payment_status || invoice.status || "UNPAID"
                        }
                      />
                    </td>

                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/sales/invoices/${invoice.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No customer invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        Customer invoices are created only from the Sales module. This prevents
        duplicate invoice records between Sales and Accounting.
      </div>
    </section>
  );
}

function AgingTab({ aging, rows }) {
  const cards = [
    ["Current", aging.CURRENT],
    ["1–30 Days", aging["1_30"]],
    ["31–60 Days", aging["31_60"]],
    ["61–90 Days", aging["61_90"]],
    ["90+ Days", aging["90_PLUS"]],
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, amount]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="mt-2 text-2xl font-black">
              <CurrencyText value={amount || 0} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold">Receivables Aging by Customer</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Customer",
                  "Current",
                  "1–30",
                  "31–60",
                  "61–90",
                  "90+",
                  "Total",
                  "Collection Status",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((row) => {
                  const needsFollowUp =
                    n(row.days_31_60) +
                      n(row.days_61_90) +
                      n(row.days_90_plus) >
                    0;

                  return (
                    <tr key={row.customer_id} className="border-b">
                      <td className="px-4 py-3 font-semibold">
                        {row.customer_name}
                      </td>

                      {[
                        "current",
                        "days_1_30",
                        "days_31_60",
                        "days_61_90",
                        "days_90_plus",
                        "total",
                      ].map((key) => (
                        <td key={key} className="px-4 py-3 text-right">
                          <CurrencyText value={row[key]} />
                        </td>
                      ))}

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            needsFollowUp
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {needsFollowUp ? "Follow-up Required" : "Normal"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No outstanding receivables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, meta, tone }) {
  const className =
    {
      red: "text-red-600",
      green: "text-emerald-600",
      amber: "text-amber-600",
    }[tone] || "";

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <div className={`mt-2 text-2xl font-black ${className}`}>{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
