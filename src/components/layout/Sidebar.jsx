import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  Users,
  FileText,
  ShoppingCart,
  ReceiptText,
  CircleDollarSign,
  Undo2,
  ContactRound,
  ClipboardList,
  PackageCheck,
  HandCoins,
  PackageX,
  Package,
  Shapes,
  Tags,
  Warehouse,
  TriangleAlert,
  ArrowRightLeft,
  SlidersHorizontal,
  Truck,
  Repeat2,
  UserRoundCog,
  CalendarCheck2,
  CalendarDays,
  Banknote,
  FileWarning,
  BadgeDollarSign,
  WalletCards,
  Landmark,
  BookOpenText,
  ChartNoAxesCombined,
  ChartColumnBig,
  PackageSearch,
  ChartPie,
  UsersRound,
  ChartSpline,
  Building2,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/permissions";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Navigation order follows a standard ERP workflow:
 * overview -> sales -> purchasing -> inventory -> logistics -> HR -> finance
 * -> reports -> administration.
 *
 * Master data is placed beside the module where it is used:
 * - Customers are under Sales.
 * - Suppliers are under Purchasing.
 * - Brands and Categories are under Inventory.
 */
const groups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        to: "/branches",
        label: "Branches",
        icon: Building2,
        adminOnly: true,
      },
      {
        to: "/audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
        adminOnly: true,
      },
      {
        to: "/settings",
        label: "Settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        to: "/inventory/categories",
        label: "Categories",
        icon: Shapes,
        adminOnly: true,
      },
      { to: "/inventory/products", label: "Products", icon: Package },

      {
        to: "/inventory/brands",
        label: "Brands",
        icon: Tags,
        adminOnly: true,
      },
      {
        to: "/inventory/stock",
        label: "Stock Overview",
        icon: Warehouse,
      },
      {
        to: "/inventory/low-stock",
        label: "Low Stock Items",
        icon: TriangleAlert,
        badge: "!",
      },
      {
        to: "/inventory/movements",
        label: "Stock Movements",
        icon: ArrowRightLeft,
      },
      {
        to: "/inventory/adjustments",
        label: "Stock Adjustments",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/sales/quotations", label: "Quotations", icon: FileText },
      { to: "/sales/pos", label: "Direct Sale / POS", icon: ShoppingCart },
      { to: "/sales/invoices", label: "Sales Invoices", icon: ReceiptText },
      {
        to: "/sales/payments",
        label: "Customer Payments",
        icon: CircleDollarSign,
      },
      { to: "/sales/credit-notes", label: "Credit Notes", icon: Undo2 },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { to: "/suppliers", label: "Suppliers", icon: ContactRound },
      {
        to: "/purchases/orders",
        label: "Purchase Orders",
        icon: ClipboardList,
      },
      {
        to: "/purchases/grn",
        label: "Goods Received Notes",
        icon: PackageCheck,
      },
      {
        to: "/purchases/supplier-bills",
        label: "Supplier Bills",
        icon: ReceiptText,
      },
      {
        to: "/purchases/supplier-payments",
        label: "Supplier Payments",
        icon: HandCoins,
      },
      {
        to: "/purchases/supplier-returns",
        label: "Supplier Returns",
        icon: PackageX,
      },
    ],
  },

  {
    label: "Warehouse & Logistics",
    items: [
      { to: "/transfers", label: "Stock Transfers", icon: Repeat2 },
      { to: "/shipments", label: "Shipments", icon: Truck },
    ],
  },
  {
    label: "Human Resources",
    items: [
      { to: "/hrms/employees", label: "Employees", icon: UserRoundCog },
      {
        to: "/hrms/attendance",
        label: "Attendance",
        icon: CalendarCheck2,
      },
      { to: "/hrms/leaves", label: "Leave Requests", icon: CalendarDays },
      {
        to: "/hrms/payroll",
        label: "Payroll",
        icon: Banknote,
        adminOnly: true,
      },
      {
        to: "/hrms/document-expiry",
        label: "Document Expiry",
        icon: FileWarning,
      },
    ],
  },
  {
    label: "Finance & Accounts",
    hideForStaff: true,
    items: [
      { to: "/finance/expenses", label: "Expenses", icon: BadgeDollarSign },
      {
        to: "/finance/receivables",
        label: "Customer Receivables",
        icon: CircleDollarSign,
      },
      {
        to: "/finance/payables",
        label: "Supplier Payables",
        icon: WalletCards,
      },
      {
        to: "/finance/cash-register",
        label: "Cash Register",
        icon: Banknote,
      },
      {
        to: "/finance/bank-accounts",
        label: "Bank Accounts",
        icon: Landmark,
      },
      { to: "/finance/ledger", label: "General Ledger", icon: BookOpenText },
    ],
  },
  {
    label: "Reports & Analytics",
    hideForStaff: true,
    items: [
      {
        to: "/reports/dashboard",
        label: "Reports Dashboard",
        icon: ChartNoAxesCombined,
      },
      { to: "/reports/sales", label: "Sales Reports", icon: ChartColumnBig },
      {
        to: "/reports/purchases",
        label: "Purchase Reports",
        icon: PackageSearch,
      },
      {
        to: "/reports/inventory",
        label: "Inventory Reports",
        icon: ChartPie,
      },
      { to: "/reports/hrms", label: "HRMS Reports", icon: UsersRound },
      {
        to: "/reports/finance",
        label: "Finance Reports",
        icon: ChartSpline,
      },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "sidebar-surface sticky top-0 flex h-screen flex-col transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[264px]",
      )}
      data-testid="app-sidebar"
    >
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-white/5 px-4 py-4",
          collapsed && "px-3",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
          <Cpu className="h-5 w-5 text-white" strokeWidth={2.2} />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight tracking-wide text-white">
              {APP_NAME}
            </div>
            <div className="text-[11px] leading-tight text-slate-500">
              {APP_TAGLINE}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => {
          if (group.hideForStaff && isStaff(user)) return null;

          const visibleItems = group.items.filter(
            (item) => !(item.adminOnly && !isAdmin(user)),
          );

          if (!visibleItems.length) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {group.label}
                </div>
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    data-testid={`nav-${item.to
                      .replace(/\//g, "-")
                      .replace(/^-/, "")}`}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        isActive
                          ? "border border-blue-500/25 bg-blue-600/15 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                      )
                    }
                  >
                    <item.icon
                      className="h-4 w-4 shrink-0"
                      strokeWidth={1.75}
                    />

                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        data-testid="sidebar-toggle-btn"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mx-3 mb-3 flex h-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
