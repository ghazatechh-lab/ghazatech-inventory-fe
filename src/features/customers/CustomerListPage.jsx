import React from "react";
import { Download, Plus, Save, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createForm = () => ({
  customer_type: "BUSINESS",
  customer_name: "",
  contact_person: "",
  phone: "",
  email: "",
  trn: "",
  trade_license: "",
  billing_address: "",
  payment_terms: "NET_30",
  credit_limit: 0,
  category: "RETAIL",
  notes: "",
  is_active: true,
});

export default function CustomerListPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(createForm);
  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "customers",
    "/customers/",
    {},
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["customers-summary"],
    queryFn: async () => unwrap(await api.get("/customers/summary/")),
  });

  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.customer_name.trim())
      next.customer_name = "Customer name is required.";
    if (form.email && !form.email.includes("@"))
      next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () =>
      api.post(
        "/customers/",
        {
          ...form,
          credit_limit: number(form.credit_limit),
        },
        { skipGlobalErrorToast: true },
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["customers-summary"] }),
      ]);
      toast.success("Customer created.");
      setOpen(false);
      setForm(createForm());
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to create customer", {
        description: details.summary || details.message,
      });
    },
  });

  const exportRows = async () => {
    const response = await api.get("/customers/export/", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "customers.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "customer_name", header: "Customer" },
    { key: "phone", header: "Contact" },
    { key: "order_count", header: "Orders" },
    {
      key: "balance_due",
      header: "Balance Due",
      align: "right",
      cell: (row) => <CurrencyText value={row.balance_due || 0} />,
    },
    {
      key: "last_order_date",
      header: "Last Order",
      cell: (row) =>
        row.last_order_date ? <DateText value={row.last_order_date} /> : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status || (row.is_active ? "ACTIVE" : "INACTIVE")}
        />
      ),
    },
  ];

  return (
    <div className="customer-module-page customer-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Customers"
        subtitle="Customer records, balances, and contact details"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setForm(createForm());
                setOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Customers"
          value={summary.total_customers || 0}
        />
        <MetricCard
          label="Active This Month"
          value={summary.active_this_month || 0}
        />
        <MetricCard
          label="Total Receivables"
          value={<CurrencyText value={summary.total_receivables || 0} />}
        />
        <MetricCard
          label="New Leads to Convert"
          value={summary.new_leads || 0}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Customers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer records, balances, and contact details
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search customer, phone, email"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">New Customer</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a customer record
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["BUSINESS", "Business"],
                  ["INDIVIDUAL", "Individual"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm("customer_type", value)}
                    className={
                      form.customer_type === value
                        ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-3 text-sm text-blue-600"
                        : "rounded-lg border px-3 py-3 text-sm"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Basic Details
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>
                      {form.customer_type === "BUSINESS"
                        ? "Company Name"
                        : "Customer Name"}{" "}
                      *
                    </Label>
                    <Input
                      value={form.customer_name}
                      onChange={(event) =>
                        updateForm("customer_name", event.target.value)
                      }
                      className="mt-2"
                      placeholder="e.g. Falcon Retail Co."
                    />
                    {errors.customer_name && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.customer_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Contact Person</Label>
                    <Input
                      value={form.contact_person}
                      onChange={(event) =>
                        updateForm("contact_person", event.target.value)
                      }
                      className="mt-2"
                      placeholder="e.g. Ahmed Al Falasi"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(event) =>
                        updateForm("phone", event.target.value)
                      }
                      className="mt-2"
                      placeholder="+971 5X XXX XXXX"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={form.email}
                      onChange={(event) =>
                        updateForm("email", event.target.value)
                      }
                      className="mt-2"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <Label>TRN</Label>
                    <Input
                      value={form.trn}
                      onChange={(event) =>
                        updateForm("trn", event.target.value)
                      }
                      className="mt-2"
                      placeholder="100XXXXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label>Trade License #</Label>
                    <Input
                      value={form.trade_license}
                      onChange={(event) =>
                        updateForm("trade_license", event.target.value)
                      }
                      className="mt-2"
                      placeholder="e.g. CN-1234567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Billing Address</Label>
                    <Textarea
                      value={form.billing_address}
                      onChange={(event) =>
                        updateForm("billing_address", event.target.value)
                      }
                      rows={3}
                      className="mt-2"
                      placeholder="Street, area, city, emirate"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Sales Settings
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Payment Terms</Label>
                    <Select
                      value={form.payment_terms}
                      onValueChange={(value) =>
                        updateForm("payment_terms", value)
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DUE_ON_RECEIPT">
                          Due on Receipt
                        </SelectItem>
                        <SelectItem value="NET_15">Net 15</SelectItem>
                        <SelectItem value="NET_30">Net 30</SelectItem>
                        <SelectItem value="NET_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Credit Limit (AED)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.credit_limit}
                      onChange={(event) =>
                        updateForm("credit_limit", event.target.value)
                      }
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave 0 for no limit
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["RETAIL", "Retail"],
                    ["WHOLESALE", "Wholesale"],
                    ["CORPORATE", "Corporate"],
                    ["LEAD", "Lead"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("category", value)}
                      className={
                        form.category === value
                          ? "rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm text-blue-600"
                          : "rounded-full border px-4 py-2 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  className="mt-2"
                  placeholder="Anything else worth noting about this customer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => validate() && mutation.mutate()}
                disabled={mutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
