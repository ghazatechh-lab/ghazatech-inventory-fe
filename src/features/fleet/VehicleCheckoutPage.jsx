import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit3,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  EmptyState,
  FleetHero,
  VehicleIdentity,
  formatDateTime,
  getEmployeeName,
  inputClass,
  rowsFrom,
} from "./fleetShared";

const EMPTY_CHECKOUT_FORM = {
  vehicle: "",
  driver: "",
  checkout_at: "",
  expected_return_at: "",
  starting_odometer_km: "",
  fuel_level_out: "FULL",
  destination: "",
  purpose: "",
  departure_notes: "",
};

const EMPTY_RETURN_FORM = {
  actual_return_at: "",
  ending_odometer_km: "",
  fuel_level_return: "FULL",
  parking_location: "",
  expense_amount: "0",
  return_notes: "",
  receipt: null,
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
};

const Modal = ({
  open,
  title,
  description,
  onClose,
  children,
  maxWidth = "max-w-3xl",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
      {value || "—"}
    </div>
  </div>
);

export default function VehicleCheckoutPage() {
  const queryClient = useQueryClient();
  const { branchParams } = useActiveBranchFilter();

  const [checkoutModalOpen, setCheckoutModalOpen] = React.useState(false);
  const [returnModalOpen, setReturnModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState(null);
  const [selectedTrip, setSelectedTrip] = React.useState(null);
  const [checkoutForm, setCheckoutForm] = React.useState(EMPTY_CHECKOUT_FORM);
  const [returnForm, setReturnForm] = React.useState(EMPTY_RETURN_FORM);
  const [errors, setErrors] = React.useState({});
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");

  const vehiclesQuery = useQuery({
    queryKey: ["fleet-movement-vehicles", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/fleet/vehicles/", {
          params: { ...branchParams, page_size: 500 },
        }),
      ),
  });

  const employeesQuery = useQuery({
    queryKey: ["fleet-movement-employees", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employees/", {
          params: { ...branchParams, page_size: 500, is_active: true },
        }),
      ),
  });

  const tripsQuery = useQuery({
    queryKey: ["fleet-movements", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/fleet/trips/", {
          params: { ...branchParams, page_size: 500, ordering: "-checkout_at" },
        }),
      ),
  });

  const vehicles = rowsFrom(vehiclesQuery.data);
  const employees = rowsFrom(employeesQuery.data);
  const trips = rowsFrom(tripsQuery.data);

  const refreshFleet = () => {
    [
      "fleet",
      "fleet-movements",
      "fleet-movement-vehicles",
      "fleet-checkout-list",
      "fleet-checkout-vehicles",
      "fleet-available-vehicles",
      "fleet-active-trips",
      "fleet-trips",
      "fleet-vehicles",
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const closeCheckoutModal = () => {
    setCheckoutModalOpen(false);
    setEditingTrip(null);
    setCheckoutForm(EMPTY_CHECKOUT_FORM);
    setErrors({});
  };

  const openAddCheckout = () => {
    setEditingTrip(null);
    setErrors({});
    setCheckoutForm(EMPTY_CHECKOUT_FORM);
    setCheckoutModalOpen(true);
  };

  const openEditCheckout = (trip) => {
    setEditingTrip(trip);
    setErrors({});
    setCheckoutForm({
      vehicle: String(trip.vehicle || ""),
      driver: String(trip.driver || ""),
      checkout_at: toDateTimeLocal(trip.checkout_at),
      expected_return_at: toDateTimeLocal(trip.expected_return_at),
      starting_odometer_km: trip.starting_odometer_km ?? "",
      fuel_level_out: trip.fuel_level_out || "FULL",
      destination: trip.destination || "",
      purpose: trip.purpose || "",
      departure_notes: trip.departure_notes || "",
    });
    setCheckoutModalOpen(true);
  };

  const openReturn = (trip) => {
    setSelectedTrip(trip);
    setReturnForm({
      ...EMPTY_RETURN_FORM,
      ending_odometer_km: trip.starting_odometer_km || "",
    });
    setReturnModalOpen(true);
  };

  const closeReturnModal = () => {
    setReturnModalOpen(false);
    setSelectedTrip(null);
    setReturnForm(EMPTY_RETURN_FORM);
  };

  const openView = (trip) => {
    setSelectedTrip(trip);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedTrip(null);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...checkoutForm,
        vehicle: Number(checkoutForm.vehicle),
        driver: Number(checkoutForm.driver),
        starting_odometer_km: Number(checkoutForm.starting_odometer_km),
        expected_return_at: checkoutForm.expected_return_at || null,
      };

      if (editingTrip) {
        return unwrap(
          await api.patch(`/fleet/trips/${editingTrip.id}/`, payload),
        );
      }

      return unwrap(await api.post("/fleet/trips/", payload));
    },
    onSuccess: () => {
      toast.success(
        editingTrip ? "Vehicle checkout updated" : "Vehicle checkout created",
      );
      closeCheckoutModal();
      refreshFleet();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      setErrors(details.fields || {});
      toast.error(details.message || "Unable to save vehicle checkout");
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(returnForm).forEach(([key, value]) => {
        if (value !== null && value !== "") formData.append(key, value);
      });

      return unwrap(
        await api.post(
          `/fleet/trips/${selectedTrip.id}/return-vehicle/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        ),
      );
    },
    onSuccess: () => {
      toast.success("Vehicle return completed");
      closeReturnModal();
      refreshFleet();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      toast.error(details.message || "Unable to complete vehicle return");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (trip) => api.delete(`/fleet/trips/${trip.id}/`),
    onSuccess: () => {
      toast.success("Vehicle movement deleted");
      refreshFleet();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      toast.error(details.message || "Unable to delete vehicle movement");
    },
  });

  const requestDelete = (trip) => {
    const label = `${trip.vehicle_name || "Vehicle"} - ${trip.driver_name || "Driver"}`;
    if (
      window.confirm(
        `Delete this vehicle movement?\n\n${label}\n\nThis action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(trip);
    }
  };

  const selectedVehicleId = String(checkoutForm.vehicle || "");
  const selectableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "AVAILABLE" ||
      String(vehicle.id) === selectedVehicleId,
  );

  const filteredTrips = trips.filter((trip) => {
    const query = search.trim().toLowerCase();
    const matchesStatus = status === "ALL" || trip.status === status;
    const matchesSearch =
      !query ||
      [
        trip.vehicle_name,
        trip.registration_number,
        trip.driver_name,
        trip.destination,
        trip.purpose,
        trip.branch_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  const activeCount = trips.filter((trip) => trip.status === "ACTIVE").length;
  const returnedCount = trips.filter(
    (trip) => trip.status === "RETURNED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <FleetHero
        eyebrow="Vehicle Movement"
        title="Vehicle Checkout & Return"
        description="Manage checkout, return, editing, viewing, and deletion from one section."
        actions={
          <Button
            type="button"
            className="bg-white !text-slate-900 hover:bg-slate-100"
            onClick={openAddCheckout}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Checkout
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-sm text-muted-foreground">Total Movements</p>
          <p className="mt-2 text-3xl font-bold">{trips.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-sm text-muted-foreground">Currently Out</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {activeCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-sm text-muted-foreground">Returned</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {returnedCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="border-b border-slate-200 p-5 dark:border-white/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Vehicle Movement List</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredTrips.length} record
                {filteredTrips.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" onClick={openAddCheckout}>
                <Plus className="mr-2 h-4 w-4" />
                Add Checkout
              </Button>
              <div className="relative min-w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search vehicle, driver, purpose..."
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="RETURNED">Returned</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {tripsQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading movements...
          </div>
        ) : filteredTrips.length === 0 ? (
          <EmptyState
            title="No vehicle movements found"
            description="Use Add Checkout to create the first movement."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-white/5">
                <tr>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-5 py-3 font-semibold">Purpose / Route</th>
                  <th className="px-5 py-3 font-semibold">Checkout</th>
                  <th className="px-5 py-3 font-semibold">Return</th>
                  <th className="px-5 py-3 font-semibold">Odometer</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filteredTrips.map((trip) => {
                  const isReturned = trip.status === "RETURNED";
                  const isActive = trip.status === "ACTIVE";

                  return (
                    <tr
                      key={trip.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
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
                        <div className="font-medium">
                          {trip.driver_name || "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {trip.branch_name || "—"}
                        </div>
                      </td>
                      <td className="max-w-64 px-5 py-4">
                        <div className="font-medium">{trip.purpose || "—"}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {trip.destination || "No destination"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDateTime(trip.checkout_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {isReturned
                          ? formatDateTime(trip.actual_return_at)
                          : formatDateTime(trip.expected_return_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div>
                          {Number(
                            trip.starting_odometer_km || 0,
                          ).toLocaleString()}{" "}
                          km
                        </div>
                        {isReturned && trip.ending_odometer_km ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            End:{" "}
                            {Number(trip.ending_odometer_km).toLocaleString()}{" "}
                            km
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {isReturned ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openView(trip)}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditCheckout(trip)}
                              >
                                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {isActive ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openReturn(trip)}
                                >
                                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                  Return
                                </Button>
                              ) : null}
                            </>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:hover:bg-red-500/10"
                            disabled={
                              deleteMutation.isPending &&
                              deleteMutation.variables?.id === trip.id
                            }
                            onClick={() => requestDelete(trip)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={checkoutModalOpen}
        title={editingTrip ? "Edit Vehicle Checkout" : "Add Vehicle Checkout"}
        description={
          editingTrip
            ? `Update movement #${editingTrip.id}`
            : "Assign an available vehicle to an employee."
        }
        onClose={closeCheckoutModal}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            checkoutMutation.mutate();
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Vehicle *
              <select
                className={inputClass}
                required
                value={checkoutForm.vehicle}
                onChange={(event) => {
                  const value = event.target.value;
                  const vehicle = vehicles.find(
                    (item) => String(item.id) === value,
                  );
                  setCheckoutForm((current) => ({
                    ...current,
                    vehicle: value,
                    starting_odometer_km:
                      vehicle?.odometer_km ?? current.starting_odometer_km,
                  }));
                }}
              >
                <option value="">Select available vehicle</option>
                {selectableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.display_name} · {vehicle.registration_number}
                  </option>
                ))}
              </select>
              {errors.vehicle ? (
                <span className="mt-1 block text-xs text-red-600">
                  {String(errors.vehicle)}
                </span>
              ) : null}
            </label>

            <label className="text-sm font-semibold">
              Driver / Employee *
              <select
                className={inputClass}
                required
                value={checkoutForm.driver}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    driver: event.target.value,
                  }))
                }
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeName(employee)}
                    {employee.employee_code
                      ? ` · ${employee.employee_code}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Checkout Date & Time *
              <Input
                className="mt-1.5"
                type="datetime-local"
                required
                value={checkoutForm.checkout_at}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    checkout_at: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Expected Return
              <Input
                className="mt-1.5"
                type="datetime-local"
                min={checkoutForm.checkout_at || undefined}
                value={checkoutForm.expected_return_at}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    expected_return_at: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Starting Odometer (km) *
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                required
                value={checkoutForm.starting_odometer_km}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    starting_odometer_km: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Fuel Level
              <select
                className={inputClass}
                value={checkoutForm.fuel_level_out}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    fuel_level_out: event.target.value,
                  }))
                }
              >
                <option value="FULL">Full</option>
                <option value="THREE_QUARTER">3/4</option>
                <option value="HALF">1/2</option>
                <option value="QUARTER">1/4</option>
                <option value="LOW">Low</option>
              </select>
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Destination / Route
              <Input
                className="mt-1.5"
                value={checkoutForm.destination}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Purpose of Trip *
              <Input
                className="mt-1.5"
                required
                value={checkoutForm.purpose}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Departure Notes
              <textarea
                className={inputClass}
                rows={4}
                value={checkoutForm.departure_notes}
                onChange={(event) =>
                  setCheckoutForm((current) => ({
                    ...current,
                    departure_notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCheckoutModal}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={checkoutMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {checkoutMutation.isPending
                ? "Saving..."
                : editingTrip
                  ? "Update Checkout"
                  : "Confirm Checkout"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={returnModalOpen}
        title="Return Vehicle"
        description={
          selectedTrip
            ? `${selectedTrip.vehicle_name} · ${selectedTrip.driver_name}`
            : ""
        }
        onClose={closeReturnModal}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            returnMutation.mutate();
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Actual Return Time
              <Input
                className="mt-1.5"
                type="datetime-local"
                value={returnForm.actual_return_at}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    actual_return_at: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Ending Odometer (km) *
              <Input
                className="mt-1.5"
                required
                type="number"
                min={selectedTrip?.starting_odometer_km || 0}
                value={returnForm.ending_odometer_km}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    ending_odometer_km: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Fuel Level on Return
              <select
                className={inputClass}
                value={returnForm.fuel_level_return}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    fuel_level_return: event.target.value,
                  }))
                }
              >
                <option value="FULL">Full</option>
                <option value="THREE_QUARTER">3/4</option>
                <option value="HALF">1/2</option>
                <option value="QUARTER">1/4</option>
                <option value="LOW">Low</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              Parking Location
              <Input
                className="mt-1.5"
                value={returnForm.parking_location}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    parking_location: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Expense / Fuel Amount
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                step="0.01"
                value={returnForm.expense_amount}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    expense_amount: event.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Proof / Receipt
              <Input
                className="mt-1.5"
                type="file"
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    receipt: event.target.files?.[0] || null,
                  }))
                }
              />
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Return Notes
              <textarea
                className={inputClass}
                rows={4}
                value={returnForm.return_notes}
                onChange={(event) =>
                  setReturnForm((current) => ({
                    ...current,
                    return_notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeReturnModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={returnMutation.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {returnMutation.isPending ? "Completing..." : "Complete Return"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={viewModalOpen}
        title="Vehicle Movement Details"
        description="Returned vehicle information is read-only."
        onClose={closeViewModal}
        maxWidth="max-w-4xl"
      >
        {selectedTrip ? (
          <div className="space-y-5">
            <VehicleIdentity
              row={{
                display_name: selectedTrip.vehicle_name,
                registration_number: selectedTrip.registration_number,
              }}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Driver" value={selectedTrip.driver_name} />
              <DetailItem label="Branch" value={selectedTrip.branch_name} />
              <DetailItem label="Status" value={selectedTrip.status} />
              <DetailItem
                label="Checkout Time"
                value={formatDateTime(selectedTrip.checkout_at)}
              />
              <DetailItem
                label="Expected Return"
                value={formatDateTime(selectedTrip.expected_return_at)}
              />
              <DetailItem
                label="Actual Return"
                value={formatDateTime(selectedTrip.actual_return_at)}
              />
              <DetailItem
                label="Starting Odometer"
                value={`${Number(selectedTrip.starting_odometer_km || 0).toLocaleString()} km`}
              />
              <DetailItem
                label="Ending Odometer"
                value={
                  selectedTrip.ending_odometer_km
                    ? `${Number(selectedTrip.ending_odometer_km).toLocaleString()} km`
                    : "—"
                }
              />
              <DetailItem
                label="Distance"
                value={
                  selectedTrip.distance_km
                    ? `${Number(selectedTrip.distance_km).toLocaleString()} km`
                    : "—"
                }
              />
              <DetailItem
                label="Fuel Out"
                value={selectedTrip.fuel_level_out}
              />
              <DetailItem
                label="Fuel Return"
                value={selectedTrip.fuel_level_return}
              />
              <DetailItem
                label="Expense"
                value={
                  selectedTrip.expense_amount
                    ? `AED ${selectedTrip.expense_amount}`
                    : "AED 0"
                }
              />
              <DetailItem label="Purpose" value={selectedTrip.purpose} />
              <DetailItem
                label="Destination"
                value={selectedTrip.destination}
              />
              <DetailItem
                label="Parking Location"
                value={selectedTrip.parking_location}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DetailItem
                label="Departure Notes"
                value={selectedTrip.departure_notes}
              />
              <DetailItem
                label="Return Notes"
                value={selectedTrip.return_notes}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
