import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Globe2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { getModuleTarget, getVisibleModules } from "@/config/moduleNavigation";

const colorClasses = {
  blue: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    border: "hover:border-blue-300 dark:hover:border-blue-500/40",
    accent: "bg-blue-600",
  },

  emerald: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    border: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
    accent: "bg-emerald-600",
  },

  rose: {
    icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    border: "hover:border-rose-300 dark:hover:border-rose-500/40",
    accent: "bg-rose-600",
  },

  amber: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    border: "hover:border-amber-300 dark:hover:border-amber-500/40",
    accent: "bg-amber-500",
  },

  cyan: {
    icon: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
    border: "hover:border-cyan-300 dark:hover:border-cyan-500/40",
    accent: "bg-cyan-600",
  },

  violet: {
    icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    border: "hover:border-violet-300 dark:hover:border-violet-500/40",
    accent: "bg-violet-600",
  },

  orange: {
    icon: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300",
    border: "hover:border-orange-300 dark:hover:border-orange-500/40",
    accent: "bg-orange-500",
  },

  teal: {
    icon: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300",
    border: "hover:border-teal-300 dark:hover:border-teal-500/40",
    accent: "bg-teal-600",
  },

  slate: {
    icon: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    border: "hover:border-slate-400 dark:hover:border-slate-500",
    accent: "bg-slate-700",
  },
};

const getUserName = (user) =>
  user?.full_name ||
  user?.name ||
  [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "User";

export default function ModuleLandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const visibleModules = React.useMemo(() => getVisibleModules(user), [user]);

  const openSelectedModule = (module) => {
    if (!module) return;

    if (module.externalUrl) {
      window.open(module.externalUrl, "_blank", "noopener,noreferrer");

      return;
    }

    const target = getModuleTarget(module, user);

    navigate(target);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="rounded-xl border bg-background px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Loading modules...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #2563eb 1px, transparent 1px), linear-gradient(to bottom, #2563eb 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-blue-100 bg-white/90 px-5 py-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/85 md:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
                <span className="text-xl font-bold">GC</span>
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white md:text-2xl">
                  GHAZA COMPUTER
                </h1>

                <p className="text-sm text-muted-foreground">
                  Sale & Service of Laptop Spare Parts
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border bg-slate-50 px-4 py-2 dark:bg-white/[0.03]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Signed in as
                </p>

                <p className="text-sm font-semibold">{getUserName(user)}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  window.open(
                    "https://www.ghazatech.com/",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <Globe2 className="h-4 w-4" />
                Website
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Main Menu
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Select a module
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose a module to open its workspace and display its related
            submodules in the sidebar.
          </p>

          <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-blue-600" />
        </section>

        {visibleModules.length > 0 ? (
          <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleModules.map((module, index) => {
              const Icon = module.icon || Globe2;

              const styles = colorClasses[module.color] || colorClasses.blue;

              const itemCount = Array.isArray(module.items)
                ? module.items.length
                : 0;

              return (
                <button
                  key={module.id || module.key || module.title || index}
                  type="button"
                  onClick={() => openSelectedModule(module)}
                  className={[
                    "group relative min-h-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200",
                    "hover:-translate-y-1 hover:shadow-xl",
                    "dark:border-white/10 dark:bg-slate-900",
                    styles.border,
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute inset-x-0 top-0 h-1 transition-all group-hover:h-1.5",
                      styles.accent,
                    ].join(" ")}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105",
                        styles.icon,
                      ].join(" ")}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      {index + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                    {module.title ||
                      module.shortTitle ||
                      module.label ||
                      "Module"}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {module.description ||
                      "Open this module to manage its related operations."}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
                    <span className="text-xs font-medium text-muted-foreground">
                      {module.externalUrl
                        ? "External website"
                        : `${itemCount} submodule${itemCount === 1 ? "" : "s"}`}
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-white/10 dark:text-slate-300">
                      {module.externalUrl ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        ) : (
          <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              No accessible modules found
            </h3>

            <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
              Your current role does not have access to any configured module,
              or the module configuration could not determine your role.
            </p>

            <div className="mt-4 rounded-lg bg-white/70 p-3 text-left text-xs text-amber-800 dark:bg-black/10 dark:text-amber-200">
              <p>
                Role code:{" "}
                <strong>
                  {user?.role?.code ||
                    user?.role_detail?.code ||
                    user?.role_code ||
                    "Not available"}
                </strong>
              </p>

              <p className="mt-1">
                User: <strong>{getUserName(user)}</strong>
              </p>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-muted-foreground dark:border-white/10">
          © {new Date().getFullYear()} GHAZA COMPUTER. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
