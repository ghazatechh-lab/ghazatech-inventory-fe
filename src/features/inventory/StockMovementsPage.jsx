import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  FilterX,
  RefreshCcw,
  Search,
  Warehouse,
} from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
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
  const { branchId: activeBranchId, branchParams } = useActiveBranchFilter();

  const [search, setSearch] = React.useState("");
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
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["stock-movements", search, type, branchParams],
    queryFn: async () => {
      const params = {
        ...branchParams,
        page_size: 500,
        ordering: "-created_at",
      };

      if (search.trim()) {
        params.search = search.trim();
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

  const summary = React.useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    let valueChange = 0;

    movements.forEach((movement) => {
      const quantity = Number(movement.quantity || 0);

      if (quantity >= 0) {
        incoming += quantity;
      } else {
        outgoing += Math.abs(quantity);
      }

      valueChange += Number(movement.net_value_change || 0);
    });

    return {
      count: movements.length,
      incoming,
      outgoing,
      valueChange,
    };
  }, [movements]);

  const selectedBranchLabel = activeBranchId
    ? branches.find((item) => String(item.id) === String(activeBranchId))
        ?.branch_name ||
      branches.find((item) => String(item.id) === String(activeBranchId))
        ?.branch_code ||
      `Branch ${activeBranchId}`
    : "All branches";

  const clearFilters = () => {
    setSearch("");
    setType(ALL);
  };

  const hasFilters = Boolean(search) || type !== ALL;

  return (
    <div
      data-stock-module="stock-movements"
      className="stock-module-page space-y-6"
    >
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{ color: "#bae6fd" }}
            >
              Inventory ledger
            </p>
            <h1
              className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,.28)",
              }}
            >
              Stock Movements
            </h1>
            <p
              className="mt-2 max-w-2xl text-sm leading-6"
              style={{ color: "#f1f5f9" }}
            >
              Inventory transaction history for {selectedBranchLabel}. Branch
              scope follows the global branch filter.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={() => refetch()}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        <Warehouse className="mr-2 inline h-4 w-4" />
        Purchase +50 → Sale -5 → Transfer -10 → Adjustment +2
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Movements
          </p>
          <p className="mt-2 text-2xl font-bold">{summary.count}</p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Incoming Quantity
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{summary.incoming}
          </p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outgoing Quantity
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            -{summary.outgoing}
          </p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Net Value Change
          </p>
          <p className="mt-2 text-2xl font-bold">
            AED {summary.valueChange.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Movement filters</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search and narrow the movement ledger by branch and transaction
            type.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
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
        </div>

        {hasFilters ? (
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        ) : null}
      </section>

      <section className="card-surface overflow-hidden">
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
                  "Unit Cost",
                  "VAT",
                  "Value Change",
                  "Running Value",
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
                    colSpan={13}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    Loading stock movements...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-14 text-center text-sm text-red-500"
                  >
                    Unable to load stock movements.
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
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
                          ? new Date(movement.created_at).toLocaleDateString(
                              "en-AE",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
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

                      <td className="px-4 py-4 text-right font-mono">
                        AED{" "}
                        {Number(movement.capitalized_unit_cost || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>
                          {String(
                            movement.vat_treatment || "OUT_OF_SCOPE",
                          ).replaceAll("_", " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Number(movement.vat_percentage || 0).toFixed(2)}% ·
                          Recoverable AED{" "}
                          {Number(movement.recoverable_vat_amount || 0).toFixed(
                            2,
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono">
                        AED {Number(movement.net_value_change || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-semibold">
                        AED{" "}
                        {Number(movement.running_stock_value || 0).toFixed(2)}
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
