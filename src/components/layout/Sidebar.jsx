import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Cpu, Grid2X2, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import {
  canAccessNavigationItem,
  getModuleByPath,
  getModuleTarget,
} from "@/config/moduleNavigation";

const safePath = (item) => {
  if (typeof item?.to === "string") {
    return item.to;
  }

  if (typeof item?.path === "string") {
    return item.path;
  }

  if (typeof item?.href === "string") {
    return item.href;
  }

  return "";
};

const createTestId = (item) => {
  const target = safePath(item);

  const source = target || item?.label || "unknown";

  return `nav-${String(source)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
};

const normalizePath = (value) => {
  const path = typeof value === "string" ? value.trim() : "";

  if (!path) {
    return "";
  }

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

/**
 * Returns the single, most-specific matching sidebar path.
 *
 * Example:
 * Current path: /settings/users-roles
 *
 * Matching items:
 * - /settings
 * - /settings/users-roles
 *
 * Result:
 * - /settings/users-roles
 */
const getActiveSubmodulePath = (items, currentPath) => {
  const pathname = normalizePath(currentPath);

  if (!pathname || !Array.isArray(items)) {
    return "";
  }

  // Keep Purchase Expenses selected on list, create, detail, and edit pages.
  if (
    pathname === "/purchases/purchase-expenses" ||
    pathname.startsWith("/purchases/purchase-expenses/") ||
    pathname === "/purchases/expenses" ||
    pathname.startsWith("/purchases/expenses/")
  ) {
    const purchaseExpenseItem = items.find(
      (item) =>
        item?.id === "purchase-expenses" ||
        normalizePath(safePath(item)) === "/purchases/purchase-expenses" ||
        normalizePath(safePath(item)) === "/purchases/expenses",
    );

    if (purchaseExpenseItem) {
      return normalizePath(safePath(purchaseExpenseItem));
    }
  }

  const matchingPaths = items
    .map((item) => normalizePath(safePath(item)))
    .filter(Boolean)
    .filter(
      (target) => pathname === target || pathname.startsWith(`${target}/`),
    )
    .sort((first, second) => second.length - first.length);

  return matchingPaths[0] || "";
};

export function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const activeModule = React.useMemo(
    () => getModuleByPath(location.pathname),
    [location.pathname],
  );

  const submodules = React.useMemo(() => {
    if (!activeModule || !Array.isArray(activeModule.items)) {
      return [];
    }

    return activeModule.items.filter(
      (item) => safePath(item) && canAccessNavigationItem(item, user),
    );
  }, [activeModule, user]);

  const activeSubmodulePath = React.useMemo(
    () => getActiveSubmodulePath(submodules, location.pathname),
    [submodules, location.pathname],
  );

  const ModuleIcon = activeModule?.icon || Grid2X2;

  const goToMainMenu = () => {
    navigate("/modules");
  };

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden",
        "border-r border-blue-400/20",
        "bg-gradient-to-b from-[#123b78] via-[#0d3269] to-[#082554]",
        "text-white shadow-xl shadow-blue-950/20",
        "transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[270px]",
      )}
      data-testid="app-sidebar"
    >
      {/* Application logo */}
      <div
        className={cn(
          "flex min-h-[72px] items-center gap-3 border-b border-white/10 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <button
          type="button"
          onClick={goToMainMenu}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "bg-gradient-to-br from-blue-400 to-blue-700",
            "shadow-lg shadow-blue-950/40",
            "transition hover:scale-105",
          )}
          title="Open Main Menu"
        >
          <Cpu className="h-5 w-5 text-white" strokeWidth={2.2} />
        </button>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide text-white">
              {APP_NAME}
            </p>

            <p className="truncate text-[10px] text-blue-100/65">
              {APP_TAGLINE}
            </p>
          </div>
        )}
      </div>

      {/* Main Menu */}
      <div className={cn("px-3 pt-4", collapsed && "px-2")}>
        <button
          type="button"
          onClick={goToMainMenu}
          className={cn(
            "group flex w-full items-center rounded-xl",
            "border border-white/15 bg-white/[0.07]",
            "text-blue-50 transition",
            "hover:border-white/25 hover:bg-white/[0.13]",
            collapsed ? "h-11 justify-center px-2" : "gap-3 px-3 py-3",
          )}
          title={collapsed ? "Main Menu" : undefined}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center",
              "rounded-lg bg-white/10",
            )}
          >
            <Grid2X2 className="h-4 w-4" />
          </div>

          {!collapsed && (
            <span className="truncate text-sm font-semibold text-white">
              Main Menu
            </span>
          )}
        </button>
      </div>

      {/* Selected module */}
      {activeModule && (
        <div className={cn("px-3 pt-4", collapsed && "px-2")}>
          {!collapsed && (
            <p
              className={cn(
                "mb-2 px-2 text-[10px] font-semibold uppercase",
                "tracking-[0.14em] text-blue-100/45",
              )}
            >
              Selected Module
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const target = getModuleTarget(activeModule, user);

              if (target && !activeModule.externalUrl) {
                navigate(target);
              }
            }}
            className={cn(
              "flex w-full items-center rounded-xl",
              "border border-cyan-300/20",
              "bg-gradient-to-r from-cyan-400/15 to-blue-400/10",
              "shadow-inner shadow-white/[0.03]",
              collapsed ? "h-11 justify-center px-2" : "gap-3 px-3 py-3",
            )}
            title={
              collapsed
                ? activeModule.shortTitle || activeModule.title
                : undefined
            }
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center",
                "rounded-lg bg-cyan-300/15 text-cyan-100",
              )}
            >
              <ModuleIcon className="h-4 w-4" />
            </div>

            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="text-[10px] uppercase tracking-wide text-cyan-100/55">
                  Module
                </p>

                <p className="truncate text-sm font-semibold text-white">
                  {activeModule.shortTitle || activeModule.title}
                </p>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Submodules */}
      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        {!collapsed && (
          <p
            className={cn(
              "mb-2 px-2 text-[10px] font-semibold uppercase",
              "tracking-[0.14em] text-blue-100/45",
            )}
          >
            Submodules
          </p>
        )}

        <div className="space-y-1">
          {submodules.map((item) => {
            const target = normalizePath(safePath(item));

            const Icon = item.icon || Grid2X2;

            const active = target === activeSubmodulePath;

            return (
              <NavLink
                key={item.id || target}
                to={target}
                title={collapsed ? item.label : undefined}
                data-testid={createTestId(item)}
                className={cn(
                  "group relative flex items-center rounded-xl",
                  "text-sm transition-all duration-150",
                  collapsed ? "h-11 justify-center px-2" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-white text-blue-800 shadow-lg shadow-blue-950/20"
                    : "text-blue-100/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {active && (
                  <span
                    className={cn(
                      "absolute -left-3 h-6 w-1",
                      "rounded-r-full bg-cyan-300",
                    )}
                  />
                )}

                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active
                      ? "text-blue-600"
                      : "text-blue-100/70 group-hover:text-white",
                  )}
                  strokeWidth={1.8}
                />

                {!collapsed && (
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      "rounded-full bg-red-500",
                      "px-2 py-0.5 text-[10px]",
                      "font-bold text-white",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {!submodules.length && !collapsed && (
            <div
              className={cn(
                "rounded-xl border border-white/10",
                "bg-white/[0.05] px-3 py-5 text-center",
              )}
            >
              <p className="text-sm text-blue-100/70">
                No submodules are available.
              </p>

              <button
                type="button"
                onClick={goToMainMenu}
                className="mt-3 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
              >
                Main Menu
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "mb-2 flex w-full items-center rounded-xl",
            "text-blue-100/70 transition",
            "hover:bg-red-500/15 hover:text-red-100",
            collapsed ? "h-10 justify-center" : "gap-3 px-3 py-2.5",
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4" />

          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        <button
          type="button"
          onClick={onToggle}
          data-testid="sidebar-toggle-btn"
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-xl",
            "border border-white/15 text-blue-100/70 transition",
            "hover:bg-white/10 hover:text-white",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
