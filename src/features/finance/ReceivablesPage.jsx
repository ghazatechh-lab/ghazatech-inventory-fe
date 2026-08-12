import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Download,
  Eye,
  FileText,
  Mail,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Send,
  Trash2,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractRows, money, today } from "./accountingUtils";

const VAT_OPTIONS = [
  ["STANDARD", "VAT 5%", 5],
  ["ZERO_RATED", "Zero Rated", 0],
  ["EXEMPT", "Exempt", 0],
  ["NON_VAT", "Non-VAT", 0],
];

const PAYMENT_TERMS = [
  ["DUE_ON_RECEIPT", "Due on Receipt", 0],
  ["NET_7", "7 Days", 7],
  ["NET_15", "15 Days", 15],
  ["NET_30", "30 Days", 30],
  ["NET_45", "45 Days", 45],
  ["NET_60", "60 Days", 60],
];

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

const n = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const addDays = (value, days) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const idOf = (value) =>
  value && typeof value === "object"
    ? String(value.id || "")
    : String(value || "");

const blankLine = () => ({
  item_service: "",
  description: "",
  quantity: "1",
  unit_price: "",
  discount_percent: "0",
  tax_category: "STANDARD",
});

const blankInvoice = (branchId = "") => ({
  customer: "",
  branch: branchId ? String(branchId) : "",
  invoice_date: today(),
  due_date: addDays(today(), 30),
  credit_terms: "NET_30",
  customer_credit_limit: "0",
  customer_po_reference: "",
  currency: "AED",
  exchange_rate: "1.0000",
  salesperson_name: "",
  price_list_name: "Standard Selling Price",
  place_of_supply: "Sharjah",
  revenue_account: "",
  cost_center: "",
  billing_address: "",
  delivery_address: "",
  invoice_narration: "",
  internal_notes: "",
  credit_override_approved: false,
  lines: [blankLine()],
});

const editable = (status) => String(status || "").toUpperCase() === "DRAFT";

const visualStatus = (invoice) => {
  const status = String(invoice?.status || "").toUpperCase();
  if (["DRAFT", "PARTIALLY_PAID", "PAID", "CANCELLED"].includes(status))
    return status;
  if (
    invoice?.balance_due > 0 &&
    invoice?.due_date &&
    invoice.due_date < today()
  )
    return "OVERDUE";
  return status || "OPEN";
};

