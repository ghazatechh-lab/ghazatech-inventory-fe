import React from "react";
import { Loader2, DatabaseZap, CheckCircle2 } from "lucide-react";
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
      tax_mode: "",
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
      tax_mode: branchData.tax_mode || "",

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

  const [provisioning, setProvisioning] = React.useState(false);

  const submit = async (values) => {
    if (provisioning) return;
    clearErrors();

    if (!isEdit && !["VAT", "NON_VAT"].includes(values.tax_mode)) {
      setError("tax_mode", { type: "required", message: "Select VAT or Non-VAT to provision the branch database." });
      return;
    }

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
      tax_mode: values.tax_mode,

      manager: normalizedManager,

      address: values.address?.trim() || "",

      city: values.city?.trim() || "",

      emirate: values.emirate?.trim() || "",

      country: values.country?.trim() || "UAE",

      phone: values.phone?.trim() || "",

      email: values.email?.trim() || "",

      is_active: Boolean(values.is_active),
    };

    setProvisioning(true);
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

      toast.success(isEdit ? "Branch updated successfully" : "Branch created and provisioning requested successfully");

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
    } finally {
      setProvisioning(false);
    }
  };

  const selectedManager = watch("manager");

  const saving = isSubmitting || provisioning || branchLoading;

  return (
    <div className="branch-module-page branch-workspace w-full space-y-5 pb-10" aria-busy={provisioning}>
      {provisioning && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="branch-provisioning-title"
          aria-describedby="branch-provisioning-description"
          data-testid="branch-provisioning-loader"
          onKeyDown={(event) => { if (event.key === "Escape") event.preventDefault(); }}
        >
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-7 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-400/10">
              <DatabaseZap className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <Loader2 className="mx-auto mt-5 h-8 w-8 animate-spin text-amber-500" aria-hidden="true" />
            <h2 id="branch-provisioning-title" className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              {isEdit ? "Saving branch changes" : "Creating your branch"}
            </h2>
            <p id="branch-provisioning-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {isEdit
                ? "Updating branch details. Please keep this page open until the request finishes."
                : "Preparing the branch and requesting its isolated database schema. Please keep this page open until the server responds."}
            </p>
            {!isEdit && (
              <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800/70">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span>Tax type: {watch("tax_mode") === "VAT" ? "VAT" : "Non-VAT"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" aria-hidden="true" />
                  <span>Waiting for branch provisioning response…</span>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Avoid refreshing or submitting the form again during this operation.
            </p>
          </div>
        </div>
      )}
      <PageHeader
        variant="hero"
        eyebrow="Branch Management"
        title={isEdit ? "Edit Branch" : "New Branch"}
        subtitle={
          isEdit
            ? "Update branch identity, location, manager, contact details, and status."
            : "Create a VAT or Non-VAT physical branch with its own database schema."
        }
      />

      <form
        onSubmit={handleSubmit(submit)}
        className="card-surface w-full space-y-6 rounded-[22px] p-6 sm:p-7"
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
            <Label htmlFor="branch-tax-mode">Tax classification <span className="text-red-600">*</span></Label>
            <Select
              value={watch("tax_mode") || undefined}
              onValueChange={(value) => {
                setValue("tax_mode", value, { shouldDirty: true, shouldValidate: true });
                clearErrors("tax_mode");
              }}
              disabled={isEdit || saving}
            >
              <SelectTrigger id="branch-tax-mode" className="mt-1.5" data-testid="branch-tax-mode-select" aria-invalid={Boolean(errors.tax_mode)}>
                <SelectValue placeholder="Select VAT or Non-VAT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VAT">VAT — VAT database</SelectItem>
                <SelectItem value="NON_VAT">Non-VAT — Non-VAT database</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? "Tax classification is locked after provisioning."
                : "The system automatically creates an isolated branch schema in the selected database."}
            </p>
            {errors.tax_mode && <p className="mt-1 text-sm text-red-600">{errors.tax_mode.message}</p>}
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

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
          <Button
            type="submit"
            disabled={saving}
            className="min-w-40 bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            data-testid="branch-save-btn"
          >
            {saving ? <><Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" aria-hidden="true" />{isEdit ? "Saving..." : "Creating branch..."}</> : isEdit ? "Save changes" : "Create branch"}
          </Button>

          <Button
            type="button"
            variant="outline"
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
