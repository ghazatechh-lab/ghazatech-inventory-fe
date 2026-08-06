import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  EmptyState,
  FleetHero,
  VehicleIdentity,
  formatDateTime,
  rowsFrom,
} from "./fleetShared";
export default function TripLogPage() {
  const { branchParams } = useActiveBranchFilter();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["fleet-trips", branchParams, status],
    queryFn: async () =>
      unwrap(
        await api.get("/fleet/trips/", {
          params: {
            ...branchParams,
            status: status || undefined,
            page_size: 500,
          },
        }),
      ),
  });
  const rows = rowsFrom(data);
  const filtered = rows.filter((t) =>
    `${t.vehicle_name} ${t.registration_number} ${t.driver_name} ${t.purpose} ${t.destination}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Audit Trail"
        title="Trip Logs"
        description="Review every vehicle movement with driver, route, mileage, fuel, expense, departure, return, and status information."
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Print / Export
          </Button>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 p-5 md:flex-row md:items-center md:justify-between dark:border-white/10">
          <div>
            <h2 className="font-bold">Trip History</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete audit trail for the selected branch
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 sm:w-72"
                placeholder="Search trip logs..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading trip logs...
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title="No trip logs found"
            description="Try another search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.03]">
                <tr>
                  {[
                    "Vehicle",
                    "Driver / Purpose",
                    "Checkout",
                    "Return",
                    "Distance",
                    "Expense",
                    "Status",
                  ].map((h) => (
                    <th className="px-4 py-3" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    className="border-t border-slate-100 dark:border-white/10"
                    key={t.id}
                  >
                    <td className="px-4 py-3">
                      <VehicleIdentity
                        row={{
                          display_name: t.vehicle_name,
                          registration_number: t.registration_number,
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.driver_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.purpose}
                        {t.destination ? ` · ${t.destination}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(t.checkout_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(t.actual_return_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.distance_km === null || t.distance_km === undefined
                        ? "—"
                        : `${Number(t.distance_km).toLocaleString()} km`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      AED {Number(t.expense_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
