import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Rows3 } from "lucide-react";
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
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

const getBranchId = (rack) => {
  const value = rack?.branch_id ?? rack?.branch?.id ?? rack?.branch ?? "";

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const getApiErrors = (error) =>
  error?.response?.data?.data || error?.response?.data || {};

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
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      rack_code: "",
      rack_name: "",
      branch: "",
      is_active: true,
    },
  });

  const {
    data: branchResponse,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useQuery({
    queryKey: ["rack-branch-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: {
            page_size: 500,
            ordering: "branch_code",
          },
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
    if (!rack) {
      return;
    }

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

      navigate("/inventory/racks", {
        replace: true,
      });
    }
  }, [isEdit, canManage, navigate]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.patch(`/racks/${id}/`, payload);
      }

      return api.post("/racks/", payload);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["racks"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["rack-options"],
        }),
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

      if (codeError) {
        setError("rack_code", {
          type: "server",
          message: String(codeError),
        });
      }

      if (nameError) {
        setError("rack_name", {
          type: "server",
          message: String(nameError),
        });
      }

      if (branchError) {
        setError("branch", {
          type: "server",
          message: String(branchError),
        });
      }

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
      setError("branch", {
        type: "manual",
        message: "Branch is required.",
      });

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
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400 dark:shadow-none">
        Loading rack form...
      </div>
    );
  }

  if (branchesError || (isEdit && rackError)) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        Unable to load rack form data.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/50 dark:shadow-xl dark:shadow-black/20">
        <div className="px-6 py-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Rows3 className="h-5 w-5" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {isEdit ? "Edit rack" : "New rack"}
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define a branch-specific rack code and name.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(submit)}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:shadow-xl dark:shadow-black/10"
      >
        <div className="space-y-6 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label>
                Rack code
                <span className="ml-1 text-red-500">*</span>
              </Label>

              <Input
                {...register("rack_code", {
                  required: "Rack code is required.",
                  onChange: () => clearErrors("rack_code"),
                })}
                placeholder="e.g. RACK-A01"
                className="mt-2 h-11 border-slate-200 bg-white uppercase dark:border-white/10 dark:bg-slate-900/80"
              />

              {errors.rack_code && (
                <p className="mt-1.5 text-sm text-red-500">
                  {errors.rack_code.message}
                </p>
              )}
            </div>

            <div>
              <Label>Rack name</Label>

              <Input
                {...register("rack_name", {
                  onChange: () => clearErrors("rack_name"),
                })}
                placeholder="e.g. Laptop Rack A"
                className="mt-2 h-11 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/80"
              />

              {errors.rack_name && (
                <p className="mt-1.5 text-sm text-red-500">
                  {errors.rack_name.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>
              Branch
              <span className="ml-1 text-red-500">*</span>
            </Label>

            <Controller
              name="branch"
              control={control}
              rules={{
                required: "Branch is required.",
              }}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => {
                    field.onChange(value);

                    clearErrors("branch");
                  }}
                >
                  <SelectTrigger className="mt-2 h-11 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/80">
                    <SelectValue placeholder="Select branch" />
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

            {errors.branch && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.branch.message}
              </p>
            )}

            {!branches.length && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                No branches are available. Create a branch first.
              </p>
            )}
          </div>

          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                    Active rack
                  </p>

                  <p className="text-xs text-slate-500">
                    Allow products to be assigned to this rack.
                  </p>
                </div>

                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.02]">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting || saveMutation.isPending}
            onClick={() => navigate("/inventory/racks")}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              isSubmitting || saveMutation.isPending || !branches.length
            }
            className="min-w-32 bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create rack"}
          </Button>
        </div>
      </form>
    </div>
  );
}
