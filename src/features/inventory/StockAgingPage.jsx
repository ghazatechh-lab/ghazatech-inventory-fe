import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Clock3,
  Download,
  RefreshCw,
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
} from "lucide-react";
import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const fmt = (n) => Number(n || 0).toLocaleString();
const ageRanges = ["0–30", "31–60", "61–90", "91–180", "180+", "Unknown"];
const badge = {
  Overstock: "bg-rose-50 text-rose-700 border-rose-200",
  "Slow Moving": "bg-amber-50 text-amber-700 border-amber-200",
  Normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const inputClass =
  "h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function downloadCSV(rows) {
  const cols = [
    "Branch",
    "Product",
    "SKU",
    "Variant",
    "Quantity",
    "Available",
    "Age Days",
    "Age Bucket",
    "Sales Last 90 Days",
    "Warehouse",
    "Racks",
    "Status",
    "Suggested Action",
    "Estimated Target",
    "Value AED",
  ];
  const data = rows.map((r) => [
    r.branch_code,
    r.name,
    r.sku,
    Object.entries(r.variant || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("; "),
    r.quantity,
    r.available,
    r.age_days ?? "Unknown",
    r.age_bucket,
    r.sales_90d,
    r.warehouse,
    (r.racks || []).join("; "),
    r.status,
    r.suggested_action,
    r.estimated_target ?? "",
    r.stock_value,
  ]);
  const csv = [cols, ...data]
    .map((arr) =>
      arr.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "ghaza-stock-aging-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StockAgingPage() {
  const { branchId, branchParams } = useActiveBranchFilter();
  const [search, setSearch] = React.useState("");
  const [age, setAge] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["stock-aging", branchId, branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock-aging/", {
          params: branchParams,
          skipGlobalErrorToast: true,
        }),
      ),
    retry: false,
  });
  const all = React.useMemo(
    () => (Array.isArray(data?.results) ? data.results : []),
    [data],
  );
  const branches = React.useMemo(
    () => [...new Set(all.map((r) => r.branch_code).filter(Boolean))].sort(),
    [all],
  );
  const locations = React.useMemo(
    () =>
      [
        ...new Set(all.map((r) => r.warehouse).filter((v) => v && v !== "—")),
      ].sort(),
    [all],
  );
  const filtered = React.useMemo(
    () =>
      all.filter((r) => {
        const hay = [
          r.name,
          r.sku,
          r.branch_name,
          r.warehouse,
          ...(r.racks || []),
          ...Object.values(r.variant || {}),
        ]
          .join(" ")
          .toLowerCase();
        return (
          (!search || hay.includes(search.toLowerCase())) &&
          (!age || r.age_bucket === age) &&
          (!status || r.status === status) &&
          (!location || r.warehouse === location) &&
          (!branch || r.branch_code === branch)
        );
      }),
    [all, search, age, status, location, branch],
  );
  const total = Math.max(1, all.length);
  const barGroups = ageRanges.map((key) => ({
    label: key,
    count: all.filter((r) => r.age_bucket === key).length,
  }));
  const suggested = [
    {
      name: "Consider Clearance",
      count: all.filter((r) => r.suggested_action === "Consider Clearance")
        .length,
      cls: "bg-amber-500",
    },
    {
      name: "Review Stock",
      count: all.filter((r) => r.suggested_action === "Review Stock").length,
      cls: "bg-blue-600",
    },
    {
      name: "Keep Stock",
      count: all.filter((r) => r.suggested_action === "Keep Stock").length,
      cls: "bg-emerald-500",
    },
  ];
  const metric = [
    {
      label: "STOCK RECORDS",
      value: all.length,
      sub: "Product / variant locations",
      icon: Package,
    },
    {
      label: "OVERSTOCK",
      value: all.filter((r) => r.status === "Overstock").length,
      sub: "Above estimated target",
      icon: AlertTriangle,
    },
    {
      label: "SLOW MOVING",
      value: all.filter((r) => r.status === "Slow Moving").length,
      sub: "Old stock with few sales",
      icon: TrendingDown,
    },
    {
      label: "AGED 180+ DAYS",
      value: all.filter((r) => r.age_days > 180).length,
      sub: "Movement-backed aging",
      icon: Clock3,
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-5 pb-10 text-slate-900">
      <div className="rounded-3xl bg-gradient-to-r from-[#082b4e] via-[#15588a] to-[#3288ae] px-6 py-7 text-white shadow-xl md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <span className="text-xs font-bold tracking-[.16em] text-blue-100">
            INVENTORY INTELLIGENCE
          </span>
          <h1 className="mt-2 text-2xl font-extrabold !text-white md:text-3xl">
            Stock Aging &amp; Overstock
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
            Identify aged inventory, slow-moving products, surplus stock, and
            opportunities for stock review across physical branches.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 md:mt-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metric.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500">
                {label}
              </span>
              <Icon size={19} className="text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold">{fmt(value)}</div>
            <div className="mt-1 text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Stock Aging Overview</h2>
          <p className="mt-1 text-xs text-slate-500">
            Number of stock records by the age of their oldest traceable
            remaining unit.
          </p>
          <div className="mt-5 space-y-3">
            {barGroups.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 font-semibold text-slate-600">
                  {label} {label === "Unknown" ? "" : "days"}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <strong className="w-8 text-right">{count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Recommended Actions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Suggestions for manager review; not automatic stock movements.
          </p>
          <div className="mt-5 space-y-4">
            {suggested.map(({ name, count, cls }) => (
              <div key={name} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 font-semibold text-slate-600">
                  {name}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${cls}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <strong className="w-8 text-right">{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-bold">Stock Aging &amp; Overstock Register</h2>
          <p className="mt-1 text-xs text-slate-500">
            Search stock by SKU, branch, location, age, or status.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
              />
              <input
                className={`${inputClass} pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, SKU or rack..."
              />
            </div>
            <select
              className={inputClass}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className={inputClass}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            >
              <option value="">All ages</option>
              {ageRanges.map((v) => (
                <option key={v} value={v}>
                  {v}
                  {v === "Unknown" ? "" : " days"}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {["Overstock", "Slow Moving", "Normal"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-blue-700 hover:underline"
            onClick={() => {
              setSearch("");
              setAge("");
              setStatus("");
              setLocation("");
              setBranch("");
            }}
          >
            Reset filters
          </button>
        </div>
        {isError ? (
          <p className="px-5 pb-5 text-sm text-red-600">
            Unable to load stock aging:{" "}
            {error?.response?.data?.detail || error?.message || "API error"}
          </p>
        ) : null}
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1060px] w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Product / SKU",
                  "Branch",
                  "Available",
                  "Stock Age",
                  "Sales (90d)",
                  "Warehouse / Rack",
                  "Status",
                  "Suggested Action",
                  "Manage",
                ].map((v) => (
                  <th
                    key={v}
                    className="whitespace-nowrap border-y border-slate-200 px-4 py-3 font-bold"
                  >
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-4">
                      <strong className="block max-w-52">{r.name}</strong>
                      <span className="mt-1 block text-slate-500">{r.sku}</span>
                      {Object.keys(r.variant || {}).length > 0 && (
                        <span className="mt-1 block text-slate-400">
                          {Object.entries(r.variant)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">{r.branch_code}</td>
                    <td className="px-4 py-4 font-semibold">
                      {fmt(r.available)}
                    </td>
                    <td className="px-4 py-4">
                      {r.age_days === null ? "Unknown" : `${r.age_days} days`}
                    </td>
                    <td className="px-4 py-4">{fmt(r.sales_90d)}</td>
                    <td className="px-4 py-4">
                      {r.warehouse}
                      <small className="block text-slate-500">
                        {(r.racks || []).join(", ") || "Rack not recorded"}
                      </small>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 font-semibold ${badge[r.status] || badge.Normal}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">{r.suggested_action}</td>
                    <td className="px-4 py-4">
                      <Link
                        className="font-bold text-blue-700 hover:underline"
                        to={`/inventory/products/${r.branch_code}:${r.product_id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Loading stock aging report...
                  </td>
                </tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No matching stock records.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {filtered.length} of {all.length} stock records
        </div>
      </section>
      <p className="text-xs leading-5 text-slate-500">
        Age uses a FIFO reconstruction of recorded inventory movements. Where
        history cannot explain current stock, age is shown as Unknown. Overstock
        is an estimate based on reorder levels and recent sales—not an approved
        maximum-stock policy. Suggested actions require management review.
      </p>
    </div>
  );
}
