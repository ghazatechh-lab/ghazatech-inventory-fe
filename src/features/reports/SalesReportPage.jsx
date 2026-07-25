import React from "react";
import { Download, FileSpreadsheet, Plus, Save, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const reportTypes = [
  ["MONTHLY_SALES_SUMMARY", "Monthly Sales Summary"],
  ["SALES_BY_CUSTOMER", "Sales by Customer"],
  ["SALES_BY_PRODUCT", "Sales by Product"],
  ["SALES_BY_CASHIER", "Sales by Cashier"],
  ["PAYMENT_METHOD_SUMMARY", "Payment Method Summary"],
  ["SALES_CHANNEL_SUMMARY", "Sales Channel Summary"],
  ["PROFITABILITY_SUMMARY", "Profitability Summary"],
];

const periodOptions = [
  ["THIS_MONTH", "This Month"],
  ["THIS_QUARTER", "This Quarter"],
  ["THIS_YEAR", "This Year"],
  ["CUSTOM", "Custom"],
];

const groupOptions = [
  ["CUSTOMER", "Customer"],
  ["PRODUCT", "Product"],
  ["CASHIER", "Cashier"],
  ["PAYMENT_METHOD", "Payment Method"],
  ["SALES_CHANNEL", "Sales Channel"],
];

const formatOptions = [
  ["PDF", "PDF"],
  ["EXCEL", "Excel"],
  ["CSV", "CSV"],
];

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  report_name: "Monthly Sales Summary",
  report_type: "MONTHLY_SALES_SUMMARY",
  period: "THIS_QUARTER",
  custom_start: "",
  custom_end: "",
  group_by: "CUSTOMER",
  sales_channel: "ALL",
  customer: "",
  output_format: "PDF",
  include_line_items: true,
  owner_team: "Finance Team",
  email_to: "",
  recurrence: "ONCE",
});

