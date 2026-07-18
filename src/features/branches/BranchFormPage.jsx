import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
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
  const isEdit = Boolean(id);

  const { data: branchData } = useQuery({
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
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      branch_type: "retail",
      country: "UAE",
      manager: null,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (!branchData) return;

    reset({
      ...branchData,
      manager: branchData.manager ?? null,
    });
  }, [branchData, reset]);

  const submit = async (values) => {
    const payload = {
      ...values,
      manager:
        values.manager === "" ||
        values.manager === undefined ||
        values.manager === NO_MANAGER_VALUE
          ? null
          : Number(values.manager),
    };

    try {
      if (isEdit) {
        await api.put(`/branches/${id}/`, payload);
      } else {
        await api.post("/branches/", payload);
      }

      toast.success(`Branch ${isEdit ? "updated" : "created"}`);
      navigate("/branches");
    } catch (error) {
      // The Axios interceptor already displays the API error.
    }
  };

  const selectedManager = watch("manager");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? "Edit branch" : "New branch"}
        subtitle="Manage branch details"
      />

      <form
        onSubmit={handleSubmit(submit)}
        className="card-surface p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Branch code</Label>
            <Input
              {...register("branch_code", {
                required: "Branch code is required",
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
                setValue("branch_type", value, { shouldDirty: true })
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
                  { shouldDirty: true },
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(watch("is_active"))}
            onCheckedChange={(value) =>
              setValue("is_active", value, { shouldDirty: true })
            }
          />
          <Label>Active</Label>
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
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
