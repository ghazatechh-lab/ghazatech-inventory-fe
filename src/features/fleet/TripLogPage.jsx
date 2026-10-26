import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Printer, CarFront, MapPin, Fuel, Wallet, Clock3, Plus } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { BranchSourceFilter, usePhysicalBranchScope } from "@/components/common/PhysicalBranchScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  EmptyState,
  MetricCard,
  FleetHero,
  VehicleIdentity,
  formatDateTime,
  rowsFrom,
} from "./fleetShared";

export default function TripLogPage() {
  const branchScope = usePhysicalBranchScope();
  const { listParams: branchParams } = branchScope;

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

  const { data: vehicleData } = useQuery({
    queryKey: ["fleet-trip-vehicle-images", branchParams],
    queryFn: async () => unwrap(await api.get("/fleet/vehicles/", { params: { ...branchParams, page_size: 500 } })),
  });
  const vehicleImages = rowsFrom(vehicleData);
  const imageForTrip = (trip) => {
    const vehicle = vehicleImages.find((item) => String(item.id) === String(trip.vehicle));
    return vehicle?.vehicle_image_url || vehicle?.vehicle_image || trip.vehicle_image_url || trip.vehicle_image || "";
  };
  const rows = rowsFrom(data);

  const filtered = rows.filter((trip) =>
    `${trip.vehicle_name} ${trip.registration_number} ${trip.driver_name} ${trip.purpose} ${trip.destination}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const totals = rows.reduce((acc, trip) => ({
    distance: acc.distance + Number(trip.distance_km || 0),
    expense: acc.expense + Number(trip.expense_amount || 0),
    fuel: acc.fuel + Number(trip.fuel_used_liters || trip.fuel_consumed_liters || 0),
    active: acc.active + (trip.status === "ACTIVE" ? 1 : 0),
  }), {distance: 0, expense: 0, fuel: 0, active: 0});
  const exportCsv = () => {
    const columns = ["vehicle_name","registration_number","driver_name","purpose","destination","checkout_at","actual_return_at","distance_km","expense_amount","status"];
    const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [columns.join(","), ...filtered.map((row) => columns.map((col) => escapeCsv(row[col])).join(","))].join("\r\n");
    const blob = new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href=url;anchor.download="fleet-trip-logs.csv";anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-5 pb-10">
      <FleetHero eyebrow="Fleet Audit Trail" title="Trip Logs" description="Review every vehicle movement with driver, route, mileage, fuel, expense, departure, return, and status information." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Print</Button><Button className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300" onClick={exportCsv}><Download className="mr-2 h-4 w-4"/>Export</Button></div>}/>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Trips" value={rows.length} description="Loaded trip records" icon={CarFront}/>
        <MetricCard label="Distance Travelled" value={`${totals.distance.toLocaleString()} km`} description="Total distance" icon={MapPin} tone="green"/>
        <MetricCard label="Fuel Recorded" value={`${totals.fuel.toLocaleString()} L`} description="Recorded fuel use" icon={Fuel}/>
        <MetricCard label="Total Expenses" value={`AED ${totals.expense.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} description="Recorded trip expense" icon={Wallet} tone="amber"/>
        <MetricCard label="Active Trips" value={totals.active} description="Currently on trip" icon={Clock3} tone="red"/>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_minmax(170px,1fr)_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-10 pl-9" aria-label="Search trips" placeholder="Search by vehicle, driver, purpose or route..." value={q} onChange={(e)=>setQ(e.target.value)}/></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label><select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-label="Trip status" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All Statuses</option><option value="ACTIVE">In Progress</option><option value="RETURNED">Returned</option><option value="CANCELLED">Cancelled</option></select></div>
          <BranchSourceFilter scope={branchScope}/>
          <Button variant="outline" onClick={()=>{setQ("");setStatus("")}}>Reset</Button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="border-b border-slate-200/80 p-5 dark:border-white/10"><h2 className="text-lg font-bold">Trip Logs</h2><p className="mt-1 text-xs text-muted-foreground">Complete audit trail for vehicle movements.</p></div>

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
              <thead className="border-b border-slate-200 bg-[#f6f9fc] text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
                <tr>
                  {[
                    "Vehicle",
                    "Driver / Purpose",
                    "Checkout",
                    "Return",
                    "Distance",
                    "Expense",
                    "Status",
                  ].map((heading, index) => (
                    <th className={`px-5 py-3.5 align-middle ${index < 2 ? "text-left" : "text-center"}`} key={heading}>
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
                          vehicle_image_url: imageForTrip(trip),
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

                    <td className="whitespace-nowrap px-5 py-4 text-center align-middle text-muted-foreground">
                      {formatDateTime(trip.checkout_at)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center align-middle text-muted-foreground">
                      {formatDateTime(trip.actual_return_at)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center align-middle font-semibold">
                      {trip.distance_km === null ||
                      trip.distance_km === undefined
                        ? "—"
                        : `${Number(trip.distance_km).toLocaleString()} km`}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center align-middle font-semibold">
                      AED {Number(trip.expense_amount || 0).toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-center align-middle">
                      <div className="flex justify-center">
                        <StatusBadge status={trip.status} />
                      </div>
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
