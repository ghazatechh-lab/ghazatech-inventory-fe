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

  const filtered = rows.filter((trip) =>
    `${trip.vehicle_name} ${trip.registration_number} ${trip.driver_name} ${trip.purpose} ${trip.destination}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div className="w-full space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Audit Trail"
        title="Trip Logs"
        description="Review every vehicle movement with driver, route, mileage, fuel, expense, departure, return, and status information."
        actions={
          <Button
            type="button"
            onClick={() => window.print()}
            className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
          >
            <Download className="mr-2 h-4 w-4 text-slate-950" />
            Print / Export
          </Button>
        }
      />

      <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(22,42,73,0.06)] dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 md:flex-row md:items-center md:justify-between dark:border-white/10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
              Fleet Movement History
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
              Trip History
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete audit trail for the selected branch
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 rounded-[10px] pl-9"
                placeholder="Search trip logs..."
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>

            <select
              className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">
            Loading trip logs...
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title="No trip logs found"
            description="Try another search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 bg-[#f6f9fc] text-left text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
                <tr>
                  {[
                    "Vehicle",
                    "Driver / Purpose",
                    "Checkout",
                    "Return",
                    "Distance",
                    "Expense",
                    "Status",
                  ].map((heading) => (
                    <th className="px-5 py-3.5" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((trip) => (
                  <tr
                    className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.03]"
                    key={trip.id}
                  >
                    <td className="px-5 py-4">
                      <VehicleIdentity
                        row={{
                          display_name: trip.vehicle_name,
                          registration_number: trip.registration_number,
                        }}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {trip.driver_name || "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {trip.purpose || "—"}
                        {trip.destination ? ` · ${trip.destination}` : ""}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDateTime(trip.checkout_at)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDateTime(trip.actual_return_at)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {trip.distance_km === null ||
                      trip.distance_km === undefined
                        ? "—"
                        : `${Number(trip.distance_km).toLocaleString()} km`}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      AED {Number(trip.expense_amount || 0).toFixed(2)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={trip.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-muted-foreground dark:border-white/10">
          Showing {filtered.length} trip log{filtered.length === 1 ? "" : "s"}
        </div>
      </section>
    </div>
  );
}
