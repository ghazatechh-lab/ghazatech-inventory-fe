import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CarFront, CheckCircle2, Clock3, Wrench } from "lucide-react";
import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  EmptyState,
  FleetHero,
  FleetQuickLinks,
  MetricCard,
  VehicleIdentity,
  formatDateTime,
} from "./fleetShared";

export default function FleetDashboardPage() {
  const { branchParams } = useActiveBranchFilter();
  const { data = {}, isLoading } = useQuery({
    queryKey: ["fleet-dashboard", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/fleet/vehicles/dashboard/", { params: branchParams }),
      ),
  });
  const metrics = [
    [
      "Total Vehicles",
      data.total || 0,
      "All registered company vehicles",
      CarFront,
      "blue",
    ],
    [
      "Available Now",
      data.available || 0,
      "Vehicles ready for assignment",
      CheckCircle2,
      "green",
    ],
    [
      "Currently Out",
      data.currently_out || 0,
      "Vehicles on active trips",
      Clock3,
      "amber",
    ],
    [
      "Service Due",
      data.service_due || 0,
      "Due within the next 500 km",
      Wrench,
      "red",
    ],
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Operations"
        title="Fleet Overview"
        description="Monitor vehicle availability, active movements, odometer readings, service alerts, and expected returns from one operational view."
        actions={<FleetQuickLinks />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, description, Icon, tone]) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            description={description}
            icon={Icon}
            tone={tone}
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_.9fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
            <h2 className="font-bold">Current Vehicle Usage</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Live checkouts and expected return timing
            </p>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading fleet activity...
            </div>
          ) : !(data.active_trips || []).length ? (
            <EmptyState
              title="No active trips"
              description="All checked-out vehicles will be listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.03]">
                  <tr>
                    {[
                      "Vehicle",
                      "Driver",
                      "Purpose",
                      "Checkout",
                      "Expected Return",
                      "Status",
                    ].map((x) => (
                      <th className="px-4 py-3" key={x}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.active_trips.map((t) => (
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
                      <td className="px-4 py-3 font-medium">{t.driver_name}</td>
                      <td className="px-4 py-3">{t.purpose}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(t.checkout_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(t.expected_return_at)}
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
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <h2 className="font-bold">Vehicle Status</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Availability and current odometer
          </p>
          <div className="mt-4 space-y-3">
            {(data.vehicles || []).map((v) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-white/10"
                key={v.id}
              >
                <VehicleIdentity row={v} />
                <div className="text-right">
                  <StatusBadge status={v.status} />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {Number(v.odometer_km || 0).toLocaleString()} km
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
