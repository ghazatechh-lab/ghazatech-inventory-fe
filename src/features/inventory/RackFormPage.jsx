import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Hash,
  Info,
  Layers3,
  Loader2,
  MapPin,
  Save,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const getBranchId = (rack) => {
  const value = rack?.branch_id ?? rack?.branch?.id ?? rack?.branch ?? "";
  return value === null || value === undefined ? "" : String(value);
};

const getApiErrors = (error) =>
  error?.response?.data?.data || error?.response?.data || {};

function FieldMessage({ error, children }) {
  if (error) {
    return (
      <p className="mt-2 text-xs font-semibold text-red-500">{error.message}</p>
    );
  }

  return children ? (
    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
      {children}
    </p>
  ) : null;
}

export default function RackFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isEdit = Boolean(id);
  const canManage = isAdmin(user);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      rack_code: "",
      rack_name: "",
      branch: "",
      is_active: true,
    },
  });

  const watchedCode = watch("rack_code");
  const watchedName = watch("rack_name");
  const watchedActive = watch("is_active");

  const {
    data: branchResponse,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useQuery({
    queryKey: ["rack-branch-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500, ordering: "branch_code" },
        }),
      ),
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const {
    data: rack,
    isLoading: rackLoading,
    isError: rackError,
  } = useQuery({
    queryKey: ["rack", id],
    queryFn: async () => unwrap(await api.get(`/racks/${id}/`)),
    enabled: isEdit,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!rack) return;

    reset({
      rack_code: rack.rack_code || "",
      rack_name: rack.rack_name || "",
      branch: getBranchId(rack),
      is_active: typeof rack.is_active === "boolean" ? rack.is_active : true,
    });
  }, [rack, reset]);

  React.useEffect(() => {
    if (isEdit && !canManage) {
      toast.error("Only Admin can edit racks.");
      navigate("/inventory/racks", { replace: true });
    }
  }, [isEdit, canManage, navigate]);

  const saveMutation = useMutation({
    mutationFn: async (payload) =>
      isEdit
        ? api.patch(`/racks/${id}/`, payload)
        : api.post("/racks/", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["racks"] }),
        queryClient.invalidateQueries({ queryKey: ["rack-options"] }),
      ]);

      toast.success(
        isEdit ? "Rack updated successfully." : "Rack created successfully.",
      );
      navigate("/inventory/racks");
    },
    onError: (error) => {
      const responseData = getApiErrors(error);
      const codeError = responseData?.rack_code?.[0] || responseData?.rack_code;
      const nameError = responseData?.rack_name?.[0] || responseData?.rack_name;
      const branchError = responseData?.branch?.[0] || responseData?.branch;
      const detailError = responseData?.detail || responseData?.message;

      if (codeError)
        setError("rack_code", { type: "server", message: String(codeError) });
      if (nameError)
        setError("rack_name", { type: "server", message: String(nameError) });
      if (branchError)
        setError("branch", { type: "server", message: String(branchError) });

      if (!error?.__apiErrorShown) {
        toast.error(
          detailError ||
            (isEdit ? "Unable to update rack." : "Unable to create rack."),
        );
      }
    },
  });

  const submit = async (values) => {
    clearErrors();

    const rackCode = values.rack_code?.trim().toUpperCase();
    const rackName = values.rack_name?.trim() || "";
    const selectedBranch = Number(values.branch);

    if (!rackCode) {
      setError("rack_code", {
        type: "manual",
        message: "Rack code is required.",
      });
      return;
    }

    if (!values.branch || Number.isNaN(selectedBranch)) {
      setError("branch", { type: "manual", message: "Branch is required." });
      return;
    }

    await saveMutation.mutateAsync({
      rack_code: rackCode,
      rack_name: rackName,
      branch: selectedBranch,
      is_active: Boolean(values.is_active),
    });
  };

  const busy = branchesLoading || (isEdit && rackLoading);

  if (busy) {
    return (
      <div className="mx-auto flex min-h-[360px] max-w-4xl items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Loading rack form...
          </p>
        </div>
      </div>
    );
  }

  if (branchesError || (isEdit && rackError)) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        Unable to load rack form data.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-6 py-7 shadow-sm dark:border-white/10 dark:bg-slate-950/80 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                Inventory setup
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {isEdit ? "Edit Rack" : "Create New Rack"}
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Define a clear branch-specific storage location for inventory
                items.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => navigate("/inventory/racks")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to racks
          </Button>
        </div>
      </section>

      <form
        onSubmit={handleSubmit(submit)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">
                  Rack details
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Enter the rack identity and assigned branch.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Rack code <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    {...register("rack_code", {
                      required: "Rack code is required.",
                      onChange: () => clearErrors("rack_code"),
                    })}
                    placeholder="e.g. RACK-A01"
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 font-bold uppercase tracking-wide dark:border-white/10 dark:bg-slate-900/80"
                  />
                </div>
                <FieldMessage error={errors.rack_code}>
                  Use a short, unique code that staff can identify quickly.
                </FieldMessage>
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Rack name
                </Label>
                <div className="relative mt-2">
                  <Layers3 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    {...register("rack_name", {
                      onChange: () => clearErrors("rack_name"),
                    })}
                    placeholder="e.g. Laptop Rack A"
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 dark:border-white/10 dark:bg-slate-900/80"
                  />
                </div>
                <FieldMessage error={errors.rack_name}>
                  Add a descriptive name for warehouse and sales staff.
                </FieldMessage>
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Branch <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="branch"
                control={control}
                rules={{ required: "Branch is required." }}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      clearErrors("branch");
                    }}
                  >
                    <SelectTrigger className="mt-2 h-12 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/80">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <SelectValue placeholder="Select branch" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.branch_code || branch.branch_name}
                          {branch.branch_name && branch.branch_code
                            ? ` - ${branch.branch_name}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldMessage error={errors.branch}>
                Each rack belongs to one branch and appears only in that branch
                inventory.
              </FieldMessage>

              {!branches.length && (
                <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <Info className="h-4 w-4 shrink-0" />
                  No branches are available. Create a branch before adding
                  racks.
                </div>
              )}
            </div>

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Active rack
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Active racks can be selected when assigning product
                        locations.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || saveMutation.isPending}
              onClick={() => navigate("/inventory/racks")}
              className="h-11 rounded-xl px-5 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || saveMutation.isPending || !branches.length
              }
              className="h-11 min-w-36 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? "Save changes" : "Create rack"}
                </>
              )}
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Live preview
            </p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-950 dark:text-white">
                    {watchedCode?.trim().toUpperCase() || "RACK-CODE"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {watchedName?.trim() || "Rack display name"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-3 dark:border-blue-500/20">
                <span className="text-xs font-semibold text-slate-500">
                  Status
                </span>
                <span
                  className={
                    watchedActive
                      ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:bg-slate-500/15 dark:text-slate-300"
                  }
                >
                  {watchedActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                Naming standard
              </h3>
            </div>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <li>• Keep rack codes short and unique.</li>
              <li>• Use a consistent pattern such as RACK-A01.</li>
              <li>• Include aisle or zone information when useful.</li>
              <li>• Disable racks that are temporarily unavailable.</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
