import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FleetHero, inputClass } from "./fleetShared";

const initial = {
  branch: "",
  vehicle_code: "",
  make: "",
  model: "",
  registration_number: "",
  vehicle_type: "",
  year: "",
  odometer_km: "0",
  service_due_km: "",
  fuel_type: "PETROL",
  status: "AVAILABLE",
  notes: "",
};
export default function VehicleFormPage() {
  const nav = useNavigate(),
    qc = useQueryClient();
  const { branchId } = useActiveBranchFilter();
  const [form, setForm] = React.useState({
    ...initial,
    branch: branchId ? String(branchId) : "",
  });
  const [errors, setErrors] = React.useState({});
  React.useEffect(() => {
    if (branchId) setForm((f) => ({ ...f, branch: String(branchId) }));
  }, [branchId]);
  const mutation = useMutation({
    mutationFn: async () => unwrap(await api.post("/fleet/vehicles/", form)),
    onSuccess: () => {
      toast.success("Vehicle added successfully");
      qc.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      qc.invalidateQueries({ queryKey: ["fleet-dashboard"] });
      nav("/fleet/vehicles");
    },
    onError: (e) => {
      const d = getApiErrorDetails?.(e) || {};
      setErrors(d.fields || {});
      toast.error(d.message || "Unable to save vehicle");
    },
  });
  const field = (key, label, type = "text", required = false) => (
    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {label}
      {required && <span className="text-red-500"> *</span>}
      <Input
        className="mt-1.5"
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      {errors[key] ? (
        <span className="mt-1 block text-xs text-red-600">
          {String(errors[key])}
        </span>
      ) : null}
    </label>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Registry"
        title="Add Vehicle"
        description="Create a vehicle record for the active branch and define its identification, odometer, status, and service threshold."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70 sm:p-7"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {field("vehicle_code", "Vehicle Code", "text", true)}
          {field("registration_number", "Registration Number", "text", true)}
          {field("make", "Make", "text", true)}
          {field("model", "Model", "text", true)}
          {field("vehicle_type", "Vehicle Type")}
          {field("year", "Year", "number")}
          {field("odometer_km", "Current Odometer (km)", "number", true)}
          {field("service_due_km", "Next Service Due (km)", "number")}
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Fuel Type
            <select
              className={inputClass}
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            >
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ELECTRIC">Electric</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Status
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="AVAILABLE">Available</option>
              <option value="SERVICE">In Service</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Notes
            <textarea
              className={inputClass}
              rows="4"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => nav("/fleet/vehicles")}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Vehicle"}
          </Button>
        </div>
      </form>
    </div>
  );
}
