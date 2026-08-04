import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, Modal, Field } from "./FinanceSectionUI";
import { extractRows, money, today } from "./accountingUtils";
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const line = () => ({
  description: "",
  quantity: "1",
  unit_price: "",
  vat_rate: "5",
});
const blank = () => ({
  branch: "",
  supplier: "",
  bill_number: `BILL-${Date.now()}`,
  supplier_invoice_number: "",
  bill_date: today(),
  due_date: addDays(today(), 30),
  payment_terms: "NET_30",
  purchase_order_id: "",
  grn_id: "",
  apply_withholding_tax: false,
  withholding_tax_rate: "0",
  route_for_approval: true,
  approval_threshold: "25000",
  approver: "",
  status: "DRAFT",
  notes: "",
  lines: [line()],
});
export default function PayablesPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("bills"),
    [open, setOpen] = React.useState(false),
    [search, setSearch] = React.useState(""),
    [form, setForm] = React.useState(blank);
  React.useEffect(() => {
    if (branchId) setForm((v) => ({ ...v, branch: String(branchId) }));
  }, [branchId]);
  const billsQ = useQuery({
    queryKey: ["payable-bills", branchId, search],
    queryFn: () =>
      api.get("/finance/payable-bills/", {
        params: {
          ...branchParams,
          search: search || undefined,
          page_size: 1000,
        },
      }),
    staleTime: 0,
  });
  const paymentsQ = useQuery({
    queryKey: ["payable-payments", branchId],
    queryFn: () =>
      api.get("/finance/payable-payments/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });
  const agingQ = useQuery({
    queryKey: ["payable-aging", branchId],
    queryFn: () =>
      api.get("/finance/payable-bills/aging-summary/", {
        params: branchParams,
      }),
  });
  const suppliersQ = useQuery({
    queryKey: ["payable-suppliers"],
    queryFn: () => api.get("/suppliers/", { params: { page_size: 1000 } }),
  });
  const usersQ = useQuery({
    queryKey: ["payable-approvers"],
    queryFn: () => api.get("/auth/users/form-options/"),
  });
  const bills = extractRows(billsQ.data),
    payments = extractRows(paymentsQ.data),
    suppliers = extractRows(suppliersQ.data);
  const raw = usersQ.data?.data ?? usersQ.data;
  const approvers = Array.isArray(raw)
    ? raw
    : raw?.users || raw?.results || raw?.data?.users || [];
  const aging = agingQ.data?.data?.data || agingQ.data?.data || {};
  const totals = React.useMemo(
    () =>
      form.lines.reduce(
        (r, l) => {
          const a = Number(l.quantity || 0) * Number(l.unit_price || 0),
            v = (a * Number(l.vat_rate || 0)) / 100;
          return { s: r.s + a, v: r.v + v };
        },
        { s: 0, v: 0 },
      ),
    [form.lines],
  );
  const tds = form.apply_withholding_tax
      ? (totals.s * Number(form.withholding_tax_rate || 0)) / 100
      : 0,
    total = totals.s + totals.v - tds;
  const save = useMutation({
    mutationFn: async (submit) => {
      const payload = {
        ...form,
        branch: Number(form.branch),
        supplier: Number(form.supplier),
        approver: form.approver ? Number(form.approver) : null,
        purchase_order_id: form.purchase_order_id
          ? Number(form.purchase_order_id)
          : null,
        grn_id: form.grn_id ? Number(form.grn_id) : null,
        withholding_tax_rate: Number(form.withholding_tax_rate),
        approval_threshold: Number(form.approval_threshold),
        lines: form.lines.map((l) => ({
          ...l,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          vat_rate: Number(l.vat_rate),
        })),
      };
      const r = await api.post("/finance/payable-bills/", payload, {
        skipGlobalErrorToast: true,
      });
      const bill = r?.data?.data || r?.data || r;
      if (submit)
        await api.post(
          `/finance/payable-bills/${bill.id}/submit-approval/`,
          {},
          { skipGlobalErrorToast: true },
        );
      return r;
    },
    onSuccess: async (_, submit) => {
      await qc.invalidateQueries({ queryKey: ["payable-bills"], exact: false });
      await billsQ.refetch();
      toast.success(
        submit ? "Bill submitted for approval." : "Bill saved as draft.",
      );
      setOpen(false);
      setForm({ ...blank(), branch: branchId ? String(branchId) : "" });
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to save bill", {
        description: d.summary || d.message,
      });
    },
  });
  const upd = (i, k, v) =>
    setForm((x) => ({
      ...x,
      lines: x.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)),
    }));
  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="Accounts Payable"
        subtitle="Supplier bills, payments, aging, three-way matching, withholding tax, and approvals."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "bills", label: "Supplier Bills" },
          { value: "payments", label: "Payments" },
          { value: "aging", label: "Aging Report" },
        ]}
      />
      {tab === "bills" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Input
              className="max-w-sm"
              placeholder="Search supplier or bill no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Bill
            </Button>
          </div>
          <Table
            headers={[
              "Bill No.",
              "Supplier",
              "Date",
              "Due Date",
              "Amount",
              "Paid",
              "Balance",
              "Status",
            ]}
            rows={bills.map((b) => [
              b.bill_number,
              b.supplier_name,
              b.bill_date,
              b.due_date,
              money(b.total_amount),
              money(b.paid_amount),
              money(b.balance_due),
              b.status_display || b.status,
            ])}
          />
        </>
      )}
      {tab === "payments" && (
        <Table
          headers={[
            "Payment No.",
            "Bill",
            "Supplier",
            "Date",
            "Method",
            "Amount",
          ]}
          rows={payments.map((p) => [
            p.payment_number,
            p.bill_number,
            p.supplier_name,
            p.payment_date,
            p.payment_method,
            money(p.amount),
          ])}
        />
      )}{" "}
      {tab === "aging" && (
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["Current", aging.current],
            ["1–30 days", aging.days_1_30],
            ["31–60 days", aging.days_31_60],
            ["61–90 days", aging.days_61_90],
            ["90+ days", aging.days_90_plus],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{l}</p>
              <p className="mt-2 text-xl font-semibold">{money(v)}</p>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record Bill"
        eyebrow="Finance & Accounting · Accounts Payable"
        footer={
          <>
            <Button variant="outline" onClick={() => save.mutate(false)}>
              Save as Draft
            </Button>
            <Button
              className="bg-slate-900 text-white"
              onClick={() => save.mutate(true)}
            >
              Submit for Approval
            </Button>
          </>
        }
      >
        <section className="border-b p-6">
          <h3 className="mb-4 text-lg font-semibold">01 Supplier & terms</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Supplier *">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.supplier}
                onChange={(e) =>
                  setForm((x) => ({ ...x, supplier: e.target.value }))
                }
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.supplier_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment Terms">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.payment_terms}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    payment_terms: e.target.value,
                    due_date: addDays(
                      x.bill_date,
                      {
                        DUE_ON_RECEIPT: 0,
                        NET_7: 7,
                        NET_15: 15,
                        NET_30: 30,
                        NET_45: 45,
                        NET_60: 60,
                      }[e.target.value],
                    ),
                  }))
                }
              >
                {[
                  "DUE_ON_RECEIPT",
                  "NET_7",
                  "NET_15",
                  "NET_30",
                  "NET_45",
                  "NET_60",
                ].map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bill No.">
              <Input
                value={form.bill_number}
                onChange={(e) =>
                  setForm((x) => ({ ...x, bill_number: e.target.value }))
                }
              />
            </Field>
            <Field label="Supplier Invoice No. *">
              <Input
                value={form.supplier_invoice_number}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    supplier_invoice_number: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Bill Date">
              <Input
                type="date"
                value={form.bill_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, bill_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Due Date">
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((x) => ({ ...x, due_date: e.target.value }))
                }
              />
            </Field>
          </div>
        </section>
        <section className="border-b p-6">
          <h3 className="mb-4 text-lg font-semibold">
            02 Purchase-order match
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Purchase Order ID">
              <Input
                type="number"
                value={form.purchase_order_id}
                onChange={(e) =>
                  setForm((x) => ({ ...x, purchase_order_id: e.target.value }))
                }
              />
            </Field>
            <Field label="Goods Received Note ID">
              <Input
                type="number"
                value={form.grn_id}
                onChange={(e) =>
                  setForm((x) => ({ ...x, grn_id: e.target.value }))
                }
              />
            </Field>
            <div className="rounded-xl border bg-green-50 p-4 dark:bg-green-950/20">
              <p className="text-xs uppercase text-muted-foreground">
                This bill
              </p>
              <p className="mt-2 text-lg font-semibold">{money(total)}</p>
            </div>
          </div>
        </section>
        <section className="border-b p-6">
          <h3 className="mb-4 text-lg font-semibold">03 Line items</h3>
          <div className="space-y-3">
            {form.lines.map((l, i) => (
              <div
                key={i}
                className="grid gap-3 md:grid-cols-[2fr_.6fr_.8fr_.5fr_.9fr_auto]"
              >
                <Input
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) => upd(i, "description", e.target.value)}
                />
                <Input
                  type="number"
                  value={l.quantity}
                  onChange={(e) => upd(i, "quantity", e.target.value)}
                />
                <Input
                  type="number"
                  value={l.unit_price}
                  onChange={(e) => upd(i, "unit_price", e.target.value)}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3"
                  value={l.vat_rate}
                  onChange={(e) => upd(i, "vat_rate", e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                </select>
                <div className="flex h-10 items-center rounded-md border px-3">
                  {money(Number(l.quantity || 0) * Number(l.unit_price || 0))}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={form.lines.length === 1}
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
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              setForm((x) => ({ ...x, lines: [...x.lines, line()] }))
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
          <div className="ml-auto mt-5 max-w-sm space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{money(totals.s)}</b>
            </div>
            <div className="flex justify-between">
              <span>VAT</span>
              <b>{money(totals.v)}</b>
            </div>
            <div className="flex justify-between">
              <span>Withholding Tax</span>
              <b>{money(tds)}</b>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span>Net payable</span>
              <b>{money(total)}</b>
            </div>
          </div>
        </section>
        <section className="p-6">
          <h3 className="mb-4 text-lg font-semibold">
            04 Withholding & approval
          </h3>
          <Toggle
            label="Apply withholding tax (TDS)"
            checked={form.apply_withholding_tax}
            onChange={(v) =>
              setForm((x) => ({ ...x, apply_withholding_tax: v }))
            }
          />
          {form.apply_withholding_tax && (
            <Field label="TDS Rate %">
              <Input
                type="number"
                value={form.withholding_tax_rate}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    withholding_tax_rate: e.target.value,
                  }))
                }
              />
            </Field>
          )}
          <div className="mt-4">
            <Toggle
              label="Route for approval"
              checked={form.route_for_approval}
              onChange={(v) =>
                setForm((x) => ({ ...x, route_for_approval: v }))
              }
            />
          </div>
          {form.route_for_approval && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Approval Threshold">
                <Input
                  type="number"
                  value={form.approval_threshold}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      approval_threshold: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Approver">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={form.approver}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, approver: e.target.value }))
                  }
                >
                  <option value="">Select approver</option>
                  {approvers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.name || a.username || a.email}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </section>
      </Modal>
    </div>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border p-4">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
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
