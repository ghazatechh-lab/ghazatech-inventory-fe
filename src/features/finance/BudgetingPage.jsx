import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { extractRows, money } from "./accountingUtils";
import { FinanceModal, SectionTitle, ToggleRow } from "./FinanceSectionUI";

const MONTHS = [
  ["jan", "Jan"],
  ["feb", "Feb"],
  ["mar", "Mar"],
  ["apr", "Apr"],
  ["may", "May"],
  ["jun", "Jun"],
  ["jul", "Jul"],
  ["aug", "Aug"],
  ["sep", "Sep"],
  ["oct", "Oct"],
  ["nov", "Nov"],
  ["dec", "Dec"],
];

const currentYear = new Date().getFullYear();

const seasonalWeights = {
  jan: 0.07,
  feb: 0.07,
  mar: 0.08,
  apr: 0.08,
  may: 0.08,
  jun: 0.08,
  jul: 0.09,
  aug: 0.09,
  sep: 0.09,
  oct: 0.09,
  nov: 0.09,
  dec: 0.09,
};

const emptyMonthlyPhasing = () =>
  Object.fromEntries(MONTHS.map(([key]) => [key, "0.00"]));

const createBlankBudget = (year = currentYear) => ({
  name: `FY ${year} — Annual Budget`,
  fiscal_year: String(year),
  account: "",
  branch: "",
  department_name: "",
  cost_centre: "",
  period_from: `${year}-01-01`,
  period_to: `${year}-12-31`,
  budget_amount: "",
  actual_amount: "0",
  phasing_method: "EVEN",
  monthly_phasing: emptyMonthlyPhasing(),
  spend_alert_enabled: true,
  alert_threshold_percent: "90",
  notify_option: "OWNER_FINANCE_MANAGER",
  rolling_forecast_enabled: true,
  revision_number: "1",
  revision_note: "",
  status: "DRAFT",
});

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const distributeEvenly = (annualAmount) => {
  const annual = roundMoney(annualAmount);

  const base = Math.floor((annual / 12) * 100) / 100;

  const result = Object.fromEntries(
    MONTHS.map(([key]) => [key, base.toFixed(2)]),
  );

  const allocated = base * 12;

  const difference = roundMoney(annual - allocated);

  result.dec = roundMoney(base + difference).toFixed(2);

  return result;
};

const distributeSeasonally = (annualAmount) => {
  const annual = roundMoney(annualAmount);

  const result = {};
  let allocated = 0;

  MONTHS.forEach(([key], index) => {
    if (index === MONTHS.length - 1) {
      result[key] = roundMoney(annual - allocated).toFixed(2);

      return;
    }

    const amount = roundMoney(annual * seasonalWeights[key]);

    result[key] = amount.toFixed(2);

    allocated += amount;
  });

  return result;
};

