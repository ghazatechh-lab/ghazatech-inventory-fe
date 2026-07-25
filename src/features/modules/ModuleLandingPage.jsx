import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ExternalLink,
  Grid2X2,
  LogOut,
  RefreshCcw,
  Search,
  Settings,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { getModuleTarget, getVisibleModules } from "@/config/moduleNavigation";

const moduleStyles = [
  ["from-orange-500 to-amber-400", "shadow-orange-500/20"],
  ["from-fuchsia-500 to-pink-500", "shadow-pink-500/20"],
  ["from-cyan-400 to-blue-500", "shadow-cyan-500/20"],
  ["from-teal-400 to-emerald-500", "shadow-emerald-500/20"],
  ["from-violet-500 to-purple-500", "shadow-violet-500/20"],
  ["from-rose-500 to-red-500", "shadow-rose-500/20"],
  ["from-blue-500 to-cyan-400", "shadow-blue-500/20"],
  ["from-amber-400 to-orange-500", "shadow-amber-500/20"],
  ["from-emerald-400 to-green-500", "shadow-emerald-500/20"],
];

const getUserName = (user) =>
  user?.full_name ||
  user?.name ||
  [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "User";

const getBranchName = (user) =>
  user?.branch?.branch_name ||
  user?.branch_detail?.branch_name ||
  user?.branch_name ||
  "Main Branch";

export default function ModuleLandingPage() {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const [search, setSearch] = React.useState("");

  const visibleModules = React.useMemo(() => getVisibleModules(user), [user]);

  const filteredModules = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return visibleModules;

    return visibleModules.filter((module) =>
      [module.title, module.shortTitle, module.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, visibleModules]);

  const openModule = (module) => {
    if (!module) return;

    if (module.externalUrl) {
      window.open(module.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(getModuleTarget(module, user));
  };

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b1b] text-white">
        Loading modules...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#070b1b] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 18%, rgba(12,124,140,.28), transparent 32%), radial-gradient(circle at 88% 14%, rgba(92,45,130,.18), transparent 28%), linear-gradient(140deg,#0b2732 0%,#0a1325 48%,#090a18 100%)",
        }}
      />

      <div className="relative z-10 min-h-screen">
        <header className="border-b border-white/10 bg-[#08101f]/90 backdrop-blur-xl">
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 lg:px-8">
            <button
              type="button"
              onClick={() => navigate("/modules")}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-lg shadow-black/20">
                <Grid2X2 className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold tracking-[0.08em]">
                  GHAZA COMPUTER
                </p>
                <p className="text-[10px] text-slate-400">
                  Sale & Service of Laptop Spare Parts
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 md:flex">
                <span className="text-[10px] text-slate-400">
                  Current Branch:
                </span>
                <span className="text-xs font-semibold text-white">
                  {getBranchName(user)}
                </span>
              </div>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Refresh"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Notifications"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#08101f]" />
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Settings"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-500/15 hover:text-red-300"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 pb-16 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-300/80">
                Main Menu
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Welcome, {getUserName(user)}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Select a module to open its workspace.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search modules..."
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/[0.08]"
              />
            </div>
          </div>

          <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border-l-4 border-red-500 bg-red-950/50 px-4 py-3 text-sm shadow-lg shadow-black/10">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-red-100/90">
                System is ready. Select a module below to continue.
              </p>
            </div>

            <span className="hidden text-xs font-medium text-cyan-300 sm:block">
              {filteredModules.length} module
              {filteredModules.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredModules.length ? (
            <section className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredModules.map((module, index) => {
                const Icon = module.icon || Grid2X2;
                const [tile, glow] = moduleStyles[index % moduleStyles.length];

                return (
                  <button
                    key={module.id || module.key || module.title}
                    type="button"
                    onClick={() => openModule(module)}
                    className="group flex flex-col items-center text-center"
                  >
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.055] shadow-xl shadow-black/20 transition duration-200 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:bg-white/[0.09]">
                      <div
                        className={`absolute inset-3 rounded-lg bg-gradient-to-br opacity-25 blur-md ${tile}`}
                      />

                      <div
                        className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${tile} ${glow}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      {module.externalUrl && (
                        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/30 p-1 text-slate-300">
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <div
                      className="relative z-20 mt-3 min-h-[40px] max-w-[120px] text-center text-sm font-semibold leading-5 text-white opacity-100 transition-colors duration-200 group-hover:text-cyan-200"
                      style={{
                        color: "#ffffff",
                        WebkitTextFillColor: "#ffffff",
                      }}
                    >
                      {module.shortTitle ||
                        module.title ||
                        module.label ||
                        "Module"}
                    </div>
                  </button>
                );
              })}
            </section>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-500" />
              <h2 className="mt-4 font-semibold">No modules found</h2>
              <p className="mt-2 text-sm text-slate-400">
                Try another search or verify the role permissions.
              </p>
            </div>
          )}

          <footer className="mt-16 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} GHAZA COMPUTER. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
