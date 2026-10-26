import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CarFront,
  CheckCircle2,
  Fuel,
  Gauge,
  AlertCircle,
  Edit3,
  Eye,
  FileText,
  ImageIcon,
  Plus,
  Save,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { BranchSourceFilter, PhysicalBranchField, usePhysicalBranchScope } from "@/components/common/PhysicalBranchScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  EmptyState,
  FleetHero,
  MetricCard,
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

function VehicleFormModal({ open, vehicle, branchId, branchScope, onClose, onSaved }) {
  const [form, setForm] = React.useState(() =>
    normalizeVehicleForm(vehicle, branchScope?.isCombined ? null : branchId),
  );
  const [errors, setErrors] = React.useState({});
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(vehicle?.vehicle_image_url || vehicle?.vehicle_image || "");

  React.useEffect(() => {
    if (open) {
      setForm(normalizeVehicleForm(vehicle, branchScope?.isCombined ? null : branchId));
      setErrors({});
      setImageFile(null);
      setImagePreview(vehicle?.vehicle_image_url || vehicle?.vehicle_image || "");
    }
  }, [open, vehicle, branchId, branchScope?.isCombined]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form, branchScope?.isCombined ? null : branchId);

      if (!payload.branch) {
        throw new Error(
          "Select a branch from the branch filter before adding a vehicle.",
        );
      }
      if (!payload.make) throw new Error("Make is required.");
      if (!payload.model) throw new Error("Model is required.");
      if (!payload.vehicle_type) throw new Error("Vehicle type is required.");

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) body.append(key, value);
      });
      if (imageFile) body.append("vehicle_image", imageFile);

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (vehicle?.id) {
        return unwrap(await api.patch(`/fleet/vehicles/${vehicle.id}/`, body, config));
      }
      return unwrap(await api.post("/fleet/vehicles/", body, config));
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
            <div className="md:col-span-2">
              <PhysicalBranchField
                scope={branchScope}
                value={form.branch}
                onChange={(value) => update("branch", value)}
              />
            </div>
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

            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Vehicle Image</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vehicle preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setImageFile(file);
                      setImagePreview(file ? URL.createObjectURL(file) : (vehicle?.vehicle_image_url || vehicle?.vehicle_image || ""));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
                </div>
              </div>
            </div>

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
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="min-w-40 bg-amber-400 font-bold !text-slate-950 shadow-lg shadow-amber-500/10 hover:bg-amber-300 hover:!text-slate-950"
            >
              <Save
                className="mr-2 h-4 w-4"
                style={{ color: "#020617", stroke: "#020617" }}
              />
              <span
                style={{
                  color: "#020617",
                  WebkitTextFillColor: "#020617",
                }}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : vehicle?.id
                    ? "Update Vehicle"
                    : "Save Vehicle"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VehicleDetailModal({ vehicle, onClose, onChanged }) {
  const queryClient = useQueryClient();
  const [documentOpen, setDocumentOpen] = React.useState(false);
  const [documentForm, setDocumentForm] = React.useState({
    document_type: "RC", title: "", document_number: "", issue_date: "", expiry_date: "", notes: "", file: null,
  });

  const { data: tripData } = useQuery({
    queryKey: ["fleet-vehicle-trips", vehicle.id],
    queryFn: async () => unwrap(await api.get("/fleet/trips/", { params: { vehicle: vehicle.id, page_size: 5, ordering: "-checkout_at" } })),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("vehicle", vehicle.id);
      Object.entries(documentForm).forEach(([key, value]) => {
        if (key !== "file" && value) body.append(key, value);
      });
      if (documentForm.file) body.append("file", documentForm.file);
      return unwrap(await api.post("/fleet/vehicle-documents/", body, { headers: { "Content-Type": "multipart/form-data" } }));
    },
    onSuccess: async () => {
      toast.success("Vehicle document uploaded");
      await queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      setDocumentOpen(false);
      onChanged();
    },
    onError: (error) => {
      const details = getApiErrorDetails?.(error) || {};
      toast.error(details.message || "Unable to upload vehicle document");
    },
  });

  const deleteDocument = async (doc) => {
    try {
      await api.delete(`/fleet/vehicle-documents/${doc.id}/`);
      toast.success("Vehicle document deleted");
      await queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      onChanged();
    } catch (error) {
      toast.error(getApiErrorDetails?.(error)?.message || "Unable to delete document");
    }
  };

  const trips = rowsFrom(tripData).slice(0, 5);
  const docs = Array.isArray(vehicle.documents) ? vehicle.documents : [];

  return (
    <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-5xl rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div className="flex gap-4">
            <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {vehicle.vehicle_image_url || vehicle.vehicle_image ? <img src={vehicle.vehicle_image_url || vehicle.vehicle_image} alt={vehicle.display_name} className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div><h2 className="text-xl font-bold">{vehicle.display_name}</h2><p className="mt-1 text-sm text-muted-foreground">{vehicle.vehicle_code} · {vehicle.registration_number}</p><div className="mt-2"><StatusBadge status={vehicle.status} /></div></div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="space-y-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[ ["Branch", vehicle.branch_name], ["Type", vehicle.vehicle_type], ["Year", vehicle.year], ["Fuel Type", vehicle.fuel_type], ["Odometer", `${Number(vehicle.odometer_km || 0).toLocaleString()} km`], ["Service Due", vehicle.service_due_km ? `${Number(vehicle.service_due_km).toLocaleString()} km` : "—"], ["Make", vehicle.make], ["Model", vehicle.model] ].map(([label,value]) => <div key={label} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value || "—"}</p></div>)}
          </div>
          {vehicle.service_due_soon ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Service is due within the next 500 km.</div> : null}
          <section>
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">Vehicle Documents</h3><p className="text-xs text-muted-foreground">Registration, insurance, permits and other fleet documents.</p></div><Button size="sm" onClick={() => setDocumentOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Document</Button></div>
            <div className="space-y-2">{docs.length ? docs.map((doc) => <div key={doc.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{doc.title}</p><p className="text-xs text-muted-foreground">{String(doc.document_type || "OTHER").replaceAll("_", " ")} · {doc.document_number || "No number"} · Expiry {doc.expiry_date || "—"}</p></div><div className="flex items-center gap-2"><StatusBadge status={doc.status} />{doc.file_url || doc.file ? <Button size="sm" variant="outline" asChild><a href={doc.file_url || doc.file} target="_blank" rel="noreferrer"><FileText className="mr-2 h-4 w-4" />View</a></Button> : null}<Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteDocument(doc)}><Trash2 className="h-4 w-4" /></Button></div></div>) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No vehicle documents uploaded.</div>}</div>
          </section>
          <section><h3 className="mb-3 font-bold">Recent Trips</h3>{trips.length ? <div className="space-y-2">{trips.map((trip) => <div key={trip.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{trip.destination || trip.purpose || "Trip"}</p><p className="text-xs text-muted-foreground">{String(trip.checkout_at || "").slice(0,10)} · {trip.driver_name || "—"}</p></div><StatusBadge status={trip.status} /></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No recent trips.</div>}</section>
          {vehicle.notes ? <section><h3 className="mb-2 font-bold">Notes</h3><p className="rounded-xl border p-3 text-sm">{vehicle.notes}</p></section> : null}
        </div>
      </div>
      {documentOpen ? <div className="fixed inset-0 z-[115] grid place-items-center bg-slate-950/60 p-4"><form className="w-full max-w-xl rounded-2xl border bg-background p-5 shadow-2xl" onSubmit={(e) => { e.preventDefault(); uploadMutation.mutate(); }}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Add Vehicle Document</h3><Button type="button" variant="ghost" size="icon" onClick={() => setDocumentOpen(false)}><X className="h-4 w-4" /></Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Type<select className={inputClass} value={documentForm.document_type} onChange={(e)=>setDocumentForm(f=>({...f,document_type:e.target.value}))}>{["RC","INSURANCE","POLLUTION","FITNESS","PERMIT","TAX","SERVICE","WARRANTY","LEASE","OTHER"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label><label className="text-sm font-medium">Title<Input className="mt-1.5" required value={documentForm.title} onChange={(e)=>setDocumentForm(f=>({...f,title:e.target.value}))}/></label><label className="text-sm font-medium">Document Number<Input className="mt-1.5" value={documentForm.document_number} onChange={(e)=>setDocumentForm(f=>({...f,document_number:e.target.value}))}/></label><label className="text-sm font-medium">Issue Date<Input className="mt-1.5" type="date" value={documentForm.issue_date} onChange={(e)=>setDocumentForm(f=>({...f,issue_date:e.target.value}))}/></label><label className="text-sm font-medium">Expiry Date<Input className="mt-1.5" type="date" value={documentForm.expiry_date} onChange={(e)=>setDocumentForm(f=>({...f,expiry_date:e.target.value}))}/></label><label className="text-sm font-medium">File<Input className="mt-1.5" type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e)=>setDocumentForm(f=>({...f,file:e.target.files?.[0] || null}))}/></label></div><label className="mt-3 block text-sm font-medium">Notes<textarea className={inputClass} rows="3" value={documentForm.notes} onChange={(e)=>setDocumentForm(f=>({...f,notes:e.target.value}))}/></label><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setDocumentOpen(false)}>Cancel</Button><Button type="submit" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "Uploading..." : "Upload Document"}</Button></div></form></div> : null}
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
  const branchScope = usePhysicalBranchScope();
  const { listParams: branchParams, branchId } = branchScope;
  const [query, setQuery] = React.useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [formState, setFormState] = React.useState({
    open: false,
    vehicle: null,
  });
  const [deleteVehicle, setDeleteVehicle] = React.useState(null);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);

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
    (vehicleTypeFilter === "ALL" || vehicle.vehicle_type === vehicleTypeFilter) &&
    (statusFilter === "ALL" || vehicle.status === statusFilter) &&
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
    <div className="w-full space-y-5 pb-10">
      <FleetHero
        eyebrow="Fleet Registry"
        title="Vehicles"
        description="Add, edit, delete, and manage company vehicles from one section, including make, model, type, mileage, fuel, status, and service details."
        actions={
          <Button
            className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            onClick={() => setFormState({ open: true, vehicle: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Vehicles" value={vehicles.length} description="All registered vehicles" icon={CarFront} />
        <MetricCard label="Available" value={vehicles.filter((v) => v.status === "AVAILABLE").length} description="Ready for use" icon={CheckCircle2} tone="green" />
        <MetricCard label="In Service" value={vehicles.filter((v) => v.status === "IN_SERVICE").length} description="Under maintenance" icon={Wrench} tone="amber" />
        <MetricCard label="Out of Service" value={vehicles.filter((v) => v.status === "OUT_OF_SERVICE").length} description="Not available" icon={AlertCircle} tone="red" />
        <MetricCard label="Total Mileage" value={`${vehicles.reduce((sum,v)=>sum+Number(v.odometer_km||0),0).toLocaleString()} km`} description="Current combined odometers" icon={Gauge} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search vehicles" className="h-10 pl-9" placeholder="Search vehicle name, code, plate number..." value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle Type</label><select aria-label="Vehicle type" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={vehicleTypeFilter} onChange={(e)=>setVehicleTypeFilter(e.target.value)}><option value="ALL">All Types</option>{[...new Set(vehicles.map((v)=>v.vehicle_type).filter(Boolean))].sort().map((v)=><option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label><select aria-label="Vehicle status" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="ALL">All Statuses</option>{[...new Set(vehicles.map((v)=>v.status).filter(Boolean))].sort().map((v)=><option key={v} value={v}>{v.replace(/_/g," ")}</option>)}</select></div>
          <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><BranchSourceFilter scope={branchScope} /></div><Button variant="outline" type="button" onClick={()=>{setQuery("");setVehicleTypeFilter("ALL");setStatusFilter("ALL")}}>Reset</Button></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 p-5 dark:border-white/10">
          <div><h2 className="text-lg font-bold">Vehicle List</h2><p className="mt-1 text-xs text-muted-foreground">View and manage all company vehicles.</p></div>
          <Button className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300" onClick={()=>setFormState({open:true,vehicle:null})}><Plus className="mr-2 h-4 w-4"/>Add Vehicle</Button>
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
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left align-middle">Vehicle</th>
                  <th className="px-4 py-3 text-center align-middle">Code</th>
                  <th className="px-4 py-3 text-center align-middle">Branch</th>
                  <th className="px-4 py-3 text-center align-middle">Type</th>
                  <th className="px-4 py-3 text-center align-middle">Mileage</th>
                  <th className="px-4 py-3 text-center align-middle">Fuel Type</th>
                  <th className="px-4 py-3 text-center align-middle">Service Due</th>
                  <th className="px-4 py-3 text-center align-middle">Status</th>
                  <th className="px-4 py-3 text-center align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr
                    className="border-t border-slate-100 dark:border-white/10"
                    key={vehicle.id}
                  >
                    <td className="min-w-[240px] px-4 py-3 text-left align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {vehicle.vehicle_image_url || vehicle.vehicle_image ? (
                            <img
                              src={vehicle.vehicle_image_url || vehicle.vehicle_image}
                              alt={vehicle.display_name || `${vehicle.make || ""} ${vehicle.model || ""}`.trim()}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold" title={vehicle.display_name || `${vehicle.make || ""} ${vehicle.model || ""}`.trim()}>
                            {vehicle.display_name || `${vehicle.make || ""} ${vehicle.model || ""}`.trim()}
                          </div>
                          <div className="truncate text-xs text-muted-foreground" title={vehicle.registration_number || ""}>
                            {vehicle.registration_number || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-medium">
                      {vehicle.vehicle_code}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">{vehicle.branch_name || "—"}</td>
                    <td className="px-4 py-3 text-center align-middle">{vehicle.vehicle_type || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle">
                      {Number(vehicle.odometer_km || 0).toLocaleString()} km
                    </td>
                    <td className="px-4 py-3 text-center align-middle"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{vehicle.fuel_type || "—"}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle">
                      {vehicle.service_due_km
                        ? `${Number(vehicle.service_due_km).toLocaleString()} km`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="flex justify-center"><StatusBadge status={vehicle.status} /></div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="View vehicle"
                          onClick={() => setSelectedVehicle(vehicle)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {selectedVehicle ? (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onChanged={() => {
            refreshVehicles();
            setSelectedVehicle(null);
          }}
        />
      ) : null}

      <VehicleFormModal
        open={formState.open}
        vehicle={formState.vehicle}
        branchId={branchId}
        branchScope={branchScope}
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
