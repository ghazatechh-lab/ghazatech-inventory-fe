import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, isAdmin } from "@/lib/permissions";
import { getVisibleModules } from "@/config/moduleNavigation";
import { PageHeader } from "@/components/common/PageHeader";
import { CurrencyText } from "@/components/common/CurrencyText";

const METRICS = [
  { key: "inventory_value", label: "Stock Value", permissions: ["inventory.stock.view", "reports.inventory.view"] },
  { key: "sales_month", label: "Sales This Month", permissions: ["sales.invoices.view", "reports.sales.view"] },
  { key: "purchases_month", label: "Purchases This Month", permissions: ["purchase.purchase_orders.view", "reports.purchase.view"] },
  { key: "receivables", label: "Receivables", permissions: ["accounting.receivables.view", "reports.finance.view"] },
  { key: "payables", label: "Payables", permissions: ["accounting.payables.view", "reports.finance.view"] },
];

export default function DashboardPage() {
  const { user, branchOverride } = useAuth();
  // The same access filter drives Dashboard and Sidebar: no hardcoded role dashboards.
  const myModules = React.useMemo(
    () => getVisibleModules(user).filter((item) => item.id !== "dashboard"),
    [user],
  );
  const metrics = METRICS.filter((item) => hasAnyPermission(user, item.permissions));
  const canFetch = isAdmin(user) || metrics.length > 0;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-dashboard", user?.id, user?.permissions, branchOverride],
    queryFn: async () => unwrap(await api.get("/dashboard/", {
      params: branchOverride ? { branch_id: branchOverride } : {},
    })),
    enabled: canFetch,
    retry: false,
  });
  const visibleMetrics = metrics.filter((metric) =>
    data?.kpi && Object.prototype.hasOwnProperty.call(data.kpi, metric.key),
  );

  return (
    <div className="space-y-6 pb-8">
      <PageHeader variant="hero" title="My Dashboard"
        subtitle="A workspace built from your access permissions and current branch" />
      {visibleMetrics.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleMetrics.map((metric) => (
            <div key={metric.key} className="card-surface min-w-0 rounded-2xl border p-5">
              <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                <CurrencyText value={data.kpi[metric.key]} />
              </div>
            </div>
          ))}
        </section>
      )}
      {canFetch && isLoading && <p className="text-sm text-muted-foreground">Loading permitted metrics…</p>}
      {canFetch && isError && (
        <p className="text-sm text-amber-600">Some dashboard metrics are unavailable. Your authorized pages are still accessible.</p>
      )}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary"><LayoutDashboard className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-semibold">Your Workspaces</h2>
            <p className="text-sm text-muted-foreground">Only pages assigned to your account appear here.</p>
          </div>
        </div>
        {myModules.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myModules.map((module) => {
              const Icon = module.icon || ShieldCheck;
              const items = module.items || [];
              return (
                <div key={module.id} className="card-surface min-w-0 rounded-2xl border p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span>
                    <h3 className="min-w-0 truncate font-semibold">{module.title}</h3>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <Link key={item.id || item.to} to={item.to}
                        className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <span className="min-w-0 truncate">{item.label}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-surface rounded-2xl border p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Your account is ready</p>
            <p className="mt-1 text-sm text-muted-foreground">An administrator has not yet assigned any module permissions.</p>
          </div>
        )}
      </section>
    </div>
  );
}
