import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Plus,
  Printer,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { extractRows, money, today } from "./accountingUtils";

const TERMS = [
  ["DUE_ON_RECEIPT", "Due on Receipt", 0],
  ["NET_15", "15 Days", 15],
  ["NET_30", "30 Days", 30],
  ["NET_60", "60 Days", 60],
];
const TAXES = [
  ["STANDARD", "VAT 5%", 5],
  ["ZERO_RATED", "Zero Rated", 0],
  ["EXEMPT", "Exempt", 0],
  ["NON_VAT", "Non-VAT", 0],
];
const num = (v) => Number(v || 0);
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + Number(n || 0));
  return x.toISOString().slice(0, 10);
};
const line = () => ({
  item_expense: "",
  description: "",
  quantity: "1",
  unit_price: "",
  discount_percent: "0",
  tax_category: "STANDARD",
});
const blank = (branch) => ({
  branch: branch ? String(branch) : "",
  supplier: "",
  supplier_invoice_number: "",
  bill_date: today(),
  due_date: addDays(today(), 30),
  payment_terms: "NET_30",
  currency: "AED",
  exchange_rate: "1.0000",
  payment_method: "BANK_TRANSFER",
  buyer_requester: "",
  purchase_order_id: "",
  grn_id: "",
  match_method: "NO_PO",
  match_status: "NOT_MATCHED",
  expense_account: "",
  cost_center: "",
  project: "",
  apply_withholding_tax: false,
  withholding_tax_rate: "0",
  bill_narration: "",
  internal_notes: "",
  approval_workflow: "AP_ACCOUNTANT_FINANCE_MANAGER",
  approver: "",
  approval_priority: "NORMAL",
  lines: [line()],
});
const editable = (s) =>
  ["DRAFT", "REJECTED"].includes(String(s || "").toUpperCase());

