import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Bell, Search, LogOut, User2, ChevronDown, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/permissions";
import { BranchSelector } from "@/components/common/BranchSelector";
import { NotificationDrawer } from "@/components/common/NotificationDrawer";

const routeLabels = {
  dashboard: "Dashboard", branches: "Branches", inventory: "Inventory",
  products: "Products", stock: "Stock", movements: "Movements", adjustments: "Adjustments",
  "low-stock": "Low Stock", customers: "Customers", sales: "Sales", quotations: "Quotations",
  invoices: "Invoices", pos: "POS", "credit-notes": "Credit Notes", payments: "Payments",
  suppliers: "Suppliers", purchases: "Purchases", orders: "Orders", grn: "GRN",
  "supplier-bills": "Supplier Bills", "supplier-payments": "Supplier Payments",
  "supplier-returns": "Supplier Returns", transfers: "Transfers", shipments: "Shipments",
  hrms: "HRMS", employees: "Employees", attendance: "Attendance", leaves: "Leaves",
  payroll: "Payroll", "document-expiry": "Document Expiry", finance: "Finance",
  expenses: "Expenses", receivables: "Receivables", payables: "Payables",
  "cash-register": "Cash Register", "bank-accounts": "Bank Accounts", ledger: "Ledger",
  reports: "Reports", notifications: "Notifications", "audit-logs": "Audit Logs",
  settings: "Settings", new: "New",
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="hidden md:flex items-center gap-1.5 text-sm">
      {parts.map((p, i) => {
        const label = routeLabels[p] || p.charAt(0).toUpperCase() + p.slice(1);
        const to = "/" + parts.slice(0, i + 1).join("/");
        const isLast = i === parts.length - 1;
        return (
          <React.Fragment key={to}>
            {i > 0 && <span className="text-slate-600">/</span>}
            {isLast
              ? <span className="text-slate-200 font-medium">{label}</span>
              : <Link to={to} className="text-slate-500 hover:text-slate-200 transition">{label}</Link>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function Header({ onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = React.useState(false);

  const { data: notifs } = useQuery({
    queryKey: ["notif-count"],
    queryFn: async () => unwrap(await api.get("/notifications/", { params: { page_size: 20 } })),
  });
  const unread = notifs?.results?.filter(n => !n.is_read).length ?? 0;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0E17]/85 border-b border-white/5">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
        <button
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          onClick={onOpenMobileSidebar}
          data-testid="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Breadcrumbs />
        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 bg-white/[0.02] text-slate-500 text-sm w-72 cursor-pointer hover:border-white/20 transition" data-testid="global-search-btn">
          <Search className="w-4 h-4" />
          <span>Search anything…</span>
          <span className="ml-auto kbd">⌘K</span>
        </div>

        {isAdmin(user) ? <BranchSelector /> : (
          <div className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[160px]">{user?.branch?.branch_name}</span>
          </div>
        )}

        <button
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          onClick={() => setNotifOpen(true)}
          data-testid="notification-bell-btn"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-red-500 text-white rounded-full">{unread}</span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-white/5 transition" data-testid="user-menu-btn">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-semibold flex items-center justify-center">
                {user?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium text-slate-200">{user?.full_name}</span>
                <span className="text-[10px] text-slate-500">{user?.role?.name}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/settings"><User2 className="w-4 h-4 mr-2" /> Profile & Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="logout-btn" className="text-red-400 focus:text-red-300">
              <LogOut className="w-4 h-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}
