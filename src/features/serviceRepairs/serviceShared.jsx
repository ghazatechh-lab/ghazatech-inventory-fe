import React from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const ACTIVE_STATUSES = [
  ["RECEIVED", "Received"],
  ["DIAGNOSING", "Diagnosing"],
  ["AWAITING_APPROVAL", "Awaiting Approval"],
  ["REPAIRING", "Repairing"],
  ["READY", "Ready for Delivery"],
];

export const ALL_STATUSES = [
  ...ACTIVE_STATUSES,
  ["COMPLETED", "Completed"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
];

export const LAPTOP_BRANDS = [
  "Acer",
  "Apple",
  "Asus",
  "Dell",
  "Dynabook",
  "Fujitsu",
  "HP",
  "Huawei",
  "Lenovo",
  "LG",
  "Microsoft",
  "MSI",
  "Razer",
  "Samsung",
  "Toshiba",
  "Other",
];

export const emptyCharge = () => ({
  charge_type: "PART",
  description: "",
  quantity: 1,
  unit_price: "",
  notes: "",
});

export const emptyJob = (branchId = "") => ({
  branch: branchId ? String(branchId) : "",
  customer: null,
  customer_name: "",
  phone: "",
  email: "",
  device_type: "Laptop",
  brand: "Dell",
  model: "",
  serial_number: "",
  password_or_pin: "",
  accessories_received: "",
  device_condition: "",
  complaint: "",
  diagnosis: "",
  technician_notes: "",
  internal_notes: "",
  technician: "",
  priority: "NORMAL",
  status: "RECEIVED",
  expected_completion_date: "",
  approval_notes: "",
  customer_approved: false,
  labour_charge: "0.00",
  discount_amount: "0.00",
  tax_amount: "0.00",
  amount_paid: "0.00",
  payment_status: "UNPAID",
  charges: [],
});

export const rowsFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
};

export const money = (value) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export const statusClass = (status) => {
  const map = {
    RECEIVED: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
    DIAGNOSING:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
    AWAITING_APPROVAL:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    REPAIRING:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
    READY:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    COMPLETED:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    DELIVERED:
      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
    CANCELLED: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  };
  return map[status] || "bg-slate-100 text-slate-700";
};