export default function SalesReportsPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [errors, setErrors] = React.useState({});

  const [form, setForm] = React.useState(() => createForm(branchId));

  const { query, q, setQ, page, setPage } = useListQuery(
    "sales-reports",
    "/sales/reports/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["sales-reports-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/reports/summary/", {
          params: branchParams,
        }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["sales-reports-form-options", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/reports/form-options/", {
          params: branchParams,
        }),
      ),
    enabled: open,
  });

  const summary = summaryResponse || {};

  const options = optionsResponse || {};

  const customers = normalizeList(options.customers);

  const teams = normalizeList(options.owner_teams);

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const selectReportType = (value) => {
    const option = reportTypes.find(([key]) => key === value);

    setForm((current) => ({
      ...current,
      report_type: value,
      report_name: option?.[1] || current.report_name,
    }));
  };

  const openNew = () => {
    setForm(createForm(branchId));
    setErrors({});
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setErrors({});
    setForm(createForm(branchId));
  };

  const validate = () => {
    const next = {};

    if (!form.report_name.trim()) {
      next.report_name = "Report name is required.";
    }

    if (!form.report_type) {
      next.report_type = "Report type is required.";
    }

    if (form.period === "CUSTOM") {
      if (!form.custom_start) {
        next.custom_start = "Start date is required.";
      }

      if (!form.custom_end) {
        next.custom_end = "End date is required.";
      }

      if (
        form.custom_start &&
        form.custom_end &&
        form.custom_end < form.custom_start
      ) {
        next.custom_end = "End date cannot be before start date.";
      }
    }

    if (form.email_to && !form.email_to.includes("@")) {
      next.email_to = "Enter a valid email address.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const generateMutation = useMutation({
    mutationFn: async () =>
      api.post(
        "/sales/reports/",
        {
          branch: form.branch ? Number(form.branch) : null,

          report_name: form.report_name,

          report_type: form.report_type,

          period: form.period,

          custom_start: form.period === "CUSTOM" ? form.custom_start : null,

          custom_end: form.period === "CUSTOM" ? form.custom_end : null,

          group_by: form.group_by,

          sales_channel: form.sales_channel,

          customer: form.customer ? Number(form.customer) : null,

          output_format: form.output_format,

          include_line_items: form.include_line_items,

          owner_team: form.owner_team,

          email_to: form.email_to || null,

          recurrence: form.recurrence,
        },
        {
          skipGlobalErrorToast: true,
        },
      ),

    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sales-reports"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["sales-reports-summary"],
        }),
      ]);

      const report = unwrap(response);

      toast.success(
        form.recurrence === "RECURRING"
          ? "Recurring report configured."
          : "Report generated.",
      );

      close();

      if (form.recurrence === "ONCE" && report?.id) {
        downloadReport(report);
      }
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to generate report", {
        description:
          details.summary ||
          details.message ||
          "Please review the report settings.",
      });
    },
  });

  const submit = () => {
    if (!validate()) return;
    generateMutation.mutate();
  };

  const downloadReport = async (report) => {
    const response = await api.get(`/sales/reports/${report.id}/download/`, {
      responseType: "blob",
    });

    const extension =
      {
        PDF: "pdf",
        EXCEL: "xlsx",
        CSV: "csv",
      }[report.output_format] || "csv";

    const url = window.URL.createObjectURL(new Blob([response.data]));

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${report.report_name || "sales-report"}.${extension}`;

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const exportList = async () => {
    const response = await api.get("/sales/reports/export/", {
      params: branchParams,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "sales-reports.csv";

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const columns = React.useMemo(
    () => [
      {
        key: "report_name",
        header: "Report",
        sortKey: "report_name",
        sortType: "text",
        cell: (row) => (
          <button
            type="button"
            onClick={() => downloadReport(row)}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.report_name}
          </button>
        ),
      },

      {
        key: "period_display",
        header: "Period",
        sortKey: "period",
        sortType: "text",
      },

      {
        key: "generated_at",
        header: "Generated",
        sortKey: "generated_at",
        sortType: "date",
        cell: (row) =>
          row.generated_at ? <DateText value={row.generated_at} /> : "—",
      },

      {
        key: "output_format",
        header: "Format",
        sortKey: "output_format",
        sortType: "text",
      },

      {
        key: "owner_team",
        header: "Owner",
        sortKey: "owner_team",
        sortType: "text",
        cell: (row) => (
          <span className="font-medium">{row.owner_team || "—"}</span>
        ),
      },

      {
        key: "status",
        header: "Status",
        sortKey: "status",
        sortType: "status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Sales Reports"
        subtitle="Performance summaries across the sales cycle"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportList}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              type="button"
              onClick={openNew}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue (MTD)"
          value={<CurrencyText value={summary.revenue_mtd || 0} />}
          subtitle={
            summary.revenue_change
              ? `${summary.revenue_change}%`
              : "Month-to-date"
          }
        />

        <MetricCard
          label="Orders (MTD)"
          value={summary.orders_mtd || 0}
          subtitle={
            summary.orders_change
              ? `${summary.orders_change}%`
              : "Month-to-date"
          }
        />

        <MetricCard
          label="Top Customer"
          value={summary.top_customer || "—"}
          subtitle={
            summary.top_customer_value ? (
              <CurrencyText value={summary.top_customer_value} />
            ) : (
              "No sales yet"
            )
          }
        />

        <MetricCard
          label="Conversion Rate"
          value={`${summary.conversion_rate || 0}%`}
          subtitle="Quotation → order"
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Sales Reports</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Performance summaries across the sales cycle
            </p>
          </div>

          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search report, type, owner, or status"
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
          emptyTitle="No Sales Reports"
          emptyDescription="Generate a report to track sales performance."
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">New Report</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Build a sales performance report
                </p>
              </div>

              <Button type="button" size="icon" variant="ghost" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Report Type
                </p>

                <Select
                  value={form.report_type}
                  onValueChange={selectReportType}
                >
                  <SelectTrigger className="mt-3">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {reportTypes.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Period
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {periodOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("period", value)}
                      className={
                        form.period === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {form.period === "CUSTOM" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Start Date</Label>

                      <Input
                        type="date"
                        value={form.custom_start}
                        onChange={(event) =>
                          updateForm("custom_start", event.target.value)
                        }
                        className="mt-2"
                      />

                      {errors.custom_start && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.custom_start}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>End Date</Label>

                      <Input
                        type="date"
                        value={form.custom_end}
                        onChange={(event) =>
                          updateForm("custom_end", event.target.value)
                        }
                        className="mt-2"
                      />

                      {errors.custom_end && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.custom_end}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Group By
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {groupOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("group_by", value)}
                      className={
                        form.group_by === value
                          ? "rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-full border border-slate-200 px-4 py-2 text-sm dark:border-white/10"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Sales Channel</Label>

                    <Select
                      value={form.sales_channel}
                      onValueChange={(value) =>
                        updateForm("sales_channel", value)
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="ALL">All Channels</SelectItem>

                        <SelectItem value="ORDER">Sales Orders</SelectItem>

                        <SelectItem value="POS">Direct Sale / POS</SelectItem>

                        <SelectItem value="INVOICE">
                          Standalone Invoices
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Customer</Label>

                    <Select
                      value={form.customer || "__all__"}
                      onValueChange={(value) =>
                        updateForm("customer", value === "__all__" ? "" : value)
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        <SelectItem value="__all__">All Customers</SelectItem>

                        {customers.map((customer) => (
                          <SelectItem
                            key={customer.id}
                            value={String(customer.id)}
                          >
                            {customer.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Format & Delivery
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {formatOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("output_format", value)}
                      className={
                        form.output_format === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-white/10"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="mt-4 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.include_line_items}
                    onChange={(event) =>
                      updateForm("include_line_items", event.target.checked)
                    }
                    className="h-4 w-4 rounded"
                  />
                  Include detailed line items, not only summary totals
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Owner / Team</Label>

                    <Select
                      value={form.owner_team}
                      onValueChange={(value) => updateForm("owner_team", value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {(teams.length
                          ? teams
                          : [
                              "Finance Team",
                              "Sales Team",
                              "Management",
                              "Branch Managers",
                            ]
                        ).map((team) => {
                          const value =
                            typeof team === "string" ? team : team.value;

                          const label =
                            typeof team === "string" ? team : team.label;

                          return (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Email To</Label>

                    <Input
                      type="email"
                      value={form.email_to}
                      onChange={(event) =>
                        updateForm("email_to", event.target.value)
                      }
                      className="mt-2"
                      placeholder="name@company.com"
                    />

                    {errors.email_to && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email_to}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["ONCE", "Generate Once"],
                    ["RECURRING", "Recurring"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("recurrence", value)}
                      className={
                        form.recurrence === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-white/10"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={generateMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
