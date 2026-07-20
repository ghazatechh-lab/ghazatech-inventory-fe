import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const generateSupplierCode = () => {
  const timestamp = Date.now().toString().slice(-6);

  const randomPart = Math.floor(100 + Math.random() * 900);

  return `SUP-${timestamp}-${randomPart}`;
};

export default function SupplierFormPage() {
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
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      supplier_code: "",
      supplier_name: "",
      contact_person: "",
      phone: "",
      email: "",
      trn_number: "",
      address: "",
      city: "",
      emirate: "",
      country: "UAE",
      payment_terms_days: 30,
      is_active: true,
    },
  });

  const { data: supplierData, isLoading: supplierLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}/`);

      return unwrap(response);
    },
    enabled: isEdit,
    staleTime: 0,
    refetchOnMount: "always",
  });

  React.useEffect(() => {
    if (!supplierData) {
      return;
    }

    reset({
      supplier_code: supplierData.supplier_code || "",
      supplier_name: supplierData.supplier_name || "",
      contact_person: supplierData.contact_person || "",
      phone: supplierData.phone || "",
      email: supplierData.email || "",
      trn_number: supplierData.trn_number || "",
      address: supplierData.address || "",
      city: supplierData.city || "",
      emirate: supplierData.emirate || "",
      country: supplierData.country || "UAE",
      payment_terms_days: supplierData.payment_terms_days ?? 30,
      is_active:
        typeof supplierData.is_active === "boolean"
          ? supplierData.is_active
          : true,
    });

    console.log("[Supplier Edit] Loaded supplier:", supplierData);
  }, [supplierData, reset]);

  const generateCode = () => {
    const code = generateSupplierCode();

    setValue("supplier_code", code, {
      shouldDirty: true,
      shouldValidate: true,
    });

    clearErrors("supplier_code");

    console.log("[Supplier Form] Generated supplier code:", code);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.patch(`/suppliers/${id}/`, payload);
      }

      return api.post("/suppliers/", payload);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["suppliers"],
      });

      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: ["supplier", id],
        });
      }

      toast.success(
        isEdit
          ? "Supplier updated successfully."
          : "Supplier created successfully.",
      );

      navigate("/suppliers");
    },

    onError: (error) => {
      const responseData = error?.response?.data;

      console.error("[Supplier Form] Save failed:", responseData || error);

      const supplierCodeError =
        responseData?.supplier_code?.[0] ||
        responseData?.data?.supplier_code?.[0];

      if (supplierCodeError) {
        setError("supplier_code", {
          type: "server",
          message: supplierCodeError,
        });
      }

      const supplierNameError =
        responseData?.supplier_name?.[0] ||
        responseData?.data?.supplier_name?.[0];

      if (supplierNameError) {
        setError("supplier_name", {
          type: "server",
          message: supplierNameError,
        });
      }

      if (!error?.__apiErrorShown) {
        toast.error(
          isEdit ? "Unable to update supplier." : "Unable to create supplier.",
        );
      }
    },
  });

  const submit = async (values) => {
    const supplierCode = values.supplier_code?.trim();

    if (!supplierCode) {
      setError("supplier_code", {
        type: "required",
        message: "Supplier code is required.",
      });

      toast.error("Enter or generate a supplier code.");

      return;
    }

    const payload = {
      supplier_code: supplierCode,
      supplier_name: values.supplier_name?.trim(),
      contact_person: values.contact_person?.trim() || "",
      phone: values.phone?.trim() || "",
      email: values.email?.trim() || "",
      trn_number: values.trn_number?.trim() || "",
      address: values.address?.trim() || "",
      city: values.city?.trim() || "",
      emirate: values.emirate?.trim() || "",
      country: values.country?.trim() || "UAE",
      payment_terms_days: Number.isFinite(values.payment_terms_days)
        ? values.payment_terms_days
        : 30,
      is_active: Boolean(values.is_active),
    };

    console.log("[Supplier Form] Submit payload:", payload);

    await saveMutation.mutateAsync(payload);
  };

  const onInvalid = (formErrors) => {
    console.error("[Supplier Form] Validation failed:", formErrors);

    toast.error("Please correct the highlighted fields.");
  };

  if (isEdit && supplierLoading) {
    return (
      <div className="max-w-3xl">
        <PageHeader
          title="Edit supplier"
          subtitle="Loading supplier details..."
        />

        <div className="card-surface p-6">
          <p className="text-sm text-muted-foreground">Loading supplier...</p>
        </div>
      </div>
    );
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? "Edit supplier" : "New supplier"}
        subtitle="Manage supplier contact, tax and payment details"
      />

      <form
        onSubmit={handleSubmit(submit, onInvalid)}
        className="card-surface space-y-5 p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="supplier_code">
              Supplier code
              <span className="ml-1 text-red-500">*</span>
            </Label>

            <div className="mt-1.5 flex gap-2">
              <Input
                id="supplier_code"
                placeholder="e.g. SUP-0001"
                {...register("supplier_code", {
                  required: "Supplier code is required.",
                })}
              />

              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                title="Generate supplier code"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>

            {errors.supplier_code && (
              <p className="mt-1 text-sm text-red-500">
                {errors.supplier_code.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="supplier_name">
              Supplier name
              <span className="ml-1 text-red-500">*</span>
            </Label>

            <Input
              id="supplier_name"
              {...register("supplier_name", {
                required: "Supplier name is required.",
              })}
              className="mt-1.5"
            />

            {errors.supplier_name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.supplier_name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="contact_person">Contact person</Label>

            <Input
              id="contact_person"
              {...register("contact_person")}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>

            <Input id="phone" {...register("phone")} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              {...register("email", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              })}
              className="mt-1.5"
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="trn_number">TRN</Label>

            <Input
              id="trn_number"
              {...register("trn_number")}
              className="mt-1.5"
            />
          </div>

          <div className="md:col-span-2">
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
            <Label htmlFor="payment_terms_days">Payment terms (days)</Label>

            <Input
              id="payment_terms_days"
              type="number"
              min="0"
              {...register("payment_terms_days", {
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: "Payment terms cannot be negative.",
                },
              })}
              className="mt-1.5 font-numeric"
            />

            {errors.payment_terms_days && (
              <p className="mt-1 text-sm text-red-500">
                {errors.payment_terms_days.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="is_active"
            checked={Boolean(watch("is_active"))}
            onCheckedChange={(checked) =>
              setValue("is_active", checked, {
                shouldDirty: true,
              })
            }
          />

          <Label htmlFor="is_active">Active supplier</Label>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create supplier"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => navigate("/suppliers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
