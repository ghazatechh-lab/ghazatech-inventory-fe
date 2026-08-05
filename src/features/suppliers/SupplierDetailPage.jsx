import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  BadgeDollarSign,
  Banknote,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Landmark,
  Mail,
  MapPin,
  PackageMinus,
  Pencil,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const value = (...items) => {
  for (const item of items) {
    if (item !== undefined && item !== null && String(item).trim()) return item;
  }
  return "—";
};

const normalizeList = (input) => {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.results)) return input.results;
  if (Array.isArray(input?.data)) return input.data;
  if (Array.isArray(input?.data?.results)) return input.data.results;
  return [];
};

const amount = (...items) => {
  for (const item of items) {
    const parsed = Number(item);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="supplier-info-item">
      <span className="supplier-info-icon">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="supplier-info-label">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
          {children || "—"}
        </div>
      </div>
    </div>
  );
}

function MoneyCard({ label, value: cardValue, icon: Icon, tone = "blue" }) {
  return (
    <div className={`supplier-money-card supplier-money-card--${tone}`}>
      <span className="supplier-money-icon">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="supplier-info-label">{label}</p>
        <CurrencyText
          value={cardValue}
          className="mt-1 block text-2xl font-extrabold tracking-tight"
        />
      </div>
    </div>
  );
}

