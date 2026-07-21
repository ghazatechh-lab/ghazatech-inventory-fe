import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

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

const movementBadge = (type) => {
  const incoming = [
    "OPENING",
    "PURCHASE",
    "CUSTOMER_RETURN",
    "TRANSFER_IN",
  ].includes(type);

  const outgoing = [
    "SALE",
    "SUPPLIER_RETURN",
    "TRANSFER_OUT",
    "DAMAGED",
    "INTERNAL",
  ].includes(type);

  if (incoming) {
    return "bg-emerald-500/10 text-emerald-400";
  }

  if (outgoing) {
    return "bg-red-500/10 text-red-400";
  }

  return "bg-amber-500/10 text-amber-400";
};

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);

  const { data: branchResponse } = useQuery({
    queryKey: ["movement-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
  });

  const branches = normalizeList(branchResponse);

  const {
    data: movementResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-movements", search, branch, type],
    queryFn: async () => {
      const params = {
        page_size: 200,
        ordering: "-created_at",
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (branch !== ALL) {
        params.branch = branch;
      }

      if (type !== ALL) {
        params.movement_type = type;
      }

      return unwrap(await api.get("/inventory/movements/", { params }));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const movements = normalizeList(movementResponse);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock movements"
        subtitle="Complete history of every transaction that changed inventory"
      />

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div>
          <Label>Search</Label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, product, SKU or branch"
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
          <Label>Movement type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All movements</SelectItem>
              <SelectItem value="OPENING">Opening stock</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="SALE">Sale</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer in</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer out</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="CUSTOMER_RETURN">Customer return</SelectItem>
              <SelectItem value="SUPPLIER_RETURN">Supplier return</SelectItem>
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
                  "Date",
                  "Reference",
                  "Product",
                  "Branch",
                  "Type",
                  "Change",
                  "Previous",
                  "New stock",
                  "User",
                ].map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    Loading stock movements...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-sm text-red-400"
                  >
                    Unable to load movements.
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-400">
                      {new Date(movement.created_at).toLocaleString()}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-blue-400">
                      {movement.reference_id || movement.movement_number}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-white">
                        {movement.product_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {movement.sku}
                        {movement.variant_label !== "Base product"
                          ? ` · ${movement.variant_label}`
                          : ""}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                      {movement.branch_code || movement.branch_name}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${movementBadge(
                          movement.movement_type,
                        )}`}
                      >
                        {movement.movement_type_display}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-semibold ${
                          movement.quantity >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {movement.quantity >= 0 ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-slate-400">
                      {movement.previous_stock}
                    </td>

                    <td className="px-4 py-4 text-right font-mono font-semibold text-white">
                      {movement.new_stock}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-400">
                      {movement.performed_by_name || "System"}
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
