import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const NO_MANAGER_VALUE = "__none__";

export default function BranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEdit = Boolean(id);

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ["branch", id],

    queryFn: async () =>
      isEdit ? unwrap(await api.get(`/branches/${id}/`)) : null,

    enabled: isEdit,
  });

  const { data: managerOptions = [], isLoading: managersLoading } = useQuery({
    queryKey: ["branch-manager-options"],

    queryFn: async () => {
      const response = await api.get("/branches/manager-options/");

      const result = unwrap(response);

      return Array.isArray(result) ? result : result?.results || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      branch_code: "",
      branch_name: "",
      branch_type: "retail",
      manager: null,
      address: "",
      city: "",
      emirate: "",
      country: "UAE",
      phone: "",
      email: "",
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (!branchData || managersLoading) {
      return;
    }

    const existingManagerId =
      branchData.manager?.id ??
      branchData.manager ??
      branchData.manager_detail?.id ??
      null;

    reset({
      branch_code: branchData.branch_code || "",

      branch_name: branchData.branch_name || "",

      branch_type: branchData.branch_type || "retail",

      manager:
        existingManagerId === null ||
        existingManagerId === undefined ||
        existingManagerId === ""
          ? null
          : Number(existingManagerId),

      address: branchData.address || "",

      city: branchData.city || "",

      emirate: branchData.emirate || "",

      country: branchData.country || "UAE",

      phone: branchData.phone || "",

      email: branchData.email || "",

      is_active: branchData.is_active !== false,
    });
  }, [branchData, managersLoading, reset]);

  const submit = async (values) => {
    clearErrors();

    const normalizedManager =
      values.manager === null ||
      values.manager === undefined ||
      values.manager === "" ||
      values.manager === 0 ||
      values.manager === "0" ||
      values.manager === NO_MANAGER_VALUE
        ? null
        : Number(values.manager);

    const payload = {
      branch_code: values.branch_code?.trim().toUpperCase(),

      branch_name: values.branch_name?.trim(),

      branch_type: values.branch_type,

      manager: normalizedManager,

      address: values.address?.trim() || "",

      city: values.city?.trim() || "",

      emirate: values.emirate?.trim() || "",

      country: values.country?.trim() || "UAE",

      phone: values.phone?.trim() || "",

      email: values.email?.trim() || "",

      is_active: Boolean(values.is_active),
    };

    try {
      const requestConfig = {
        skipGlobalErrorToast: true,
      };

      if (isEdit) {
        await api.patch(`/branches/${id}/`, payload, requestConfig);
      } else {
        await api.post("/branches/", payload, requestConfig);
      }

      /*
       * Refresh every query used by:
       * - Branch list page
       * - Top bar branch selector
       * - Branch dropdowns in forms
       */
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["branches"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["branches-select"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["branch-options"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["header-branches"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["rack-branch-options"],
        }),
      ]);

      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["branches-select"],
          type: "active",
        }),

        queryClient.refetchQueries({
          queryKey: ["branches"],
          type: "active",
        }),
      ]);

      toast.success(`Branch ${isEdit ? "updated" : "created"} successfully`);

      navigate("/branches");
    } catch (error) {
      const details = getApiErrorDetails(error);

      (details.errors || []).forEach(({ field, message }) => {
        const rootField = field?.split(/[.[]/)[0];

        if (rootField) {
          setError(rootField, {
            type: "server",
            message,
          });
        }
      });

      toast.error(details.title || "Unable to save branch", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    }
  };

  const selectedManager = watch("manager");

  const saving = isSubmitting || branchLoading;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? "Edit branch" : "New branch"}
        subtitle="Manage branch details"
      />

      <form
        onSubmit={handleSubmit(submit)}
        className="card-surface space-y-5 p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Branch code</Label>

            <Input
              {...register("branch_code", {
                required: "Branch code is required",
              })}
              className="mt-1.5 uppercase"
              data-testid="branch-code-input"
            />

            {errors.branch_code && (
              <p className="mt-1 text-sm text-red-600">
                {errors.branch_code.message}
              </p>
            )}
          </div>

          <div>
            <Label>Branch name</Label>

            <Input
              {...register("branch_name", {
                required: "Branch name is required",
              })}
              className="mt-1.5"
              data-testid="branch-name-input"
            />

            {errors.branch_name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.branch_name.message}
              </p>
            )}
          </div>

          <div>
            <Label>Branch type</Label>

            <Select
              value={watch("branch_type") || "retail"}
              onValueChange={(value) =>
                setValue("branch_type", value, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select branch type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>

                <SelectItem value="warehouse">Warehouse</SelectItem>

                <SelectItem value="office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Manager</Label>

            <Select
              value={
                selectedManager === null ||
                selectedManager === undefined ||
                selectedManager === ""
                  ? NO_MANAGER_VALUE
                  : String(selectedManager)
              }
              onValueChange={(value) =>
                setValue(
                  "manager",
                  value === NO_MANAGER_VALUE ? null : Number(value),
                  {
                    shouldDirty: true,
                  },
                )
              }
              disabled={managersLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue
                  placeholder={
                    managersLoading ? "Loading managers..." : "Select manager"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={NO_MANAGER_VALUE}>No manager</SelectItem>

                {managerOptions.map((manager) => (
                  <SelectItem key={manager.id} value={String(manager.id)}>
                    {manager.display_name}

                    {manager.role_name ? ` — ${manager.role_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.manager && (
              <p className="mt-1 text-sm text-red-600">
                {errors.manager.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Address</Label>

            <Input {...register("address")} className="mt-1.5" />
          </div>

          <div>
            <Label>City</Label>

            <Input {...register("city")} className="mt-1.5" />
          </div>

          <div>
            <Label>Emirate</Label>

            <Input {...register("emirate")} className="mt-1.5" />
          </div>

          <div>
            <Label>Country</Label>

            <Input {...register("country")} className="mt-1.5" />
          </div>

          <div>
            <Label>Phone</Label>

            <Input {...register("phone")} className="mt-1.5" />
          </div>

          <div className="sm:col-span-2">
            <Label>Email</Label>

            <Input type="email" {...register("email")} className="mt-1.5" />

            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(watch("is_active"))}
            onCheckedChange={(value) =>
              setValue("is_active", value, {
                shouldDirty: true,
              })
            }
          />

          <Label>Active</Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="branch-save-btn"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create branch"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => navigate("/branches")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