export default function PayablesPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("bills");
  const [mode, setMode] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [form, setForm] = React.useState(() => blank(branchId));
  const [files, setFiles] = React.useState([]);
  const [filters, setFilters] = React.useState({
    search: "",
    status: "",
    supplier: "",
    date_from: "",
    date_to: "",
  });
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [payment, setPayment] = React.useState({
    branch: "",
    supplier: "",
    bill: "",
    payment_date: today(),
    amount: "",
    payment_method: "BANK_TRANSFER",
    reference: "",
  });
  const [workflow, setWorkflow] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const branchesQ = useQuery({
    queryKey: ["ap-branches"],
    queryFn: () => api.get("/branches/", { params: { page_size: 500 } }),
  });
  const suppliersQ = useQuery({
    queryKey: ["ap-suppliers"],
    queryFn: () => api.get("/suppliers/", { params: { page_size: 1000 } }),
  });
  const usersQ = useQuery({
    queryKey: ["ap-users"],
    queryFn: () => api.get("/auth/users/form-options/"),
  });
  const accountsQ = useQuery({
    queryKey: ["ap-accounts", form.branch],
    queryFn: () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: form.branch || undefined,
          is_active: true,
          page_size: 1000,
        },
      }),
    enabled: Boolean(form.branch),
  });
  const poQ = useQuery({
    queryKey: ["ap-pos", form.branch, form.supplier],
    queryFn: () =>
      api.get("/purchases/purchase-orders/", {
        params: {
          branch: form.branch || undefined,
          supplier: form.supplier || undefined,
          page_size: 500,
        },
      }),
    enabled: Boolean(form.branch && form.supplier),
  });
  const grnQ = useQuery({
    queryKey: ["ap-grns", form.branch, form.supplier],
    queryFn: () =>
      api.get("/purchases/grns/", {
        params: {
          branch: form.branch || undefined,
          supplier: form.supplier || undefined,
          page_size: 500,
        },
      }),
    enabled: Boolean(form.branch && form.supplier),
  });
  const billsQ = useQuery({
    queryKey: ["ap-bills", branchParams, filters],
    queryFn: () =>
      api.get("/finance/payable-bills/", {
        params: { ...branchParams, ...filters, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const paymentsQ = useQuery({
    queryKey: ["ap-payments", branchParams],
    queryFn: () =>
      api.get("/finance/payable-payments/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const summaryQ = useQuery({
    queryKey: ["ap-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/payable-bills/summary/", {
          params: branchParams,
        }),
      ),
  });
  const agingQ = useQuery({
    queryKey: ["ap-aging", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/finance/payable-bills/aging-summary/", {
          params: branchParams,
        }),
      ),
  });

  const branches = extractRows(branchesQ.data),
    suppliers = extractRows(suppliersQ.data),
    accounts = extractRows(accountsQ.data),
    pos = extractRows(poQ.data),
    grns = extractRows(grnQ.data),
    bills = extractRows(billsQ.data),
    payments = extractRows(paymentsQ.data);
  const raw = usersQ.data?.data ?? usersQ.data;
  const approvers = Array.isArray(raw)
    ? raw
    : raw?.users || raw?.results || raw?.data?.users || [];
  const summary = summaryQ.data || {},
    aging = agingQ.data || {},
    agingBuckets = aging.buckets || aging,
    agingSuppliers = aging.by_supplier || [];
  const supplier = suppliers.find(
    (x) => String(x.id) === String(form.supplier),
  );

  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (r, l) => {
          const gross = num(l.quantity) * num(l.unit_price),
            discount = (gross * num(l.discount_percent)) / 100,
            taxable = gross - discount;
          const rate = TAXES.find(([v]) => v === l.tax_category)?.[2] || 0,
            vat = (taxable * rate) / 100;
          return {
            subtotal: r.subtotal + gross,
            discount: r.discount + discount,
            taxable: r.taxable + taxable,
            vat: r.vat + vat,
          };
        },
        { subtotal: 0, discount: 0, taxable: 0, vat: 0 },
      ),
    [form.lines],
  );
  const tds = form.apply_withholding_tax
    ? (totals.taxable * num(form.withholding_tax_rate)) / 100
    : 0;
  const total = totals.taxable + totals.vat - tds;

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ap-bills"] }),
      qc.invalidateQueries({ queryKey: ["ap-payments"] }),
      qc.invalidateQueries({ queryKey: ["ap-summary"] }),
      qc.invalidateQueries({ queryKey: ["ap-aging"] }),
    ]);

  const openBill = async (row, requested = "view") => {
    try {
      const d = unwrap(await api.get(`/finance/payable-bills/${row.id}/`));
      setActive(d);
      setForm({
        branch: String(d.branch?.id || d.branch || ""),
        supplier: String(d.supplier?.id || d.supplier || ""),
        supplier_invoice_number: d.supplier_invoice_number || "",
        bill_date: d.bill_date || today(),
        due_date: d.due_date || today(),
        payment_terms: d.payment_terms || "NET_30",
        currency: d.currency || "AED",
        exchange_rate: String(d.exchange_rate || 1),
        payment_method: d.payment_method || "BANK_TRANSFER",
        buyer_requester: d.buyer_requester || "",
        purchase_order_id: d.purchase_order_id
          ? String(d.purchase_order_id)
          : "",
        grn_id: d.grn_id ? String(d.grn_id) : "",
        match_method: d.match_method || "NO_PO",
        match_status: d.match_status || "NOT_MATCHED",
        expense_account: d.expense_account
          ? String(d.expense_account?.id || d.expense_account)
          : "",
        cost_center: d.cost_center || "",
        project: d.project || "",
        apply_withholding_tax: Boolean(d.apply_withholding_tax),
        withholding_tax_rate: String(d.withholding_tax_rate || 0),
        bill_narration: d.bill_narration || "",
        internal_notes: d.internal_notes || "",
        approval_workflow:
          d.approval_workflow || "AP_ACCOUNTANT_FINANCE_MANAGER",
        approver: d.approver ? String(d.approver?.id || d.approver) : "",
        approval_priority: d.approval_priority || "NORMAL",
        lines: (d.lines || []).map((l) => ({
          id: l.id,
          item_expense: l.item_expense || "",
          description: l.description || "",
          quantity: String(l.quantity || 1),
          unit_price: String(l.unit_price || 0),
          discount_percent: String(l.discount_percent || 0),
          tax_category: l.tax_category || "STANDARD",
        })),
      });
      setFiles([]);
      setMode(requested === "edit" && !editable(d.status) ? "view" : requested);
    } catch (e) {
      const x = getApiErrorDetails(e);
      toast.error(x.title || "Unable to open bill", {
        description: x.summary || x.message,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ submit }) => {
      if (
        !form.branch ||
        !form.supplier ||
        !form.supplier_invoice_number ||
        !form.expense_account
      )
        throw new Error(
          "Branch, supplier, supplier invoice number and expense/inventory account are required.",
        );
      if (!active?.attachments?.length && !files.length)
        throw new Error("Supplier invoice attachment is required.");
      const payload = {
        ...form,
        branch: Number(form.branch),
        supplier: Number(form.supplier),
        approver: form.approver ? Number(form.approver) : null,
        expense_account: Number(form.expense_account),
        purchase_order_id: form.purchase_order_id
          ? Number(form.purchase_order_id)
          : null,
        grn_id: form.grn_id ? Number(form.grn_id) : null,
        exchange_rate: num(form.exchange_rate),
        withholding_tax_rate: num(form.withholding_tax_rate),
        lines: form.lines.map((l) => ({
          ...l,
          quantity: num(l.quantity),
          unit_price: num(l.unit_price),
          discount_percent: num(l.discount_percent),
        })),
      };
      const r =
        mode === "edit"
          ? await api.put(`/finance/payable-bills/${active.id}/`, payload, {
              skipGlobalErrorToast: true,
            })
          : await api.post("/finance/payable-bills/", payload, {
              skipGlobalErrorToast: true,
            });
      const saved = unwrap(r);
      if (files.length) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        await api.post(`/finance/payable-bills/${saved.id}/attachments/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          skipGlobalErrorToast: true,
        });
      }
      if (submit)
        await api.post(
          `/finance/payable-bills/${saved.id}/submit-approval/`,
          {},
          { skipGlobalErrorToast: true },
        );
    },
    onSuccess: async (_, v) => {
      await refresh();
      toast.success(v.submit ? "Bill submitted for approval." : "Bill saved.");
      setMode(null);
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(
        e?.message && !e?.response
          ? e.message
          : d.title || "Unable to save bill",
        { description: d.summary || d.message },
      );
    },
  });

  const workflowMutation = useMutation({
    mutationFn: ({ bill, action }) =>
      api.post(
        `/finance/payable-bills/${bill.id}/${action}/`,
        action === "reject" ? { reason: rejectReason } : {},
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Bill updated.");
      setWorkflow(null);
      setRejectReason("");
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to update bill", {
        description: d.summary || d.message,
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post(
        "/finance/payable-payments/",
        {
          ...payment,
          branch: Number(payment.branch),
          supplier: Number(payment.supplier),
          bill: Number(payment.bill),
          amount: num(payment.amount),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Supplier payment recorded.");
      setPaymentOpen(false);
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to record payment", {
        description: d.summary || d.message,
      });
    },
  });

  if (mode)
    return (
      <BillForm
        mode={mode}
        active={active}
        form={form}
        setForm={setForm}
        branches={branches}
        suppliers={suppliers}
        supplier={supplier}
        accounts={accounts}
        pos={pos}
        grns={grns}
        approvers={approvers}
        totals={totals}
        tds={tds}
        total={total}
        files={files}
        setFiles={setFiles}
        saveMutation={saveMutation}
        onClose={() => setMode(null)}
      />
    );

  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Accounts Payable"
        subtitle="Manage supplier bills, approvals, payments, aging, tax, and PO / GRN matching."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={() => {
                setActive(null);
                setForm(blank(branchId));
                setFiles([]);
                setMode("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Supplier Bill
            </Button>
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["bills", "Supplier Bills"],
          ["payments", "Payments"],
          ["aging", "Aging Report"],
          ["approvals", "Approval Queue"],
        ]}
      />
      {tab === "bills" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi l="Total Payables" v={money(summary.total_payables || 0)} />
            <Kpi
              l="Overdue"
              v={money(summary.overdue_amount || 0)}
              tone="red"
            />
            <Kpi
              l="Due Next 7 Days"
              v={money(summary.due_next_7_days || 0)}
              tone="amber"
            />
            <Kpi
              l="Paid This Month"
              v={money(summary.paid_this_month || 0)}
              tone="green"
            />
          </div>
          <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Search">
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, search: e.target.value }))
                }
              />
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, date_from: e.target.value }))
                }
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, date_to: e.target.value }))
                }
              />
            </Field>
            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={filters.status}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, status: e.target.value }))
                }
              >
                <option value="">All</option>
                {[
                  "DRAFT",
                  "PENDING_APPROVAL",
                  "APPROVED",
                  "POSTED",
                  "PARTIALLY_PAID",
                  "PAID",
                  "OVERDUE",
                  "REJECTED",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Supplier">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={filters.supplier}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, supplier: e.target.value }))
                }
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <BillTable
            bills={bills}
            openBill={openBill}
            setWorkflow={setWorkflow}
            onPay={(b) => {
              setPayment({
                branch: String(b.branch?.id || b.branch),
                supplier: String(b.supplier?.id || b.supplier),
                bill: String(b.id),
                payment_date: today(),
                amount: String(b.balance_due || ""),
                payment_method: "BANK_TRANSFER",
                reference: "",
              });
              setPaymentOpen(true);
            }}
          />
        </>
      )}
      {tab === "payments" && (
        <SimpleTable
          headers={["Payment", "Bill", "Supplier", "Date", "Method", "Amount"]}
          rows={payments.map((p) => [
            p.payment_number,
            p.bill_number,
            p.supplier_name,
            p.payment_date,
            p.payment_method_display || p.payment_method,
            money(p.amount),
          ])}
        />
      )}
      {tab === "aging" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Current", "current"],
              ["1–30", "days_1_30"],
              ["31–60", "days_31_60"],
              ["61–90", "days_61_90"],
              ["90+", "days_90_plus"],
            ].map(([l, k]) => (
              <Kpi key={k} l={l} v={money(agingBuckets[k] || 0)} />
            ))}
          </div>
          <SimpleTable
            headers={[
              "Supplier",
              "Current",
              "1–30",
              "31–60",
              "61–90",
              "90+",
              "Total",
            ]}
            rows={agingSuppliers.map((s) => [
              s.supplier_name,
              money(s.current),
              money(s.days_1_30),
              money(s.days_31_60),
              money(s.days_61_90),
              money(s.days_90_plus),
              money(s.total),
            ])}
          />
        </>
      )}
      {tab === "approvals" && (
        <BillTable
          bills={bills.filter(
            (b) =>
              ["PENDING_APPROVAL"].includes(String(b.status).toUpperCase()) ||
              String(b.match_status).toUpperCase() === "VARIANCE",
          )}
          openBill={openBill}
          setWorkflow={setWorkflow}
          onPay={() => {}}
          compact
        />
      )}
      {paymentOpen && (
        <PaymentModal
          payment={payment}
          setPayment={setPayment}
          bills={bills}
          suppliers={suppliers}
          branches={branches}
          onClose={() => setPaymentOpen(false)}
          onSave={() => paymentMutation.mutate()}
          pending={paymentMutation.isPending}
        />
      )}
      {workflow && (
        <WorkflowModal
          workflow={workflow}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onClose={() => setWorkflow(null)}
          onConfirm={() => workflowMutation.mutate(workflow)}
          pending={workflowMutation.isPending}
        />
      )}
    </div>
  );
}

function BillForm({
  mode,
  active,
  form,
  setForm,
  branches,
  suppliers,
  supplier,
  accounts,
  pos,
  grns,
  approvers,
  totals,
  tds,
  total,
  files,
  setFiles,
  saveMutation,
  onClose,
}) {
  const ro = mode === "view";
  const upd = (i, k, v) =>
    setForm((x) => ({
      ...x,
      lines: x.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)),
    }));
  return (
    <div className="finance-module-page finance-workspace mx-auto w-full max-w-[1420px] space-y-5 pb-10">
      <PageHeader
        title={
          mode === "create"
            ? "Record Supplier Bill"
            : active?.bill_number || "Supplier Bill"
        }
        subtitle="Capture supplier invoice, matching, tax and approval details."
        actions={
          <div className="flex gap-2">
            {active && <StatusBadge status={active.status} />}
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        }
      />
      {ro && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Only Draft and Rejected bills can be edited.
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Section t="01 Bill Details">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Internal Bill Number">
              <Input
                disabled
                value={active?.bill_number || "Auto-generated on save"}
              />
            </Field>
            <Field label="Supplier Invoice Number *">
              <Input
                disabled={ro}
                value={form.supplier_invoice_number}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    supplier_invoice_number: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Bill Date *">
              <Input
                disabled={ro}
                type="date"
                value={form.bill_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, bill_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Due Date *">
              <Input
                disabled={ro}
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, due_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Supplier *">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.supplier}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    supplier: e.target.value,
                    purchase_order_id: "",
                    grn_id: "",
                  }))
                }
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch *">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.branch}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    branch: e.target.value,
                    expense_account: "",
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
            <Field label="Currency">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.currency}
                onChange={(e) =>
                  setForm((x) => ({ ...x, currency: e.target.value }))
                }
              >
                <option>AED</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Exchange Rate">
              <Input
                disabled={ro}
                type="number"
                value={form.exchange_rate}
                onChange={(e) =>
                  setForm((x) => ({ ...x, exchange_rate: e.target.value }))
                }
              />
            </Field>
            <Field label="Payment Terms">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.payment_terms}
                onChange={(e) => {
                  const t = TERMS.find(([v]) => v === e.target.value);
                  setForm((x) => ({
                    ...x,
                    payment_terms: e.target.value,
                    due_date: addDays(x.bill_date, t?.[2] || 0),
                  }));
                }}
              >
                {TERMS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment Method">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.payment_method}
                onChange={(e) =>
                  setForm((x) => ({ ...x, payment_method: e.target.value }))
                }
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </Field>
            <Field label="Buyer / Requester">
              <Input
                disabled={ro}
                value={form.buyer_requester}
                onChange={(e) =>
                  setForm((x) => ({ ...x, buyer_requester: e.target.value }))
                }
              />
            </Field>
            <Field label="Supplier TRN">
              <Input
                disabled
                value={supplier?.trn_number || supplier?.trn || "—"}
              />
            </Field>
          </div>
        </Section>
        <Section t="02 Supplier Information">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-bold">
              {supplier?.name || active?.supplier_name || "Select supplier"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              TRN: {supplier?.trn_number || supplier?.trn || "—"} · Contact:{" "}
              {supplier?.email || "—"}
            </p>
          </div>
        </Section>
        <Section t="03 PO / GRN Matching">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Purchase Order">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.purchase_order_id}
                onChange={(e) =>
                  setForm((x) => ({ ...x, purchase_order_id: e.target.value }))
                }
              >
                <option value="">Select PO</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_number || p.order_number || `PO-${p.id}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="GRN">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.grn_id}
                onChange={(e) =>
                  setForm((x) => ({ ...x, grn_id: e.target.value }))
                }
              >
                <option value="">Select GRN</option>
                {grns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.grn_number || `GRN-${g.id}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Match Method">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.match_method}
                onChange={(e) =>
                  setForm((x) => ({ ...x, match_method: e.target.value }))
                }
              >
                <option value="THREE_WAY">Three-way</option>
                <option value="TWO_WAY">Two-way</option>
                <option value="NO_PO">No PO</option>
              </select>
            </Field>
            <Field label="Match Status">
              <StatusBadge status={form.match_status} />
            </Field>
          </div>
        </Section>
        <Section t="04 Bill Lines">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] space-y-2">
              {form.lines.map((l, i) => (
                <div
                  key={l.id || i}
                  className="grid grid-cols-[1.35fr_1fr_.5fr_.65fr_.6fr_.65fr_.8fr_44px] gap-2"
                >
                  <Input
                    disabled={ro}
                    placeholder="Item / Expense"
                    value={l.item_expense}
                    onChange={(e) => upd(i, "item_expense", e.target.value)}
                  />
                  <Input
                    disabled={ro}
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => upd(i, "description", e.target.value)}
                  />
                  <Input
                    disabled={ro}
                    type="number"
                    value={l.quantity}
                    onChange={(e) => upd(i, "quantity", e.target.value)}
                  />
                  <Input
                    disabled={ro}
                    type="number"
                    value={l.unit_price}
                    onChange={(e) => upd(i, "unit_price", e.target.value)}
                  />
                  <Input
                    disabled={ro}
                    type="number"
                    value={l.discount_percent}
                    onChange={(e) => upd(i, "discount_percent", e.target.value)}
                  />
                  <select
                    disabled={ro}
                    className="h-10 rounded-md border bg-background px-2"
                    value={l.tax_category}
                    onChange={(e) => upd(i, "tax_category", e.target.value)}
                  >
                    {TAXES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Input
                    disabled
                    value={money(
                      num(l.quantity) *
                        num(l.unit_price) *
                        (1 - num(l.discount_percent) / 100) *
                        (1 +
                          (TAXES.find(([v]) => v === l.tax_category)?.[2] ||
                            0) /
                            100),
                    )}
                  />
                  <Button
                    disabled={ro || form.lines.length === 1}
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm((x) => ({
                        ...x,
                        lines: x.lines.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {!ro && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() =>
                setForm((x) => ({ ...x, lines: [...x.lines, line()] }))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          )}
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
              <Field label="Bill Narration">
                <Textarea
                  disabled={ro}
                  rows={4}
                  value={form.bill_narration}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, bill_narration: e.target.value }))
                  }
                />
              </Field>
              <Field label="Internal Notes">
                <Textarea
                  disabled={ro}
                  rows={4}
                  value={form.internal_notes}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, internal_notes: e.target.value }))
                  }
                />
              </Field>
              <Field label="Expense / Inventory Account *">
                <select
                  disabled={ro}
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={form.expense_account}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, expense_account: e.target.value }))
                  }
                >
                  <option value="">Select account</option>
                  {accounts
                    .filter((a) =>
                      ["ASSET", "EXPENSE"].includes(a.account_type),
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Cost Center">
                <Input
                  disabled={ro}
                  value={form.cost_center}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, cost_center: e.target.value }))
                  }
                />
              </Field>
              <Field label="Withholding Tax">
                <select
                  disabled={ro}
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={
                    form.apply_withholding_tax ? form.withholding_tax_rate : "0"
                  }
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      apply_withholding_tax: e.target.value !== "0",
                      withholding_tax_rate: e.target.value,
                    }))
                  }
                >
                  <option value="0">Not Applicable</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                </select>
              </Field>
              <Field label="Project">
                <Input
                  disabled={ro}
                  value={form.project}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, project: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Summary l="Subtotal" v={money(totals.subtotal)} />
              <Summary l="Discount" v={money(totals.discount)} />
              <Summary l="Taxable Amount" v={money(totals.taxable)} />
              <Summary l="VAT" v={money(totals.vat)} />
              <Summary l="Withholding" v={money(tds)} />
              <Summary l="Bill Total" v={money(total)} strong />
            </div>
          </div>
        </Section>
        <Section t="05 Supporting Documents">
          {ro ? (
            <div>
              {(active?.attachments || []).map((a) => (
                <a
                  key={a.id}
                  href={a.file_url || a.file}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border p-2 text-sm"
                >
                  {a.original_name}
                </a>
              ))}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8">
              <Upload className="h-8 w-8 text-blue-600" />
              <p className="mt-2 font-semibold">
                Attach supplier invoice, PO, GRN or delivery note
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
          )}
        </Section>
        <Section t="06 Approval & Audit">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Workflow">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approval_workflow}
              >
                <option value="AP_ACCOUNTANT_FINANCE_MANAGER">
                  AP Accountant → Finance Manager
                </option>
              </select>
            </Field>
            <Field label="Approver">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approver}
                onChange={(e) =>
                  setForm((x) => ({ ...x, approver: e.target.value }))
                }
              >
                <option value="">Select approver</option>
                {approvers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                disabled={ro}
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.approval_priority}
                onChange={(e) =>
                  setForm((x) => ({ ...x, approval_priority: e.target.value }))
                }
              >
                <option>NORMAL</option>
                <option>HIGH</option>
                <option>URGENT</option>
              </select>
            </Field>
          </div>
        </Section>
        <div className="flex justify-end gap-2 bg-muted/20 p-5">
          <Button variant="outline" onClick={onClose}>
            {ro ? "Close" : "Cancel"}
          </Button>
          {!ro && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate({ submit: false })}
              >
                Save Draft
              </Button>
              <Button onClick={() => saveMutation.mutate({ submit: true })}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BillTable({ bills, openBill, setWorkflow, onPay, compact }) {
  return (
    <SimpleTable
      headers={
        compact
          ? ["Bill", "Supplier", "Amount", "Match", "Status", "Actions"]
          : [
              "Bill",
              "Supplier",
              "Supplier Invoice",
              "Date",
              "Due",
              "Match",
              "Amount",
              "Paid",
              "Balance",
              "Status",
              "Actions",
            ]
      }
      rows={bills.map((b) =>
        compact
          ? [
              b.bill_number,
              b.supplier_name,
              money(b.total_amount),
              <StatusBadge status={b.match_status} />,
              <StatusBadge status={b.status} />,
              <Actions
                b={b}
                openBill={openBill}
                setWorkflow={setWorkflow}
                onPay={onPay}
              />,
            ]
          : [
              b.bill_number,
              b.supplier_name,
              b.supplier_invoice_number,
              b.bill_date,
              b.due_date,
              <StatusBadge status={b.match_status} />,
              money(b.total_amount),
              money(b.paid_amount),
              money(b.balance_due),
              <StatusBadge status={b.status} />,
              <Actions
                b={b}
                openBill={openBill}
                setWorkflow={setWorkflow}
                onPay={onPay}
              />,
            ],
      )}
    />
  );
}
function Actions({ b, openBill, setWorkflow, onPay }) {
  return (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" onClick={() => openBill(b, "view")}>
        <Eye className="h-4 w-4" />
      </Button>
      {editable(b.status) && (
        <Button size="icon" variant="ghost" onClick={() => openBill(b, "edit")}>
          <FileText className="h-4 w-4" />
        </Button>
      )}
      {["POSTED", "PARTIALLY_PAID", "OVERDUE"].includes(
        String(b.status).toUpperCase(),
      ) && (
        <Button size="icon" variant="ghost" onClick={() => onPay(b)}>
          <CreditCard className="h-4 w-4" />
        </Button>
      )}
      {["DRAFT", "REJECTED"].includes(String(b.status).toUpperCase()) && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setWorkflow({ bill: b, action: "submit-approval" })}
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
      {String(b.status).toUpperCase() === "PENDING_APPROVAL" && (
        <>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setWorkflow({ bill: b, action: "approve" })}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setWorkflow({ bill: b, action: "reject" })}
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}
      {String(b.status).toUpperCase() === "APPROVED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setWorkflow({ bill: b, action: "post" })}
        >
          Post
        </Button>
      )}
    </div>
  );
}
function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5">
      {items.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${value === v ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted/40"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
function SimpleTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {r.map((v, j) => (
                <td key={j} className="px-4 py-3">
                  {v ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td
                colSpan={headers.length}
                className="p-10 text-center text-muted-foreground"
              >
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function PaymentModal({
  payment,
  setPayment,
  bills,
  suppliers,
  branches,
  onClose,
  onSave,
  pending,
}) {
  return (
    <Modal title="Record Supplier Payment" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={payment.branch}
            onChange={(e) =>
              setPayment((x) => ({ ...x, branch: e.target.value }))
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
        <Field label="Supplier">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={payment.supplier}
            onChange={(e) =>
              setPayment((x) => ({ ...x, supplier: e.target.value, bill: "" }))
            }
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bill">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={payment.bill}
            onChange={(e) => {
              const b = bills.find((x) => String(x.id) === e.target.value);
              setPayment((x) => ({
                ...x,
                bill: e.target.value,
                amount: String(b?.balance_due || ""),
              }));
            }}
          >
            <option value="">Select bill</option>
            {bills
              .filter(
                (b) =>
                  !payment.supplier ||
                  String(b.supplier?.id || b.supplier) ===
                    String(payment.supplier),
              )
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bill_number} — {money(b.balance_due)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={payment.payment_date}
            onChange={(e) =>
              setPayment((x) => ({ ...x, payment_date: e.target.value }))
            }
          />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            value={payment.amount}
            onChange={(e) =>
              setPayment((x) => ({ ...x, amount: e.target.value }))
            }
          />
        </Field>
        <Field label="Method">
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={payment.payment_method}
            onChange={(e) =>
              setPayment((x) => ({ ...x, payment_method: e.target.value }))
            }
          >
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={onSave}>
          Record Payment
        </Button>
      </div>
    </Modal>
  );
}
function WorkflowModal({
  workflow,
  rejectReason,
  setRejectReason,
  onClose,
  onConfirm,
  pending,
}) {
  return (
    <Modal
      title={`${workflow.action.replaceAll("-", " ")} ${workflow.bill.bill_number}`}
      onClose={onClose}
    >
      {workflow.action === "reject" && (
        <Field label="Rejection Reason">
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Field>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={
            pending || (workflow.action === "reject" && !rejectReason.trim())
          }
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-background p-5">
        <div className="mb-5 flex justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Section({ t, children }) {
  return (
    <section className="border-b p-5 md:p-6">
      <h3 className="mb-4 font-bold">{t}</h3>
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
function Kpi({ l, v, tone }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{l}</p>
      <p
        className={`mt-2 text-2xl font-black ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-600" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}
function Summary({ l, v, strong }) {
  return (
    <div
      className={`flex justify-between border-b px-4 py-3 ${strong ? "bg-blue-50 font-bold" : ""}`}
    >
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );
}
