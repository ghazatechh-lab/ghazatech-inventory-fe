import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
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

const defaults = {
  supplier_code: "",
  supplier_name: "",
  trade_name: "",
  supplier_type: "Local Supplier",
  supplier_category: "ELECTRONICS",
  contact_person: "",
  designation: "",
  phone: "",
  email: "",
  billing_address: "",
  city: "",
  country: "UAE",
  trn_number: "",
  credit_limit: 0,
  payment_terms_days: 15,
  currency: "AED",
  opening_balance: 0,
  bank_name: "",
  account_holder_name: "",
  iban: "",
  swift_code: "",
  auto_block_credit_limit: true,
  send_payment_reminders: false,
  notes: "",
  is_active: true,
};
const Section = ({ title, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/50">
    <h2 className="mb-4 font-semibold">{title}</h2>
    {children}
  </section>
);
const Field = ({ label, error, children, required }) => (
  <div>
    <Label>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </Label>
    <div className="mt-2">{children}</div>
    {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
  </div>
);

export default function SupplierFormPage() {
  const { id } = useParams(),
    edit = Boolean(id),
    nav = useNavigate(),
    qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({ defaultValues: defaults });
  const { data, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => unwrap(await api.get(`/suppliers/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });
  React.useEffect(() => {
    if (data) reset({ ...defaults, ...data });
  }, [data, reset]);
  const save = useMutation({
    mutationFn: (v) =>
      edit ? api.patch(`/suppliers/${id}/`, v) : api.post("/suppliers/", v),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(edit ? "Supplier updated." : "Supplier created.");
      nav("/suppliers");
    },
  });
  const submit = (v) =>
    save.mutate({
      ...v,
      credit_limit: Number(v.credit_limit || 0),
      opening_balance: Number(v.opening_balance || 0),
      payment_terms_days: Number(v.payment_terms_days || 0),
    });
  if (edit && isLoading)
    return <div className="card-surface p-6">Loading supplier...</div>;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={edit ? "Edit Supplier" : "Add Supplier"}
        subtitle="Company identity, contacts, commercial terms, bank details and preferences"
      />
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <Section title="Company identity">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Supplier code" required error={errors.supplier_code}>
              <div className="flex gap-2">
                <Input
                  {...register("supplier_code", {
                    required: "Supplier code is required.",
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue(
                      "supplier_code",
                      `SUP-${Date.now().toString().slice(-6)}`,
                    )
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </Field>
            <Field label="Legal name" required error={errors.supplier_name}>
              <Input
                {...register("supplier_name", {
                  required: "Legal name is required.",
                })}
              />
            </Field>
            <Field label="Trade name">
              <Input {...register("trade_name")} />
            </Field>
            <Field label="TRN / Tax ID">
              <Input {...register("trn_number")} />
            </Field>
            <Field label="Supplier category">
              <Controller
                name="supplier_category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ELECTRONICS">
                        Electronics & Components
                      </SelectItem>
                      <SelectItem value="LAPTOPS">Laptops</SelectItem>
                      <SelectItem value="SPARE_PARTS">Spare Parts</SelectItem>
                      <SelectItem value="SERVICES">Services</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Supplier type">
              <Input {...register("supplier_type")} />
            </Field>
          </div>
        </Section>
        <Section title="Contact details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact person">
              <Input {...register("contact_person")} />
            </Field>
            <Field label="Designation">
              <Input {...register("designation")} />
            </Field>
            <Field label="Email">
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone">
              <Input {...register("phone")} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Billing address">
                <Textarea {...register("billing_address")} />
              </Field>
            </div>
            <Field label="City">
              <Input {...register("city")} />
            </Field>
            <Field label="Country">
              <Input {...register("country")} />
            </Field>
          </div>
        </Section>
        <Section title="Commercial terms">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Payment terms (days)">
              <Input type="number" {...register("payment_terms_days")} />
            </Field>
            <Field label="Currency">
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["AED", "USD", "EUR", "INR"].map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Credit limit">
              <Input type="number" step="0.01" {...register("credit_limit")} />
            </Field>
            <Field label="Opening balance">
              <Input
                type="number"
                step="0.01"
                {...register("opening_balance")}
              />
            </Field>
          </div>
        </Section>
        <Section title="Bank details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bank name">
              <Input {...register("bank_name")} />
            </Field>
            <Field label="Account holder name">
              <Input {...register("account_holder_name")} />
            </Field>
            <Field label="IBAN">
              <Input {...register("iban")} />
            </Field>
            <Field label="SWIFT / BIC code">
              <Input {...register("swift_code")} />
            </Field>
          </div>
        </Section>
        <Section title="Preferences">
          <div className="space-y-4">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mark as active</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive suppliers cannot be selected on new purchase
                      orders.
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <Controller
              name="auto_block_credit_limit"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Auto-block on credit limit breach
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stop new purchase orders after the credit limit is
                      exceeded.
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <Controller
              name="send_payment_reminders"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Send payment reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Enable reminders as invoices approach due date.
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <Field label="Notes">
              <Textarea {...register("notes")} />
            </Field>
          </div>
        </Section>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav("/suppliers")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : edit
                ? "Save changes"
                : "Create supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
