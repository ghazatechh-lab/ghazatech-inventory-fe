import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
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

const NO_MANAGER_VALUE = "__none__";

const getManagerId = (branch) => {
  if (!branch) {
    return null;
  }

  const managerId =
    branch.manager_detail?.id ??
    branch.manager?.id ??
    branch.manager_id ??
    branch.manager ??
    null;

  if (
    managerId === null ||
    managerId === undefined ||
    managerId === "" ||
    managerId === 0 ||
    managerId === "0"
  ) {
    return null;
  }

  return String(managerId);
};

const getManagerName = (manager) => {
  if (!manager) {
    return "Unnamed manager";
  }

  return (
    manager.display_name ||
    manager.full_name ||
    manager.name ||
    [manager.first_name, manager.last_name].filter(Boolean).join(" ") ||
    manager.email ||
    manager.username ||
    `Manager #${manager.id}`
  );
};

export default function BranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ["branch", id],
    queryFn: async () => {
      const response = await api.get(`/branches/${id}/`);

      return unwrap(response);
    },
    enabled: isEdit,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const {
    data: managerOptions = [],
    isLoading: managersLoading,
    refetch: refetchManagers,
  } = useQuery({
    queryKey: ["branch-manager-options"],
    queryFn: async () => {
      const response = await api.get("/branches/manager-options/");

      const result = unwrap(response);

      return Array.isArray(result) ? result : result?.results || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const availableManagers = React.useMemo(() => {
    const options = Array.isArray(managerOptions) ? [...managerOptions] : [];

    const existingManager =
      branchData?.manager_detail ||
      (branchData?.manager && typeof branchData.manager === "object"
        ? branchData.manager
        : null);

    if (existingManager?.id !== null && existingManager?.id !== undefined) {
      const alreadyIncluded = options.some(
        (manager) => String(manager.id) === String(existingManager.id),
      );

      if (!alreadyIncluded) {
        options.unshift(existingManager);
      }
    }

    return options;
  }, [managerOptions, branchData]);

  React.useEffect(() => {
    if (!isEdit || !branchData || branchLoading || managersLoading) {
      return;
    }

    const existingManagerId = getManagerId(branchData);

    reset({
      branch_code: branchData.branch_code || "",
      branch_name: branchData.branch_name || "",
      branch_type: branchData.branch_type || "retail",
      manager: existingManagerId,
      address: branchData.address || "",
      city: branchData.city || "",
      emirate: branchData.emirate || "",
      country: branchData.country || "UAE",
      phone: branchData.phone || "",
      email: branchData.email || "",
      is_active:
        typeof branchData.is_active === "boolean" ? branchData.is_active : true,
    });
  }, [
    isEdit,
    branchData,
    branchLoading,
    managersLoading,
    availableManagers,
    reset,
  ]);

  const submit = async (values) => {
    const managerValue = values.manager;

    const payload = {
      branch_code: values.branch_code?.trim(),
      branch_name: values.branch_name?.trim(),
      branch_type: values.branch_type,
      manager:
        !managerValue || managerValue === NO_MANAGER_VALUE
          ? null
          : Number(managerValue),
      address: values.address?.trim() || "",
      city: values.city?.trim() || "",
      emirate: values.emirate?.trim() || "",
      country: values.country?.trim() || "UAE",
      phone: values.phone?.trim() || "",
      email: values.email?.trim() || "",
      is_active: Boolean(values.is_active),
    };

    try {
      if (isEdit) {
        await api.patch(`/branches/${id}/`, payload);
      } else {
        await api.post("/branches/", payload);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["branches"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["branch-manager-options"],
        }),
        isEdit
          ? queryClient.invalidateQueries({
              queryKey: ["branch", id],
            })
          : Promise.resolve(),
      ]);

      await refetchManagers();

      toast.success(
        isEdit
          ? "Branch updated successfully."
          : "Branch created successfully.",
      );

      navigate("/branches");
    } catch (error) {
      /*
       * api.js already displays the exact
       * backend validation message.
       */
      if (!error?.__apiErrorShown) {
        toast.error(
          isEdit ? "Unable to update branch." : "Unable to create branch.",
        );
      }
    }
  };

  const selectedManager = watch("manager");

  const selectedManagerValue =
    selectedManager === null ||
    selectedManager === undefined ||
    selectedManager === "" ||
    selectedManager === 0 ||
    selectedManager === "0"
      ? NO_MANAGER_VALUE
      : String(selectedManager);

  if (isEdit && branchLoading) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Edit branch" subtitle="Loading branch details..." />

        <div className="card-surface p-6">
          <p className="text-sm text-muted-foreground">Loading branch...</p>
        </div>
      </div>
    );
  }

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
            <Label htmlFor="branch_code">Branch code</Label>

            <Input
              id="branch_code"
              {...register("branch_code", {
                required: "Branch code is required.",
              })}
              className="mt-1.5"
              data-testid="branch-code-input"
            />

            {errors.branch_code && (
              <p className="mt-1 text-sm text-red-600">
                {errors.branch_code.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="branch_name">Branch name</Label>

            <Input
              id="branch_name"
              {...register("branch_name", {
                required: "Branch name is required.",
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
                  shouldValidate: true,
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
            <Label>Branch manager</Label>

            <Select
              value={selectedManagerValue}
              onValueChange={(value) =>
                setValue("manager", value === NO_MANAGER_VALUE ? null : value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={managersLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue
                  placeholder={
                    managersLoading
                      ? "Loading managers..."
                      : "Select branch manager"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={NO_MANAGER_VALUE}>No manager</SelectItem>

                {availableManagers.map((manager) => (
                  <SelectItem key={manager.id} value={String(manager.id)}>
                    {getManagerName(manager)}

                    {manager.role_name ? ` — ${manager.role_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!managersLoading && availableManagers.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No branch managers are available.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>

            <Input id="address" {...register("address")} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="city">City</Label>

            <Input id="city" {...register("city")} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="emirate">Emirate</Label>

            <Input id="emirate" {...register("emirate")} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="country">Country</Label>

            <Input id="country" {...register("country")} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>

            <Input id="phone" {...register("phone")} className="mt-1.5" />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={Boolean(watch("is_active"))}
            onCheckedChange={(value) =>
              setValue("is_active", value, {
                shouldDirty: true,
              })
            }
          />

          <Label htmlFor="is_active">Active</Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="branch-save-btn"
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create branch"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/branches")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
