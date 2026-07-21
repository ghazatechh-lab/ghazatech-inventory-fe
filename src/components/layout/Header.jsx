import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User2,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import api, { unwrap } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { isAdmin } from "@/lib/permissions";
import { BranchSelector } from "@/components/common/BranchSelector";
import { NotificationDrawer } from "@/components/common/NotificationDrawer";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const routeLabels = {
  dashboard: "Dashboard",
  branches: "Branches",
  inventory: "Inventory",
  categories: "Categories",
  brands: "Brands",
  products: "Products",
  racks: "Racks",
  stock: "Stock",
  movements: "Movements",
  adjustments: "Adjustments",
  "low-stock": "Low Stock",
  transfers: "Stock Transfers",
  shipments: "Shipments",
  customers: "Customers",
  sales: "Sales",
  quotations: "Quotations",
  invoices: "Invoices",
  pos: "POS",
  suppliers: "Suppliers",
  purchases: "Purchases",
  reports: "Reports",
  finance: "Finance",
  settings: "Settings",
  notifications: "Notifications",
  "audit-logs": "Audit Logs",
  new: "New",
  edit: "Edit",
};

const nonClickableSegments = new Set(["inventory"]);

function formatDynamicLabel(part) {
  if (/^\d+$/.test(part)) {
    return `#${part}`;
  }

  return part
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Breadcrumbs() {
  const { pathname } = useLocation();

  const parts = pathname.split("/").filter(Boolean);

  if (!parts.length) {
    return null;
  }

  return (
    <nav
      className="hidden items-center gap-1.5 text-sm md:flex"
      aria-label="Breadcrumb"
    >
      {parts.map((part, index) => {
        const generatedPath = "/" + parts.slice(0, index + 1).join("/");

        const label = routeLabels[part] || formatDynamicLabel(part);

        const isLast = index === parts.length - 1;

        const isSectionOnly = nonClickableSegments.has(part);

        return (
          <React.Fragment key={generatedPath}>
            {index > 0 && (
              <span
                className="text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              >
                /
              </span>
            )}

            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {label}
              </span>
            ) : isSectionOnly ? (
              <span className="text-slate-500 dark:text-slate-500">
                {label}
              </span>
            ) : (
              <Link
                to={generatedPath}
                className="text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-500 dark:hover:text-slate-200"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

const normalizeNotificationList = (response) => {
  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

export function Header({ onOpenMobileSidebar }) {
  const { user, logout } = useAuth();

  const [notificationOpen, setNotificationOpen] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notif-count"],
    queryFn: async () => {
      const response = await api.get("/notifications/", {
        params: {
          page_size: 20,
        },
      });

      return normalizeNotificationList(response);
    },
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const userInitial =
    user?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.username?.trim()?.charAt(0)?.toUpperCase() ||
    "?";

  const userBranchCode =
    user?.branch?.branch_code ||
    user?.branch_detail?.branch_code ||
    "No branch";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-[#0A0E17]/85 dark:shadow-none">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />

        <div className="flex-1" />

        <div className="hidden h-9 w-72 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm md:flex dark:border-white/10 dark:bg-white/[0.02] dark:shadow-none">
          <Search className="h-4 w-4" />
          <span>Search anything…</span>
        </div>

        {isAdmin(user) ? (
          <BranchSelector />
        ) : (
          <div className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm md:flex dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:shadow-none">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />

            <span>{userBranchCode}</span>
          </div>
        )}

        <ThemeToggle />

        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          onClick={() => setNotificationOpen(true)}
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-medium leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
                {userInitial}
              </div>

              <div className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-medium text-slate-900 dark:text-slate-200">
                  {user?.full_name || user?.username || "User"}
                </span>

                <span className="text-[10px] text-slate-500">
                  {user?.role?.name || user?.role_detail?.name || ""}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {user?.full_name || user?.username || "User"}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User2 className="mr-2 h-4 w-4" />
                Profile & Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={logout}
              className="text-red-500 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotificationDrawer
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
      />
    </header>
  );
}
