import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, ArrowUpRight, Boxes, CalendarDays, CircleAlert,
  Clock3, CreditCard, FileText, PackageCheck,
  RefreshCw, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, isAdmin } from "@/lib/permissions";

const formatMoney = (value) => `AED ${Number(value || 0).toLocaleString("en-AE", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const formatNumber = (value) => Number(value || 0).toLocaleString("en-AE");
const metricConfig = [
  { key: "sales_month", label: "Sales this month", icon: TrendingUp, tone: "sky", link: "/sales/invoices", money: true, permissions: ["sales.invoices.view", "reports.sales.view"] },
  { key: "purchases_month", label: "Purchases this month", icon: ShoppingBag, tone: "violet", link: "/purchases/orders", money: true, permissions: ["purchase.purchase_orders.view", "reports.purchase.view"] },
  { key: "inventory_value", label: "Inventory value", icon: Boxes, tone: "amber", link: "/inventory/stock", money: true, permissions: ["inventory.stock.view", "reports.inventory.view"] },
  { key: "receivables", label: "Outstanding receivables", icon: Wallet, tone: "emerald", link: "/finance/receivables", money: true, permissions: ["accounting.receivables.view", "reports.finance.view"] },
  { key: "payables", label: "Outstanding payables", icon: CreditCard, tone: "rose", link: "/finance/payables", money: true, permissions: ["accounting.payables.view", "reports.finance.view"] },
  { key: "stock_units", label: "Units in stock", icon: PackageCheck, tone: "sky", link: "/inventory/stock", permissions: ["inventory.stock.view", "reports.inventory.view"] },
  { key: "low_stock_items", label: "Low-stock lines", icon: CircleAlert, tone: "amber", link: "/inventory/low-stock", permissions: ["inventory.stock.view", "reports.inventory.view"] },
  { key: "unallocated_units", label: "Units awaiting racks", icon: Boxes, tone: "rose", link: "/inventory/stock", permissions: ["inventory.stock.view", "reports.inventory.view"] },
  { key: "open_purchase_orders", label: "Open purchase orders", icon: FileText, tone: "violet", link: "/purchases/orders", permissions: ["purchase.purchase_orders.view", "reports.purchase.view"] },
  { key: "open_sales_invoices", label: "Invoices with balance", icon: CalendarDays, tone: "emerald", link: "/sales/invoices", permissions: ["sales.invoices.view", "reports.sales.view"] },
  { key: "active_employees", label: "Active employees", icon: ShieldCheck, tone: "sky", link: "/hrms/employees", permissions: ["hrms.employees.view"] },
  { key: "fleet_vehicles", label: "Fleet vehicles", icon: Activity, tone: "violet", link: "/fleet/vehicles", permissions: ["fleet.vehicles.view"] },
];
const styles = {
  sky: "from-sky-500/15 to-cyan-500/5 text-sky-600 dark:text-sky-300",
  violet: "from-violet-500/15 to-indigo-500/5 text-violet-600 dark:text-violet-300",
  amber: "from-amber-500/15 to-orange-500/5 text-amber-600 dark:text-amber-300",
  emerald: "from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-300",
  rose: "from-rose-500/15 to-pink-500/5 text-rose-600 dark:text-rose-300",
};
const panel = "rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_36px_-25px_rgba(8,31,70,.30)] dark:border-white/10 dark:bg-white/[0.045] sm:p-6";

function MetricCard({ metric, value }) {
  const Icon = metric.icon;
  return (
    <Link to={metric.link} className={`${panel} group relative flex min-w-0 flex-col gap-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl dark:hover:border-sky-500/30`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-2xl bg-gradient-to-br p-3 ${styles[metric.tone]}`}><Icon className="h-5 w-5" /></span>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">{metric.label}</p>
        <p className="mt-2 break-words text-[clamp(1.25rem,2vw,1.85rem)] font-bold tracking-tight text-slate-900 dark:text-white" title={String(value)}>
          {metric.money ? formatMoney(value) : formatNumber(value)}
        </p>
      </div>
    </Link>
  );
}

const chartTip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-xl dark:border-white/10 dark:bg-slate-900">
    <p className="mb-2 font-semibold">{label}</p>
    {payload.map((item) => <p key={item.dataKey} className="py-0.5" style={{ color: item.color }}>{item.name}: {formatMoney(item.value)}</p>)}
  </div>
) : null;

