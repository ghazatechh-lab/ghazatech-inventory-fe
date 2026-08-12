import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  Contact,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const defaults = {
  customer_name: "",
  customer_type: "RETAIL",
  contact_person: "",
  phone: "",
  whatsapp_number: "",
  email: "",
  trn_number: "",
  trade_license: "",
  address: "",
  billing_address: "",
  city: "",
  emirate: "",
  country: "UAE",
  credit_limit: 0,
  payment_terms_days: 0,
  category: "RETAIL",
  notes: "",
  is_active: true,
};

function Section({ title, description, icon: Icon, children }) {
  return (
    <section className="card-surface p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({ label, error, required, children }) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>

      <div className="mt-2">{children}</div>

      {error ? (
        <p className="mt-1 text-xs text-red-500">{error.message}</p>
      ) : null}
    </div>
  );
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const isEdit = Boolean(id);
  const backTarget = isEdit ? `/customers/${id}` : "/customers";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm({ defaultValues: defaults });

  const customerQuery = useQuery({
    queryKey: ["customer", id, branchId],
    queryFn: async () =>
      unwrap(await api.get(`/customers/${id}/`, { params: branchParams })),
    enabled: isEdit,
    staleTime: 0,
    retry: false,
  });

  React.useEffect(() => {
    if (!customerQuery.data) return;

    reset({
      ...defaults,
      ...customerQuery.data,
      customer_type: customerQuery.data.customer_type || defaults.customer_type,
      category: customerQuery.data.category || defaults.category,
    });
  }, [customerQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (!branchId) {
        throw new Error("Select a branch before saving a customer.");
      }

      const payload = {
        ...values,
        branch: Number(branchId),
        credit_limit: Number(values.credit_limit || 0),
        payment_terms_days: Number(values.payment_terms_days || 0),
      };

      return isEdit
        ? api.patch(`/customers/${id}/`, payload, {
            params: branchParams,
            skipGlobalErrorToast: true,
          })
        : api.post("/customers/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);
      const customerId = saved?.id || id;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["customers-summary"] }),
        queryClient.invalidateQueries({
          queryKey: ["customer", customerId],
        }),
      ]);

      toast.success(isEdit ? "Customer updated." : "Customer created.");

      navigate(customerId ? `/customers/${customerId}` : "/customers");
    },

    onError: (error) => {
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

      toast.error(details.title || "Unable to save customer", {
        description:
          details.summary ||
          details.message ||
          "Please check the entered details.",
      });
    },
  });

  if (isEdit && customerQuery.isLoading) {
    return (
      <div className="card-surface p-10 text-center text-muted-foreground">
        Loading customer...
      </div>
    );
  }

  return (
    <div className="customer-module-page customer-workspace mx-auto max-w-6xl space-y-5 pb-10">
      <PageHeader
        title={isEdit ? "Edit Customer" : "New Customer"}
        subtitle="Create and maintain the complete customer master record."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backTarget)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEdit ? "Back to Customer" : "Back to Customers"}
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        className="space-y-5"
        noValidate
      >
        <Section
          title="Customer identity"
          description="Primary identity and classification used in sales documents."
          icon={Building2}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Customer name"
                required
                error={errors.customer_name}
              >
                <Input
                  {...register("customer_name", {
                    required: "Customer name is required.",
                  })}
                  placeholder="Customer or company name"
                />
              </Field>
            </div>

            <Field label="Customer type">
              <Controller
                name="customer_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAIL">Retail</SelectItem>
                      <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                      <SelectItem value="BUSINESS">Business</SelectItem>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Category">
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAIL">Retail</SelectItem>
                      <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                      <SelectItem value="LEAD">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="TRN / Tax number">
              <Input {...register("trn_number")} />
            </Field>

            <Field label="Trade licence">
              <Input {...register("trade_license")} />
            </Field>
          </div>
        </Section>

        <Section
          title="Contact information"
          description="Primary contact person and communication channels."
          icon={Contact}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact person">
              <Input {...register("contact_person")} />
            </Field>

            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                {...register("email", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address.",
                  },
                })}
              />
            </Field>

            <Field label="Phone">
              <Input {...register("phone")} />
            </Field>

            <Field label="WhatsApp">
              <Input {...register("whatsapp_number")} />
            </Field>
          </div>
        </Section>

        <Section
          title="Address"
          description="Billing and location information."
          icon={MapPin}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Address">
                <Textarea rows={3} {...register("address")} />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Billing address">
                <Textarea rows={3} {...register("billing_address")} />
              </Field>
            </div>

            <Field label="City">
              <Input {...register("city")} />
            </Field>

            <Field label="Emirate">
              <Input {...register("emirate")} />
            </Field>

            <Field label="Country">
              <Input {...register("country")} />
            </Field>
          </div>
        </Section>

        <Section
          title="Commercial terms"
          description="Credit exposure and payment settings."
          icon={BadgeDollarSign}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Credit limit" error={errors.credit_limit}>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...register("credit_limit", {
                  min: {
                    value: 0,
                    message: "Credit limit cannot be negative.",
                  },
                })}
              />
            </Field>

            <Field
              label="Payment terms (days)"
              error={errors.payment_terms_days}
            >
              <Input
                type="number"
                min="0"
                max="365"
                {...register("payment_terms_days", {
                  min: {
                    value: 0,
                    message: "Payment terms cannot be negative.",
                  },
                  max: {
                    value: 365,
                    message: "Payment terms cannot exceed 365 days.",
                  },
                })}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Status and notes"
          description="Operational status and internal remarks."
          icon={ShieldCheck}
        >
          <div className="space-y-5">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Active customer</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Inactive customers cannot be selected in new sales
                      documents.
                    </p>
                  </div>

                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <Field label="Notes">
              <Textarea
                rows={4}
                {...register("notes")}
                placeholder="Internal customer notes"
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={saveMutation.isPending}
            onClick={() => navigate(backTarget)}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="min-w-40 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
