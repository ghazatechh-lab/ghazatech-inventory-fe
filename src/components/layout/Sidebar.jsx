import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Grid2X2,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import {
  canAccessNavigationItem,
  getModuleByPath,
  getModuleTarget,
  getVisibleModules,
} from "@/config/moduleNavigation";

const safePath = (item) => {
  if (typeof item?.to === "string") return item.to;
  if (typeof item?.path === "string") return item.path;
  if (typeof item?.href === "string") return item.href;
  return "";
};

const normalizePath = (value) => {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path) return "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
};

const createTestId = (item) => {
  const source = safePath(item) || item?.label || item?.title || "unknown";

  return `nav-${String(source)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
};

const isPathActive = (target, pathname) => {
  const itemPath = normalizePath(target);
  const currentPath = normalizePath(pathname);

  if (!itemPath || !currentPath) return false;
  if (itemPath === "/dashboard") return currentPath === "/dashboard";

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
};

const getBestActiveTarget = (items, pathname) => {
  const matches = (Array.isArray(items) ? items : [])
    .map((item) => normalizePath(safePath(item)))
    .filter((target) => target && isPathActive(target, pathname))
    .sort((first, second) => second.length - first.length);

  return matches[0] || "";
};

const isDirectModule = (module, items) => {
  if (module?.externalUrl) return true;
  if (!Array.isArray(items) || items.length !== 1) return false;

  const moduleTarget = normalizePath(module?.landingPath || module?.path || "");
  const itemTarget = normalizePath(safePath(items[0]));

  return Boolean(moduleTarget && itemTarget && moduleTarget === itemTarget);
};

const getInitials = (user) => {
  const name =
    user?.full_name || user?.name || user?.username || user?.email || "User";

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export function Sidebar({ collapsed, onToggle, onNavigate, mobile = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [search, setSearch] = React.useState("");
  const navRef = React.useRef(null);
  const visibleModules = React.useMemo(() => getVisibleModules(user), [user]);
  const activeModule = React.useMemo(
    () => getModuleByPath(location.pathname),
    [location.pathname],
  );
  /*
   * Keep only one sidebar module expanded at a time.
   * The module containing the current route opens automatically.
   */
  const [expandedModuleId, setExpandedModuleId] = React.useState(
    () => activeModule?.id || null,
  );

  React.useEffect(() => {
    if (!activeModule?.id) return;
    setExpandedModuleId(activeModule.id);
  }, [activeModule?.id]);

  const filteredModules = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return visibleModules;

    return visibleModules
      .map((module) => {
        const items = (module.items || []).filter((item) =>
          canAccessNavigationItem(item, user),
        );
        const moduleMatches = String(module.title || module.shortTitle || "")
          .toLowerCase()
          .includes(keyword);
        const matchingItems = items.filter((item) =>
          String(item.label || item.title || "")
            .toLowerCase()
            .includes(keyword),
        );

        if (!moduleMatches && !matchingItems.length) return null;
        return { ...module, items: moduleMatches ? items : matchingItems };
      })
      .filter(Boolean);
  }, [search, user, visibleModules]);

  const handleModuleClick = (module, items = [], event) => {
    if (module.externalUrl) {
      window.open(module.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const directModule = isDirectModule(module, items);

    if (collapsed || directModule) {
      const target = directModule
        ? safePath(items[0])
        : getModuleTarget(module, user);

      if (target) {
        navigate(target);
        onNavigate?.();
      }
      return;
    }

    const opening = expandedModuleId !== module.id;

    setExpandedModuleId(opening ? module.id : null);

    if (opening) {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          event?.currentTarget?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        }, 180);
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      navigate("/login", { replace: true });
      onNavigate?.();
    }
  };

  const userName = user?.full_name || user?.name || user?.username || "User";
  const roleName =
    user?.role?.name || user?.role_name || user?.role_code || "Team Member";

  return (
    <aside
      data-testid="app-sidebar"
      data-app-sidebar="true"
      data-collapsed={collapsed && !mobile ? "true" : "false"}
      data-mobile={mobile ? "true" : "false"}
      className={cn(
        "relative z-30 flex h-full min-h-0 shrink-0 flex-col overflow-hidden text-white",
        "border-r border-white/[0.08] bg-[#07162f]",
        "shadow-[18px_0_48px_rgba(2,12,30,0.20)]",
        "sidebar-shell transition-[width,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform]",
        mobile ? "w-full" : collapsed ? "w-[84px]" : "w-[304px]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,42,81,0.94)_0%,rgba(7,22,47,0.98)_52%,rgba(4,15,34,1)_100%)]" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.09] blur-3xl" />
        <div className="absolute -left-28 bottom-10 h-60 w-60 rounded-full bg-amber-300/[0.06] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />
      </div>

      <div
        className={cn(
          "relative flex min-h-[88px] items-center gap-3 border-b border-white/[0.08] px-4",
          collapsed && !mobile && "justify-center px-3",
        )}
      >
        <button
          type="button"
          onClick={() => {
            navigate("/dashboard");
            onNavigate?.();
          }}
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-amber-100/25 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_12px_30px_rgba(245,158,11,0.20)] transition duration-200 hover:-translate-y-0.5"
          title="Dashboard"
        >
          <span className="absolute inset-[1px] rounded-[17px] bg-gradient-to-br from-white/25 to-transparent" />
          <Cpu className="relative h-5 w-5 text-[#08214a]" strokeWidth={2.3} />
        </button>

        {(!collapsed || mobile) && (
          <div className="sidebar-brand-copy min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="sidebar-user-label truncate text-[15px] font-extrabold tracking-[0.02em]">
                {APP_NAME}
              </p>
              <span className="rounded-md border border-amber-200/20 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] !text-amber-200">
                ERP
              </span>
            </div>
            <p className="sidebar-role-label mt-1 truncate text-[10px] font-medium tracking-wide">
              {APP_TAGLINE}
            </p>
          </div>
        )}

        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] !text-white hover:bg-white/[0.12]"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(!collapsed || mobile) && (
        <div className="relative px-4 pb-2 pt-4">
          <div className="sidebar-search group flex items-center gap-2.5 rounded-2xl border border-white/[0.09] bg-white/[0.055] px-3.5 py-3 shadow-inner shadow-black/10 backdrop-blur-xl transition focus-within:border-amber-200/35 focus-within:bg-white/[0.08]">
            <Search className="h-4 w-4 shrink-0 !text-white/80" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold !text-white outline-none placeholder:!text-white/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="!text-white/80 hover:!text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <nav
        ref={navRef}
        className="sidebar-nav relative flex-1 overflow-y-auto px-3 py-3 [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin]"
      >
        {(!collapsed || mobile) && (
          <div className="mb-2 flex items-center justify-between px-2.5 py-1.5">
            <p className="sidebar-section-label text-[11px] font-extrabold uppercase tracking-[0.16em]">
              Main workspace
            </p>
            <Sparkles className="h-3.5 w-3.5 !text-amber-300" />
          </div>
        )}

        <div className="space-y-1.5">
          {filteredModules.map((module) => {
            const ModuleIcon = module.icon || Grid2X2;
            const routeActive = activeModule?.id === module.id;
            const expanded =
              (!collapsed || mobile) &&
              (expandedModuleId === module.id || Boolean(search.trim()));
            const items = (module.items || []).filter((item) =>
              canAccessNavigationItem(item, user),
            );
            const directModule = isDirectModule(module, items);

            /*
             * Accordion modules must highlight the module the user opened,
             * even before a submenu route is selected. Direct modules still
             * follow the current URL.
             */
            const moduleSelected = directModule
              ? routeActive
              : expandedModuleId === module.id;

            return (
              <div key={module.id} className="sidebar-module space-y-1">
                <button
                  type="button"
                  onClick={(event) => handleModuleClick(module, items, event)}
                  title={
                    collapsed && !mobile
                      ? module.shortTitle || module.title
                      : undefined
                  }
                  className={cn(
                    "sidebar-module-button group relative flex w-full items-center overflow-hidden rounded-2xl border !text-white transition-all duration-200",
                    collapsed && !mobile
                      ? "h-12 justify-center border-transparent px-2"
                      : "gap-3 px-3.5 py-3",
                    moduleSelected
                      ? "sidebar-module-active border-amber-200/20 bg-gradient-to-r from-amber-300/[0.14] via-white/[0.07] to-cyan-300/[0.05] shadow-[0_12px_28px_rgba(1,9,24,0.24)]"
                      : "border-transparent hover:border-white/[0.10] hover:bg-white/[0.065]",
                  )}
                >
                  {moduleSelected && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.55)]" />
                  )}

                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border transition-all",
                      moduleSelected
                        ? "border-amber-100/20 bg-amber-300/[0.14] !text-amber-200"
                        : "border-white/[0.07] bg-white/[0.045] !text-white/90 group-hover:bg-white/[0.09] group-hover:!text-white",
                    )}
                  >
                    <ModuleIcon
                      className="h-[17px] w-[17px]"
                      strokeWidth={1.9}
                    />
                  </span>

                  {(!collapsed || mobile) && (
                    <>
                      <span className="sidebar-main-label min-w-0 flex-1 truncate text-left leading-5">
                        {module.shortTitle || module.title}
                      </span>

                      {module.externalUrl ? (
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 !text-white/75" />
                      ) : !directModule ? (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 !text-white/75 transition-transform duration-200",
                            expanded && "rotate-180 !text-amber-200",
                          )}
                        />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 !text-white/65" />
                      )}
                    </>
                  )}
                </button>

                {expanded && !module.externalUrl && !directModule && (
                  <div className="sidebar-submenu relative ml-[27px] space-y-1 border-l border-white/[0.12] py-1 pl-4">
                    {items.map((item) => {
                      const target = normalizePath(safePath(item));
                      const bestActiveTarget = getBestActiveTarget(
                        items,
                        location.pathname,
                      );
                      const Icon = item.icon || Grid2X2;
                      const active = target === bestActiveTarget;

                      /*
                       * React Router NavLink uses prefix matching unless `end`
                       * is enabled. For example, `/settings` also matches
                       * `/settings/users-roles`. Enable exact matching whenever
                       * an item is the parent path of another sibling item.
                       */
                      const requiresExactMatch = items.some((otherItem) => {
                        const otherTarget = normalizePath(safePath(otherItem));

                        return (
                          otherTarget &&
                          otherTarget !== target &&
                          otherTarget.startsWith(`${target}/`)
                        );
                      });

                      return (
                        <NavLink
                          key={item.id || target}
                          to={target}
                          end={requiresExactMatch}
                          onClick={() => onNavigate?.()}
                          data-testid={createTestId(item)}
                          className={cn(
                            "sidebar-submenu-item group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] !text-white transition-all duration-200",
                            active
                              ? "border-amber-200/30 bg-gradient-to-r from-[#123d73] to-[#0d315f] font-bold shadow-[0_8px_24px_rgba(1,9,24,0.28)]"
                              : "border-transparent font-semibold hover:translate-x-0.5 hover:border-white/[0.06] hover:bg-white/[0.06]",
                          )}
                        >
                          {active && (
                            <span className="absolute -left-[17px] h-4 w-[3px] rounded-r-full bg-amber-400" />
                          )}
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              active ? "!text-amber-300" : "!text-white/80",
                            )}
                            strokeWidth={2}
                          />
                          <span className="sidebar-sub-label min-w-0 flex-1 truncate leading-5">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold !text-white shadow-sm">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}

                    {!items.length && (
                      <p className="px-3 py-2 text-xs !text-white/75">
                        No accessible pages
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!filteredModules.length && (!collapsed || mobile) && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-4 py-8 text-center">
              <Search className="mx-auto h-5 w-5 !text-white/70" />
              <p className="mt-2 text-xs font-medium !text-white/80">
                No menu items found
              </p>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer relative border-t border-white/[0.08] bg-black/[0.08] p-3 backdrop-blur-xl">
        {(!collapsed || mobile) && (
          <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.045] p-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-xs font-extrabold text-[#08214a] shadow-lg shadow-black/20">
              {getInitials(user)}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#07162f] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="sidebar-user-label truncate text-[13px] font-bold">
                {userName}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <ShieldCheck className="sidebar-footer-icon h-3 w-3 !text-emerald-300" />
                <p className="sidebar-role-label truncate text-[11px] font-semibold">
                  {roleName}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-xl border border-transparent !text-white/85 transition duration-200 hover:border-rose-300/10 hover:bg-rose-500/[0.10] hover:!text-white",
            collapsed && !mobile ? "h-10 justify-center" : "gap-3 px-3.5 py-3",
          )}
          title={collapsed && !mobile ? "Logout" : undefined}
        >
          <LogOut className="sidebar-footer-icon h-4 w-4" />
          {(!collapsed || mobile) && (
            <span className="sidebar-logout-label text-[13px] font-bold">
              Sign out
            </span>
          )}
        </button>

        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            data-testid="sidebar-toggle-btn"
            className="sidebar-toggle mt-2 flex h-9 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] !text-white/80 transition duration-200 hover:border-amber-200/15 hover:bg-white/[0.07] hover:!text-amber-200"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