export default function DashboardPage() {
  const { user, branchOverride } = useAuth();
  const permitted = metricConfig.filter((metric) => isAdmin(user) || hasAnyPermission(user, metric.permissions));
  const canFetch = isAdmin(user) || permitted.length > 0;
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-overview-v2", user?.id, user?.permissions, branchOverride],
    queryFn: async () => unwrap(await api.get("/dashboard/")),
    enabled: Boolean(user) && canFetch,
    retry: 1,
    staleTime: 60000,
    refetchInterval: 120000,
  });
  const kpis = data?.kpi || {};
  const visible = permitted.filter((metric) => Object.prototype.hasOwnProperty.call(kpis, metric.key));
  const trends = Array.isArray(data?.trend) ? data.trend.map((m) => ({ ...m, sales: Number(m.sales ?? 0), purchases: Number(m.purchases ?? 0) })) : [];
  const chartKeys = ["sales", "purchases"].filter((key) => trends.some((row) => Object.prototype.hasOwnProperty.call(row, key)));
  const branches = Array.isArray(data?.by_branch) ? data.by_branch : [];
  const activities = Array.isArray(data?.recent_activity) ? data.recent_activity : [];
  const userDisplay = user?.first_name || user?.full_name || user?.username || "there";
  const updated = data?.as_of ? new Date(data.as_of).toLocaleString() : null;
  const warningItems = data?.warnings || [];
  const canViewStock = Object.prototype.hasOwnProperty.call(kpis, "stock_units");
  const stockPie = canViewStock ? [
    { name: "Allocated", value: Math.max(0, Number(kpis.stock_units || 0) - Number(kpis.unallocated_units || 0)) },
    { name: "Unallocated", value: Math.max(0, Number(kpis.unallocated_units || 0)) },
  ] : [];
  const branchSeries = branches.map((b) => ({ name: b.source_branch_code || b.source_branch_name,
    sales: Number(b.sales_month || 0), purchases: Number(b.purchases_month || 0),
    stock: Number(b.stock_units || 0) }));
  const operationalInsights = [
    Object.prototype.hasOwnProperty.call(kpis, "unallocated_units") && Object.prototype.hasOwnProperty.call(kpis, "stock_units") && {
      key: "rack-health", title: "Rack allocation coverage", value: Number(kpis.stock_units || 0) > 0
        ? Math.max(0, Math.min(100, ((Number(kpis.stock_units || 0) - Number(kpis.unallocated_units || 0)) / Number(kpis.stock_units)) * 100))
        : 100,
      detail: `${formatNumber(kpis.unallocated_units)} units still awaiting rack allocation`, href: "/inventory/stock", color: "bg-sky-500", kind: "percent",
    },
    Object.prototype.hasOwnProperty.call(kpis, "low_stock_items") && {
      key: "low-stock", title: "Low-stock attention", value: Number(kpis.low_stock_items || 0),
      detail: "Stock lines at or below reorder level", href: "/inventory/low-stock", color: "bg-amber-500", kind: "count",
    },
    Object.prototype.hasOwnProperty.call(kpis, "open_purchase_orders") && {
      key: "pending-po", title: "Open purchase orders", value: Number(kpis.open_purchase_orders || 0),
      detail: "Purchase orders still in progress", href: "/purchases/orders", color: "bg-violet-500", kind: "count",
    },
    Object.prototype.hasOwnProperty.call(kpis, "open_sales_invoices") && {
      key: "invoice-balances", title: "Invoices with balance", value: Number(kpis.open_sales_invoices || 0),
      detail: "Sales invoices requiring payment follow-up", href: "/sales/invoices", color: "bg-emerald-500", kind: "count",
    },
    Object.prototype.hasOwnProperty.call(kpis, "receivables") && {
      key: "receivables", title: "Receivables outstanding", value: Number(kpis.receivables || 0),
      detail: "Unpaid customer balances", href: "/finance/receivables", color: "bg-teal-500", kind: "money",
    },
    Object.prototype.hasOwnProperty.call(kpis, "payables") && {
      key: "payables", title: "Payables outstanding", value: Number(kpis.payables || 0),
      detail: "Unpaid supplier balances", href: "/finance/payables", color: "bg-rose-500", kind: "money",
    },
  ].filter(Boolean);
  const activeTrendKeys = ["sales", "purchases"].filter((key) => chartKeys.includes(key));
  const lastTrend = trends[trends.length - 1];
  const priorTrend = trends[trends.length - 2];
  const growthItems = activeTrendKeys.map((key) => {
    const current = Number(lastTrend?.[key] || 0);
    const previous = Number(priorTrend?.[key] || 0);
    return { key, current, previous, change: previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null };
  });
  const branchSeriesKeys = ["sales", "purchases", "stock"].filter((key) =>
    branches.some((b) => Object.prototype.hasOwnProperty.call(b, key === "stock" ? "stock_units" : `${key}_month`)));


  return (
    <div className="ghaza-dashboard w-full min-w-0 space-y-5 pb-3 text-slate-900 dark:text-slate-100">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#061831] via-[#0c3261] to-[#0b5a77] px-6 py-7 text-white shadow-[0_20px_60px_-25px_rgba(6,42,89,.6)] sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-24 -top-44 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-150px] right-[28%] h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-widest !text-cyan-100"><Sparkles className="h-3.5 w-3.5" /> GHAZATECH · CONTROL CENTER</p>
            <h1 className="!text-white text-2xl font-bold tracking-tight sm:text-4xl">Welcome back, {userDisplay}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 !text-slate-100">Your business command center — performance, financial health, inventory and operations in real time.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs !text-slate-100"><span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-300" /> {data?.scope === "consolidated" ? "Consolidated workspace" : "Branch workspace"}</span>{updated && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Updated {updated}</span>}</div>
          </div>
          <button type="button" onClick={() => refetch()} disabled={!canFetch || isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh data</button>
        </div>
      </section>

      {canFetch && isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Loading dashboard metrics">{Array.from({ length: 5 }, (_, idx) => <div key={idx} className={`${panel} h-40 animate-pulse bg-slate-100/60 dark:bg-white/5`} />)}</div>}
      {isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"><span>Dashboard metrics could not be loaded. {error?.response?.status === 403 ? "Your account does not have access to these reports." : "Check your selected branch and backend connection."} You can retry or inspect the dashboard API response.</span><button type="button" className="font-semibold underline" onClick={() => refetch()}>Retry</button></div>}
      {warningItems.length > 0 && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">Some live metrics could not be loaded: {warningItems.join(" · ")}. Available sections remain live; check backend logs for the failing query.</div>}
      {visible.length > 0 && <section aria-label="Business key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{visible.map((metric) => <MetricCard key={metric.key} metric={metric} value={kpis[metric.key]} />)}</section>}

      {(chartKeys.length > 0 || branches.length > 0) && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        {chartKeys.length > 0 && <section className={panel}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold tracking-tight">Business performance</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Six-month sales and purchase totals · AED</p></div><TrendingUp className="h-5 w-5 text-sky-500" /></div>
          <div className="h-[260px] w-full sm:h-[310px]" role="img" aria-label="Sales and purchases over the last six months">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={trends} margin={{ top: 6, left: -18, right: 8, bottom: 0 }}>
              <defs><linearGradient id="dashboardSales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0284c7" stopOpacity={0.28} /><stop offset="95%" stopColor="#0284c7" stopOpacity={0} /></linearGradient><linearGradient id="dashboardPurchases" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#94a3b8" strokeOpacity={0.22} vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} /><Tooltip content={chartTip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              {chartKeys.includes("sales") && <Area name="Sales" type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2.5} fill="url(#dashboardSales)" />}
              {chartKeys.includes("purchases") && <Area name="Purchases" type="monotone" dataKey="purchases" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#dashboardPurchases)" />}
            </AreaChart></ResponsiveContainer>
          </div>
        </section>}
        {branches.length > 0 && <section className={`${panel} ${!chartKeys.length ? "xl:col-span-2" : ""}`}>
          <div className="mb-5 flex items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Branch snapshot</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Real-time totals by physical branch</p></div><Boxes className="h-5 w-5 text-amber-500" /></div>
          <div className="space-y-3">{branches.map((branch) => <div key={branch.source_branch_id || branch.source_branch_code} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.035]"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{branch.source_branch_name || branch.source_branch_code}</span><span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-white/10">{branch.tax_mode || branch.source_branch_code}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs">{Object.prototype.hasOwnProperty.call(branch, "sales_month") && <div><p className="text-slate-500">Sales</p><p className="mt-1 font-bold">{formatMoney(branch.sales_month)}</p></div>}{Object.prototype.hasOwnProperty.call(branch, "inventory_value") && <div><p className="text-slate-500">Stock value</p><p className="mt-1 font-bold">{formatMoney(branch.inventory_value)}</p></div>}{Object.prototype.hasOwnProperty.call(branch, "purchases_month") && <div><p className="text-slate-500">Purchases</p><p className="mt-1 font-bold">{formatMoney(branch.purchases_month)}</p></div>}{Object.prototype.hasOwnProperty.call(branch, "low_stock_items") && <div><p className="text-slate-500">Low-stock lines</p><p className="mt-1 font-bold">{formatNumber(branch.low_stock_items)}</p></div>}</div></div>)}</div>
        </section>}
      </div>}

      {(stockPie.some((item) => item.value > 0) || (branchSeries.length > 1 && branchSeriesKeys.length > 0)) && <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        {stockPie.some((item) => item.value > 0) && <section className={panel} aria-label="Rack stock allocation chart">
          <div className="mb-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Stock allocation health</h2><p className="text-xs text-slate-600 dark:text-slate-400">Actual rack allocation against total on-hand inventory</p></div>
          <div className="flex flex-col items-center gap-4 sm:flex-row"><div className="h-[215px] w-full min-w-0 sm:w-1/2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stockPie} cx="50%" cy="50%" innerRadius={62} outerRadius={90} dataKey="value" paddingAngle={3} stroke="none">{stockPie.map((item, index) => <Cell key={item.name} fill={index ? "#f59e0b" : "#0ea5e9"} />)}</Pie><Tooltip formatter={(v) => formatNumber(v)} /></PieChart></ResponsiveContainer></div><div className="flex-1 space-y-4">{stockPie.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-8 border-b border-slate-100 pb-3 text-sm dark:border-white/10"><span className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: index ? "#f59e0b" : "#0ea5e9" }} />{item.name}</span><strong>{formatNumber(item.value)}</strong></div>)}</div></div>
        </section>}
        {branchSeries.length > 1 && branchSeriesKeys.length > 0 && <section className={panel} aria-label="Branch comparison chart">
          <div className="mb-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Branch performance</h2><p className="text-xs text-slate-600 dark:text-slate-400">Live totals from each authorized physical branch</p></div>
          <div className="h-[235px] w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={branchSeries} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 6" stroke="#cbd5e1" strokeOpacity={0.4}/><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={48} axisLine={false} tickLine={false}/><Tooltip formatter={(v, name) => name === "Stock units" ? formatNumber(v) : formatMoney(v)}/><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }}/>{branchSeriesKeys.includes("sales") && <Bar dataKey="sales" name="Sales" fill="#0284c7" radius={[5,5,0,0]}/>}{branchSeriesKeys.includes("purchases") && <Bar dataKey="purchases" name="Purchases" fill="#8b5cf6" radius={[5,5,0,0]}/>}{branchSeriesKeys.includes("stock") && <Bar dataKey="stock" name="Stock units" fill="#10b981" radius={[5,5,0,0]}/>}</BarChart></ResponsiveContainer></div>
        </section>}
      </div>}
      {growthItems.length > 0 && <section className={panel} aria-label="Monthly performance insights">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Monthly momentum</h2><p className="text-xs text-slate-500 dark:text-slate-400">Comparing the latest two reporting months, based on live authorized transactions</p></div><TrendingUp className="h-5 w-5 text-sky-500" /></div>
        <div className="grid gap-3 sm:grid-cols-2">{growthItems.map((item) => <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{item.key === "sales" ? "Sales momentum" : "Purchase momentum"}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><strong className="text-xl font-bold text-slate-900 dark:text-white">{formatMoney(item.current)}</strong><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.change == null ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200" : item.change >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"}`}>{item.change == null ? "No comparable baseline" : `${item.change >= 0 ? "+" : ""}${item.change.toFixed(1)}% vs prior month`}</span></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Previous month: {formatMoney(item.previous)}</p></div>)}</div>
      </section>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {operationalInsights.length > 0 && <section className={panel} aria-label="Operational insights">
          <div className="mb-5 flex items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Operations intelligence</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Actionable live signals from your accessible modules</p></div><Activity className="h-5 w-5 text-sky-500" /></div>
          <div className="grid gap-3 sm:grid-cols-2">{operationalInsights.map((insight) => <Link key={insight.key} to={insight.href} className="group rounded-2xl border border-slate-200 bg-slate-50/75 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.035]"><div className="flex items-start justify-between gap-2"><span className={`h-2.5 w-2.5 rounded-full ${insight.color}`} /><ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-sky-600" /></div><p className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{insight.title}</p><p className="mt-1 break-words text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{insight.kind === "money" ? formatMoney(insight.value) : insight.kind === "percent" ? `${insight.value.toFixed(1)}%` : formatNumber(insight.value)}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{insight.detail}</p>{insight.kind === "percent" && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full rounded-full ${insight.color}`} style={{ width: `${insight.value}%` }} /></div>}</Link>)}</div>
        </section>}
        <section className={`${panel} ${!operationalInsights.length ? "xl:col-span-2" : ""}`} aria-label="Recent business activity">
          <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-300"><Activity className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Transaction feed</h2><p className="text-xs text-slate-500 dark:text-slate-400">Latest activity you are authorized to view</p></div></div>
          {activities.length ? <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">{activities.slice(0, 12).map((item, index) => <Link key={`${item.type}-${item.branch}-${index}`} to={item.url === "/purchases/purchase-orders" ? "/purchases/orders" : item.url} className="group flex items-center gap-3 py-3.5 first:pt-0"><span className={`rounded-xl p-2.5 ${item.type === "sale" ? "bg-sky-500/10 text-sky-600" : "bg-violet-500/10 text-violet-600"}`}>{item.type === "sale" ? <TrendingUp className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.branch} · {item.at ? new Date(item.at).toLocaleDateString() : ""}</p></div><span className="shrink-0 text-xs font-bold text-slate-800 dark:text-slate-200">{formatMoney(item.amount)}</span></Link>)}</div> : <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No recent transactions in your authorized reporting scope.</div>}
        </section>
      </div>
    </div>
  );
}
