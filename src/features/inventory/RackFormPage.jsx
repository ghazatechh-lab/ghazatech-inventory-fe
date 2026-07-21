import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Rows3 } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
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

const branchId = (rack) => {
  const value = rack?.branch_id ?? rack?.branch?.id ?? rack?.branch ?? "";

  return value === null || value === undefined ? "" : String(value);
};

export default function RackFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      rack_code: "",
      rack_name: "",
      branch: "",
      is_active: true,
    },
  });

  const { data: branchResponse, isLoading: branchesLoading } = useQuery({
    queryKey: ["rack-branch-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const { data: rack, isLoading: rackLoading } = useQuery({
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
      branch: branchId(rack),
      is_active: typeof rack.is_active === "boolean" ? rack.is_active : true,
    });
  }, [rack, reset]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.patch(`/racks/${id}/`, payload);
      }

      return api.post("/racks/", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["racks"],
      });

      toast.success(
        isEdit ? "Rack updated successfully." : "Rack created successfully.",
      );

      navigate("/inventory/racks");
    },
    onError: (error) => {
      const responseData =
        error?.response?.data?.data || error?.response?.data || {};

      const codeError = responseData?.rack_code?.[0] || responseData?.rack_code;

      const branchError = responseData?.branch?.[0] || responseData?.branch;

      if (codeError) {
        setError("rack_code", {
          type: "server",
          message: String(codeError),
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
          isEdit ? "Unable to update rack." : "Unable to create rack.",
        );
      }
    },
  });

  const submit = async (values) => {
    await saveMutation.mutateAsync({
      rack_code: values.rack_code.trim(),
      rack_name: values.rack_name.trim() || "",
      branch: Number(values.branch),
      is_active: Boolean(values.is_active),
    });
  };

  const busy = branchesLoading || (isEdit && rackLoading);

  if (busy) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-950/70 p-8 text-sm text-slate-400">
        Loading rack form...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/50 shadow-xl shadow-black/20">
        <div className="px-6 py-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Rows3 className="h-5 w-5" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {isEdit ? "Edit rack" : "New rack"}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Define a branch-specific rack code and name.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(submit)}
        className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl shadow-black/10"
      >
        <div className="space-y-6 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label>
                Rack code
                <span className="ml-1 text-red-400">*</span>
              </Label>

              <Input
                {...register("rack_code", {
                  required: "Rack code is required.",
                })}
                placeholder="e.g. RACK-A01"
                className="mt-2 h-11 border-white/10 bg-slate-900/80"
              />

              {errors.rack_code && (
                <p className="mt-1.5 text-sm text-red-400">
                  {errors.rack_code.message}
                </p>
              )}
            </div>

            <div>
              <Label>Rack name</Label>

              <Input
                {...register("rack_name")}
                placeholder="e.g. Laptop Rack A"
                className="mt-2 h-11 border-white/10 bg-slate-900/80"
              />
            </div>
          </div>

          <div>
            <Label>
              Branch
              <span className="ml-1 text-red-400">*</span>
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
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-2 h-11 border-white/10 bg-slate-900/80">
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
              <p className="mt-1.5 text-sm text-red-400">
                {errors.branch.message}
              </p>
            )}
          </div>

          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">
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

        <div className="flex justify-end gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4">
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
            disabled={isSubmitting || saveMutation.isPending}
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
