import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CarFront,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  Wrench,
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
  MetricCard,
  VehicleIdentity,
  inputClass,
  rowsFrom,
} from "./fleetShared";
import { VEHICLE_MAKES, VEHICLE_TYPES, modelsForMake } from "./vehicleCatalog";

const EMPTY_FORM = {
  branch: "",
  vehicle_code: "",
  make: "",
  custom_make: "",
  model: "",
  custom_model: "",
  registration_number: "",
  vehicle_type: "",
  custom_vehicle_type: "",
  year: "",
  odometer_km: "0",
  service_due_km: "",
  fuel_type: "PETROL",
  status: "AVAILABLE",
  notes: "",
};

function normalizeVehicleForm(vehicle, branchId) {
  if (!vehicle) {
    return {
      ...EMPTY_FORM,
      branch: branchId ? String(branchId) : "",
    };
  }

  const knownMake = VEHICLE_MAKES.includes(vehicle.make);
  const availableModels = modelsForMake(vehicle.make);
  const knownModel = availableModels.includes(vehicle.model);
  const knownType = VEHICLE_TYPES.includes(vehicle.vehicle_type);

  return {
    branch: String(vehicle.branch || branchId || ""),
    vehicle_code: vehicle.vehicle_code || "",
    make: knownMake ? vehicle.make : "Other",
    custom_make: knownMake ? "" : vehicle.make || "",
    model: knownModel ? vehicle.model : "Other",
    custom_model: knownModel ? "" : vehicle.model || "",
    registration_number: vehicle.registration_number || "",
    vehicle_type: knownType ? vehicle.vehicle_type : "Other",
    custom_vehicle_type: knownType ? "" : vehicle.vehicle_type || "",
    year: vehicle.year || "",
    odometer_km: vehicle.odometer_km ?? "0",
    service_due_km: vehicle.service_due_km ?? "",
    fuel_type: vehicle.fuel_type || "PETROL",
    status: vehicle.status || "AVAILABLE",
    notes: vehicle.notes || "",
  };
}

function buildPayload(form, branchId) {
  const make = form.make === "Other" ? form.custom_make.trim() : form.make;
  const model = form.model === "Other" ? form.custom_model.trim() : form.model;
  const vehicleType =
    form.vehicle_type === "Other"
      ? form.custom_vehicle_type.trim()
      : form.vehicle_type;

  return {
    branch: form.branch || branchId,
    vehicle_code: form.vehicle_code.trim(),
    make,
    model,
    registration_number: form.registration_number.trim(),
    vehicle_type: vehicleType,
    year: form.year ? Number(form.year) : null,
    odometer_km: Number(form.odometer_km || 0),
    service_due_km: form.service_due_km ? Number(form.service_due_km) : null,
    fuel_type: form.fuel_type,
    status: form.status,
    notes: form.notes.trim(),
  };
}

function errorText(error) {
  if (Array.isArray(error)) return error.join(" ");
  if (typeof error === "object" && error)
    return Object.values(error).flat().join(" ");
  return String(error || "");
}