function SupplierActivityCard({
  title,
  description,
  icon: Icon,
  items,
  isLoading,
  isError,
  emptyText,
  onViewAll,
  renderItem,
}) {
  return (
    <div className="supplier-detail-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="supplier-card-heading mb-0">
          <Icon className="h-5 w-5" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={onViewAll}>
          View all
        </Button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading records...</p>
        ) : isError ? (
          <p className="text-sm text-red-500">Unable to load records.</p>
        ) : items.length ? (
          <div className="space-y-2">{items.slice(0, 5).map(renderItem)}</div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-white/10">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const openSupplierActivity = React.useCallback(
    (path) => {
      navigate(`${path}?supplier=${encodeURIComponent(id)}`);
    },
    [id, navigate],
  );
  const { data, isLoading, isError } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => unwrap(await api.get(`/suppliers/${id}/`)),
  });

  const billsQuery = useQuery({
    queryKey: ["supplier-detail-bills", id],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/supplier-bills/", {
          params: {
            supplier: id,
            page_size: 5,
            ordering: "-bill_date",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  const paymentsQuery = useQuery({
    queryKey: ["supplier-detail-payments", id],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/supplier-payments/", {
          params: {
            supplier: id,
            page_size: 5,
            ordering: "-payment_date",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  const returnsQuery = useQuery({
    queryKey: ["supplier-detail-returns", id],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/supplier-returns/", {
          params: {
            supplier: id,
            page_size: 5,
            ordering: "-return_date",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  const creditsQuery = useQuery({
    queryKey: ["supplier-detail-credits", id],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/vendor-credits/", {
          params: {
            supplier: id,
            page_size: 5,
            ordering: "-credit_date",
          },
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });

  if (isLoading) return <LoadingState />;

  if (isError || !data) {
    return (
      <div className="supplier-module-page min-h-full p-6">
        <div className="supplier-empty-card">
          <Building2 className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold">Supplier not available</h2>
          <p className="mt-1 text-sm text-slate-500">
            The record may have been removed or you may not have access.
          </p>
          <Button asChild className="mt-5">
            <Link to="/suppliers">Back to suppliers</Link>
          </Button>
        </div>
      </div>
    );
  }

  const s = data;
  const supplierName = value(s.supplier_name, s.legal_name, s.name, "Supplier");
  const isActive =
    s.is_active !== false && String(s.status || "").toUpperCase() !== "BLOCKED";
  const documents = Array.isArray(s.documents) ? s.documents : [];
  const paymentTerms =
    Number(s.payment_terms_days || 0) === 0
      ? "Due on receipt"
      : `${Number(s.payment_terms_days || 0)} days`;

  const supplierBills = normalizeList(billsQuery.data);
  const supplierPayments = normalizeList(paymentsQuery.data);
  const supplierReturns = normalizeList(returnsQuery.data);
  const supplierCredits = normalizeList(creditsQuery.data);

  return (
    <div className="supplier-module-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="supplier-detail-hero">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/suppliers" className="supplier-back-link">
                <ArrowLeft className="h-4 w-4" /> Suppliers
              </Link>
              <div className="mt-5 flex items-start gap-4">
                <span className="supplier-hero-icon">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                      {supplierName}
                    </h1>
                    <span
                      className={
                        isActive
                          ? "supplier-status supplier-status--active"
                          : "supplier-status supplier-status--blocked"
                      }
                    >
                      <span /> {isActive ? "Active" : "Blocked"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    {value(s.supplier_code, s.trade_name)}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm text-slate-400">
                    Supplier identity, payment readiness, credit exposure and
                    operational records.
                  </p>
                </div>
              </div>
            </div>
            <Button
              asChild
              className="bg-white text-slate-950 shadow-lg hover:bg-slate-100"
            >
              <Link to={`/suppliers/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit supplier
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MoneyCard
            label="Outstanding payable"
            value={amount(s.outstanding, s.outstanding_balance, s.balance)}
            icon={WalletCards}
            tone="amber"
          />
          <MoneyCard
            label="Credit limit"
            value={amount(s.credit_limit)}
            icon={CreditCard}
            tone="blue"
          />
          <MoneyCard
            label="Opening balance"
            value={amount(s.opening_balance)}
            icon={Banknote}
            tone="slate"
          />
          <div className="supplier-money-card supplier-money-card--green">
            <span className="supplier-money-icon">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="supplier-info-label">Payment terms</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {paymentTerms}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="supplier-detail-card">
              <div className="supplier-card-heading">
                <UserRound className="h-5 w-5" />
                <div>
                  <h2>Company and contact</h2>
                  <p>Primary identity and communication information</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem icon={UserRound} label="Contact person">
                  {value(s.contact_person)}
                </InfoItem>
                <InfoItem icon={BadgeCheck} label="Designation">
                  {value(s.designation)}
                </InfoItem>
                <InfoItem icon={Phone} label="Phone">
                  {s.phone ? (
                    <a href={`tel:${s.phone}`} className="hover:text-blue-600">
                      {s.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoItem>
                <InfoItem icon={Mail} label="Email">
                  {s.email ? (
                    <a
                      href={`mailto:${s.email}`}
                      className="hover:text-blue-600"
                    >
                      {s.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoItem>
                <InfoItem icon={ShieldCheck} label="TRN number">
                  {value(s.trn_number, s.trn, s.tax_registration_number)}
                </InfoItem>
                <InfoItem icon={Building2} label="Supplier type">
                  {value(s.supplier_type)}
                </InfoItem>
              </div>
            </div>

            <div className="supplier-detail-card">
              <div className="supplier-card-heading">
                <MapPin className="h-5 w-5" />
                <div>
                  <h2>Address and location</h2>
                  <p>Billing and operational location</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem icon={MapPin} label="Billing address">
                  {value(s.billing_address, s.address)}
                </InfoItem>
                <InfoItem icon={Building2} label="City and country">
                  {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                </InfoItem>
              </div>
            </div>

            <div className="supplier-detail-card">
              <div className="supplier-card-heading">
                <Landmark className="h-5 w-5" />
                <div>
                  <h2>Bank information</h2>
                  <p>Settlement details used for supplier payments</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem icon={Landmark} label="Bank name">
                  {value(s.bank_name)}
                </InfoItem>
                <InfoItem icon={UserRound} label="Account holder">
                  {value(s.account_holder_name)}
                </InfoItem>
                <InfoItem icon={CreditCard} label="IBAN">
                  {value(s.iban)}
                </InfoItem>
                <InfoItem icon={ShieldCheck} label="SWIFT / BIC">
                  {value(s.swift_code)}
                </InfoItem>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="supplier-detail-card">
              <div className="supplier-card-heading">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <h2>Operational preferences</h2>
                  <p>Controls applied to purchasing</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ["Supplier active", s.is_active !== false],
                  [
                    "Auto-block credit breach",
                    Boolean(s.auto_block_credit_limit),
                  ],
                  ["Payment reminders", Boolean(s.send_payment_reminders)],
                ].map(([label, enabled]) => (
                  <div key={label} className="supplier-preference-row">
                    <span>{label}</span>
                    <span
                      className={
                        enabled ? "supplier-pref-on" : "supplier-pref-off"
                      }
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="supplier-detail-card">
              <div className="supplier-card-heading">
                <FileText className="h-5 w-5" />
                <div>
                  <h2>Documents</h2>
                  <p>
                    {documents.length} supporting file
                    {documents.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {documents.length ? (
                <div className="space-y-2">
                  {documents.map((document) => (
                    <a
                      key={document.id || document.file}
                      href={document.file_url || document.file}
                      target="_blank"
                      rel="noreferrer"
                      className="supplier-document-link"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate">
                        {document.original_name ||
                          document.file_name ||
                          "Supplier document"}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No supporting documents uploaded.
                </p>
              )}
            </div>

            {s.notes && (
              <div className="supplier-detail-card">
                <div className="supplier-card-heading">
                  <FileText className="h-5 w-5" />
                  <div>
                    <h2>Notes</h2>
                    <p>Internal supplier information</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {s.notes}
                </p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Supplier activity
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent bills, payments, returns, and supplier credits.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SupplierActivityCard
              title="Supplier Bills"
              description={`${supplierBills.length} recent record${
                supplierBills.length === 1 ? "" : "s"
              }`}
              icon={ReceiptText}
              items={supplierBills}
              isLoading={billsQuery.isLoading}
              isError={billsQuery.isError}
              emptyText="No supplier bills found."
              onViewAll={() =>
                openSupplierActivity("/purchases/supplier-bills")
              }
              renderItem={(bill) => (
                <Link
                  key={bill.id}
                  to={`/purchases/supplier-bills/${bill.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {value(
                        bill.bill_number,
                        bill.supplier_invoice_number,
                        `Bill ${bill.id}`,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {bill.bill_date ? (
                        <DateText value={bill.bill_date} />
                      ) : (
                        "No bill date"
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <CurrencyText
                      value={amount(
                        bill.balance_due,
                        bill.total_amount,
                        bill.amount,
                      )}
                      currency={bill.currency || s.currency || "AED"}
                      className="text-sm font-semibold"
                    />
                    <div className="mt-1">
                      <StatusBadge
                        status={bill.payment_status || bill.status || "OPEN"}
                      />
                    </div>
                  </div>
                </Link>
              )}
            />

            <SupplierActivityCard
              title="Supplier Payments"
              description={`${supplierPayments.length} recent record${
                supplierPayments.length === 1 ? "" : "s"
              }`}
              icon={Banknote}
              items={supplierPayments}
              isLoading={paymentsQuery.isLoading}
              isError={paymentsQuery.isError}
              emptyText="No supplier payments found."
              onViewAll={() =>
                openSupplierActivity("/purchases/supplier-payments")
              }
              renderItem={(payment) => (
                <Link
                  key={payment.id}
                  to={`/purchases/supplier-payments/${payment.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {value(
                        payment.payment_number,
                        payment.reference_number,
                        `Payment ${payment.id}`,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {payment.payment_date ? (
                        <DateText value={payment.payment_date} />
                      ) : (
                        "No payment date"
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <CurrencyText
                      value={amount(payment.amount, payment.total_amount)}
                      currency={payment.currency || s.currency || "AED"}
                      className="text-sm font-semibold"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {String(payment.payment_method || "Payment").replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                  </div>
                </Link>
              )}
            />

            <SupplierActivityCard
              title="Supplier Returns"
              description={`${supplierReturns.length} recent record${
                supplierReturns.length === 1 ? "" : "s"
              }`}
              icon={PackageMinus}
              items={supplierReturns}
              isLoading={returnsQuery.isLoading}
              isError={returnsQuery.isError}
              emptyText="No supplier returns found."
              onViewAll={() =>
                openSupplierActivity("/purchases/supplier-returns")
              }
              renderItem={(supplierReturn) => (
                <Link
                  key={supplierReturn.id}
                  to={`/purchases/supplier-returns/${supplierReturn.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {value(
                        supplierReturn.return_number,
                        `Return ${supplierReturn.id}`,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {supplierReturn.return_date ? (
                        <DateText value={supplierReturn.return_date} />
                      ) : (
                        "No return date"
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <CurrencyText
                      value={amount(
                        supplierReturn.total_amount,
                        supplierReturn.amount,
                      )}
                      currency={supplierReturn.currency || s.currency || "AED"}
                      className="text-sm font-semibold"
                    />
                    <div className="mt-1">
                      <StatusBadge status={supplierReturn.status || "DRAFT"} />
                    </div>
                  </div>
                </Link>
              )}
            />

            <SupplierActivityCard
              title="Supplier Credit"
              description={`${supplierCredits.length} recent record${
                supplierCredits.length === 1 ? "" : "s"
              }`}
              icon={BadgeDollarSign}
              items={supplierCredits}
              isLoading={creditsQuery.isLoading}
              isError={creditsQuery.isError}
              emptyText="No supplier credits found."
              onViewAll={() =>
                openSupplierActivity("/purchases/vendor-credits")
              }
              renderItem={(credit) => (
                <Link
                  key={credit.id}
                  to={`/purchases/vendor-credits/${credit.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {value(
                        credit.credit_number,
                        credit.reference_number,
                        `Credit ${credit.id}`,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {credit.credit_date ? (
                        <DateText value={credit.credit_date} />
                      ) : (
                        "No credit date"
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <CurrencyText
                      value={amount(
                        credit.remaining_amount,
                        credit.total_amount,
                        credit.amount,
                      )}
                      currency={credit.currency || s.currency || "AED"}
                      className="text-sm font-semibold"
                    />

                    <div className="mt-1">
                      <StatusBadge status={credit.status || "OPEN"} />
                    </div>
                  </div>
                </Link>
              )}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