export default function ReceivablesPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("invoices");
  const [filters, setFilters] = React.useState({
    search: "",
    date_from: "",
    date_to: "",
    status: "",
    customer: "",
  });
  const [invoiceMode, setInvoiceMode] = React.useState(null);
  const [activeInvoice, setActiveInvoice] = React.useState(null);
  const [form, setForm] = React.useState(() => blankInvoice(branchId));
  const [files, setFiles] = React.useState([]);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [receiptForm, setReceiptForm] = React.useState({
    invoice: "",
    customer: "",
    branch: branchId ? String(branchId) : "",
    receipt_date: today(),
    amount: "",
    payment_method: "BANK_TRANSFER",
    reference: "",
    notes: "",
  });
  const [statement, setStatement] = React.useState({
    customer: "",
    period: "CURRENT_MONTH",
    date_from: "",
    date_to: "",
  });
  const [statementRows, setStatementRows] = React.useState([]);

  const customersQuery = useQuery({
    queryKey: ["ar-customers"],
    queryFn: () =>
      api.get("/customers/", { params: { page_size: 1000, ordering: "name" } }),
  });
  const branchesQuery = useQuery({
    queryKey: ["ar-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const accountsQuery = useQuery({
    queryKey: ["ar-revenue-accounts", form.branch],
    queryFn: () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: form.branch || undefined,
          account_type: "INCOME",
          is_active: true,
          page_size: 500,
        },
      }),
    enabled: Boolean(form.branch),
  });
  const invoicesQuery = useQuery({
    queryKey: ["ar-invoices", branchParams, filters],
    queryFn: () =>
      api.get("/finance/receivable-invoices/", {
        params: {
          ...branchParams,
          ...filters,
          page_size: 1000,
          ordering: "-invoice_date,-id",
        },
      }),
    staleTime: 0,
  });
  const receiptsQuery = useQuery({
    queryKey: ["ar-receipts", branchParams],
    queryFn: () =>
      api.get("/finance/receivable-receipts/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const summaryQuery = useQuery({
    queryKey: ["ar-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/receivable-invoices/summary/", {
          params: branchParams,
        }),
      ),
  });
  const agingQuery = useQuery({
    queryKey: ["ar-aging", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/receivable-invoices/aging-summary/", {
          params: branchParams,
        }),
      ),
  });

  const customers = extractRows(customersQuery.data);
  const branches = extractRows(branchesQuery.data);
  const revenueAccounts = extractRows(accountsQuery.data);
  const invoices = extractRows(invoicesQuery.data);
  const receipts = extractRows(receiptsQuery.data);
  const summary = summaryQuery.data || {};
  const aging = agingQuery.data || {};
  const selectedCustomer =
    customers.find((c) => String(c.id) === String(form.customer)) || null;

  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (acc, line) => {
          const gross = n(line.quantity) * n(line.unit_price);
          const discount = gross * (n(line.discount_percent) / 100);
          const taxable = Math.max(0, gross - discount);
          const rate =
            VAT_OPTIONS.find(([value]) => value === line.tax_category)?.[2] ||
            0;
          const vat = (taxable * rate) / 100;
          return {
            gross: acc.gross + gross,
            discount: acc.discount + discount,
            taxable: acc.taxable + taxable,
            vat: acc.vat + vat,
            total: acc.total + taxable + vat,
          };
        },
        { gross: 0, discount: 0, taxable: 0, vat: 0, total: 0 },
      ),
    [form.lines],
  );

  const exposure = n(
    activeInvoice?.currently_owed ??
      selectedCustomer?.current_exposure ??
      selectedCustomer?.outstanding_balance,
  );
  const creditLimit = n(form.customer_credit_limit);
  const availableCredit =
    creditLimit > 0 ? Math.max(0, creditLimit - exposure) : 0;
  const exceedsCredit =
    creditLimit > 0 && exposure + totals.total > creditLimit;

  React.useEffect(() => {
    if (!selectedCustomer || invoiceMode === "view") return;
    const limit =
      selectedCustomer.credit_limit ??
      selectedCustomer.customer_credit_limit ??
      0;
    const terms =
      selectedCustomer.credit_terms ||
      selectedCustomer.payment_terms ||
      "NET_30";
    const days = PAYMENT_TERMS.find(([value]) => value === terms)?.[2] ?? 30;
    const address =
      selectedCustomer.billing_address ||
      selectedCustomer.address ||
      [
        selectedCustomer.address_line1,
        selectedCustomer.city,
        selectedCustomer.emirate,
        selectedCustomer.country,
      ]
        .filter(Boolean)
        .join(", ");
    setForm((current) => ({
      ...current,
      customer_credit_limit: String(limit || 0),
      credit_terms: terms,
      due_date: addDays(current.invoice_date, days),
      billing_address: current.billing_address || address || "",
      delivery_address: current.delivery_address || address || "",
    }));
  }, [selectedCustomer, invoiceMode]);

  const refresh = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] }),
      queryClient.invalidateQueries({ queryKey: ["ar-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["ar-aging"] }),
    ]);

  const openInvoice = async (row, requestedMode = "view") => {
    try {
      const detail = unwrap(
        await api.get(`/finance/receivable-invoices/${row.id}/`),
      );
      setActiveInvoice(detail);
      setForm({
        customer: idOf(detail.customer),
        branch: idOf(detail.branch),
        invoice_date: detail.invoice_date,
        due_date: detail.due_date,
        credit_terms: detail.credit_terms || "NET_30",
        customer_credit_limit: String(detail.customer_credit_limit || 0),
        customer_po_reference: detail.customer_po_reference || "",
        currency: detail.currency || "AED",
        exchange_rate: String(detail.exchange_rate || "1.0000"),
        salesperson_name: detail.salesperson_name || "",
        price_list_name: detail.price_list_name || "Standard Selling Price",
        place_of_supply: detail.place_of_supply || "Sharjah",
        revenue_account: idOf(detail.revenue_account),
        cost_center: detail.cost_center || "",
        billing_address: detail.billing_address || "",
        delivery_address: detail.delivery_address || "",
        invoice_narration: detail.invoice_narration || "",
        internal_notes: detail.internal_notes || "",
        credit_override_approved: Boolean(detail.credit_override_approved),
        lines: (detail.lines || []).map((line) => ({
          id: line.id,
          item_service: line.item_service || "",
          description: line.description || "",
          quantity: String(line.quantity || 1),
          unit_price: String(line.unit_price || 0),
          discount_percent: String(line.discount_percent || 0),
          tax_category: line.tax_category || "STANDARD",
        })),
      });
      setFiles([]);
      setInvoiceMode(
        requestedMode === "edit" && !editable(detail.status)
          ? "view"
          : requestedMode,
      );
    } catch (error) {
      const d = getApiErrorDetails(error);
      toast.error(d.title || "Unable to open invoice", {
        description: d.summary || d.message,
      });
    }
  };

  const saveInvoice = useMutation({
    mutationFn: async ({ postAfterSave }) => {
      if (
        !form.customer ||
        !form.branch ||
        !form.invoice_date ||
        !form.due_date ||
        !form.revenue_account
      )
        throw new Error(
          "Customer, Branch, Invoice Date, Due Date and Revenue Account are required.",
        );
      if (!form.lines.length) throw new Error("Add at least one invoice line.");
      if (exceedsCredit && !form.credit_override_approved)
        throw new Error(
          "Customer credit limit is exceeded. Approved credit override is required.",
        );
      const payload = {
        customer: Number(form.customer),
        branch: Number(form.branch),
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        credit_terms: form.credit_terms,
        customer_credit_limit: n(form.customer_credit_limit),
        customer_po_reference: form.customer_po_reference,
        currency: form.currency,
        exchange_rate: n(form.exchange_rate || 1),
        salesperson_name: form.salesperson_name,
        price_list_name: form.price_list_name,
        place_of_supply: form.place_of_supply,
        revenue_account: Number(form.revenue_account),
        cost_center: form.cost_center,
        billing_address: form.billing_address,
        delivery_address: form.delivery_address,
        invoice_narration: form.invoice_narration,
        internal_notes: form.internal_notes,
        credit_override_approved: Boolean(form.credit_override_approved),
        lines: form.lines.map((line) => ({
          item_service: line.item_service,
          description: line.description,
          quantity: n(line.quantity),
          unit_price: n(line.unit_price),
          discount_percent: n(line.discount_percent),
          tax_category: line.tax_category,
        })),
      };
      const response =
        invoiceMode === "edit"
          ? await api.put(
              `/finance/receivable-invoices/${activeInvoice.id}/`,
              payload,
              { skipGlobalErrorToast: true },
            )
          : await api.post("/finance/receivable-invoices/", payload, {
              skipGlobalErrorToast: true,
            });
      const saved = unwrap(response);
      if (files.length) {
        const data = new FormData();
        files.forEach((file) => data.append("files", file));
        await api.post(
          `/finance/receivable-invoices/${saved.id}/attachments/`,
          data,
          {
            headers: { "Content-Type": "multipart/form-data" },
            skipGlobalErrorToast: true,
          },
        );
      }
      if (postAfterSave)
        await api.post(
          `/finance/receivable-invoices/${saved.id}/post/`,
          {},
          { skipGlobalErrorToast: true },
        );
      return postAfterSave;
    },
    onSuccess: async (posted) => {
      await refresh();
      toast.success(
        posted
          ? "Invoice posted to Accounts Receivable."
          : "Invoice saved as draft.",
      );
      setInvoiceMode(null);
      setActiveInvoice(null);
    },
    onError: (error) => {
      const d = getApiErrorDetails(error);
      toast.error(
        !error?.response && error?.message
          ? error.message
          : d.title || "Unable to save invoice",
        {
          description: error?.response?.data?.detail || d.summary || d.message,
        },
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ invoice, action }) =>
      api.post(
        `/finance/receivable-invoices/${invoice.id}/${action}/`,
        {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async (_r, vars) => {
      await refresh();
      toast.success(
        vars.action === "send-reminder"
          ? "Payment reminder recorded."
          : "Invoice updated.",
      );
    },
    onError: (error) => {
      const d = getApiErrorDetails(error);
      toast.error(d.title || "Unable to update invoice", {
        description: error?.response?.data?.detail || d.summary,
      });
    },
  });

  const receiptMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/receivable-receipts/",
        {
          branch: Number(receiptForm.branch),
          customer: Number(receiptForm.customer),
          invoice: receiptForm.invoice ? Number(receiptForm.invoice) : null,
          receipt_date: receiptForm.receipt_date,
          amount: n(receiptForm.amount),
          payment_method: receiptForm.payment_method,
          reference: receiptForm.reference,
          notes: receiptForm.notes,
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Customer receipt recorded.");
      setReceiptOpen(false);
    },
    onError: (error) => {
      const d = getApiErrorDetails(error);
      toast.error(d.title || "Unable to record receipt", {
        description: error?.response?.data?.detail || d.summary,
      });
    },
  });

  const generateStatement = async () => {
    if (!statement.customer) return toast.error("Select a customer.");
    try {
      const data = unwrap(
        await api.get("/finance/receivable-invoices/customer-statement/", {
          params: { ...branchParams, ...statement },
        }),
      );
      setStatementRows(data?.rows || []);
    } catch (error) {
      const d = getApiErrorDetails(error);
      toast.error(d.title || "Unable to generate statement");
    }
  };

  const exportInvoices = async () => {
    try {
      const response = await api.get("/finance/receivable-invoices/export/", {
        params: { ...branchParams, ...filters },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "accounts-receivable.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to export Accounts Receivable.");
    }
  };

  if (invoiceMode) {
    return (
      <InvoiceForm
        mode={invoiceMode}
        activeInvoice={activeInvoice}
        form={form}
        setForm={setForm}
        customers={customers}
        branches={branches}
        revenueAccounts={revenueAccounts}
        selectedCustomer={selectedCustomer}
        exposure={exposure}
        creditLimit={creditLimit}
        availableCredit={availableCredit}
        exceedsCredit={exceedsCredit}
        totals={totals}
        files={files}
        setFiles={setFiles}
        saveMutation={saveInvoice}
        onClose={() => {
          setInvoiceMode(null);
          setActiveInvoice(null);
        }}
      />
    );
  }

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Manage customer invoices, receipts, aging, statements, credit exposure, and collections."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={exportInvoices}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setActiveInvoice(null);
                setForm(blankInvoice(branchId));
                setFiles([]);
                setInvoiceMode("create");
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5 shadow-sm">
        {[
          ["invoices", "Customer Invoices"],
          ["receipts", "Receipts"],
          ["aging", "Aging Report"],
          ["statements", "Customer Statements"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === value ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted/40"}`}
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
          customers={customers}
          invoices={invoices}
          onView={(x) => openInvoice(x, "view")}
          onEdit={(x) => openInvoice(x, "edit")}
          onReceipt={(x) => {
            setReceiptForm({
              invoice: String(x.id),
              customer: idOf(x.customer),
              branch: idOf(x.branch),
              receipt_date: today(),
              amount: String(x.balance_due || ""),
              payment_method: "BANK_TRANSFER",
              reference: "",
              notes: "",
            });
            setReceiptOpen(true);
          }}
          onReminder={(x) =>
            actionMutation.mutate({ invoice: x, action: "send-reminder" })
          }
          onCancel={(x) =>
            actionMutation.mutate({ invoice: x, action: "cancel" })
          }
        />
      )}
      {tab === "receipts" && (
        <ReceiptsTab receipts={receipts} onNew={() => setReceiptOpen(true)} />
      )}
      {tab === "aging" && <AgingTab aging={aging} />}
      {tab === "statements" && (
        <StatementsTab
          customers={customers}
          statement={statement}
          setStatement={setStatement}
          rows={statementRows}
          onGenerate={generateStatement}
        />
      )}
      {receiptOpen && (
        <ReceiptModal
          form={receiptForm}
          setForm={setReceiptForm}
          branches={branches}
          customers={customers}
          invoices={invoices}
          onClose={() => setReceiptOpen(false)}
          onSave={() => receiptMutation.mutate()}
          pending={receiptMutation.isPending}
        />
      )}
    </div>
  );
}

function InvoicesTab({
  summary,
  filters,
  setFilters,
  customers,
  invoices,
  onView,
  onEdit,
  onReceipt,
  onReminder,
  onCancel,
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total Receivables"
          value={money(summary.total_receivables || 0)}
          meta={`${summary.open_invoice_count || 0} open invoices`}
        />
        <Kpi
          label="Overdue"
          value={money(summary.overdue_amount || 0)}
          meta={`${summary.overdue_invoice_count || 0} invoices past due`}
          tone="red"
        />
        <Kpi
          label="Received This Month"
          value={money(summary.received_this_month || 0)}
          meta={`${summary.receipts_this_month_count || 0} receipts`}
          tone="green"
        />
        <Kpi
          label="Due Next 7 Days"
          value={money(summary.due_next_7_days || 0)}
          meta={`${summary.due_next_7_days_count || 0} approaching due date`}
          tone="amber"
        />
      </div>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.5fr_.9fr_.9fr_.9fr_.9fr_auto]">
        <Field label="Search">
          <Input
            placeholder="Customer, invoice no., reference"
            value={filters.search}
            onChange={(e) =>
              setFilters((c) => ({ ...c, search: e.target.value }))
            }
          />
        </Field>
        <Field label="From Date">
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((c) => ({ ...c, date_from: e.target.value }))
            }
          />
        </Field>
        <Field label="To Date">
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((c) => ({ ...c, date_to: e.target.value }))
            }
          />
        </Field>
        <Field label="Status">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.status}
            onChange={(e) =>
              setFilters((c) => ({ ...c, status: e.target.value }))
            }
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_PAID">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>
        <Field label="Customer">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={filters.customer}
            onChange={(e) =>
              setFilters((c) => ({ ...c, customer: e.target.value }))
            }
          >
            <option value="">All customers</option>
            {customers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name || x.customer_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                search: "",
                date_from: "",
                date_to: "",
                status: "",
                customer: "",
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
            Invoices, payment progress, due dates, and outstanding balances.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
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
                  "Credit Status",
                  "Actions",
                ].map((x) => (
                  <th
                    key={x}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const status = visualStatus(invoice);
                return (
                  <tr key={invoice.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-bold text-blue-600">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {invoice.customer_name}
                    </td>
                    <td className="px-4 py-3">{invoice.invoice_date}</td>
                    <td className="px-4 py-3">{invoice.due_date}</td>
                    <td className="px-4 py-3 text-right">
                      {money(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(invoice.paid_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {money(invoice.balance_due)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${invoice.exceeds_credit_limit ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                      >
                        {invoice.exceeds_credit_limit
                          ? "Limit Exceeded"
                          : "Within Limit"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Icon title="View" onClick={() => onView(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Icon>
                        {editable(invoice.status) && (
                          <Icon title="Edit" onClick={() => onEdit(invoice)}>
                            <FileText className="h-4 w-4" />
                          </Icon>
                        )}
                        {!["DRAFT", "PAID", "CANCELLED"].includes(
                          String(invoice.status).toUpperCase(),
                        ) && (
                          <Icon
                            title="Record Receipt"
                            onClick={() => onReceipt(invoice)}
                          >
                            <WalletCards className="h-4 w-4 text-emerald-600" />
                          </Icon>
                        )}
                        {status === "OVERDUE" && (
                          <Icon
                            title="Send Reminder"
                            onClick={() => onReminder(invoice)}
                          >
                            <Mail className="h-4 w-4 text-amber-600" />
                          </Icon>
                        )}
                        {editable(invoice.status) && (
                          <Icon
                            title="Cancel"
                            onClick={() => onCancel(invoice)}
                          >
                            <Ban className="h-4 w-4 text-red-600" />
                          </Icon>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!invoices.length && (
                <tr>
                  <td
                    colSpan="10"
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
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Posted invoices are read-only. Corrections must use the Sales Return or
        cancellation workflow instead of editing the posted invoice.
      </div>
    </section>
  );
}

function ReceiptsTab({ receipts, onNew }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Receipts"
          value={money(receipts.reduce((s, x) => s + n(x.amount), 0))}
          meta={`${receipts.length} receipts`}
          tone="green"
        />
        <Kpi
          label="Unallocated Receipts"
          value={money(
            receipts.reduce((s, x) => s + n(x.unallocated_amount), 0),
          )}
          meta="Pending allocation"
        />
        <Kpi
          label="Cheque Receipts"
          value={money(
            receipts
              .filter((x) => x.payment_method === "CHEQUE")
              .reduce((s, x) => s + n(x.amount), 0),
          )}
          meta="Cheque payments"
        />
        <Kpi
          label="Bank Transfers"
          value={money(
            receipts
              .filter((x) => x.payment_method === "BANK_TRANSFER")
              .reduce((s, x) => s + n(x.amount), 0),
          )}
          meta="Bank transfer receipts"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Customer Receipts</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Payments received and invoice allocations.
            </p>
          </div>
          <Button onClick={onNew} className="bg-blue-600 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Record Receipt
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Receipt No.",
                  "Date",
                  "Customer",
                  "Method",
                  "Reference",
                  "Amount",
                  "Allocated",
                  "Unallocated",
                  "Status",
                ].map((x) => (
                  <th
                    key={x}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground"
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-3 font-bold text-blue-600">
                    {r.receipt_number}
                  </td>
                  <td className="px-4 py-3">{r.receipt_date}</td>
                  <td className="px-4 py-3 font-semibold">{r.customer_name}</td>
                  <td className="px-4 py-3">
                    {r.payment_method_display || r.payment_method}
                  </td>
                  <td className="px-4 py-3">{r.reference || "—"}</td>
                  <td className="px-4 py-3 text-right">{money(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {money(r.allocated_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(r.unallocated_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        n(r.unallocated_amount) > 0
                          ? "UNALLOCATED"
                          : "ALLOCATED"
                      }
                    />
                  </td>
                </tr>
              ))}
              {!receipts.length && (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No customer receipts found.
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

function AgingTab({ aging }) {
  const b = aging.buckets || aging;
  const rows = aging.by_customer || [];
  const cards = [
    ["Current", b.current, b.current_count],
    ["1–30 Days", b.days_1_30, b.days_1_30_count],
    ["31–60 Days", b.days_31_60, b.days_31_60_count],
    ["61–90 Days", b.days_61_90, b.days_61_90_count],
    ["90+ Days", b.days_90_plus, b.days_90_plus_count],
  ];
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([l, a, c]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-2 text-2xl font-black">{money(a || 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {c || 0} invoices
            </p>
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
                ].map((x) => (
                  <th
                    key={x}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground"
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer_id} className="border-b">
                  <td className="px-4 py-3 font-semibold">{r.customer_name}</td>
                  {[
                    "current",
                    "days_1_30",
                    "days_31_60",
                    "days_61_90",
                    "days_90_plus",
                    "total",
                  ].map((k) => (
                    <td key={k} className="px-4 py-3 text-right">
                      {money(r[k])}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${n(r.days_31_60) + n(r.days_61_90) + n(r.days_90_plus) > 0 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                    >
                      {n(r.days_31_60) + n(r.days_61_90) + n(r.days_90_plus) > 0
                        ? "Follow-up Required"
                        : "Normal"}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No aging data available.
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

function StatementsTab({
  customers,
  statement,
  setStatement,
  rows,
  onGenerate,
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <Field label="Customer">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={statement.customer}
            onChange={(e) =>
              setStatement((c) => ({ ...c, customer: e.target.value }))
            }
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.customer_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statement Period">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={statement.period}
            onChange={(e) =>
              setStatement((c) => ({ ...c, period: e.target.value }))
            }
          >
            <option value="CURRENT_MONTH">Current Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="CUSTOM">Custom Range</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button onClick={onGenerate} className="bg-blue-600 text-white">
            Generate Statement
          </Button>
        </div>
        {statement.period === "CUSTOM" && (
          <>
            <Field label="From Date">
              <Input
                type="date"
                value={statement.date_from}
                onChange={(e) =>
                  setStatement((c) => ({ ...c, date_from: e.target.value }))
                }
              />
            </Field>
            <Field label="To Date">
              <Input
                type="date"
                value={statement.date_to}
                onChange={(e) =>
                  setStatement((c) => ({ ...c, date_to: e.target.value }))
                }
              />
            </Field>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Customer Statement Preview</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Invoices, receipts, Sales Return adjustments, and running balance.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Date",
                  "Document No.",
                  "Type",
                  "Description",
                  "Debit",
                  "Credit",
                  "Balance",
                ].map((x) => (
                  <th
                    key={x}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground"
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.document_no}-${i}`} className="border-b">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 font-semibold">{r.document_no}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">{r.description}</td>
                  <td className="px-4 py-3 text-right">
                    {n(r.debit) ? money(r.debit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {n(r.credit) ? money(r.credit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    Select a customer and generate a statement.
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

function InvoiceForm({
  mode,
  activeInvoice,
  form,
  setForm,
  customers,
  branches,
  revenueAccounts,
  selectedCustomer,
  exposure,
  creditLimit,
  availableCredit,
  exceedsCredit,
  totals,
  files,
  setFiles,
  saveMutation,
  onClose,
}) {
  const readOnly = mode === "view";
  const updateLine = (index, key, value) =>
    setForm((c) => ({
      ...c,
      lines: c.lines.map((line, i) =>
        i === index ? { ...line, [key]: value } : line,
      ),
    }));
  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1420px] space-y-5 pb-10">
      <PageHeader
        title={
          mode === "create"
            ? "New Customer Invoice"
            : mode === "edit"
              ? `Edit ${activeInvoice?.invoice_number}`
              : activeInvoice?.invoice_number || "Customer Invoice"
        }
        subtitle="Create a customer invoice with items, tax, payment terms, credit controls, and accounting details."
        actions={
          <div className="flex gap-2">
            {activeInvoice && (
              <StatusBadge status={visualStatus(activeInvoice)} />
            )}
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        }
      />
      {readOnly && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This invoice is read-only. Only Draft customer invoices can be edited.
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Section title="01 Invoice Details" note="Required fields are marked *">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Invoice Number">
              <Input
                value={
                  activeInvoice?.invoice_number || "Auto-generated on save"
                }
                disabled
              />
            </Field>
            <Field label="Invoice Date *">
              <Input
                type="date"
                disabled={readOnly}
                value={form.invoice_date}
                onChange={(e) =>
                  setForm((c) => ({ ...c, invoice_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Due Date *">
              <Input
                type="date"
                disabled={readOnly}
                value={form.due_date}
                onChange={(e) =>
                  setForm((c) => ({ ...c, due_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Branch *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.branch}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    branch: e.target.value,
                    revenue_account: "",
                  }))
                }
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name || b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.customer}
                onChange={(e) =>
                  setForm((c) => ({ ...c, customer: e.target.value }))
                }
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.customer_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer PO / Reference">
              <Input
                disabled={readOnly}
                value={form.customer_po_reference}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    customer_po_reference: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Currency *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.currency}
                onChange={(e) =>
                  setForm((c) => ({ ...c, currency: e.target.value }))
                }
              >
                <option>AED</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Exchange Rate">
              <Input
                disabled={readOnly}
                type="number"
                step="0.0001"
                value={form.exchange_rate}
                onChange={(e) =>
                  setForm((c) => ({ ...c, exchange_rate: e.target.value }))
                }
              />
            </Field>
            <Field label="Payment Terms *">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.credit_terms}
                onChange={(e) => {
                  const opt = PAYMENT_TERMS.find(([v]) => v === e.target.value);
                  setForm((c) => ({
                    ...c,
                    credit_terms: e.target.value,
                    due_date: addDays(c.invoice_date, opt?.[2] ?? 30),
                  }));
                }}
              >
                {PAYMENT_TERMS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Salesperson">
              <Input
                disabled={readOnly}
                value={form.salesperson_name}
                onChange={(e) =>
                  setForm((c) => ({ ...c, salesperson_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Price List">
              <Input
                disabled={readOnly}
                value={form.price_list_name}
                onChange={(e) =>
                  setForm((c) => ({ ...c, price_list_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Place of Supply">
              <select
                disabled={readOnly}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.place_of_supply}
                onChange={(e) =>
                  setForm((c) => ({ ...c, place_of_supply: e.target.value }))
                }
              >
                {EMIRATES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
        <Section
          title="02 Customer & Credit Control"
          note="Shown automatically from the customer master"
        >
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-bold">
              {selectedCustomer?.name ||
                selectedCustomer?.customer_name ||
                activeInvoice?.customer_name ||
                "Select a customer"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              TRN:{" "}
              {selectedCustomer?.trn_number || selectedCustomer?.trn || "—"} ·
              Credit terms: {form.credit_terms} · Billing contact:{" "}
              {selectedCustomer?.email || "—"}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Credit label="Credit Limit" value={money(creditLimit)} />
              <Credit label="Current Exposure" value={money(exposure)} />
              <Credit
                label="Available Credit"
                value={money(availableCredit)}
                alert={exceedsCredit}
              />
            </div>
            {exceedsCredit && !readOnly && (
              <label className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <input
                  type="checkbox"
                  checked={form.credit_override_approved}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      credit_override_approved: e.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Credit limit exceeded.</strong> Confirm an approved
                  override before posting.
                </span>
              </label>
            )}
          </div>
        </Section>
        <Section
          title="03 Invoice Lines"
          note="Tax and line totals are calculated automatically"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[1.4fr_1fr_.55fr_.7fr_.6fr_.7fr_.8fr_44px] gap-2 pb-2 text-[11px] font-bold uppercase text-muted-foreground">
                {[
                  "Item / Service",
                  "Description",
                  "Qty",
                  "Unit Price",
                  "Discount %",
                  "Tax",
                  "Line Total",
                  "",
                ].map((x, i) => (
                  <span key={`${x}-${i}`}>{x}</span>
                ))}
              </div>
              <div className="space-y-2">
                {form.lines.map((line, index) => {
                  const gross = n(line.quantity) * n(line.unit_price);
                  const taxable = Math.max(
                    0,
                    gross - (gross * n(line.discount_percent)) / 100,
                  );
                  const rate =
                    VAT_OPTIONS.find(([v]) => v === line.tax_category)?.[2] ||
                    0;
                  const lineTotal = taxable + (taxable * rate) / 100;
                  return (
                    <div
                      key={line.id || index}
                      className="grid grid-cols-[1.4fr_1fr_.55fr_.7fr_.6fr_.7fr_.8fr_44px] gap-2"
                    >
                      <Input
                        disabled={readOnly}
                        value={line.item_service}
                        onChange={(e) =>
                          updateLine(index, "item_service", e.target.value)
                        }
                        placeholder="Item / service"
                      />
                      <Input
                        disabled={readOnly}
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                        placeholder="Description"
                      />
                      <Input
                        disabled={readOnly}
                        type="number"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, "quantity", e.target.value)
                        }
                      />
                      <Input
                        disabled={readOnly}
                        type="number"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(index, "unit_price", e.target.value)
                        }
                      />
                      <Input
                        disabled={readOnly}
                        type="number"
                        value={line.discount_percent}
                        onChange={(e) =>
                          updateLine(index, "discount_percent", e.target.value)
                        }
                      />
                      <select
                        disabled={readOnly}
                        className="h-10 rounded-md border bg-background px-2"
                        value={line.tax_category}
                        onChange={(e) =>
                          updateLine(index, "tax_category", e.target.value)
                        }
                      >
                        {VAT_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <Input value={money(lineTotal)} disabled />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={readOnly || form.lines.length <= 1}
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            lines: c.lines.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                setForm((c) => ({ ...c, lines: [...c.lines, blankLine()] }))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          )}
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Invoice Narration">
                  <Textarea
                    disabled={readOnly}
                    rows={4}
                    value={form.invoice_narration}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        invoice_narration: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Internal Notes">
                  <Textarea
                    disabled={readOnly}
                    rows={4}
                    value={form.internal_notes}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, internal_notes: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Revenue Account *">
                  <select
                    disabled={readOnly}
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={form.revenue_account}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        revenue_account: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select revenue account</option>
                    {revenueAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cost Center">
                  <Input
                    disabled={readOnly}
                    value={form.cost_center}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, cost_center: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Sum label="Subtotal" value={money(totals.gross)} />
              <Sum label="Discount" value={money(totals.discount)} />
              <Sum label="Taxable Amount" value={money(totals.taxable)} />
              <Sum label="VAT" value={money(totals.vat)} />
              <Sum label="Invoice Total" value={money(totals.total)} strong />
              <Sum
                label="Amount Due"
                value={money(activeInvoice?.balance_due ?? totals.total)}
                balance
              />
            </div>
          </div>
        </Section>
        <Section
          title="04 Billing & Delivery"
          note="Use customer defaults or override for this invoice"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Billing Address">
              <Textarea
                disabled={readOnly}
                rows={5}
                value={form.billing_address}
                onChange={(e) =>
                  setForm((c) => ({ ...c, billing_address: e.target.value }))
                }
              />
            </Field>
            <Field label="Delivery Address">
              <Textarea
                disabled={readOnly}
                rows={5}
                value={form.delivery_address}
                onChange={(e) =>
                  setForm((c) => ({ ...c, delivery_address: e.target.value }))
                }
              />
            </Field>
          </div>
        </Section>
        <Section title="05 Supporting Documents" note="Optional">
          {readOnly ? (
            <div className="space-y-2">
              {(activeInvoice?.attachments || []).map((a) => (
                <a
                  key={a.id}
                  href={a.file_url || a.file}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  {a.original_name || "Attachment"}
                </a>
              ))}
              {!activeInvoice?.attachments?.length && (
                <p className="text-sm text-muted-foreground">
                  No supporting documents attached.
                </p>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center">
              <Upload className="h-8 w-8 text-blue-600" />
              <p className="mt-3 font-semibold">
                Attach customer PO, delivery note, quotation, or supporting
                files
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
          )}
          {!!files.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f) => (
                <span
                  key={`${f.name}-${f.size}`}
                  className="rounded-full bg-muted px-3 py-1 text-xs"
                >
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </Section>
        <div className="border-b p-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Posting creates the customer receivable and the corresponding
            revenue/VAT General Ledger entries. After posting, corrections must
            use the Sales Return or cancellation workflow.
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Review credit availability, totals, VAT, and due date before
            posting.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ postAfterSave: false })}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ postAfterSave: true })}
                  className="bg-blue-600 text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Post Invoice
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({
  form,
  setForm,
  branches,
  customers,
  invoices,
  onClose,
  onSave,
  pending,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
        <div className="flex justify-between border-b p-5">
          <div>
            <h3 className="text-xl font-bold">Record Customer Receipt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave Invoice blank to record an unallocated receipt.
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Receipt Date">
            <Input
              type="date"
              value={form.receipt_date}
              onChange={(e) =>
                setForm((c) => ({ ...c, receipt_date: e.target.value }))
              }
            />
          </Field>
          <Field label="Branch *">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.branch}
              onChange={(e) =>
                setForm((c) => ({ ...c, branch: e.target.value }))
              }
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name || b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer *">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.customer}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  customer: e.target.value,
                  invoice: "",
                }))
              }
            >
              <option value="">Select customer</option>
              {customers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name || x.customer_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Invoice Allocation">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.invoice}
              onChange={(e) =>
                setForm((c) => ({ ...c, invoice: e.target.value }))
              }
            >
              <option value="">Unallocated receipt</option>
              {invoices
                .filter(
                  (x) =>
                    !form.customer ||
                    idOf(x.customer) === String(form.customer),
                )
                .filter(
                  (x) =>
                    !["DRAFT", "PAID", "CANCELLED"].includes(
                      String(x.status).toUpperCase(),
                    ),
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.invoice_number} — {money(x.balance_due)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Amount *">
            <Input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((c) => ({ ...c, amount: e.target.value }))
              }
            />
          </Field>
          <Field label="Payment Method">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.payment_method}
              onChange={(e) =>
                setForm((c) => ({ ...c, payment_method: e.target.value }))
              }
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Reference">
            <Input
              value={form.reference}
              onChange={(e) =>
                setForm((c) => ({ ...c, reference: e.target.value }))
              }
            />
          </Field>
          <Field label="Notes">
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm((c) => ({ ...c, notes: e.target.value }))
              }
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={onSave}
            className="bg-blue-600 text-white"
          >
            {pending ? "Saving..." : "Record Receipt"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, meta, tone }) {
  const cls =
    { red: "text-red-600", green: "text-emerald-600", amber: "text-amber-600" }[
      tone
    ] || "";
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-black ${cls}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}
function Credit({ label, value, alert }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black ${alert ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
function Sum({ label, value, strong, balance }) {
  return (
    <div
      className={`flex justify-between border-b px-4 py-3 last:border-b-0 ${strong ? "bg-blue-50 font-bold" : ""} ${balance ? "bg-emerald-50 font-bold text-emerald-700" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
function Section({ title, note, children }) {
  return (
    <section className="border-b p-5 md:p-6">
      <div className="mb-4 flex justify-between gap-4">
        <h3 className="font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Icon({ title, onClick, children }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={title}
      onClick={onClick}
      className="h-8 w-8"
    >
      {children}
    </Button>
  );
}
