import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingState, EmptyState } from "@/components/common/States";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, PackageOpen, HandCoins, Wallet,
  ReceiptText, FileText, ShieldAlert, ArrowUpRight, ArrowDownRight, Boxes
} from "lucide-react";
import { formatAED, formatNumber } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";

const CHART_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

function KpiCard({ title, value, delta, icon: Icon, tint = "blue", isCurrency = true, testId }) {
  const positive = (delta ?? 0) >= 0;
  const tintMap = {
    blue: "from-blue-500/20 to-blue-500/0 text-blue-400",
    green: "from-emerald-500/20 to-emerald-500/0 text-emerald-400",
    purple: "from-violet-500/20 to-violet-500/0 text-violet-400",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-400",
    red: "from-red-500/20 to-red-500/0 text-red-400",
    slate: "from-slate-500/20 to-slate-500/0 text-slate-400",
  };
  return (
    <div className="card-surface p-5 relative overflow-hidden" data-testid={testId}>
      <div className={`absolute -top-8 -right-8 w-32 h-32 bg-gradient-radial rounded-full bg-gradient-to-br ${tintMap[tint]} blur-2xl opacity-70`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">{title}</span>
          <Icon className={`w-4 h-4 ${tintMap[tint].split(" ").pop()}`} />
        </div>
        <div className="mt-3 text-2xl font-semibold font-numeric text-white tracking-tight">
          {isCurrency ? formatAED(value) : formatNumber(value)}
        </div>
        {delta !== undefined && (
          <div className={`mt-1 flex items-center text-[11px] ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            <span className="font-numeric">{Math.abs(delta).toFixed(1)}%</span>
            <span className="text-slate-500 ml-1.5">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, branchOverride } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", branchOverride],
    queryFn: async () => unwrap(await api.get("/dashboard/", { params: branchOverride ? { branch_id: branchOverride } : {} })),
  });

  if (isLoading) return <LoadingState label="Loading dashboard…" rows={10} />;

  const k = data?.kpi ?? {};
  const trend = data?.trend ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user?.full_name?.split(" ")[0]}`}
        subtitle={`Here's what's happening across ${branchOverride ? "your selected branch" : user?.role?.code === "ADMIN" ? "all branches" : "your branch"} today.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total stock value" value={k.stock_value} delta={4.2} icon={Boxes} tint="blue" testId="kpi-stock-value" />
        <KpiCard title="Sales this month" value={k.sales_month} delta={12.5} icon={TrendingUp} tint="green" testId="kpi-sales-month" />
        <KpiCard title="Purchases this month" value={k.purchases_month} delta={-3.1} icon={ShoppingCart} tint="amber" testId="kpi-purchases-month" />
        <KpiCard title="Total receivables" value={k.receivables} delta={2.3} icon={HandCoins} tint="purple" testId="kpi-receivables" />
        <KpiCard title="Total payables" value={k.payables} delta={-1.4} icon={Wallet} tint="red" testId="kpi-payables" />
        <KpiCard title="Expenses this month" value={k.expenses_month} delta={5.6} icon={ReceiptText} tint="slate" testId="kpi-expenses" />
        <KpiCard title="Low stock items" value={k.low_stock_count} icon={TrendingDown} tint="amber" isCurrency={false} testId="kpi-low-stock" />
        <KpiCard title="Pending quotations" value={k.pending_quotations} icon={FileText} tint="blue" isCurrency={false} testId="kpi-pending-quotations" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Sales vs Purchases</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={v => (v >= 1000 ? `${Math.round(v/1000)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "#0f1522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v) => formatAED(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: "#3B82F6" }} name="Sales" />
                <Line type="monotone" dataKey="purchases" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} name="Purchases" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Sales by category</h3>
            <p className="text-xs text-slate-500">Distribution</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={(data?.sales_by_category || []).slice(0, 6)} dataKey="value" nameKey="category" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {(data?.sales_by_category || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f1522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={v => formatAED(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Stock value by branch</h3>
            <p className="text-xs text-slate-500">AED</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data?.stock_by_branch || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="branch" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} tickFormatter={v => (v >= 1000 ? `${Math.round(v/1000)}k` : v)} />
                <Tooltip contentStyle={{ background: "#0f1522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={v => formatAED(v)} />
                <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Top selling products</h3>
          <div className="space-y-2">
            {(data?.top_products || []).length === 0 && <EmptyState title="No sales yet" description="Data will appear once you record sales." />}
            {(data?.top_products || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-white/[0.02]">
                <div className="min-w-0 pr-2">
                  <div className="text-xs text-slate-200 truncate">{p.name}</div>
                </div>
                <div className="font-numeric text-xs text-slate-300">{formatAED(p.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-200">Document expiry alerts</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.doc_expiry_alerts || []).length === 0 && <div className="text-xs text-slate-500 py-4 text-center">All documents valid.</div>}
            {(data?.doc_expiry_alerts || []).map((a, i) => (
              <Link to={`/hrms/employees/${a.employee.id}`} key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-white/[0.02]">
                <div className="min-w-0">
                  <div className="text-xs text-slate-200 truncate">{a.employee.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{a.document_type.replace(/_/g, " ")}</div>
                </div>
                <StatusBadge status={a.days_left < 0 ? "expired" : a.days_left <= 7 ? "critical" : a.days_left <= 30 ? "warning" : "info"} label={a.days_left < 0 ? "Expired" : `${a.days_left}d`} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Recent invoices</h3>
            <Link to="/sales/invoices" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <div className="space-y-2">
            {(data?.recent_invoices || []).map(inv => (
              <Link to={`/sales/invoices/${inv.id}`} key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.02]">
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 font-numeric">{inv.invoice_number}</div>
                  <div className="text-xs text-slate-500 truncate">{inv.customer.name} · <DateText value={inv.date} /></div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-numeric text-white">{formatAED(inv.total)}</div>
                  <div className="mt-0.5"><StatusBadge status={inv.payment_status} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Low-stock alerts</h3>
            <Link to="/inventory/low-stock" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <div className="space-y-2">
            {(data?.low_stock_products || []).map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={s.product.image} alt="" className="w-9 h-9 rounded-md object-cover" />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-100 truncate">{s.product.name}</div>
                    <div className="text-[10px] text-slate-500">{s.branch.name} · SKU {s.product.sku}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-numeric text-sm text-white">{s.quantity}</div>
                  <div className="text-[10px] text-slate-500">Reorder ≥ {s.reorder_level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
