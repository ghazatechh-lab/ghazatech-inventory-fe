import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
  purchase_price: 0,
  retail_price: 0,
  wholesale_price: 0,
  minimum_selling_price: 0,
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

  const [selectedImage, setSelectedImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [referenceDialog, setReferenceDialog] = React.useState(null);
  const [referenceName, setReferenceName] = React.useState("");
  const [referenceDescription, setReferenceDescription] = React.useState("");
  const [variants, setVariants] = React.useState([]);

  const { data: product } = useQuery({
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
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm({ defaultValues });

  React.useEffect(() => {
    if (!product || brandsLoading || categoriesLoading) return;

    const brandId =
      product.brand_id ??
      product.brand?.id ??
      (typeof product.brand === "number" || typeof product.brand === "string"
        ? product.brand
        : "");

    const categoryId =
      product.category_id ??
      product.category?.id ??
      (typeof product.category === "number" ||
      typeof product.category === "string"
        ? product.category
        : "");

    reset({
      product_name: product.product_name ?? "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      brand: brandId ? String(brandId) : "",
      category: categoryId ? String(categoryId) : "",
      description: product.description ?? "",
      purchase_price: Number(product.purchase_price ?? 0),
      retail_price: Number(product.retail_price ?? 0),
      wholesale_price: Number(product.wholesale_price ?? 0),
      minimum_selling_price: Number(product.minimum_selling_price ?? 0),
      warranty_period_days: Number(product.warranty_period_days ?? 0),
      reorder_level: Number(product.reorder_level ?? 0),
      rack_location: product.rack_location ?? "",
      is_active: product.is_active ?? true,
    });

    setVariants(
      (product.variants || []).map((variant) => ({
        id: variant.id,
        variant_name: variant.variant_name || "",
        sku: variant.sku || "",
        barcode: variant.barcode || "",
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

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [product, brandsLoading, categoriesLoading, reset]);

  React.useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const selectedBrand = watch("brand");
  const selectedCategory = watch("category");

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
    const formData = new FormData();

    const payload = {
      product_name: values.product_name,
      sku: values.sku,
      barcode: values.barcode || "",
      brand: Number(values.brand),
      category: Number(values.category),
      description: values.description || "",
      purchase_price: Number(values.purchase_price ?? 0),
      retail_price: Number(values.retail_price ?? 0),
      wholesale_price: Number(values.wholesale_price ?? 0),
      minimum_selling_price: Number(values.minimum_selling_price ?? 0),
      warranty_period_days: Number(values.warranty_period_days ?? 0),
      reorder_level: Number(values.reorder_level ?? 0),
      rack_location: values.rack_location || "",
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

      return {
        ...(variant.id ? { id: variant.id } : {}),
        variant_name: variant.variant_name.trim(),
        sku: variant.sku.trim(),
        barcode: variant.barcode.trim() || null,
        attributes,
        purchase_price: nullableNumber(variant.purchase_price),
        retail_price: nullableNumber(variant.retail_price),
        wholesale_price: nullableNumber(variant.wholesale_price),
        minimum_selling_price: nullableNumber(variant.minimum_selling_price),
        is_default: Boolean(variant.is_default),
        is_active: Boolean(variant.is_active),
      };
    });

    formData.append("variants", JSON.stringify(normalizedVariants));

    // Preserve the existing image on edit. Only send this field when the
    // user has selected a new File object.
    if (selectedImage instanceof File) {
      formData.append("product_image", selectedImage);
    }

    try {
      // Do not set Content-Type manually for FormData.
      // The browser must add the multipart boundary automatically.
      if (isEdit) {
        await api.patch(`/products/${id}/`, formData);
      } else {
        await api.post("/products/", formData);
      }

      toast.success(`Product ${isEdit ? "updated" : "created"} successfully`);
      navigate("/inventory/products");
    } catch (error) {
      if (!error?.__apiErrorShown) {
        toast.error(error?.message || apiErrorMessage(error));
      }
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isEdit ? "Edit product" : "New product"}
        subtitle="Create and maintain the spare-parts product catalog"
      />

      <form
        onSubmit={handleSubmit(submit)}
        className="card-surface p-6 space-y-5"
      >
        <input
          type="hidden"
          {...register("brand", { required: "Brand is required" })}
        />
        <input
          type="hidden"
          {...register("category", { required: "Category is required" })}
        />

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
            <Select
              value={selectedBrand ? String(selectedBrand) : ""}
              onValueChange={(value) =>
                setValue("brand", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              disabled={brandsLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue
                  placeholder={
                    brandsLoading ? "Loading brands…" : "Select brand"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={selectedCategory ? String(selectedCategory) : ""}
              onValueChange={(value) =>
                setValue("category", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              disabled={categoriesLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue
                  placeholder={
                    categoriesLoading
                      ? "Loading categories…"
                      : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                custom attribute. Empty variant prices inherit the main product
                prices.
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
              This product has no variants. The main product SKU and prices will
              be used.
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
