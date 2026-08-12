import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  Contact,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/common/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const displayValue = (...values) =>
  values.find((item) => item !== null && item !== undefined && item !== "") ??
  "—";

function MetricCard({ label, children, tone = "default" }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>

      <div
        className={`mt-2 text-2xl font-semibold ${
          tone === "danger" ? "text-red-500" : "text-slate-950 dark:text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function DetailCard({ title, icon: Icon, children }) {
  return (
    <section className="card-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-4 w-4" />
        </div>

        <h2 className="font-semibold">{title}</h2>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/5">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="max-w-[65%] text-right text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { branchId, branchParams } = useActiveBranchFilter();

  const customerQuery = useQuery({
    queryKey: ["customer", id, branchId],
    queryFn: async () =>
      unwrap(await api.get(`/customers/${id}/`, { params: branchParams })),
    enabled: Boolean(id),
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["cust-sales", id, branchId],
    queryFn: async () =>
      unwrap(
        await api.get(`/customers/${id}/sales-history/`, {
          params: branchParams,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  const ledgerQuery = useQuery({
    queryKey: ["cust-ledger", id, branchId],
    queryFn: async () =>
      unwrap(
        await api.get(`/customers/${id}/ledger/`, { params: branchParams }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  const outstandingQuery = useQuery({
    queryKey: ["cust-out", id, branchId],
    queryFn: async () =>
      unwrap(
        await api.get(`/customers/${id}/outstanding/`, {
          params: branchParams,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  if (customerQuery.isLoading) {
    return <LoadingState />;
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <EmptyState
        title="Customer not found"
        description="The requested customer could not be loaded."
      />
    );
  }

  const c = customerQuery.data || {};
  const history = normalizeList(historyQuery.data);
  const ledger = normalizeList(ledgerQuery.data);
  const outstandingInvoices = normalizeList(outstandingQuery.data?.invoices);
  const outstandingTotal = outstandingQuery.data?.total ?? c.balance_due ?? 0;

  return (
    <div className="customer-module-page customer-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={c.customer_name || "Customer"}
        subtitle={`${displayValue(
          c.customer_code,
          `Customer #${id}`,
        )} · ${displayValue(c.customer_type, c.category)}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>

            <Button asChild>
              <Link to={`/customers/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Customer
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Outstanding" tone="danger">
          <CurrencyText
            value={outstandingTotal}
            currency={c.currency || "AED"}
          />
        </MetricCard>

        <MetricCard label="Credit Limit">
          <CurrencyText
            value={c.credit_limit || 0}
            currency={c.currency || "AED"}
          />
        </MetricCard>

        <MetricCard label="Payment Terms">
          {Number(c.payment_terms_days || 0)}d
        </MetricCard>

        <MetricCard label="Status">
          <StatusBadge
            status={c.status || (c.is_active ? "ACTIVE" : "INACTIVE")}
          />
        </MetricCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <DetailCard title="Customer identity" icon={Building2}>
          <DetailRow label="Customer code">
            {displayValue(c.customer_code)}
          </DetailRow>
          <DetailRow label="Customer type">
            {displayValue(c.customer_type)}
          </DetailRow>
          <DetailRow label="Category">{displayValue(c.category)}</DetailRow>
          <DetailRow label="Contact person">
            {displayValue(c.contact_person)}
          </DetailRow>
          <DetailRow label="TRN / Tax ID">
            {displayValue(c.trn_number, c.trn)}
          </DetailRow>
          <DetailRow label="Trade licence">
            {displayValue(c.trade_license)}
          </DetailRow>
        </DetailCard>

        <DetailCard title="Contact information" icon={Contact}>
          <DetailRow label="Phone">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {displayValue(c.phone)}
            </span>
          </DetailRow>
          <DetailRow label="WhatsApp">
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              {displayValue(c.whatsapp_number)}
            </span>
          </DetailRow>
          <DetailRow label="Email">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {displayValue(c.email)}
            </span>
          </DetailRow>
          <DetailRow label="Country">{displayValue(c.country)}</DetailRow>
          <DetailRow label="City">{displayValue(c.city)}</DetailRow>
          <DetailRow label="Emirate">{displayValue(c.emirate)}</DetailRow>
        </DetailCard>

        <DetailCard title="Commercial settings" icon={BadgeDollarSign}>
          <DetailRow label="Credit limit">
            <CurrencyText
              value={c.credit_limit || 0}
              currency={c.currency || "AED"}
            />
          </DetailRow>
          <DetailRow label="Outstanding">
            <CurrencyText
              value={outstandingTotal}
              currency={c.currency || "AED"}
            />
          </DetailRow>
          <DetailRow label="Payment terms">
            {Number(c.payment_terms_days || 0)} days
          </DetailRow>
          <DetailRow label="Currency">
            {displayValue(c.currency, "AED")}
          </DetailRow>
          <DetailRow label="Active">
            <StatusBadge status={c.is_active ? "ACTIVE" : "INACTIVE"} />
          </DetailRow>
          <DetailRow label="Created">
            {c.created_at ? <DateText value={c.created_at} /> : "—"}
          </DetailRow>
        </DetailCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailCard title="Address information" icon={MapPin}>
          <DetailRow label="Address">{displayValue(c.address)}</DetailRow>
          <DetailRow label="Billing address">
            {displayValue(c.billing_address)}
          </DetailRow>
          <DetailRow label="Location">
            {[c.city, c.emirate, c.country].filter(Boolean).join(", ") || "—"}
          </DetailRow>
        </DetailCard>

        <DetailCard title="Internal notes" icon={FileText}>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
            {displayValue(c.notes)}
          </p>
        </DetailCard>
      </div>

      <section className="card-surface overflow-hidden">
        <Tabs defaultValue="sales">
          <div className="border-b px-5 pt-4">
            <TabsList>
              <TabsTrigger value="sales">Sales History</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sales" className="mt-0">
            <DataTable
              columns={[
                {
                  key: "invoice_number",
                  header: "Invoice",
                  cell: (row) => (
                    <Link
                      to={`/sales/invoices/${row.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.invoice_number}
                    </Link>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  cell: (row) =>
                    row.date ? <DateText value={row.date} /> : "—",
                },
                {
                  key: "total",
                  header: "Total",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.total} />,
                },
                {
                  key: "paid",
                  header: "Paid",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.paid} />,
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.balance} />,
                },
                {
                  key: "payment_status",
                  header: "Status",
                  cell: (row) => <StatusBadge status={row.payment_status} />,
                },
              ]}
              data={history}
              total={history.length}
              page={1}
            />
          </TabsContent>

          <TabsContent value="ledger" className="mt-0">
            <DataTable
              columns={[
                {
                  key: "date",
                  header: "Date",
                  cell: (row) =>
                    row.date ? <DateText value={row.date} /> : "—",
                },
                { key: "reference", header: "Reference" },
                { key: "type", header: "Type" },
                {
                  key: "debit",
                  header: "Debit",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.debit || 0} />,
                },
                {
                  key: "credit",
                  header: "Credit",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.credit || 0} />,
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.balance || 0} />,
                },
              ]}
              data={ledger}
              total={ledger.length}
              page={1}
            />
          </TabsContent>

          <TabsContent value="outstanding" className="mt-0">
            <DataTable
              columns={[
                {
                  key: "invoice_number",
                  header: "Invoice",
                  cell: (row) => (
                    <Link
                      to={`/sales/invoices/${row.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.invoice_number}
                    </Link>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  cell: (row) =>
                    row.date ? <DateText value={row.date} /> : "—",
                },
                {
                  key: "due_date",
                  header: "Due Date",
                  cell: (row) =>
                    row.due_date ? <DateText value={row.due_date} /> : "—",
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  cell: (row) => <CurrencyText value={row.balance || 0} />,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => (
                    <StatusBadge status={row.payment_status || row.status} />
                  ),
                },
              ]}
              data={outstandingInvoices}
              total={outstandingInvoices.length}
              page={1}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
