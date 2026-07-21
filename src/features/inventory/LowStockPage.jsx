import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search } from "lucide-react";

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

export default function LowStockPage() {
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState(ALL);

  const { data: branchResponse } = useQuery({
    queryKey: ["low-stock-branches"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });

  const branches = normalizeList(branchResponse);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["low-stock-items", branch],
    queryFn: async () => {
      const params = {};
      if (branch !== ALL) params.branch = branch;
      return unwrap(await api.get("/inventory/low-stock/", { params }));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const items = normalizeList(data).filter((item) => {
    const available = Number(item.available_stock ?? 0);
    if (available >= 10) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      item.product_name,
      item.sku,
      item.variant_label,
      item.branch_code,
      item.branch_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low stock items"
        subtitle="Items with available quantity below 10"
      />

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[1fr_240px]">
        <div>
          <Label>Search</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product, SKU, attribute or branch"
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-white/10 bg-white/[0.025]">
              <tr>
                {[
                  "Product",
                  "Branch",
                  "Current",
                  "Reserved",
                  "Damaged",
                  "Available",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-slate-400"
                  >
                    Loading low-stock items...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-red-400"
                  >
                    Unable to load low-stock items.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-3 font-medium text-white">
                      No low-stock items
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      All available quantities are 10 or above.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">
                        {item.product_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.sku}
                        {item.variant_label !== "Base product"
                          ? ` · ${item.variant_label}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {item.branch_code || item.branch_name}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-300">
                      {item.current_stock}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">
                      {item.reserved_stock}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">
                      {item.damaged_stock}
                    </td>
                    <td className="px-5 py-4 font-mono text-lg font-bold text-white">
                      {item.available_stock}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          Number(item.available_stock) <= 0
                            ? "rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"
                            : "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
                        }
                      >
                        {Number(item.available_stock) <= 0
                          ? "Out of stock"
                          : "Low stock"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
