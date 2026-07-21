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
              <span className="text-slate-600" aria-hidden="true">
                /
              </span>
            )}

            {isLast ? (
              <span className="font-medium text-slate-200">{label}</span>
            ) : isSectionOnly ? (
              <span className="cursor-default text-slate-500">{label}</span>
            ) : (
              <Link
                to={generatedPath}
                className="text-slate-500 transition-colors hover:text-slate-200"
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
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0E17]/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="rounded-md p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />

        <div className="flex-1" />

        <div className="hidden h-9 w-72 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-sm text-slate-500 md:flex">
          <Search className="h-4 w-4" />
          <span>Search anything…</span>
        </div>

        {isAdmin(user) ? (
          <BranchSelector />
        ) : (
          <div className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-slate-300 md:flex">
            <Building2 className="h-3.5 w-3.5" />

            <span>{userBranchCode}</span>
          </div>
        )}

        <button
          type="button"
          className="relative rounded-md p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
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
              className="flex items-center gap-2 rounded-md p-1 transition hover:bg-white/5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
                {userInitial}
              </div>

              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.full_name || user?.username || "User"}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User2 className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
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
