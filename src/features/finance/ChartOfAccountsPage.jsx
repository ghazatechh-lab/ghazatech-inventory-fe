import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const TYPE_OPTIONS = [
  { value: "ASSET", label: "Assets", prefix: "1" },
  { value: "LIABILITY", label: "Liabilities", prefix: "2" },
  { value: "EQUITY", label: "Equity", prefix: "3" },
  { value: "INCOME", label: "Revenue", prefix: "4" },
  { value: "EXPENSE", label: "Expenses", prefix: "5" },
];

const SUBTYPE_OPTIONS = {
  ASSET: [
    ["CURRENT_ASSET", "Current Asset"],
    ["BANK", "Bank"],
    ["CASH", "Cash"],
    ["ACCOUNTS_RECEIVABLE", "Accounts Receivable"],
    ["INVENTORY", "Inventory"],
    ["PREPAID_EXPENSE", "Prepaid Expense"],
    ["FIXED_ASSET", "Fixed Asset"],
    ["ACCUMULATED_DEPRECIATION", "Accumulated Depreciation"],
    ["OTHER_ASSET", "Other Asset"],
  ],
  LIABILITY: [
    ["CURRENT_LIABILITY", "Current Liability"],
    ["ACCOUNTS_PAYABLE", "Accounts Payable"],
    ["VAT_PAYABLE", "VAT Payable"],
    ["ACCRUED_EXPENSE", "Accrued Expense"],
    ["PAYROLL_PAYABLE", "Payroll Payable"],
    ["LONG_TERM_LIABILITY", "Long-term Liability"],
    ["OTHER_LIABILITY", "Other Liability"],
  ],
  EQUITY: [
    ["OWNER_EQUITY", "Owner's Equity"],
    ["RETAINED_EARNINGS", "Retained Earnings"],
    ["CURRENT_YEAR_EARNINGS", "Current Year Earnings"],
  ],
  INCOME: [
    ["SALES_REVENUE", "Sales Revenue"],
    ["SERVICE_REVENUE", "Service Revenue"],
    ["OTHER_INCOME", "Other Income"],
  ],
  EXPENSE: [
    ["COST_OF_GOODS_SOLD", "Cost of Goods Sold"],
    ["PAYROLL_EXPENSE", "Payroll Expense"],
    ["RENT_EXPENSE", "Rent Expense"],
    ["DEPRECIATION_EXPENSE", "Depreciation Expense"],
    ["UTILITY_EXPENSE", "Utility Expense"],
    ["BANK_CHARGE", "Bank Charges"],
    ["OTHER_EXPENSE", "Other Expense"],
  ],
};

const NORMAL_BY_TYPE = {
  ASSET: "DEBIT",
  EXPENSE: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  INCOME: "CREDIT",
};

const emptyForm = {
  code: "",
  name: "",
  account_type: "ASSET",
  sub_type: "CURRENT_ASSET",
  parent: "",
  normal_balance: "DEBIT",
  opening_balance: "0.00",
  tax_treatment: "NOT_APPLICABLE",
  branch: "",
  is_active: true,
  lock_from_posting: false,
  notes: "",
};

const extractList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value.results)) {
    return value.results;
  }

  if (Array.isArray(value.groups)) {
    return value.groups;
  }

  if (Array.isArray(value.data)) {
    return value.data;
  }

  if (Array.isArray(value.data?.results)) {
    return value.data.results;
  }

  if (Array.isArray(value.data?.groups)) {
    return value.data.groups;
  }

  if (Array.isArray(value.data?.data)) {
    return value.data.data;
  }

  if (Array.isArray(value.data?.data?.results)) {
    return value.data.data.results;
  }

  if (Array.isArray(value.data?.data?.groups)) {
    return value.data.data.groups;
  }

  return [];
};

const list = (value) => extractList(value);

