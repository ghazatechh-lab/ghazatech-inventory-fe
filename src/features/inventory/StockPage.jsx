import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Search, Warehouse } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const stockStatusLabel = {
  ok: "In stock",
  low: "Low stock",
  out: "Out of stock",
};

export default function StockPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(ALL);
  const [branch, setBranch] = React.useState(ALL);

  const { data: branchResponse } = useQuery({
    queryKey: ["stock-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const {
    data: stockResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-overview", search, status, branch],
    queryFn: async () => {
      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status !== ALL) {
        params.status = status;
      }

      if (branch !== ALL) {
        params.branch = branch;
      }

      return unwrap(await api.get("/inventory/stock/", { params }));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const rows = normalizeList(stockResponse);

  const visibleBranchIds = React.useMemo(() => {
    if (branch !== ALL) {
      return [String(branch)];
    }

    const ids = new Set();

    rows.forEach((row) => {
      row.branch_stocks?.forEach((item) => {
        ids.add(String(item.branch_id));
      });
    });

    return Array.from(ids);
  }, [rows, branch]);

  const visibleBranches = React.useMemo(
    () => branches.filter((item) => visibleBranchIds.includes(String(item.id))),
    [branches, visibleBranchIds],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        subtitle="Current stock available across all branches and warehouses"
      />

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div>
          <Label>Search</Label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, SKU or branch"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div>
          <Label>Branch</Label>

          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={ALL}>All branches</SelectItem>

              {branches.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.branch_code || item.branch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Stock status</Label>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="ok">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-white/10 bg-white/[0.025]">
              <tr>
                <th className="sticky left-0 z-10 min-w-64 bg-slate-950 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product
                </th>

                {visibleBranches.map((item) => (
                  <th
                    key={item.id}
                    className="min-w-32 px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {item.branch_code || item.branch_name}
                  </th>
                ))}

                <th className="min-w-32 px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>

                <th className="min-w-32 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleBranches.length + 3}
                    className="px-5 py-14 text-center text-sm text-slate-400"
                  >
                    Loading stock overview...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={visibleBranches.length + 3}
                    className="px-5 py-14 text-center text-sm text-red-400"
                  >
                    Unable to load stock overview.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleBranches.length + 3}
                    className="px-5 py-14 text-center"
                  >
                    <Boxes className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-3 font-medium text-white">
                      No stock records found
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const branchMap = Object.fromEntries(
                    (row.branch_stocks || []).map((item) => [
                      String(item.branch_id),
                      item,
                    ]),
                  );

                  return (
                    <tr
                      key={`${row.product_id}-${row.variant_id || "base"}`}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="sticky left-0 z-10 bg-slate-950 px-5 py-4">
                        <div className="font-medium text-white">
                          {row.product_name}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{row.sku}</span>

                          {row.variant_label !== "Base product" && (
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-300">
                              {row.variant_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {visibleBranches.map((item) => {
                        const stock = branchMap[String(item.id)];

                        return (
                          <td key={item.id} className="px-5 py-4 text-right">
                            <div className="font-mono text-base font-semibold text-slate-100">
                              {stock?.available_stock ?? 0}
                            </div>

                            {stock &&
                              (stock.reserved_stock > 0 ||
                                stock.damaged_stock > 0) && (
                                <div className="mt-1 text-[10px] text-slate-500">
                                  R:
                                  {stock.reserved_stock} D:
                                  {stock.damaged_stock}
                                </div>
                              )}
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 text-right">
                        <span className="font-mono text-lg font-bold text-white">
                          {row.total_available}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            row.status === "ok"
                              ? "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                              : row.status === "low"
                                ? "inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
                                : "inline-flex rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"
                          }
                        >
                          {stockStatusLabel[row.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.035] p-4 text-sm text-slate-400">
        <Warehouse className="mr-2 inline h-4 w-4 text-blue-400" />
        Available stock equals current stock minus reserved and damaged
        quantities.
      </div>
    </div>
  );
}
