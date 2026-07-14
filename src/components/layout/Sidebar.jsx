import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileText, ReceiptText, ShoppingCart, RotateCcw, Wallet, Users,
  Boxes, Tag, Layers, TrendingDown, GitBranch, ClipboardList,
  Truck, PackageCheck, PackagePlus, Building2, ArrowLeftRight,
  UserSquare2, CalendarCheck, CalendarDays, Banknote, ShieldAlert,
  BadgeDollarSign, Landmark, HandCoins, BookOpenText, PieChart,
  BellRing, ScrollText, Cog, ChevronLeft, ChevronRight, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/permissions";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const groups = [
  { label: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [
    { to: "/sales/quotations", label: "Quotations", icon: FileText },
    { to: "/sales/invoices", label: "Invoices", icon: ReceiptText },
    { to: "/sales/pos", label: "Direct Sale / POS", icon: ShoppingCart },
    { to: "/sales/credit-notes", label: "Credit Notes", icon: RotateCcw },
    { to: "/sales/payments", label: "Sales Payments", icon: Wallet },
    { to: "/customers", label: "Customers", icon: Users },
  ]},
  { label: "Inventory", items: [
    { to: "/inventory/products", label: "Products", icon: Boxes },
    { to: "/inventory/stock", label: "Stock Overview", icon: Layers },
    { to: "/inventory/movements", label: "Stock Movements", icon: ArrowLeftRight },
    { to: "/inventory/adjustments", label: "Stock Adjustments", icon: ClipboardList },
    { to: "/inventory/low-stock", label: "Low Stock Items", icon: TrendingDown, badge: "!" },
  ]},
  { label: "Purchases", items: [
    { to: "/suppliers", label: "Suppliers", icon: Tag },
    { to: "/purchases/orders", label: "Purchase Orders", icon: FileText },
    { to: "/purchases/grn", label: "Goods Received Notes", icon: PackageCheck },
    { to: "/purchases/supplier-bills", label: "Supplier Bills", icon: ReceiptText },
    { to: "/purchases/supplier-payments", label: "Supplier Payments", icon: HandCoins },
    { to: "/purchases/supplier-returns", label: "Supplier Returns", icon: RotateCcw },
  ]},
  { label: "Operations", items: [
    { to: "/transfers", label: "Stock Transfers", icon: GitBranch },
    { to: "/shipments", label: "Shipments", icon: Truck },
  ], hideForStaff: false },
  { label: "HRMS", items: [
    { to: "/hrms/employees", label: "Employees", icon: UserSquare2 },
    { to: "/hrms/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/hrms/leaves", label: "Leave Requests", icon: CalendarDays },
    { to: "/hrms/payroll", label: "Payroll", icon: Banknote, adminOnly: true },
    { to: "/hrms/document-expiry", label: "Document Expiry", icon: ShieldAlert },
  ]},
  { label: "Finance", items: [
    { to: "/finance/expenses", label: "Expenses", icon: BadgeDollarSign },
    { to: "/finance/receivables", label: "Customer Receivables", icon: HandCoins },
    { to: "/finance/payables", label: "Supplier Payables", icon: Wallet },
    { to: "/finance/cash-register", label: "Cash Register", icon: Banknote },
    { to: "/finance/bank-accounts", label: "Bank Accounts", icon: Landmark },
    { to: "/finance/ledger", label: "Ledger", icon: BookOpenText },
  ], hideForStaff: true },
  { label: "Reports", items: [
    { to: "/reports/dashboard", label: "Dashboard Reports", icon: PieChart },
    { to: "/reports/sales", label: "Sales Reports", icon: FileText },
    { to: "/reports/purchases", label: "Purchase Reports", icon: PackagePlus },
    { to: "/reports/inventory", label: "Inventory Reports", icon: Boxes },
    { to: "/reports/hrms", label: "HRMS Reports", icon: UserSquare2 },
    { to: "/reports/finance", label: "Finance Reports", icon: BadgeDollarSign },
  ], hideForStaff: true },
  { label: "Administration", items: [
    { to: "/branches", label: "Branches", icon: Building2, adminOnly: true },
    { to: "/notifications", label: "Notifications", icon: BellRing },
    { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, adminOnly: true },
    { to: "/settings", label: "Settings", icon: Cog, adminOnly: true },
  ]},
];

export function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  return (
    <aside
      className={cn("sidebar-surface h-screen sticky top-0 transition-[width] duration-200 flex flex-col", collapsed ? "w-[68px]" : "w-[264px]")}
      data-testid="app-sidebar"
    >
      <div className={cn("flex items-center gap-2.5 px-4 py-4 border-b border-white/5", collapsed && "px-3")}>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Cpu className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-wide text-white leading-tight">{APP_NAME}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{APP_TAGLINE}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {groups.map((g) => {
          const items = g.items.filter(it => !(it.adminOnly && !isAdmin(user)));
          if (g.hideForStaff && isStaff(user)) return null;
          if (!items.length) return null;
          return (
            <div key={g.label}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{g.label}</div>
              )}
              <div className="space-y-0.5">
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    data-testid={`nav-${it.to.replace(/\//g, "-").replace(/^-/, "")}`}
                    className={({ isActive }) => cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                      isActive
                        ? "bg-blue-600/15 text-white border border-blue-500/25 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    )}
                    end
                  >
                    <it.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && it.badge && (
                      <span className="ml-auto text-[10px] font-medium bg-red-500/15 text-red-400 rounded-full px-1.5 py-0.5">{it.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        data-testid="sidebar-toggle-btn"
        className="mx-3 mb-3 flex items-center justify-center h-8 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