const normalizeGroupedPayload = (value) => extractList(value);

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const accountTypeTitle = (group) => `${group.prefix} — ${group.label}`;

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);
  const [expanded, setExpanded] = React.useState(
    () => new Set(TYPE_OPTIONS.map((item) => item.value)),
  );

  const accountsQuery = useQuery({
    queryKey: ["chart-of-accounts", "flat", branchId, search],

    queryFn: async () => {
      const params = {
        ...branchParams,
        search: search || undefined,
        page_size: 1000,
        ordering: "code",
      };

      console.group("[ChartOfAccounts] GET /finance/accounts/");
      console.log("Selected branch ID:", branchId);
      console.log("Branch params:", branchParams);
      console.log("Request params:", params);

      try {
        const response = await api.get("/finance/accounts/", {
          params,
        });

        const payload = response?.data ?? response;

        console.log("Raw Axios response:", response);
        console.log("Raw response.data:", response?.data);
        console.log("Account payload:", payload);
        console.log("Normalized account rows:", extractList(payload));
        console.groupEnd();

        return payload;
      } catch (error) {
        console.error("[ChartOfAccounts] Account list request failed:", error);
        console.error("Backend response:", error?.response?.data);
        console.groupEnd();

        throw error;
      }
    },

    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const groupedQuery = useQuery({
    queryKey: ["chart-of-accounts", "grouped", branchId, search],

    queryFn: async () => {
      const params = {
        ...branchParams,
        search: search || undefined,
      };

      try {
        const response = await api.get("/finance/accounts/grouped-summary/", {
          params,
        });

        const payload = response?.data ?? response;

        console.group(
          "[ChartOfAccounts] GET /finance/accounts/grouped-summary/",
        );
        console.log("Raw Axios response:", response);
        console.log("Raw response.data:", response?.data);
        console.log("Grouped payload:", payload);
        console.log(
          "Normalized grouped response:",
          normalizeGroupedPayload(payload),
        );
        console.groupEnd();

        return payload;
      } catch (error) {
        /*
         * The flat endpoint remains the source of truth.
         * A grouped-summary failure must not hide valid accounts.
         */
        console.error(
          "[ChartOfAccounts] Grouped summary request failed:",
          error,
        );
        console.error("Backend response:", error?.response?.data);

        return [];
      }
    },

    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const branchQuery = useQuery({
    queryKey: ["branches", "account-form"],
    queryFn: async () => {
      const response = await api.get("/branches/", {
        params: {
          page_size: 500,
        },
      });

      return response?.data ?? response;
    },
  });

  const accounts = React.useMemo(
    () => list(accountsQuery.data),
    [accountsQuery.data],
  );

  const branches = React.useMemo(
    () => list(branchQuery.data),
    [branchQuery.data],
  );

  const groupedResponse = React.useMemo(
    () => normalizeGroupedPayload(groupedQuery.data),
    [groupedQuery.data],
  );

  /*
   * IMPORTANT:
   * The flat account list is the source of truth for displayed rows.
   * This prevents a malformed or stale grouped-summary response from
   * hiding accounts that already exist in the database.
   */
  const grouped = React.useMemo(
    () =>
      TYPE_OPTIONS.map((type) => {
        const rows = accounts
          .filter(
            (account) =>
              String(account.account_type || "").toUpperCase() === type.value,
          )
          .sort((first, second) =>
            String(first.code || "").localeCompare(String(second.code || "")),
          );

        const summaryGroup = groupedResponse.find(
          (group) =>
            String(group.account_type || "").toUpperCase() === type.value,
        );

        return {
          ...type,
          rows,
          balance:
            summaryGroup?.balance !== undefined
              ? Number(summaryGroup.balance || 0)
              : rows.reduce(
                  (sum, account) => sum + Number(account.current_balance || 0),
                  0,
                ),
        };
      }),
    [accounts, groupedResponse],
  );

  React.useEffect(() => {
    console.group("[ChartOfAccounts] Render diagnostics");
    console.log("accountsQuery.status:", accountsQuery.status);
    console.log("accountsQuery.error:", accountsQuery.error);
    console.log("accountsQuery.data:", accountsQuery.data);
    console.log("Normalized accounts:", accounts);
    console.log("Account count:", accounts.length);
    console.log("groupedQuery.status:", groupedQuery.status);
    console.log("groupedQuery.data:", groupedQuery.data);
    console.log("Normalized grouped response:", groupedResponse);
    console.log("Final rendered groups:", grouped);
    console.groupEnd();
  }, [
    accountsQuery.status,
    accountsQuery.error,
    accountsQuery.data,
    groupedQuery.status,
    groupedQuery.data,
    accounts,
    groupedResponse,
    grouped,
  ]);

  React.useEffect(() => {
    accountsQuery.refetch();
    groupedQuery.refetch();
    // Query keys already include branchId; this guarantees immediate refresh
    // when the active branch selector changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const parentOptions = React.useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.account_type === form.account_type &&
          account.id !== editing?.id &&
          (!form.branch ||
            !account.branch ||
            String(account.branch) === String(form.branch)),
      ),
    [accounts, form.account_type, form.branch, editing],
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: String(form.code || "").trim(),
        name: String(form.name || "").trim(),
        account_type: form.account_type,
        sub_type: form.sub_type,
        parent: form.parent ? Number(form.parent) : null,
        normal_balance: form.normal_balance,
        opening_balance: Number(form.opening_balance || 0),
        tax_treatment: form.tax_treatment,
        branch: form.branch ? Number(form.branch) : null,
        is_active: Boolean(form.is_active),
        lock_from_posting: Boolean(form.lock_from_posting),
        notes: String(form.notes || "").trim(),
      };

      if (!payload.code || payload.code.length !== 5) {
        throw new Error("Account code must contain exactly 5 digits.");
      }

      if (!payload.name) {
        throw new Error("Account name is required.");
      }

      if (editing) {
        return api.patch(`/finance/accounts/${editing.id}/`, payload, {
          skipGlobalErrorToast: true,
        });
      }

      return api.post("/finance/accounts/", payload, {
        skipGlobalErrorToast: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["chart-of-accounts"],
        exact: false,
      });

      await Promise.all([accountsQuery.refetch(), groupedQuery.refetch()]);

      toast.success(
        editing
          ? "Account updated successfully."
          : "Account created successfully.",
      );

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || error?.message || "Unable to save account", {
        description:
          details.summary ||
          details.message ||
          error?.message ||
          "Check the account fields and try again.",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (account) =>
      api.delete(`/finance/accounts/${account.id}/`, {
        skipGlobalErrorToast: true,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["chart-of-accounts"],
        exact: false,
      });

      await Promise.all([accountsQuery.refetch(), groupedQuery.refetch()]);

      toast.success("Account deleted successfully.");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to delete account", {
        description:
          details.summary ||
          details.message ||
          error?.response?.data?.detail ||
          "Accounts with child accounts, journal entries, or ledger activity cannot be deleted. Mark the account inactive instead.",
      });
    },
  });

  const confirmDelete = (account) => {
    const confirmed = window.confirm(
      `Delete account ${account.code} — ${account.name}?\n\nThis action cannot be undone.`,
    );

    if (confirmed) {
      deleteAccount.mutate(account);
    }
  };

  const showForm = (account = null) => {
    setEditing(account);
    setForm(
      account
        ? {
            code: account.code || "",
            name: account.name || "",
            account_type: account.account_type || "ASSET",
            sub_type: account.sub_type || "OTHER_ASSET",
            parent: account.parent ? String(account.parent) : "",
            normal_balance:
              account.normal_balance ||
              NORMAL_BY_TYPE[account.account_type] ||
              "DEBIT",
            opening_balance: account.opening_balance ?? "0.00",
            tax_treatment: account.tax_treatment || "NOT_APPLICABLE",
            branch: account.branch ? String(account.branch) : "",
            is_active: account.is_active !== false,
            lock_from_posting: Boolean(account.lock_from_posting),
            notes: account.notes || "",
          }
        : {
            ...emptyForm,
            branch: branchId ? String(branchId) : "",
          },
    );
    setOpen(true);
  };

  const setType = (accountType) => {
    const subType = SUBTYPE_OPTIONS[accountType]?.[0]?.[0] || "";
    setForm((current) => ({
      ...current,
      account_type: accountType,
      sub_type: subType,
      normal_balance: NORMAL_BY_TYPE[accountType],
      parent: "",
      code:
        current.code && current.code.length === 5
          ? `${TYPE_OPTIONS.find((item) => item.value === accountType)?.prefix}${current.code.slice(1)}`
          : current.code,
    }));
  };

  const toggleGroup = (type) => {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const exportCsv = () => {
    const header = [
      "Code",
      "Name",
      "Type",
      "Sub-type",
      "Parent",
      "Normal Balance",
      "Opening Balance",
      "Current Balance",
      "Tax Treatment",
      "Branch",
      "Active",
      "Locked",
    ];
    const rows = accounts.map((account) => [
      account.code,
      account.name,
      account.account_type_display,
      account.sub_type_display,
      account.parent_code
        ? `${account.parent_code} - ${account.parent_name}`
        : "",
      account.normal_balance_display,
      account.opening_balance,
      account.current_balance,
      account.tax_treatment_display,
      account.branch_name || "All branches",
      account.is_active ? "Yes" : "No",
      account.lock_from_posting ? "Yes" : "No",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "chart-of-accounts.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="finance-module-page finance-workspace space-y-5">
      <PageHeader
        title="Chart of Accounts"
        subtitle={`Master ledger accounts grouped by type${isAllBranches ? " · All branches" : " · Selected branch"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button
              type="button"
              onClick={() => showForm()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </div>
        }
      />

      <section className="card-surface p-4">
        <p className="text-sm text-muted-foreground">
          Codes use five digits: 1xxxx Assets, 2xxxx Liabilities, 3xxxx Equity,
          4xxxx Revenue, and 5xxxx Expenses.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search account name or code"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled
            title="CSV import can be enabled after defining your import template"
          >
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Loaded accounts: <strong>{accounts.length}</strong>
          </span>

          <span className="text-xs text-muted-foreground">
            Open browser DevTools → Console and search for
            <code className="mx-1 rounded bg-background px-1.5 py-0.5">
              [ChartOfAccounts]
            </code>
          </span>
        </div>

        {accountsQuery.isError && (
          <p className="mt-2 text-red-600">
            Account API error:{" "}
            {accountsQuery.error?.response?.data?.detail ||
              accountsQuery.error?.message ||
              "Unable to load accounts."}
          </p>
        )}
      </section>

      <section className="space-y-3">
        {grouped.map((group) => (
          <div
            key={group.value}
            className="overflow-hidden rounded-xl border bg-card"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.value)}
              className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 font-semibold">
                {expanded.has(group.value) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {accountTypeTitle(group)}
              </span>
              <span className="font-semibold">
                Balance: {money(group.balance)}
              </span>
            </button>

            {expanded.has(group.value) && (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="border-y bg-muted/20 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Sub-type</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.length ? (
                      group.rows.map((account) => (
                        <tr
                          key={account.id}
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {account.code}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{account.name}</p>
                            {account.parent_name && (
                              <p className="text-xs text-muted-foreground">
                                Under {account.parent_code} —{" "}
                                {account.parent_name}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {account.sub_type_display}
                          </td>
                          <td className="px-4 py-3">
                            {account.branch_name || "All branches"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {money(account.current_balance)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"}`}
                            >
                              {account.is_active ? "Active" : "Inactive"}
                            </span>
                            {account.lock_from_posting && (
                              <span className="ml-2 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600">
                                Locked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => showForm(account)}
                                title="Edit account"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => confirmDelete(account)}
                                disabled={
                                  deleteAccount.isPending &&
                                  deleteAccount.variables?.id === account.id
                                }
                                title="Delete account"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No accounts in this group.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (!save.isPending) {
                save.mutate();
              }
            }}
            className="mx-auto my-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Finance & Accounting · Chart of Accounts
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {editing ? "Edit Account" : "New Account"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fields marked with an asterisk are required before the account
                  can be saved and posted to.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="divide-y">
              <FormSection number="01" title="Identity">
                <Field
                  label="Account code *"
                  hint="5 digits. First digit sets the type."
                >
                  <Input
                    maxLength={5}
                    inputMode="numeric"
                    placeholder="e.g. 10200"
                    value={form.code}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        code: event.target.value.replace(/\D/g, "").slice(0, 5),
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Account name *">
                  <Input
                    placeholder="e.g. Bank — Branch 2"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    required
                  />
                </Field>
              </FormSection>

              <FormSection number="02" title="Classification">
                <Field label="Type *">
                  <Select
                    value={form.account_type}
                    onChange={(event) => setType(event.target.value)}
                    options={TYPE_OPTIONS.map((item) => [
                      item.value,
                      item.label,
                    ])}
                    required
                  />
                </Field>
                <Field label="Sub-type *">
                  <Select
                    value={form.sub_type}
                    onChange={(event) =>
                      setForm({ ...form, sub_type: event.target.value })
                    }
                    options={SUBTYPE_OPTIONS[form.account_type] || []}
                    required
                  />
                </Field>
                <Field label="Parent account" full>
                  <Select
                    value={form.parent}
                    onChange={(event) =>
                      setForm({ ...form, parent: event.target.value })
                    }
                    options={[
                      ["", "— None (top-level account) —"],
                      ...parentOptions.map((account) => [
                        String(account.id),
                        `${account.code} — ${account.name}`,
                      ]),
                    ]}
                  />
                  <div className="mt-2 rounded-lg border border-dashed px-3 py-2 font-mono text-xs text-muted-foreground">
                    Hierarchy preview:{" "}
                    {
                      TYPE_OPTIONS.find(
                        (item) => item.value === form.account_type,
                      )?.prefix
                    }
                    xxxx{" "}
                    {
                      TYPE_OPTIONS.find(
                        (item) => item.value === form.account_type,
                      )?.label
                    }{" "}
                    →{" "}
                    {parentOptions.find(
                      (item) => String(item.id) === String(form.parent),
                    )?.name || "top level"}{" "}
                    → {form.name || "(new account)"}
                  </div>
                </Field>
              </FormSection>

              <FormSection number="03" title="Balance & tax">
                <Field label="Normal balance *">
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border">
                    {["DEBIT", "CREDIT"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, normal_balance: value })
                        }
                        className={`h-10 text-sm font-medium ${form.normal_balance === value ? "bg-slate-800 text-white" : "bg-background"}`}
                      >
                        {value === "DEBIT" ? "Debit" : "Credit"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Opening balance (AED)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.opening_balance}
                    onChange={(event) =>
                      setForm({ ...form, opening_balance: event.target.value })
                    }
                  />
                </Field>
                <Field label="Tax treatment" full>
                  <Select
                    value={form.tax_treatment}
                    onChange={(event) =>
                      setForm({ ...form, tax_treatment: event.target.value })
                    }
                    options={[
                      ["NOT_APPLICABLE", "Not Applicable"],
                      ["VAT_STANDARD", "VAT Applicable — Standard 5%"],
                      ["VAT_ZERO", "VAT Zero-rated"],
                      ["VAT_EXEMPT", "VAT Exempt"],
                      ["VAT_INPUT", "VAT Input / Recoverable"],
                      ["VAT_OUTPUT", "VAT Output / Payable"],
                    ]}
                  />
                </Field>
              </FormSection>

              <FormSection number="04" title="Restrictions & status">
                <Field label="Branch restriction" full>
                  <Select
                    value={form.branch}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        branch: event.target.value,
                        parent: "",
                      })
                    }
                    options={[
                      ["", "All branches"],
                      ...branches.map((branch) => [
                        String(branch.id),
                        branch.branch_name || branch.branch_code,
                      ]),
                    ]}
                  />
                </Field>
                <ToggleRow
                  title="Active"
                  description="Inactive accounts remain available for reporting but cannot be selected on new journal entries."
                  checked={form.is_active}
                  onChange={(checked) =>
                    setForm({ ...form, is_active: checked })
                  }
                />
                <ToggleRow
                  title="Lock from posting"
                  description="Blocks all new entries to this account, including approved journals. Useful for accounts under review."
                  checked={form.lock_from_posting}
                  onChange={(checked) =>
                    setForm({ ...form, lock_from_posting: checked })
                  }
                />
                <Field label="Internal notes" full>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </Field>
              </FormSection>
            </div>

            <div className="flex items-center justify-between border-t bg-muted/20 p-5">
              <p className="text-xs text-muted-foreground">
                Changes are not saved until you confirm.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={save.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:text-white/80"
                >
                  {save.isPending
                    ? "Saving..."
                    : editing
                      ? "Update Account"
                      : "Save Account"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FormSection({ number, title, children }) {
  return (
    <section className="grid gap-4 p-6 md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-3">
        <span className="rounded bg-orange-500/10 px-2 py-1 font-mono text-xs text-orange-600">
          {number}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, full, children }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, required }) {
  return (
    <select
      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      value={value}
      onChange={onChange}
      required={required}
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="md:col-span-2 flex items-start justify-between gap-5 border-t pt-4 first:border-0 first:pt-0">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
