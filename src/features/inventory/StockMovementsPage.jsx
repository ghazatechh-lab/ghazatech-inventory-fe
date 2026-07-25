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
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (outgoing) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
};

const movementLabel = (movement) =>
  movement.movement_type_display ||
  {
    OPENING: "Opening stock",
    PURCHASE: "Purchase",
    SALE: "Sale",
    TRANSFER_IN: "Transfer in",
    TRANSFER_OUT: "Transfer out",
    ADJUSTMENT: "Adjustment",
    CUSTOMER_RETURN: "Customer return",
    SUPPLIER_RETURN: "Supplier return",
    DAMAGED: "Damaged",
  }[movement.movement_type] ||
  movement.movement_type ||
  "Movement";

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);

  const { data: branchResponse } = useQuery({
    queryKey: ["stock-movement-branches"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 500,
          },
        }),
      ),
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const {
    data: movementResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-movements", search, branch, type],
    queryFn: async () => {
      const params = {
        page_size: 500,
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

  const movements = React.useMemo(
    () => normalizeList(movementResponse),
    [movementResponse],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="History of every transaction that changed inventory levels"
      />

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        Purchase +50 → Sale -5 → Transfer -10 → Adjustment +2
      </section>

      <section className="card-surface grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div>
          <Label>Search</Label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, product, SKU or branch"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <Label>Branch</Label>

          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="mt-2">
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
          <Label>Movement Type</Label>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-2">
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
              <SelectItem value="DAMAGED">Damaged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Movement Ledger</h2>

            <p className="text-xs text-muted-foreground">
              Every stock change in one log
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Date",
                  "Type",
                  "Item",
                  "Branch",
                  "Qty Change",
                  "Previous",
                  "New Stock",
                  "Reference",
                  "By",
                ].map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    Loading stock movements...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-sm text-red-500"
                  >
                    Unable to load stock movements.
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const quantity = Number(movement.quantity || 0);

                  return (
                    <tr
                      key={movement.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                        {movement.created_at
                          ? new Date(movement.created_at).toLocaleString()
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${movementBadge(
                            movement.movement_type,
                          )}`}
                        >
                          {movementLabel(movement)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {movement.product_name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {movement.sku || movement.product_sku || "—"}

                          {movement.variant_label &&
                          movement.variant_label !== "Base product"
                            ? ` · ${movement.variant_label}`
                            : ""}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {movement.branch_code || movement.branch_name || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold ${
                            quantity >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {quantity >= 0 ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}

                          {quantity > 0 ? "+" : ""}
                          {quantity}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-muted-foreground">
                        {movement.previous_stock ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-mono font-bold">
                        {movement.new_stock ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-blue-600 dark:text-blue-400">
                        {[
                          movement.reference_type,
                          movement.reference_id || movement.movement_number,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                        {movement.performed_by_name || "System"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
