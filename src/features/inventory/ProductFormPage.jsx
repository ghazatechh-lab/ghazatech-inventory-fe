import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultValues = {
  product_name: "",
  sku: "",
  barcode: "",
  brand: "",
  category: "",
  description: "",
  warranty_period_days: 180,
  reorder_level: 5,
  rack_location: "",
  is_active: true,
};

function listResults(response) {
  const data = unwrap(response);
  return Array.isArray(data) ? data : data?.results || [];
}

function apiErrorMessage(error) {
  const body = error?.response?.data;
  const details = body?.errors || body?.data || body;

  if (details && typeof details === "object") {
    const firstValue = Object.values(details)[0];
    if (Array.isArray(firstValue) && firstValue[0])
      return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }

  return body?.message || "Unable to save product";
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function resolveRelatedId(item, key, options = []) {
  if (!item) return "";

  const directId = item[`${key}_id`];
  const related = item[key];
  const relatedDetail = item[`${key}_detail`];

  const possibleId =
    directId ??
    relatedDetail?.id ??
    related?.id ??
    related?.value ??
    (typeof related === "number" ? related : null);

  if (possibleId !== null && possibleId !== undefined && possibleId !== "") {
    return String(possibleId);
  }

  const possibleName =
    item[`${key}_name`] ??
    relatedDetail?.name ??
    related?.name ??
    (typeof related === "string" ? related : "");

  if (!possibleName) return "";

  const matchedOption = options.find(
    (option) => normalizeText(option?.name) === normalizeText(possibleName),
  );

  return matchedOption?.id ? String(matchedOption.id) : "";
}

function ensureSelectedOption(options, selectedId, fallbackName) {
  const list = Array.isArray(options) ? [...options] : [];
  if (!selectedId) return list;

  const exists = list.some(
    (option) => String(option.id) === String(selectedId),
  );
  if (!exists) {
    list.unshift({ id: selectedId, name: fallbackName || `#${selectedId}` });
  }

  return list;
}

function appendFormValue(formData, key, value) {
  if (value === undefined || value === null) return;
  formData.append(key, typeof value === "boolean" ? String(value) : value);
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const fileInputRef = React.useRef(null);
  const hydratedProductIdRef = React.useRef(null);

  const [selectedImage, setSelectedImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [referenceDialog, setReferenceDialog] = React.useState(null);
  const [referenceName, setReferenceName] = React.useState("");
  const [referenceDescription, setReferenceDescription] = React.useState("");
  const [variants, setVariants] = React.useState([]);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`)),
    enabled: isEdit,
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands", "active-options"],
    queryFn: async () =>
      listResults(
        await api.get("/brands/", {
          params: { is_active: true, page_size: 500 },
        }),
      ),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", "active-options"],
    queryFn: async () =>
      listResults(
        await api.get("/categories/", {
          params: { is_active: true, page_size: 500 },
        }),
      ),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm({ defaultValues });

  React.useEffect(() => {
    if (!product || !isEdit || brandsLoading || categoriesLoading) {
      return;
    }

    const hydrationKey = String(product.id ?? id);
    if (hydratedProductIdRef.current === hydrationKey) return;

    const brandId = resolveRelatedId(product, "brand", brands);
    const categoryId = resolveRelatedId(product, "category", categories);

    console.group("[Product Edit] Hydration");
    console.log("Product API response:", product);
    console.log("Brand options:", brands);
    console.log("Category options:", categories);
    console.log("Resolved brand ID:", brandId, {
      brand: product.brand,
      brand_id: product.brand_id,
      brand_name: product.brand_name,
      brand_detail: product.brand_detail,
    });
    console.log("Resolved category ID:", categoryId, {
      category: product.category,
      category_id: product.category_id,
      category_name: product.category_name,
      category_detail: product.category_detail,
    });
    console.groupEnd();

    const hydratedValues = {
      product_name: product.product_name ?? "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      brand: brandId,
      category: categoryId,
      description: product.description ?? "",
      warranty_period_days: Number(product.warranty_period_days ?? 0),
      reorder_level: Number(product.reorder_level ?? 0),
      rack_location: product.rack_location ?? "",
      is_active: product.is_active ?? true,
    };

    console.log("[Product Edit] Values passed to reset:", hydratedValues);
    reset(hydratedValues);

    // Verify React Hook Form received the selected string IDs.
    window.setTimeout(() => {
      console.log("[Product Edit] Form values after reset:", {
        brand: String(hydratedValues.brand || ""),
        category: String(hydratedValues.category || ""),
      });
    }, 0);

    setVariants(
      (product.variants || []).map((variant) => ({
        id: variant.id,
        variant_name: variant.variant_name || "",
        sku: variant.sku || "",
        barcode: variant.barcode || "",
        available_qty: variant.available_qty ?? 0,
        purchase_price: variant.purchase_price ?? "",
        retail_price: variant.retail_price ?? "",
        wholesale_price: variant.wholesale_price ?? "",
        minimum_selling_price: variant.minimum_selling_price ?? "",
        is_default: Boolean(variant.is_default),
        is_active: variant.is_active ?? true,
        attributes: Object.entries(variant.attributes || {}).map(
          ([name, value]) => ({
            name,
            value,
          }),
        ),
      })),
    );

    setSelectedImage(null);
    setImagePreview(product.product_image_url || product.product_image || "");
    hydratedProductIdRef.current = hydrationKey;

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [
    product,
    isEdit,
    id,
    reset,
    brands,
    categories,
    brandsLoading,
    categoriesLoading,
  ]);

  React.useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const selectedBrand = watch("brand");
  const selectedCategory = watch("category");

  const brandOptions = React.useMemo(
    () =>
      ensureSelectedOption(
        brands,
        selectedBrand,
        product?.brand_name || product?.brand?.name,
      ),
    [brands, selectedBrand, product],
  );

  const categoryOptions = React.useMemo(
    () =>
      ensureSelectedOption(
        categories,
        selectedCategory,
        product?.category_name || product?.category?.name,
      ),
    [categories, selectedCategory, product],
  );

  const createReferenceMutation = useMutation({
    mutationFn: async () => {
      const isBrand = referenceDialog === "brand";
      const endpoint = isBrand ? "/brands/" : "/categories/";

      const response = await api.post(endpoint, {
        name: referenceName.trim(),
        description: referenceDescription.trim(),
        is_active: true,
      });

      return {
        item: unwrap(response),
        type: referenceDialog,
      };
    },
    onSuccess: async ({ item, type }) => {
      const queryKey =
        type === "brand"
          ? ["brands", "active-options"]
          : ["categories", "active-options"];

      await queryClient.invalidateQueries({ queryKey });

      if (item?.id) {
        setValue(type, String(item.id), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      toast.success(
        `${type === "brand" ? "Brand" : "Category"} created successfully`,
      );
      setReferenceDialog(null);
      setReferenceName("");
      setReferenceDescription("");
    },
    onError: (error) => {
      if (!error?.__apiErrorShown) {
        toast.error(`Unable to create ${referenceDialog}`);
      }
    },
  });

  const openReferenceDialog = (type) => {
    setReferenceDialog(type);
    setReferenceName("");
    setReferenceDescription("");
  };

  const closeReferenceDialog = () => {
    if (createReferenceMutation.isPending) return;
    setReferenceDialog(null);
    setReferenceName("");
    setReferenceDescription("");
  };

  const handleCreateReference = (event) => {
    event.preventDefault();

    if (!referenceName.trim()) {
      toast.error(
        `${referenceDialog === "brand" ? "Brand" : "Category"} name is required`,
      );
      return;
    }

    createReferenceMutation.mutate();
  };

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        variant_name: "",
        sku: "",
        barcode: "",
        available_qty: 0,
        purchase_price: "",
        retail_price: "",
        wholesale_price: "",
        minimum_selling_price: "",
        is_default: current.length === 0,
        is_active: true,
        attributes: [{ name: "Color", value: "" }],
      },
    ]);
  };

  const updateVariant = (index, field, value) => {
    setVariants((current) =>
      current
        .map((variant, variantIndex) => {
          if (variantIndex !== index) return variant;

          if (field === "is_default" && value) {
            return { ...variant, is_default: true };
          }

          return { ...variant, [field]: value };
        })
        .map((variant, variantIndex) =>
          field === "is_default" && value && variantIndex !== index
            ? { ...variant, is_default: false }
            : variant,
        ),
    );
  };

  const removeVariant = (index) => {
    setVariants((current) => {
      const next = current.filter((_, variantIndex) => variantIndex !== index);
      if (next.length && !next.some((variant) => variant.is_default)) {
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
  };

  const addVariantAttribute = (variantIndex) => {
    setVariants((current) =>
      current.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              attributes: [...variant.attributes, { name: "", value: "" }],
            }
          : variant,
      ),
    );
  };

  const updateVariantAttribute = (
    variantIndex,
    attributeIndex,
    field,
    value,
  ) => {
    setVariants((current) =>
      current.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              attributes: variant.attributes.map(
                (attribute, currentAttributeIndex) =>
                  currentAttributeIndex === attributeIndex
                    ? { ...attribute, [field]: value }
                    : attribute,
              ),
            }
          : variant,
      ),
    );
  };

  const removeVariantAttribute = (variantIndex, attributeIndex) => {
    setVariants((current) =>
      current.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              attributes: variant.attributes.filter(
                (_, currentAttributeIndex) =>
                  currentAttributeIndex !== attributeIndex,
              ),
            }
          : variant,
      ),
    );
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Select a JPG, PNG, or WebP image");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Product image must be 5 MB or smaller");
      event.target.value = "";
      return;
    }

    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(product?.product_image_url || product?.product_image || "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (values) => {
    try {
      console.group("[Product Edit] Submit");
      console.log("React Hook Form values:", values);
      console.log("Variant state:", variants);

      const formData = new FormData();

      const brandId = Number(values.brand);
      const categoryId = Number(values.category);

      if (!Number.isInteger(brandId) || brandId <= 0) {
        throw new Error("Please select a brand.");
      }

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new Error("Please select a category.");
      }

      const payload = {
        product_name: values.product_name?.trim(),
        sku: values.sku?.trim(),
        barcode: values.barcode?.trim() || "",
        brand: brandId,
        category: categoryId,
        description: values.description?.trim() || "",
        warranty_period_days: Number(values.warranty_period_days ?? 0),
        reorder_level: Number(values.reorder_level ?? 0),
        rack_location: values.rack_location?.trim() || "",
        is_active: Boolean(values.is_active),
      };

      Object.entries(payload).forEach(([key, value]) =>
        appendFormValue(formData, key, value),
      );

      const normalizedVariants = variants.map((variant, index) => {
        if (!variant.variant_name.trim()) {
          throw new Error(`Variant ${index + 1}: name is required.`);
        }
        if (!variant.sku.trim()) {
          throw new Error(`Variant ${index + 1}: SKU is required.`);
        }

        const attributes = {};
        variant.attributes.forEach((attribute) => {
          const name = attribute.name.trim();
          const value = attribute.value.trim();
          if (name && value) attributes[name] = value;
        });

        const nullableNumber = (value) =>
          value === "" || value === null || value === undefined
            ? null
            : Number(value);

        const parsedInitialQty = Number.parseInt(variant.available_qty, 10);

        return {
          ...(variant.id ? { id: variant.id } : {}),
          variant_name: variant.variant_name.trim(),
          sku: variant.sku.trim(),
          barcode: variant.barcode.trim() || null,
          attributes,
          available_qty:
            Number.isFinite(parsedInitialQty) && parsedInitialQty >= 0
              ? parsedInitialQty
              : 0,
          purchase_price: nullableNumber(variant.purchase_price),
          retail_price: nullableNumber(variant.retail_price),
          wholesale_price: nullableNumber(variant.wholesale_price),
          minimum_selling_price: nullableNumber(variant.minimum_selling_price),
          is_default: Boolean(variant.is_default),
          is_active: Boolean(variant.is_active),
        };
      });

      formData.append("variants", JSON.stringify(normalizedVariants));

      console.log("Normalized product payload:", payload);
      console.log("Normalized variants:", normalizedVariants);
      console.groupEnd();

      // Preserve the existing image on edit. Only send this field when the
      // user has selected a new File object.
      if (selectedImage instanceof File) {
        formData.append("product_image", selectedImage);
      }

      // Do not set Content-Type manually for FormData.
      // The browser must add the multipart boundary automatically.
      if (isEdit) {
        await api.patch(`/products/${id}/`, formData);
      } else {
        await api.post("/products/", formData);
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", id] });

      toast.success(`Product ${isEdit ? "updated" : "created"} successfully`);
      navigate("/inventory/products");
    } catch (error) {
      console.groupEnd();
      console.error("[Product Edit] Submit failed:", error);
      if (!error?.__apiErrorShown) {
        toast.error(error?.message || apiErrorMessage(error));
      }
    }
  };

  const handleInvalidSubmit = (formErrors) => {
    console.group("[Product Edit] Form validation failed");
    console.error("Validation errors:", formErrors);
    console.log("Current form values:", watch());
    console.log("Current variants:", variants);
    console.groupEnd();

    const firstError = Object.values(formErrors || {})[0];
    toast.error(firstError?.message || "Please complete all required fields.");
  };

  if (
    isEdit &&
    (productLoading || !product || brandsLoading || categoriesLoading)
  ) {
    return (
      <div className="max-w-4xl">
        <PageHeader
          title="Edit product"
          subtitle="Loading product details..."
        />
        <div className="card-surface p-6 text-sm text-muted-foreground">
          Loading product and variant quantities...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isEdit ? "Edit product" : "New product"}
        subtitle="Create and maintain the spare-parts product catalog"
      />

      <form
        onSubmit={handleSubmit(submit, handleInvalidSubmit)}
        className="card-surface p-6 space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Product image</Label>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="h-36 w-36 overflow-hidden rounded-lg border border-dashed bg-muted/30 flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-9 w-9 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or WebP. Maximum file size: 5 MB.
                </p>
                {selectedImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedImage}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel new image
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Product name</Label>
            <Input
              {...register("product_name", {
                required: "Product name is required",
              })}
              className="mt-1.5"
              data-testid="product-name-input"
            />
            {errors.product_name && (
              <p className="mt-1 text-xs text-red-400">
                {errors.product_name.message}
              </p>
            )}
          </div>

          <div>
            <Label>SKU</Label>
            <Input
              {...register("sku", { required: "SKU is required" })}
              className="mt-1.5"
            />
            {errors.sku && (
              <p className="mt-1 text-xs text-red-400">{errors.sku.message}</p>
            )}
          </div>

          <div>
            <Label>Barcode</Label>
            <Input {...register("barcode")} className="mt-1.5" />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Brand</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => openReferenceDialog("brand")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add brand
              </Button>
            </div>
            <Controller
              name="brand"
              control={control}
              rules={{ required: "Brand is required" }}
              render={({ field }) => (
                <select
                  ref={field.ref}
                  name={field.name}
                  value={field.value == null ? "" : String(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const value = String(event.target.value);
                    console.log("[Product Form] Brand selected:", value);
                    field.onChange(value);
                  }}
                  disabled={brandsLoading}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {brandsLoading ? "Loading brands…" : "Select brand"}
                  </option>
                  {brandOptions.map((brand) => (
                    <option key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.brand && (
              <p className="mt-1 text-xs text-red-400">
                {errors.brand.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => openReferenceDialog("category")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add category
              </Button>
            </div>
            <Controller
              name="category"
              control={control}
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <select
                  ref={field.ref}
                  name={field.name}
                  value={field.value == null ? "" : String(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const value = String(event.target.value);
                    console.log("[Product Form] Category selected:", value);
                    field.onChange(value);
                  }}
                  disabled={categoriesLoading}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories…"
                      : "Select category"}
                  </option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.category && (
              <p className="mt-1 text-xs text-red-400">
                {errors.category.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              {...register("description")}
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div>
            <Label>Warranty (days)</Label>
            <Input
              type="number"
              min="0"
              {...register("warranty_period_days", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
            />
          </div>
          <div>
            <Label>Reorder level</Label>
            <Input
              type="number"
              min="0"
              {...register("reorder_level", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Rack location</Label>
            <Input
              {...register("rack_location")}
              placeholder="e.g. R3-S2-B10"
              className="mt-1.5"
            />
          </div>
        </div>

        <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Product variants
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Add combinations such as Color, RAM, Storage, Condition, or any
                custom attribute. Enter the available quantity for each variant.
                Empty quantity is saved as 0.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              This product has no variants. Add at least one variant to manage
              pricing and available quantity.
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, variantIndex) => (
                <div
                  key={variant.id || variantIndex}
                  className="rounded-lg border border-white/10 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-200">
                      Variant {variantIndex + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => removeVariant(variantIndex)}
                      title="Remove variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Variant name</Label>
                      <Input
                        value={variant.variant_name}
                        onChange={(event) =>
                          updateVariant(
                            variantIndex,
                            "variant_name",
                            event.target.value,
                          )
                        }
                        placeholder="e.g. Black / 16 GB / 512 GB"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Variant SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(event) =>
                          updateVariant(variantIndex, "sku", event.target.value)
                        }
                        placeholder="e.g. DELL-16-BLK"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Variant barcode</Label>
                      <Input
                        value={variant.barcode}
                        onChange={(event) =>
                          updateVariant(
                            variantIndex,
                            "barcode",
                            event.target.value,
                          )
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Available qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={variant.available_qty ?? 0}
                        onChange={(event) =>
                          updateVariant(
                            variantIndex,
                            "available_qty",
                            event.target.value,
                          )
                        }
                        onBlur={(event) => {
                          if (event.target.value === "") {
                            updateVariant(variantIndex, "available_qty", 0);
                          }
                        }}
                        placeholder="0"
                        className="mt-1.5 font-numeric"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Empty value will be saved as 0.
                      </p>
                    </div>
                    <div className="flex items-end gap-6 pb-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={variant.is_default}
                          onCheckedChange={(value) =>
                            updateVariant(variantIndex, "is_default", value)
                          }
                        />
                        <Label>Default</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={variant.is_active}
                          onCheckedChange={(value) =>
                            updateVariant(variantIndex, "is_active", value)
                          }
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Attributes</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addVariantAttribute(variantIndex)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add attribute
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {variant.attributes.map((attribute, attributeIndex) => (
                        <div
                          key={attributeIndex}
                          className="grid grid-cols-[1fr_1fr_auto] gap-2"
                        >
                          <Input
                            value={attribute.name}
                            onChange={(event) =>
                              updateVariantAttribute(
                                variantIndex,
                                attributeIndex,
                                "name",
                                event.target.value,
                              )
                            }
                            placeholder="Attribute, e.g. RAM"
                          />
                          <Input
                            value={attribute.value}
                            onChange={(event) =>
                              updateVariantAttribute(
                                variantIndex,
                                attributeIndex,
                                "value",
                                event.target.value,
                              )
                            }
                            placeholder="Value, e.g. 16 GB"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeVariantAttribute(
                                variantIndex,
                                attributeIndex,
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["purchase_price", "Purchase price"],
                      ["retail_price", "Retail price"],
                      ["wholesale_price", "Wholesale price"],
                      ["minimum_selling_price", "Minimum selling"],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <Label>{label} (AED)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant[field]}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              field,
                              event.target.value,
                            )
                          }
                          placeholder="Inherit"
                          className="mt-1.5 font-numeric"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(watch("is_active"))}
            onCheckedChange={(value) => setValue("is_active", value)}
          />
          <Label>Active</Label>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || brandsLoading || categoriesLoading}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="product-save-btn"
          >
            {isSubmitting
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create product"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/inventory/products")}
          >
            Cancel
          </Button>
        </div>
      </form>

      <Dialog
        open={Boolean(referenceDialog)}
        onOpenChange={(open) => {
          if (!open) closeReferenceDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {referenceDialog === "brand" ? "brand" : "category"}
            </DialogTitle>
            <DialogDescription>
              Create it here and it will be selected automatically for this
              product.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReference} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-name">Name</Label>
              <Input
                id="reference-name"
                value={referenceName}
                onChange={(event) => setReferenceName(event.target.value)}
                placeholder={`Enter ${referenceDialog === "brand" ? "brand" : "category"} name`}
                autoFocus
                disabled={createReferenceMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference-description">Description</Label>
              <Textarea
                id="reference-description"
                value={referenceDescription}
                onChange={(event) =>
                  setReferenceDescription(event.target.value)
                }
                placeholder="Optional description"
                rows={3}
                disabled={createReferenceMutation.isPending}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeReferenceDialog}
                disabled={createReferenceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReferenceMutation.isPending}
              >
                {createReferenceMutation.isPending
                  ? "Creating…"
                  : "Create and select"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
