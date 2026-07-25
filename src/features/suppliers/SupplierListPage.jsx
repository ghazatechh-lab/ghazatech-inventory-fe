import React from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput, useListQuery } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";

const PAGE_SIZE = 12;

const numberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const textValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return "";
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const getOutstanding = (supplier) =>
  numberValue(
    supplier.outstanding_balance,
    supplier.outstanding,
    supplier.balance,
    supplier.total_outstanding,
  );

const getPayable = (supplier) =>
  numberValue(
    supplier.payable_balance,
    supplier.total_payable,
    supplier.payable,
    supplier.outstanding_balance,
    supplier.outstanding,
  );

const getCreditLimit = (supplier) =>
  numberValue(supplier.credit_limit, supplier.credit_limit_amount);

const getCreditUsed = (supplier) =>
  numberValue(
    supplier.credit_used,
    supplier.used_credit,
    supplier.total_credit_used,
    supplier.outstanding_balance,
    supplier.outstanding,
  );

const getStatus = (supplier) => {
  const rawStatus = textValue(
    supplier.status,
    supplier.supplier_status,
  ).toUpperCase();

  if (
    supplier.is_blocked === true ||
    rawStatus === "BLOCKED" ||
    rawStatus === "INACTIVE" ||
    supplier.is_active === false
  ) {
    return "Blocked";
  }

  return "Active";
};

function MetricCard({ label, value, tone = "text-slate-900 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className={`mt-2 text-xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-red-500",
        ].join(" ")}
      />
      {status}
    </span>
  );
}

function CreditUsage({ used, limit }) {
  const safeUsed = Math.max(0, numberValue(used));
  const safeLimit = Math.max(0, numberValue(limit));
  const percentage =
    safeLimit > 0
      ? Math.min(100, Math.round((safeUsed / safeLimit) * 100))
      : safeUsed > 0
        ? 100
        : 0;

  const barClass =
    percentage >= 75
      ? "bg-red-500"
      : percentage >= 40
        ? "bg-amber-600"
        : "bg-indigo-600";

  return (
    <div className="min-w-[120px]">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {safeUsed.toLocaleString("en-US")} / {safeLimit.toLocaleString("en-US")}
      </p>
    </div>
  );
}

export default function SupplierListPage() {
  const { query, q, setQ, page, setPage } = useListQuery(
    "suppliers",
    "/suppliers/",
  );

  const payload = React.useMemo(
    () =>
      query.data || {
        results: [],
        count: 0,
      },
    [query.data],
  );

  const rows = React.useMemo(() => normalizeRows(payload), [payload]);

  const summary = React.useMemo(() => {
    const fallback = rows.reduce(
      (totals, supplier) => {
        totals.active += getStatus(supplier) === "Active" ? 1 : 0;
        totals.outstanding += getOutstanding(supplier);
        totals.payable += getPayable(supplier);
        totals.creditUsed += getCreditUsed(supplier);
        return totals;
      },
      { active: 0, outstanding: 0, payable: 0, creditUsed: 0 },
    );

    return {
      totalSuppliers: numberValue(
        payload.count,
        payload.total_suppliers,
        rows.length,
      ),
      active: numberValue(
        payload.active_suppliers,
        payload.summary?.active,
        fallback.active,
      ),
      outstanding: numberValue(
        payload.total_outstanding,
        payload.summary?.total_outstanding,
        fallback.outstanding,
      ),
      payable: numberValue(
        payload.total_payable,
        payload.summary?.total_payable,
        fallback.payable,
      ),
      creditUsed: numberValue(
        payload.total_credit_used,
        payload.summary?.credit_used,
        fallback.creditUsed,
      ),
    };
  }, [payload, rows]);

  const totalPages = Math.max(1, Math.ceil(summary.totalSuppliers / PAGE_SIZE));

  return (
    <div className="min-h-full bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Purchases /{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              Suppliers
            </span>
          </p>

          <div className="w-full sm:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search anything..."
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vendor master records, terms, and outstanding balances
            </p>
          </div>

          <Button
            asChild
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Link to="/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Link>
          </Button>
        </section>

        <section className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <p>
            Fields captured per supplier: legal name, TRN/tax ID, contact
            person, phone/email, address, payment terms, bank details, credit
            limit, and linked purchase history.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total Suppliers" value={summary.totalSuppliers} />
          <MetricCard
            label="Active"
            value={summary.active}
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard
            label="Total Outstanding"
            value={formatCurrency(summary.outstanding)}
            tone="text-amber-700 dark:text-amber-400"
          />
          <MetricCard
            label="Total Payable"
            value={formatCurrency(summary.payable)}
            tone="text-red-600 dark:text-red-400"
          />
          <MetricCard
            label="Credit Used"
            value={formatCurrency(summary.creditUsed)}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-400">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Terms</th>
                  <th className="px-4 py-3">TRN</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Payable</th>
                  <th className="px-4 py-3">Credit Used</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {query.isLoading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-14 text-center text-slate-500"
                    >
                      Loading suppliers...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((supplier) => {
                    const outstanding = getOutstanding(supplier);
                    const payable = getPayable(supplier);
                    const creditLimit = getCreditLimit(supplier);
                    const creditUsed = getCreditUsed(supplier);
                    const status = getStatus(supplier);
                    const paymentTerms =
                      textValue(
                        supplier.payment_terms,
                        supplier.payment_terms_display,
                      ) || `Net ${numberValue(supplier.payment_terms_days)}`;

                    return (
                      <tr
                        key={supplier.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.025]"
                      >
                        <td className="px-4 py-4">
                          <Link
                            to={`/suppliers/${supplier.id}`}
                            className="font-semibold text-slate-950 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
                          >
                            {textValue(
                              supplier.supplier_name,
                              supplier.legal_name,
                              supplier.name,
                              "Unnamed supplier",
                            )}
                          </Link>
                          {(supplier.trade_name || supplier.supplier_code) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {textValue(
                                supplier.trade_name,
                                supplier.supplier_code,
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {textValue(
                            supplier.contact_person,
                            supplier.primary_contact_name,
                            "—",
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {supplier.email ? (
                            <a
                              href={`mailto:${supplier.email}`}
                              className="text-indigo-600 hover:underline dark:text-indigo-300"
                            >
                              {supplier.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                          {textValue(supplier.phone, supplier.mobile, "—")}
                        </td>

                        <td className="px-4 py-4">{paymentTerms}</td>

                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                          {textValue(
                            supplier.trn,
                            supplier.tax_registration_number,
                            supplier.tax_id,
                            "—",
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          <CurrencyText value={outstanding} />
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          <CurrencyText value={payable} />
                        </td>

                        <td className="px-4 py-4">
                          <CreditUsage used={creditUsed} limit={creditLimit} />
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 px-4"
                          >
                            <Link to={`/suppliers/${supplier.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <AlertCircle className="mx-auto h-7 w-7 text-slate-400" />
                      <p className="mt-3 font-medium">No suppliers found</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Add your first supplier or change the search.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {rows.length} of {summary.totalSuppliers}
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-indigo-600 px-2 text-xs font-semibold text-white">
                {page}
              </span>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