export function ServiceHero({ title, description, actions }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-[#061126] via-[#142f68] to-[#0e7b8f] px-7 py-8 shadow-[0_22px_55px_rgba(15,23,42,.20)] md:px-9 md:py-10">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] !text-cyan-200">
            Service Operations
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight !text-white drop-shadow-sm md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 !text-slate-200 md:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200",
    violet:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {helper}
          </p>
        </div>
        {Icon ? (
          <span
            className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(status)}`}
    >
      {label || status?.replaceAll("_", " ")}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-5xl",
}) {
  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm md:p-6"
      onMouseDown={onClose}
    >
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-950`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10 md:px-7">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-5 md:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

const fieldClass =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-900";
const labelClass = "text-sm font-bold text-slate-700 dark:text-slate-200";

export function ServiceJobForm({
  form,
  setForm,
  employees = [],
  branches = [],
  showStatus = true,
}) {
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateCharge = (index, key, value) =>
    setForm((current) => ({
      ...current,
      charges: current.charges.map((charge, chargeIndex) =>
        chargeIndex === index ? { ...charge, [key]: value } : charge,
      ),
    }));

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
          Customer & Device
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.length ? (
            <label className={labelClass}>
              Branch *
              <select
                className={fieldClass}
                value={form.branch || ""}
                onChange={(e) => update("branch", e.target.value)}
                required
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.branch_name || b.code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={labelClass}>
            Customer Name *
            <Input
              className="mt-1.5"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Mobile Number *
            <Input
              className="mt-1.5"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Email
            <Input
              className="mt-1.5"
              type="email"
              value={form.email || ""}
              onChange={(e) => update("email", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Device Type
            <select
              className={fieldClass}
              value={form.device_type}
              onChange={(e) => update("device_type", e.target.value)}
            >
              <option>Laptop</option>
              <option>Desktop</option>
              <option>All-in-One</option>
              <option>Tablet</option>
              <option>Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Brand *
            <select
              className={fieldClass}
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              required
            >
              {LAPTOP_BRANDS.map((brand) => (
                <option key={brand}>{brand}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Model *
            <Input
              className="mt-1.5"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Serial Number
            <Input
              className="mt-1.5"
              value={form.serial_number || ""}
              onChange={(e) => update("serial_number", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Password / PIN
            <Input
              className="mt-1.5"
              value={form.password_or_pin || ""}
              onChange={(e) => update("password_or_pin", e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Accessories Received
            <Textarea
              className="mt-1.5"
              rows={3}
              value={form.accessories_received || ""}
              onChange={(e) => update("accessories_received", e.target.value)}
              placeholder="Charger, bag, mouse, adapters..."
            />
          </label>
          <label className={labelClass}>
            Device Condition
            <Textarea
              className="mt-1.5"
              rows={3}
              value={form.device_condition || ""}
              onChange={(e) => update("device_condition", e.target.value)}
              placeholder="Scratches, broken hinges, missing screws..."
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Customer Complaint *
            <Textarea
              className="mt-1.5"
              rows={3}
              value={form.complaint}
              onChange={(e) => update("complaint", e.target.value)}
              required
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
          Service Management
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Technician
            <select
              className={fieldClass}
              value={form.technician || ""}
              onChange={(e) => update("technician", e.target.value)}
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name ||
                    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
                    employee.employee_code}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Priority
            <select
              className={fieldClass}
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          {showStatus ? (
            <label className={labelClass}>
              Status
              <select
                className={fieldClass}
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {ALL_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={labelClass}>
            Expected Completion
            <Input
              className="mt-1.5"
              type="date"
              value={form.expected_completion_date || ""}
              onChange={(e) =>
                update("expected_completion_date", e.target.value)
              }
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Diagnosis
            <Textarea
              className="mt-1.5"
              rows={4}
              value={form.diagnosis || ""}
              onChange={(e) => update("diagnosis", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Technician Notes
            <Textarea
              className="mt-1.5"
              rows={4}
              value={form.technician_notes || ""}
              onChange={(e) => update("technician_notes", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
            Parts & Charges
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((current) => ({
                ...current,
                charges: [...current.charges, emptyCharge()],
              }))
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Charge
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {form.charges?.length ? (
            form.charges.map((charge, index) => (
              <div
                key={charge.id || index}
                className="grid gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10 md:grid-cols-[130px_1fr_90px_120px_44px]"
              >
                <select
                  className={fieldClass.replace("mt-1.5 ", "")}
                  value={charge.charge_type}
                  onChange={(e) =>
                    updateCharge(index, "charge_type", e.target.value)
                  }
                >
                  <option value="PART">Part</option>
                  <option value="SERVICE">Service</option>
                  <option value="OTHER">Other</option>
                </select>
                <Input
                  value={charge.description}
                  onChange={(e) =>
                    updateCharge(index, "description", e.target.value)
                  }
                  placeholder="Part or service description"
                />
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={charge.quantity}
                  onChange={(e) =>
                    updateCharge(index, "quantity", e.target.value)
                  }
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={charge.unit_price}
                  onChange={(e) =>
                    updateCharge(index, "unit_price", e.target.value)
                  }
                  placeholder="AED"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      charges: current.charges.filter(
                        (_, chargeIndex) => chargeIndex !== index,
                      ),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/15">
              No parts or service charges added.
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Labour Charge
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={form.labour_charge}
              onChange={(e) => update("labour_charge", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Discount
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={form.discount_amount}
              onChange={(e) => update("discount_amount", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Tax Amount
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={form.tax_amount}
              onChange={(e) => update("tax_amount", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Amount Paid
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={(e) => update("amount_paid", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Payment Status
            <select
              className={fieldClass}
              value={form.payment_status}
              onChange={(e) => update("payment_status", e.target.value)}
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}

export function SubmitButton({ pending, children }) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-blue-600 text-white hover:bg-blue-700"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
