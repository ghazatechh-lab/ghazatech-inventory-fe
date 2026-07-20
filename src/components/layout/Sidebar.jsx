import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ReceiptText,
  ShoppingCart,
  RotateCcw,
  Wallet,
  Users,
  Boxes,
  Tag,
  Layers,
  TrendingDown,
  GitBranch,
  ClipboardList,
  Truck,
  PackageCheck,
  PackagePlus,
  Building2,
  ArrowLeftRight,
  UserSquare2,
  CalendarCheck,
  CalendarDays,
  Banknote,
  ShieldAlert,
  BadgeDollarSign,
  Landmark,
  HandCoins,
  BookOpenText,
  PieChart,
  ScrollText,
  Cog,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/permissions";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const groups = [
  {
    label: "Overview",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
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
        icon: Cog,
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
        icon: Layers,
      },
      {
        to: "/inventory/brands",
        label: "Brands",
        icon: Tag,
      },
      {
        to: "/inventory/products",
        label: "Products",
        icon: Boxes,
      },
      {
        to: "/inventory/stock",
        label: "Stock Overview",
        icon: PackageCheck,
      },
      {
        to: "/inventory/movements",
        label: "Stock Movements",
        icon: ArrowLeftRight,
      },
      {
        to: "/inventory/adjustments",
        label: "Stock Adjustments",
        icon: ClipboardList,
      },
      {
        to: "/inventory/low-stock",
        label: "Low Stock Items",
        icon: TrendingDown,
        badge: "!",
      },
    ],
  },
  {
    label: "Purchases",
    items: [
      {
        to: "/suppliers",
        label: "Suppliers",
        icon: Users,
      },
      {
        to: "/purchases/orders",
        label: "Purchase Orders",
        icon: FileText,
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
        icon: RotateCcw,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        to: "/sales/quotations",
        label: "Quotations",
        icon: FileText,
      },
      {
        to: "/sales/invoices",
        label: "Invoices",
        icon: ReceiptText,
      },
      {
        to: "/sales/pos",
        label: "Direct Sale / POS",
        icon: ShoppingCart,
      },
      {
        to: "/sales/credit-notes",
        label: "Credit Notes",
        icon: RotateCcw,
      },
      {
        to: "/sales/payments",
        label: "Sales Payments",
        icon: Wallet,
      },
      {
        to: "/customers",
        label: "Customers",
        icon: Users,
      },
    ],
  },

  {
    label: "Operations",
    items: [
      {
        to: "/transfers",
        label: "Stock Transfers",
        icon: GitBranch,
      },
      {
        to: "/shipments",
        label: "Shipments",
        icon: Truck,
      },
    ],
  },
  {
    label: "HRMS",
    items: [
      {
        to: "/hrms/employees",
        label: "Employees",
        icon: UserSquare2,
      },
      {
        to: "/hrms/attendance",
        label: "Attendance",
        icon: CalendarCheck,
      },
      {
        to: "/hrms/leaves",
        label: "Leave Requests",
        icon: CalendarDays,
      },
      {
        to: "/hrms/payroll",
        label: "Payroll",
        icon: Banknote,
        adminOnly: true,
      },
      {
        to: "/hrms/document-expiry",
        label: "Document Expiry",
        icon: ShieldAlert,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        to: "/reports/dashboard",
        label: "Dashboard Reports",
        icon: PieChart,
      },
      {
        to: "/reports/sales",
        label: "Sales Reports",
        icon: FileText,
      },
      {
        to: "/reports/purchases",
        label: "Purchase Reports",
        icon: PackagePlus,
      },
      {
        to: "/reports/inventory",
        label: "Inventory Reports",
        icon: Boxes,
      },
      {
        to: "/reports/hrms",
        label: "HRMS Reports",
        icon: UserSquare2,
      },
      {
        to: "/reports/finance",
        label: "Finance Reports",
        icon: BadgeDollarSign,
      },
    ],
    hideForStaff: true,
  },
  {
    label: "Finance",
    items: [
      {
        to: "/finance/expenses",
        label: "Expenses",
        icon: BadgeDollarSign,
      },
      {
        to: "/finance/receivables",
        label: "Customer Receivables",
        icon: HandCoins,
      },
      {
        to: "/finance/payables",
        label: "Supplier Payables",
        icon: Wallet,
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
      {
        to: "/finance/ledger",
        label: "Ledger",
        icon: BookOpenText,
      },
    ],
    hideForStaff: true,
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
          if (group.hideForStaff && isStaff(user)) {
            return null;
          }

          const visibleItems = group.items.filter(
            (item) => !(item.adminOnly && !isAdmin(user)),
          );

          if (!visibleItems.length) {
            return null;
          }

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
                    data-testid={`nav-${item.to
                      .replace(/\//g, "-")
                      .replace(/^-/, "")}`}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        isActive
                          ? "border border-blue-500/25 bg-blue-600/15 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                      )
                    }
                    end
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
        className="mx-3 mb-3 flex h-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
