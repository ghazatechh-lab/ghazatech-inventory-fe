import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowLeft,
  Building2,
  FileText,
  Landmark,
  RefreshCw,
  Save,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const PAYMENT_TERMS = [
  { value: "0", label: "Due on Receipt" },
  { value: "7", label: "7 Days" },
  { value: "15", label: "15 Days" },
  { value: "30", label: "30 Days" },
  { value: "45", label: "45 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
];

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

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

const Section = ({ title, description, children, icon: Icon }) => (
  <section className="supplier-form-section">
    <div className="mb-5 flex items-start gap-3">
      {Icon && (
        <span className="supplier-section-icon">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div>
        <h2 className="font-semibold text-slate-950 dark:text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
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

const getExtension = (name) => {
  const index = String(name || "").lastIndexOf(".");

  return index >= 0 ? String(name).slice(index).toLowerCase() : "";
};

const formatFileSize = (bytes) => {
  const value = Number(bytes) || 0;

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

const appendFormValue = (formData, key, value) => {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "boolean") {
    formData.append(key, value ? "true" : "false");

    return;
  }

  formData.append(key, String(value));
};

export default function SupplierFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const backTarget = edit ? `/suppliers/${id}` : "/suppliers";
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = React.useState([]);

  const [fileError, setFileError] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: defaults,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["supplier", id],

    queryFn: async () => unwrap(await api.get(`/suppliers/${id}/`)),

    enabled: edit,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!data) {
      return;
    }

    reset({
      ...defaults,
      ...data,
    });
  }, [data, reset]);

  const save = useMutation({
    mutationFn: async (values) => {
      const formData = new FormData();

      const normalized = {
        ...values,

        credit_limit: Number(values.credit_limit || 0),

        opening_balance: Number(values.opening_balance || 0),

        payment_terms_days: Number(values.payment_terms_days || 0),
      };

      Object.entries(normalized).forEach(([key, value]) =>
        appendFormValue(formData, key, value),
      );

      selectedFiles.forEach((file) => {
        formData.append("documents", file);
      });

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        skipGlobalErrorToast: true,
      };

      return edit
        ? api.patch(`/suppliers/${id}/`, formData, config)
        : api.post("/suppliers/", formData, config);
    },

    onSuccess: async (response) => {
      const savedSupplier = unwrap(response);
      const supplierId = savedSupplier?.id || id;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["suppliers"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier", supplierId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-detail-bills", supplierId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-detail-payments", supplierId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["supplier-detail-returns", supplierId],
        }),
      ]);

      toast.success(edit ? "Supplier updated." : "Supplier created.");

      navigate(supplierId ? `/suppliers/${supplierId}` : "/suppliers");
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      (details.errors || []).forEach(({ field, message }) => {
        const rootField = field?.split(/[.[]/)[0];

        if (rootField === "documents") {
          setFileError(message);

          return;
        }

        if (rootField) {
          setError(rootField, {
            type: "server",
            message,
          });
        }
      });

      toast.error(details.title || "Unable to save supplier", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);

    setFileError("");

    const rejected = incoming.find((file) => {
      const extension = getExtension(file.name);

      return (
        !ACCEPTED_EXTENSIONS.includes(extension) || file.size > MAX_FILE_SIZE
      );
    });

    if (rejected) {
      setFileError(
        "Only PDF, JPG, PNG, DOC and DOCX files up to 10 MB are allowed.",
      );

      event.target.value = "";

      return;
    }

    setSelectedFiles((current) => {
      const merged = [...current, ...incoming];

      return merged.filter(
        (file, index) =>
          merged.findIndex(
            (candidate) =>
              candidate.name === file.name && candidate.size === file.size,
          ) === index,
      );
    });

    event.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const submit = (values) => {
    clearErrors();
    setFileError("");
    save.mutate(values);
  };

  if (edit && isLoading) {
    return <div className="supplier-loading-card">Loading supplier...</div>;
  }

  const existingDocuments = Array.isArray(data?.documents)
    ? data.documents
    : [];

  return (
    <div className="supplier-module-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="supplier-form-hero">
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            className="supplier-back-button"
          >
            <ArrowLeft className="h-4 w-4" />
            {edit ? "Back to supplier" : "Back to suppliers"}
          </button>
          <div className="supplier-hero-content mt-5 flex items-start gap-4">
            <span className="supplier-hero-icon">
              <Building2 className="h-6 w-6" />
            </span>
            <div className="supplier-hero-copy min-w-0">
              <p className="supplier-eyebrow">Supplier master</p>
              <h1 className="supplier-hero-title mt-1">
                {edit ? "Edit supplier" : "Add supplier"}
              </h1>
              <p className="supplier-hero-description mt-2">
                Company identity, contacts, commercial terms, bank details,
                supporting documents and operational preferences.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          <Section
            title="Company identity"
            icon={Building2}
            description="Legal and tax details used on purchase orders and supplier bills."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Supplier code"
                required
                error={errors.supplier_code}
              >
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
                        {
                          shouldDirty: true,
                        },
                      )
                    }
                    title="Generate supplier code"
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

          <Section
            title="Contact details"
            icon={UserRound}
            description="Primary contact and billing address."
          >
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

          <Section
            title="Commercial terms"
            icon={WalletCards}
            description="Payment behavior, credit exposure and preferred currency."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Payment Terms">
                <Controller
                  name="payment_terms_days"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? 15)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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
                        {["AED", "USD", "EUR", "INR"].map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Credit limit">
                <Input
                  type="number"
                  min="0"
                  max="999999999999.99"
                  step="0.01"
                  {...register("credit_limit", {
                    min: {
                      value: 0,
                      message: "Credit limit cannot be negative.",
                    },
                    max: {
                      value: 999999999999.99,
                      message: "Credit limit cannot exceed 14 digits in total.",
                    },
                  })}
                />
              </Field>

              <Field label="Opening balance">
                <Input
                  type="number"
                  min="-999999999999.99"
                  max="999999999999.99"
                  step="0.01"
                  {...register("opening_balance", {
                    min: {
                      value: -999999999999.99,
                      message:
                        "Opening balance cannot exceed 14 digits in total.",
                    },
                    max: {
                      value: 999999999999.99,
                      message:
                        "Opening balance cannot exceed 14 digits in total.",
                    },
                  })}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Bank details"
            icon={Landmark}
            description="Used to prepare payment vouchers and bank transfers."
          >
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

          <Section
            title="Supporting documents"
            icon={FileText}
            description="Upload trade licence, VAT certificate, bank details, agreements or other supplier documents."
          >
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-white/15 dark:bg-white/[0.025] dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5">
              <UploadCloud className="h-8 w-8 text-blue-500" />

              <span className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                Click to upload supporting documents
              </span>

              <span className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG, DOC or DOCX · maximum 10 MB per file
              </span>

              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="sr-only"
                onChange={handleFiles}
              />
            </label>

            {fileError && (
              <p className="mt-2 text-sm text-red-500">{fileError}</p>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  New files
                </p>

                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-900/60"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-blue-500" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                        {file.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSelectedFile(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {existingDocuments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Existing documents
                </p>

                {existingDocuments.map((document) => (
                  <a
                    key={document.id}
                    href={document.file_url || document.file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-white/5"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-emerald-500" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                        {document.original_name ||
                          document.file_name ||
                          "Supplier document"}
                      </p>

                      <p className="text-xs text-slate-500">
                        {document.file_size
                          ? formatFileSize(document.file_size)
                          : "Uploaded document"}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Preferences"
            icon={ShieldCheck}
            description="Control ordering and payment behavior."
          >
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
                      checked={Boolean(field.value)}
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
                      checked={Boolean(field.value)}
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
                        Enable reminders as invoices approach their due date.
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
                <Textarea rows={4} {...register("notes")} />
              </Field>
            </div>
          </Section>

          <div className="supplier-form-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => navigate(backTarget)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={save.isPending}
              className="min-w-[160px] bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {save.isPending
                ? "Saving..."
                : edit
                  ? "Save changes"
                  : "Create supplier"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
