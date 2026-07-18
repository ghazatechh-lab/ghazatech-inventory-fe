import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  const isEdit = Boolean(id);
  const fileInputRef = React.useRef(null);

  const [selectedImage, setSelectedImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");

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

    // Preserve the existing image on edit. Only send this field when the
    // user has selected a new File object.
    if (selectedImage instanceof File) {
      formData.append("product_image", selectedImage);
    }

    try {
      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (isEdit) {
        await api.patch(`/products/${id}/`, formData, config);
      } else {
        await api.post("/products/", formData, config);
      }

      toast.success(`Product ${isEdit ? "updated" : "created"} successfully`);
      navigate("/inventory/products");
    } catch (error) {
      toast.error(apiErrorMessage(error));
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
            <Label>Brand</Label>
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
            <Label>Category</Label>
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
            <Label>Purchase price (AED)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("purchase_price", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
            />
          </div>
          <div>
            <Label>Retail price (AED)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("retail_price", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
            />
          </div>
          <div>
            <Label>Wholesale price (AED)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("wholesale_price", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
            />
          </div>
          <div>
            <Label>Minimum selling price (AED)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("minimum_selling_price", { valueAsNumber: true })}
              className="mt-1.5 font-numeric"
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
    </div>
  );
}