export default function BudgetingPage() {
  const queryClient = useQueryClient();

  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();

  const [fiscalYear, setFiscalYear] = React.useState(String(currentYear));

  const [open, setOpen] = React.useState(false);

  const [form, setForm] = React.useState(() => createBlankBudget());

  React.useEffect(() => {
    if (branchId) {
      setForm((current) => ({
        ...current,
        branch: String(branchId),
      }));
    }
  }, [branchId]);

  const budgetsQuery = useQuery({
    queryKey: ["budgets", branchId, fiscalYear],

    queryFn: async () =>
      api.get("/finance/budgets/", {
        params: {
          ...branchParams,
          fiscal_year: fiscalYear,
          page_size: 1000,
          ordering: "account__code",
        },
      }),

    staleTime: 0,
  });

  const accountsQuery = useQuery({
    queryKey: ["budget-accounts", branchId],

    queryFn: async () =>
      api.get("/finance/accounts/", {
        params: {
          available_for_branch: branchId || undefined,
          is_active: true,
          page_size: 1000,
          ordering: "code",
        },
      }),
  });

  const branchesQuery = useQuery({
    queryKey: ["budget-branches"],

    queryFn: async () =>
      api.get("/branches/", {
        params: {
          page_size: 500,
          ordering: "branch_name",
        },
      }),
  });

  const budgets = extractRows(budgetsQuery.data);

  const accounts = extractRows(accountsQuery.data);

  const branches = extractRows(branchesQuery.data);

  const annualBudget = Number(form.budget_amount || 0);

  const monthlyTotal = MONTHS.reduce(
    (sum, [key]) => sum + Number(form.monthly_phasing[key] || 0),
    0,
  );

  const isPhasingBalanced = Math.abs(monthlyTotal - annualBudget) < 0.01;

  const applyPhasing = React.useCallback(
    (method, amount = annualBudget) => {
      let monthlyPhasing = form.monthly_phasing;

      if (method === "EVEN") {
        monthlyPhasing = distributeEvenly(amount);
      }

      if (method === "SEASONAL") {
        monthlyPhasing = distributeSeasonally(amount);
      }

      setForm((current) => ({
        ...current,
        phasing_method: method,
        monthly_phasing: monthlyPhasing,
      }));
    },
    [annualBudget, form.monthly_phasing],
  );

  React.useEffect(() => {
    if (!annualBudget || annualBudget < 0) {
      return;
    }

    if (form.phasing_method === "EVEN") {
      setForm((current) => ({
        ...current,
        monthly_phasing: distributeEvenly(annualBudget),
      }));
    }

    if (form.phasing_method === "SEASONAL") {
      setForm((current) => ({
        ...current,
        monthly_phasing: distributeSeasonally(annualBudget),
      }));
    }
  }, [annualBudget, form.phasing_method]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,

        fiscal_year: Number(form.fiscal_year),

        account: Number(form.account),

        branch: Number(form.branch),

        budget_amount: Number(form.budget_amount),

        actual_amount: Number(form.actual_amount || 0),

        alert_threshold_percent: Number(form.alert_threshold_percent),

        revision_number: Number(form.revision_number || 1),

        monthly_phasing: Object.fromEntries(
          Object.entries(form.monthly_phasing).map(([month, value]) => [
            month,
            Number(value || 0),
          ]),
        ),
      };

      return api.post("/finance/budgets/", payload, {
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["budgets"],
        exact: false,
      });

      await budgetsQuery.refetch();

      toast.success("Budget line saved successfully.");

      setOpen(false);

      setForm({
        ...createBlankBudget(Number(fiscalYear)),
        branch: branchId ? String(branchId) : "",
      });
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save budget", {
        description:
          details.summary || details.message || error?.response?.data?.detail,
      });
    },
  });

  const openNew = () => {
    const year = Number(fiscalYear);

    const next = createBlankBudget(year);

    next.branch = branchId ? String(branchId) : "";

    setForm(next);
    setOpen(true);
  };

  const updateAnnualBudget = (value) => {
    setForm((current) => ({
      ...current,
      budget_amount: value,
    }));
  };

  const updateMonthlyAmount = (month, value) => {
    setForm((current) => ({
      ...current,
      monthly_phasing: {
        ...current.monthly_phasing,
        [month]: value,
      },
    }));
  };

  const submit = () => {
    if (!form.account || !form.branch || annualBudget <= 0) {
      toast.error("Account, branch, and annual budget are required.");
      return;
    }

    if (!isPhasingBalanced) {
      toast.error("Monthly figures must equal the annual budget.");
      return;
    }

    if (
      form.spend_alert_enabled &&
      (Number(form.alert_threshold_percent) < 1 ||
        Number(form.alert_threshold_percent) > 100)
    ) {
      toast.error("Alert threshold must be between 1% and 100%.");
      return;
    }

    save.mutate();
  };

  return (
    <div className="finance-module-page finance-workspace space-y-6">
      <PageHeader
        title="Budgeting"
        subtitle={
          isAllBranches
            ? "Annual budgets and actual-spend monitoring across all branches."
            : "Budget and actual-spend monitoring for the selected branch."
        }
        actions={
          <div className="flex gap-2">
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
              onClick={openNew}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Budget Line
            </Button>
          </div>
        }
      />

      <select
        className="h-10 rounded-md border bg-background px-3"
        value={fiscalYear}
        onChange={(event) => setFiscalYear(event.target.value)}
      >
        {[0, 1, 2].map((offset) => {
          const year = currentYear + offset;

          return (
            <option key={year} value={year}>
              FY {year} — Annual Budget
            </option>
          );
        })}
      </select>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[950px] w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {[
                "Account",
                "Branch",
                "Annual Budget",
                "Actual (YTD)",
                "Variance",
                "% Used",
                "Revision",
              ].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.id} className="border-b">
                <td className="px-4 py-3">
                  {budget.account_code} — {budget.account_name}
                </td>

                <td className="px-4 py-3">{budget.branch_name || "—"}</td>

                <td className="px-4 py-3">{money(budget.budget_amount)}</td>

                <td className="px-4 py-3">{money(budget.actual_amount)}</td>

                <td className="px-4 py-3">{money(budget.variance)}</td>

                <td className="px-4 py-3">
                  {Number(budget.percent_used || 0).toFixed(1)}%
                </td>

                <td className="px-4 py-3">V{budget.revision_number || 1}</td>
              </tr>
            ))}

            {!budgets.length && (
              <tr>
                <td
                  colSpan="7"
                  className="p-10 text-center text-muted-foreground"
                >
                  No budget lines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FinanceModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={`Finance & Accounting · Budgeting · FY ${form.fiscal_year} — Annual Budget`}
        title="New Budget Line"
        subtitle="Set a budget for one account within a branch, department, or cost-centre. Split it across months so actuals can be tracked against a phased target."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Budget takes effect immediately for actual-vs-budget reporting.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={save.isPending}
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
              >
                Save Budget Line
              </Button>
            </div>
          </div>
        }
      >
        <section className="border-b p-6">
          <SectionTitle number="01" title="Scope" />

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Account *</Label>

              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                value={form.account}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    account: event.target.value,
                  }))
                }
              >
                <option value="">Select account</option>

                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Branch *</Label>

              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                value={form.branch}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    branch: event.target.value,
                  }))
                }
              >
                <option value="">Select branch</option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Department / Cost-Centre</Label>

              <Input
                className="mt-2"
                placeholder="e.g. Administration"
                value={form.department_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    department_name: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </section>

        <section className="border-b p-6">
          <SectionTitle number="02" title="Annual amount & phasing" />

          <div className="grid gap-5 md:grid-cols-[0.9fr_2fr]">
            <div>
              <Label>Annual Budget (AED) *</Label>

              <Input
                className="mt-2"
                type="number"
                min="0"
                step="0.01"
                value={form.budget_amount}
                onChange={(event) => updateAnnualBudget(event.target.value)}
              />
            </div>

            <div>
              <Label>Phasing Method</Label>

              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["EVEN", "Even monthly"],
                  ["SEASONAL", "Seasonal weighting"],
                  ["CUSTOM", "Custom (edit each month)"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyPhasing(value)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      form.phasing_method === value
                        ? "bg-slate-900 text-white"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Label>Monthly Phasing</Label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 md:grid-cols-6">
              {MONTHS.map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs uppercase text-muted-foreground">
                    {label}
                  </Label>

                  <Input
                    className="mt-2 text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly={form.phasing_method !== "CUSTOM"}
                    value={form.monthly_phasing[key]}
                    onChange={(event) =>
                      updateMonthlyAmount(key, event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              isPhasingBalanced
                ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            {isPhasingBalanced
              ? `✓ Monthly figures add up to the annual budget of ${money(
                  annualBudget,
                )}.`
              : `Monthly total is ${money(
                  monthlyTotal,
                )}; annual budget is ${money(annualBudget)}.`}
          </div>
        </section>

        <section className="border-b p-6">
          <SectionTitle number="03" title="Spend alerts" />

          <ToggleRow
            title="Alert when actual spend crosses a threshold"
            description="Notify the budget owner automatically once year-to-date actuals reach the percentage configured below."
            checked={form.spend_alert_enabled}
            onChange={(checked) =>
              setForm((current) => ({
                ...current,
                spend_alert_enabled: checked,
              }))
            }
          />

          {form.spend_alert_enabled && (
            <div className="mt-4 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <Label>Alert Threshold</Label>

                <span className="font-semibold">
                  {form.alert_threshold_percent}%
                </span>
              </div>

              <input
                className="mt-3 w-full"
                type="range"
                min="1"
                max="100"
                step="1"
                value={form.alert_threshold_percent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    alert_threshold_percent: event.target.value,
                  }))
                }
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Triggers when YTD actual reaches {form.alert_threshold_percent}%
                of the phased budget for that period.
              </p>

              <div className="mt-4 max-w-lg">
                <Label>Notify</Label>

                <select
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                  value={form.notify_option}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notify_option: event.target.value,
                    }))
                  }
                >
                  <option value="OWNER">Budget Owner</option>

                  <option value="FINANCE_MANAGER">Finance Manager</option>

                  <option value="OWNER_FINANCE_MANAGER">
                    Budget Owner + Finance Manager
                  </option>
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="p-6">
          <SectionTitle
            number="04"
            title="Revision tracking"
            note={`Original — V${form.revision_number}`}
          />

          <ToggleRow
            title="Enable rolling forecast revisions"
            description="Keeps this as a live forecast. Later changes are stored as V2, V3, and later versions while retaining the original budget."
            checked={form.rolling_forecast_enabled}
            onChange={(checked) =>
              setForm((current) => ({
                ...current,
                rolling_forecast_enabled: checked,
              }))
            }
          />

          <div className="mt-4">
            <Label>Revision Note</Label>

            <Input
              className="mt-2"
              placeholder="e.g. Initial FY budget approved by Finance Committee"
              value={form.revision_note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  revision_note: event.target.value,
                }))
              }
            />
          </div>
        </section>
      </FinanceModal>
    </div>
  );
}