function VehicleFormModal({ open, vehicle, branchId, onClose, onSaved }) {
  const [form, setForm] = React.useState(() =>
    normalizeVehicleForm(vehicle, branchId),
  );
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (open) {
      setForm(normalizeVehicleForm(vehicle, branchId));
      setErrors({});
    }
  }, [open, vehicle, branchId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form, branchId);

      if (!payload.branch) {
        throw new Error(
          "Select a branch from the branch filter before adding a vehicle.",
        );
      }
      if (!payload.make) throw new Error("Make is required.");
      if (!payload.model) throw new Error("Model is required.");
      if (!payload.vehicle_type) throw new Error("Vehicle type is required.");

      if (vehicle?.id) {
        return unwrap(
          await api.patch(`/fleet/vehicles/${vehicle.id}/`, payload),
        );
      }
      return unwrap(await api.post("/fleet/vehicles/", payload));
    },
    onSuccess: () => {
      toast.success(
        vehicle?.id
          ? "Vehicle updated successfully"
          : "Vehicle added successfully",
      );
      onSaved();
      onClose();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      setErrors(details.fields || {});
      toast.error(details.message || error.message || "Unable to save vehicle");
    },
  });

  if (!open) return null;

  const modelOptions = modelsForMake(
    form.make === "Other" ? form.custom_make : form.make,
  );

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectField = (key, label, options, required = false) => (
    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {label}
      {required ? <span className="text-red-500"> *</span> : null}
      <select
        className={inputClass}
        value={form[key]}
        required={required}
        onChange={(event) => update(key, event.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
      {errors[key] ? (
        <span className="mt-1 block text-xs text-red-600">
          {errorText(errors[key])}
        </span>
      ) : null}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
        role="dialog"
        aria-modal="true"
        aria-label={vehicle?.id ? "Edit vehicle" : "Add vehicle"}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              Fleet Registry
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {vehicle?.id ? "Edit Vehicle" : "Add Vehicle"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage identification, classification, odometer, fuel, and service
              details.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
          className="p-5 sm:p-7"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Vehicle Code <span className="text-red-500">*</span>
              <Input
                className="mt-1.5"
                required
                value={form.vehicle_code}
                onChange={(event) => update("vehicle_code", event.target.value)}
                placeholder="e.g. VH-0001"
              />
              {errors.vehicle_code ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errorText(errors.vehicle_code)}
                </span>
              ) : null}
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Registration Number <span className="text-red-500">*</span>
              <Input
                className="mt-1.5"
                required
                value={form.registration_number}
                onChange={(event) =>
                  update("registration_number", event.target.value)
                }
                placeholder="e.g. Dubai A 45812"
              />
              {errors.registration_number ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errorText(errors.registration_number)}
                </span>
              ) : null}
            </label>

            {selectField("make", "Make", VEHICLE_MAKES, true)}

            {form.make === "Other" ? (
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Custom Make <span className="text-red-500">*</span>
                <Input
                  className="mt-1.5"
                  required
                  value={form.custom_make}
                  onChange={(event) =>
                    update("custom_make", event.target.value)
                  }
                  placeholder="Enter vehicle make"
                />
              </label>
            ) : null}

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Model <span className="text-red-500">*</span>
              <select
                className={inputClass}
                required
                value={form.model}
                onChange={(event) => update("model", event.target.value)}
              >
                <option value="">Select model</option>
                {modelOptions.map((model) => (
                  <option value={model} key={model}>
                    {model}
                  </option>
                ))}
                <option value="Other">Other Model</option>
              </select>
              {errors.model ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errorText(errors.model)}
                </span>
              ) : null}
            </label>

            {form.model === "Other" ? (
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Custom Model <span className="text-red-500">*</span>
                <Input
                  className="mt-1.5"
                  required
                  value={form.custom_model}
                  onChange={(event) =>
                    update("custom_model", event.target.value)
                  }
                  placeholder="Enter model or trim"
                />
              </label>
            ) : null}

            {selectField("vehicle_type", "Vehicle Type", VEHICLE_TYPES, true)}

            {form.vehicle_type === "Other" ? (
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Custom Vehicle Type <span className="text-red-500">*</span>
                <Input
                  className="mt-1.5"
                  required
                  value={form.custom_vehicle_type}
                  onChange={(event) =>
                    update("custom_vehicle_type", event.target.value)
                  }
                  placeholder="Enter vehicle type"
                />
              </label>
            ) : null}

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Year
              <Input
                className="mt-1.5"
                type="number"
                min="1900"
                max="2100"
                value={form.year}
                onChange={(event) => update("year", event.target.value)}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Current Odometer (km) <span className="text-red-500">*</span>
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                required
                value={form.odometer_km}
                onChange={(event) => update("odometer_km", event.target.value)}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Next Service Due (km)
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                value={form.service_due_km}
                onChange={(event) =>
                  update("service_due_km", event.target.value)
                }
              />
            </label>

            {selectField("fuel_type", "Fuel Type", [
              "PETROL",
              "DIESEL",
              "HYBRID",
              "ELECTRIC",
              "CNG",
              "LPG",
            ])}

            {selectField("status", "Status", [
              "AVAILABLE",
              "SERVICE",
              "INACTIVE",
            ])}

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
              Notes
              <textarea
                className={inputClass}
                rows="4"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Insurance, condition, assigned department, accessories, or other notes..."
              />
            </label>
          </div>

          <div className="mt-7 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending
                ? "Saving..."
                : vehicle?.id
                  ? "Update Vehicle"
                  : "Save Vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteVehicleDialog({ vehicle, onClose, onDeleted }) {
  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/fleet/vehicles/${vehicle.id}/`),
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      onDeleted();
      onClose();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      toast.error(
        details.message ||
          "Unable to delete this vehicle. It may already be linked to trip records.",
      );
    },
  });

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
          Delete vehicle?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You are about to delete <strong>{vehicle.display_name}</strong> (
          {vehicle.registration_number}). This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? "Deleting..." : "Delete Vehicle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VehicleListPage() {
  const queryClient = useQueryClient();
  const { branchParams, branchId } = useActiveBranchFilter();
  const [query, setQuery] = React.useState("");
  const [formState, setFormState] = React.useState({
    open: false,
    vehicle: null,
  });
  const [deleteVehicle, setDeleteVehicle] = React.useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fleet-vehicles", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/fleet/vehicles/", {
          params: { ...branchParams, page_size: 500 },
        }),
      ),
  });

  const vehicles = rowsFrom(data);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = vehicles.filter((vehicle) =>
    [
      vehicle.vehicle_code,
      vehicle.make,
      vehicle.model,
      vehicle.registration_number,
      vehicle.vehicle_type,
      vehicle.branch_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );

  const refreshVehicles = () => {
    queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["fleet-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["fleet"] });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Registry"
        title="Vehicles"
        description="Add, edit, delete, and manage company vehicles from one section, including make, model, type, mileage, fuel, status, and service details."
        actions={
          <Button
            className="bg-white text-slate-950 hover:bg-slate-100"
            onClick={() => setFormState({ open: true, vehicle: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Registered"
          value={vehicles.length}
          description="Vehicles in selected branch"
          icon={CarFront}
        />
        <MetricCard
          label="Available"
          value={vehicles.filter((item) => item.status === "AVAILABLE").length}
          description="Ready for checkout"
          icon={CarFront}
          tone="green"
        />
        <MetricCard
          label="Service Due"
          value={vehicles.filter((item) => item.service_due_soon).length}
          description="Within next 500 km"
          icon={Wrench}
          tone="red"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div>
            <h2 className="font-bold">Registered Vehicles</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Search, add, edit, or delete without leaving this page
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vehicles..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading vehicles...
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title="No vehicles found"
            description="Add a vehicle or change the current search text."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.03]">
                <tr>
                  {[
                    "Vehicle",
                    "Code",
                    "Branch",
                    "Type",
                    "Odometer",
                    "Service Due",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th className="px-4 py-3" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr
                    className="border-t border-slate-100 dark:border-white/10"
                    key={vehicle.id}
                  >
                    <td className="px-4 py-3">
                      <VehicleIdentity row={vehicle} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {vehicle.vehicle_code}
                    </td>
                    <td className="px-4 py-3">{vehicle.branch_name || "—"}</td>
                    <td className="px-4 py-3">{vehicle.vehicle_type || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {Number(vehicle.odometer_km || 0).toLocaleString()} km
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {vehicle.service_due_km
                        ? `${Number(vehicle.service_due_km).toLocaleString()} km`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Edit vehicle"
                          onClick={() => setFormState({ open: true, vehicle })}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Delete vehicle"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                          onClick={() => setDeleteVehicle(vehicle)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <VehicleFormModal
        open={formState.open}
        vehicle={formState.vehicle}
        branchId={branchId}
        onClose={() => setFormState({ open: false, vehicle: null })}
        onSaved={refreshVehicles}
      />

      {deleteVehicle ? (
        <DeleteVehicleDialog
          vehicle={deleteVehicle}
          onClose={() => setDeleteVehicle(null)}
          onDeleted={refreshVehicles}
        />
      ) : null}
    </div>
  );
}
