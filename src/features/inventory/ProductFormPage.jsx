import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyBaseStock = {
  attributes: [],
  available_qty: 0,
  purchase_price: "",
  retail_price: 0,
  wholesale_price: 0,
  minimum_selling_price: 0,
  is_active: true,
};

const defaults = {
  product_name: "",
  sku: "",
  barcode: "",
  brand: "",
  category: "",
  branch: "",
  rack: "",
  supplier: "",
  has_variants: false,
  compatible_models: "",
  condition: "NEW",
  unit: "PCS",
  vat_inclusive: true,
  vat_rate: 5,
  description: "",
  warranty_period_days: 0,
  reorder_level: 0,
  is_active: true,
};

function list(response) {
  const data = unwrap(response);
  return Array.isArray(data) ? data : data?.results || [];
}

function relatedId(item, key) {
  const directValue = item?.[key];
  const detailValue = item?.[`${key}_detail`];

  const value =
    item?.[`${key}_id`] ??
    directValue?.id ??
    detailValue?.id ??
    directValue ??
    "";

  return value === null || value === undefined ? "" : String(value);
}

function variantFromApi(item) {
  return {
    id: item.id,
    attributes: Object.entries(item.attributes || {}).map(([name, value]) => ({
      name,
      value,
    })),
    available_qty: item.available_qty ?? 0,
    purchase_price: item.purchase_price ?? "",
    retail_price: item.retail_price ?? 0,
    wholesale_price: item.wholesale_price ?? 0,
    minimum_selling_price: item.minimum_selling_price ?? 0,
    is_active: item.is_active ?? true,
  };
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branchOverride } = useAuth();
  const fileRef = React.useRef(null);
  const hydratedRef = React.useRef(false);
  const previousBranchRef = React.useRef("");
  const lastAppliedHeaderBranchRef = React.useRef(undefined);
  const [image, setImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [stockConfirmOpen, setStockConfirmOpen] = React.useState(false);
  const [pendingFormValues, setPendingFormValues] = React.useState(null);
  const [pendingStockChanges, setPendingStockChanges] = React.useState([]);
  const [variants, setVariants] = React.useState([{ ...emptyBaseStock }]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: defaults });
  const selectedBranch = watch("branch");
  const hasVariants = Boolean(watch("has_variants"));

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`)),
    enabled: isEdit,
    staleTime: 0,
  });
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands", "product-options"],
    queryFn: async () =>
      list(
        await api.get("/brands/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", "product-options"],
    queryFn: async () =>
      list(
        await api.get("/categories/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", "product-options"],
    queryFn: async () =>
      list(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", "product-options"],
    queryFn: async () =>
      list(
        await api.get("/suppliers/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });

  React.useEffect(() => {
    if (isEdit || branchesLoading) {
      return;
    }

    const normalizedHeaderBranch =
      branchOverride === null ||
      branchOverride === undefined ||
      branchOverride === ""
        ? null
        : String(branchOverride);

    /*
     * Apply only when the HEADER selection itself changes.
     * This prevents a branch-options refetch from overwriting a branch
     * that the user manually selected inside the product form.
     */
    if (lastAppliedHeaderBranchRef.current === normalizedHeaderBranch) {
      return;
    }

    lastAppliedHeaderBranchRef.current = normalizedHeaderBranch;

    /*
     * "All branches" should not force or clear the product form branch.
     * The user can continue selecting the product branch manually.
     */
    if (normalizedHeaderBranch === null) {
      console.log(
        "[Product Form] Header changed to All branches. Product branch left unchanged.",
      );
      return;
    }

    const matchingBranch = branches.find(
      (branch) => String(branch.id) === normalizedHeaderBranch,
    );

    if (!matchingBranch) {
      console.warn(
        "[Product Form] Header branch was not found in product branch options:",
        {
          branchOverride,
          normalizedHeaderBranch,
          branches,
        },
      );

      /*
       * Allow another attempt when the branch options are refreshed.
       */
      lastAppliedHeaderBranchRef.current = undefined;
      return;
    }

    const branchId = String(matchingBranch.id);

    console.log("[Product Form] Applying changed header branch:", {
      branchOverride,
      branchId,
      branchCode: matchingBranch.branch_code,
      branchName: matchingBranch.branch_name,
    });

    setValue("branch", branchId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    /*
     * A rack belongs to a branch. Clear the old rack whenever the header
     * changes the product branch, then load racks for the new branch.
     */
    setValue("rack", "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });

    previousBranchRef.current = branchId;
  }, [isEdit, branchesLoading, branches, branchOverride, setValue]);
  const {
    data: rackResponse = [],
    isLoading: racksLoading,
    isError: racksError,
    error: racksQueryError,
  } = useQuery({
    queryKey: ["racks", "product-options", selectedBranch],
    queryFn: async () => {
      const response = await api.get("/racks/", {
        params: {
          page_size: 500,
          branch: selectedBranch,
        },
      });

      const result = list(response);

      console.group("[Product Form] Rack options");
      console.log("Selected branch:", selectedBranch);
      console.log("Rack API response:", unwrap(response));
      console.log("Normalized racks:", result);
      console.groupEnd();

      return result;
    },
    enabled: Boolean(selectedBranch),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selectedRackId = watch("rack");

  const racks = React.useMemo(() => {
    const branchRacks = rackResponse.filter((rack) => {
      const rackBranchId =
        rack?.branch_id ?? rack?.branch?.id ?? rack?.branch ?? "";

      return !selectedBranch || String(rackBranchId) === String(selectedBranch);
    });

    if (
      isEdit &&
      selectedRackId &&
      !branchRacks.some((rack) => String(rack.id) === String(selectedRackId))
    ) {
      const productRack =
        product?.rack_detail ||
        (product?.rack && typeof product.rack === "object"
          ? product.rack
          : null);

      const existingRack = {
        ...(productRack || {}),
        id: selectedRackId,
        rack_code:
          productRack?.rack_code ||
          product?.rack_code ||
          `Rack #${selectedRackId}`,
        rack_name: productRack?.rack_name || product?.rack_name || "",
        branch:
          productRack?.branch ??
          productRack?.branch_id ??
          product?.branch?.id ??
          product?.branch_id ??
          product?.branch ??
          selectedBranch,
      };

      console.log("[Product Edit] Preserving saved rack option:", existingRack);

      return [existingRack, ...branchRacks];
    }

    return branchRacks;
  }, [rackResponse, selectedBranch, isEdit, product, selectedRackId]);

  React.useEffect(() => {
    if (
      !product ||
      hydratedRef.current ||
      brandsLoading ||
      categoriesLoading ||
      branchesLoading ||
      suppliersLoading
    )
      return;
    const values = {
      product_name: product.product_name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      brand: relatedId(product, "brand"),
      category: relatedId(product, "category"),
      branch: relatedId(product, "branch"),
      rack: relatedId(product, "rack"),
      supplier: relatedId(product, "supplier"),
      has_variants: Boolean(product.has_variants),
      compatible_models: product.compatible_models || "",
      condition: product.condition || "NEW",
      unit: product.unit || "PCS",
      vat_inclusive: product.vat_inclusive ?? true,
      vat_rate: Number(product.vat_rate ?? 5),
      description: product.description || "",
      warranty_period_days: Number(product.warranty_period_days ?? 0),
      reorder_level: Number(product.reorder_level ?? 0),
      is_active: product.is_active ?? true,
    };
    console.group("[Product Edit] Hydration");
    console.log("Product response:", product);
    console.log("Resolved form values:", values);
    console.log("Brand options:", brands);
    console.log("Category options:", categories);
    console.log("Branch options:", branches);
    console.log("Resolved branch ID:", values.branch);
    console.log("Resolved rack ID:", values.rack);
    console.log("Rack detail:", product.rack_detail);
    console.log("Rack field:", product.rack);
    console.groupEnd();
    reset(values);
    const apiVariants = (product.variants || []).map(variantFromApi);
    setVariants(apiVariants.length ? apiVariants : [{ ...emptyBaseStock }]);
    setImagePreview(product.product_image_url || product.product_image || "");
    previousBranchRef.current = String(values.branch || "");
    hydratedRef.current = true;
  }, [
    product,
    reset,
    brandsLoading,
    categoriesLoading,
    branchesLoading,
    suppliersLoading,
    brands,
    categories,
    branches,
  ]);

  React.useEffect(() => {
    if (!selectedBranch) {
      previousBranchRef.current = "";
      return;
    }

    if (!hydratedRef.current) {
      previousBranchRef.current = String(selectedBranch);
      return;
    }

    const previousBranch = previousBranchRef.current;

    if (previousBranch && String(previousBranch) !== String(selectedBranch)) {
      console.log("[Product Form] Branch changed manually. Clearing rack.", {
        previousBranch,
        selectedBranch,
      });

      setValue("rack", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    previousBranchRef.current = String(selectedBranch);
  }, [selectedBranch, setValue]);

  const updateVariant = (index, field, value) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );
  const addVariant = () =>
    setVariants((current) => [
      ...current,
      { ...emptyBaseStock, attributes: [{ name: "", value: "" }] },
    ]);
  const removeVariant = (index) =>
    setVariants((current) => current.filter((_, i) => i !== index));
  const addAttribute = (variantIndex) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === variantIndex
          ? {
              ...variant,
              attributes: [...variant.attributes, { name: "", value: "" }],
            }
          : variant,
      ),
    );
  const updateAttribute = (variantIndex, attributeIndex, field, value) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === variantIndex
          ? {
              ...variant,
              attributes: variant.attributes.map((attribute, j) =>
                j === attributeIndex
                  ? { ...attribute, [field]: value }
                  : attribute,
              ),
            }
          : variant,
      ),
    );
  const removeAttribute = (variantIndex, attributeIndex) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === variantIndex
          ? {
              ...variant,
              attributes: variant.attributes.filter(
                (_, j) => j !== attributeIndex,
              ),
            }
          : variant,
      ),
    );

  const saveProduct = async (values) => {
    try {
      const normalizedVariants = (
        hasVariants ? variants : [variants[0] || emptyBaseStock]
      ).map((variant, index) => {
        const attributes = Object.fromEntries(
          (variant.attributes || [])
            .map((attribute) => [
              String(attribute.name || "").trim(),
              String(attribute.value || "").trim(),
            ])
            .filter(([name, value]) => name && value),
        );
        if (hasVariants && Object.keys(attributes).length === 0)
          throw new Error(`Variant ${index + 1}: add at least one attribute.`);
        return {
          ...(variant.id ? { id: variant.id } : {}),
          attributes: hasVariants ? attributes : {},
          available_qty: Math.max(0, Number(variant.available_qty || 0)),
          purchase_price:
            variant.purchase_price === "" || variant.purchase_price == null
              ? null
              : Number(variant.purchase_price),
          retail_price: Number(variant.retail_price || 0),
          wholesale_price: Number(variant.wholesale_price || 0),
          minimum_selling_price: Number(variant.minimum_selling_price || 0),
          is_active: variant.is_active ?? true,
        };
      });

      const formData = new FormData();
      const payload = {
        product_name: values.product_name.trim(),
        sku: values.sku.trim(),
        barcode: values.barcode?.trim() || "",
        brand: Number(values.brand),
        category: Number(values.category),
        branch: Number(values.branch),
        rack: values.rack ? Number(values.rack) : "",
        supplier: values.supplier ? Number(values.supplier) : "",
        has_variants: Boolean(values.has_variants),
        compatible_models: values.compatible_models?.trim() || "",
        condition: values.condition,
        unit: values.unit,
        vat_inclusive: Boolean(values.vat_inclusive),
        vat_rate: Number(values.vat_rate || 0),
        description: values.description?.trim() || "",
        warranty_period_days: Number(values.warranty_period_days || 0),
        reorder_level: Number(values.reorder_level || 0),
        is_active: Boolean(values.is_active),
      };
      Object.entries(payload).forEach(([key, value]) =>
        formData.append(key, value),
      );
      formData.append("variants", JSON.stringify(normalizedVariants));
      if (image) formData.append("product_image", image);

      console.group("[Product Form] Submit");
      console.log("Product payload:", payload);
      console.log("Variants payload:", normalizedVariants);
      console.groupEnd();

      if (isEdit) await api.patch(`/products/${id}/`, formData);
      else await api.post("/products/", formData);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success(
        isEdit
          ? "Product updated successfully."
          : "Product created successfully.",
      );
      navigate("/inventory/products");
    } catch (error) {
      console.error("[Product Form] Save failed:", error);
      if (error instanceof Error && !error.response) toast.error(error.message);
      else if (!error?.__apiErrorShown) toast.error("Unable to save product.");
    }
  };

  const requestSubmit = async (values) => {
    if (!isEdit || !product) {
      await saveProduct(values);
      return;
    }

    const originalVariants = product.variants || [];
    const nextVariants = hasVariants
      ? variants
      : [variants[0] || emptyBaseStock];

    const changes = nextVariants
      .map((variant, index) => {
        const original = variant.id
          ? originalVariants.find(
              (item) => String(item.id) === String(variant.id),
            )
          : originalVariants[index];
        const before = Number(original?.available_qty || 0);
        const after = Number(variant.available_qty || 0);
        if (before === after) return null;
        const label = hasVariants
          ? Object.values(
              Object.fromEntries(
                (variant.attributes || []).map((a) => [a.name, a.value]),
              ),
            )
              .filter(Boolean)
              .join(" / ") || `Variant ${index + 1}`
          : "Base product";
        return { label, before, after, difference: after - before };
      })
      .filter(Boolean);

    if (!changes.length) {
      await saveProduct(values);
      return;
    }

    setPendingFormValues(values);
    setPendingStockChanges(changes);
    setStockConfirmOpen(true);
  };

  const confirmProductStockUpdate = async () => {
    if (!pendingFormValues) return;
    setStockConfirmOpen(false);
    await saveProduct(pendingFormValues);
    setPendingFormValues(null);
    setPendingStockChanges([]);
  };

  React.useEffect(() => {
    if (!racksError) return;

    console.error(
      "[Product Form] Rack loading failed:",
      racksQueryError?.response?.data || racksQueryError,
    );
  }, [racksError, racksQueryError]);

  const busy =
    productLoading ||
    brandsLoading ||
    categoriesLoading ||
    branchesLoading ||
    suppliersLoading ||
    (selectedBranch && racksLoading);
  if (isEdit && busy)
    return <div className="p-6">Loading product details...</div>;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/50 p-1 shadow-2xl shadow-black/20">
        <div className="rounded-[14px] bg-slate-950/70 px-6 py-5 backdrop-blur">
          <PageHeader
            title={isEdit ? "Edit product" : "New product"}
            subtitle="Create and maintain products, branch stock, rack location and pricing"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit(requestSubmit, (formErrors) => {
          console.error("[Product Form] Validation failed:", formErrors);

          toast.error("Please complete the required fields.");
        })}
        className="space-y-6"
      >
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl shadow-black/10">
          <div className="border-b border-white/10 bg-white/[0.025] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              Product information
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Basic catalogue details, branch assignment and storage location.
            </p>
          </div>

          <div className="space-y-7 p-6">
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
              <Label className="text-sm font-medium text-slate-200">
                Product image
              </Label>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-3 text-center text-xs text-slate-500">
                      No image selected
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="cursor-pointer border-white/10 bg-slate-900/80 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;

                      setImage(file);

                      if (file) {
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    PNG, JPG or WebP. Recommended square image.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Label>
                  Product name
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <Input
                  {...register("product_name", {
                    required: "Product name is required.",
                  })}
                  placeholder="Enter product name"
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />

                {errors.product_name && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.product_name.message}
                  </p>
                )}
              </div>

              <div>
                <Label>
                  SKU
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <Input
                  {...register("sku", {
                    required: "SKU is required.",
                  })}
                  placeholder="e.g. LAP-ASUS-001"
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />

                {errors.sku && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.sku.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Barcode</Label>

                <Input
                  {...register("barcode")}
                  placeholder="Scan or enter barcode"
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <Label>
                  Brand
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <select
                  {...register("brand", {
                    required: "Brand is required.",
                  })}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select brand</option>

                  {brands.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {errors.brand && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.brand.message}
                  </p>
                )}
              </div>

              <div>
                <Label>
                  Category
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <select
                  {...register("category", {
                    required: "Category is required.",
                  })}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select category</option>

                  {categories.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {errors.category && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Supplier</Label>

                <select
                  {...register("supplier")}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">No supplier</option>

                  {suppliers.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.035] p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-100">
                  Branch and storage
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Assign the product to a branch and optionally select its rack.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label>
                    Branch
                    <span className="ml-1 text-red-400">*</span>
                  </Label>

                  <select
                    {...register("branch", {
                      required: "Branch is required.",
                    })}
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select branch</option>

                    {branches.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.branch_code ||
                          item.branch_name ||
                          `Branch #${item.id}`}
                        {item.branch_name && item.branch_code
                          ? ` - ${item.branch_name}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {errors.branch && (
                    <p className="mt-1.5 text-sm text-red-400">
                      {errors.branch.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Rack</Label>

                  <select
                    {...register("rack")}
                    disabled={!selectedBranch || racksLoading}
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(event) => {
                      console.log(
                        "[Product Form] Rack selected:",
                        event.target.value,
                      );

                      setValue("rack", event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">
                      {!selectedBranch
                        ? "Select branch first"
                        : racksLoading
                          ? "Loading racks..."
                          : racks.length
                            ? "Select rack"
                            : "No racks available"}
                    </option>

                    {racks.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.rack_code || item.rack_name || `Rack #${item.id}`}
                        {item.rack_name && item.rack_code
                          ? ` - ${item.rack_name}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {racksError && (
                    <p className="mt-1.5 text-sm text-red-400">
                      Unable to load racks for this branch.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <Label>Compatible models</Label>

                <Input
                  {...register("compatible_models")}
                  placeholder="e.g. Dell Latitude 5420"
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />
              </div>

              <div>
                <Label>Condition</Label>

                <select
                  {...register("condition")}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="REFURBISHED">Refurbished</option>
                </select>
              </div>

              <div>
                <Label>Unit</Label>

                <select
                  {...register("unit")}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="PCS">Pcs</option>
                  <option value="SET">Set</option>
                  <option value="BOX">Box</option>
                  <option value="PACK">Pack</option>
                  <option value="PAIR">Pair</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Description</Label>

              <Textarea
                {...register("description")}
                placeholder="Product description, technical notes or compatibility information"
                className="mt-2 min-h-28 border-white/10 bg-slate-900/80"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <Label>Warranty period</Label>

                <div className="relative mt-2">
                  <Input
                    type="number"
                    min="0"
                    {...register("warranty_period_days", {
                      valueAsNumber: true,
                    })}
                    className="h-11 border-white/10 bg-slate-900/80 pr-14"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    days
                  </span>
                </div>
              </div>

              <div>
                <Label>Reorder level</Label>

                <Input
                  type="number"
                  min="0"
                  {...register("reorder_level", {
                    valueAsNumber: true,
                  })}
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />
              </div>

              <div>
                <Label>VAT rate</Label>

                <div className="relative mt-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("vat_rate", {
                      valueAsNumber: true,
                    })}
                    className="h-11 border-white/10 bg-slate-900/80 pr-10"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    VAT inclusive
                  </p>

                  <p className="text-xs text-slate-500">
                    Prices already include VAT.
                  </p>
                </div>

                <Switch
                  checked={Boolean(watch("vat_inclusive"))}
                  onCheckedChange={(value) => setValue("vat_inclusive", value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Product variants
                  </p>

                  <p className="text-xs text-slate-500">
                    Use attribute combinations.
                  </p>
                </div>

                <Switch
                  checked={Boolean(watch("has_variants"))}
                  onCheckedChange={(value) => {
                    setValue("has_variants", value);

                    if (
                      value &&
                      variants.length === 1 &&
                      variants[0].attributes.length === 0
                    ) {
                      setVariants([
                        {
                          ...variants[0],
                          attributes: [
                            {
                              name: "",
                              value: "",
                            },
                          ],
                        },
                      ]);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Active product
                  </p>

                  <p className="text-xs text-slate-500">
                    Available across the system.
                  </p>
                </div>

                <Switch
                  checked={Boolean(watch("is_active"))}
                  onCheckedChange={(value) => setValue("is_active", value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.025] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {hasVariants
                  ? "Attributes, stock and pricing"
                  : "Stock and pricing"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {hasVariants
                  ? "Create attribute combinations such as RAM, color and storage."
                  : "Manage stock and pricing for this non-variant product."}
              </p>
            </div>

            {hasVariants && (
              <Button
                type="button"
                variant="outline"
                onClick={addVariant}
                className="border-blue-500/30 bg-blue-500/5 text-blue-200 hover:bg-blue-500/10 hover:text-blue-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add combination
              </Button>
            )}
          </div>

          <div className="space-y-5 p-6">
            {(hasVariants ? variants : [variants[0] || emptyBaseStock]).map(
              (variant, variantIndex) => (
                <div
                  key={variant.id || variantIndex}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950 shadow-lg shadow-black/10"
                >
                  {hasVariants && (
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Attribute combination {variantIndex + 1}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Define one or more attribute values.
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVariant(variantIndex)}
                        disabled={variants.length === 1}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="space-y-5 p-5">
                    {hasVariants && (
                      <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <div className="space-y-3">
                          {variant.attributes.map(
                            (attribute, attributeIndex) => (
                              <div
                                key={attributeIndex}
                                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                              >
                                <Input
                                  placeholder="Attribute, e.g. RAM"
                                  value={attribute.name}
                                  onChange={(event) =>
                                    updateAttribute(
                                      variantIndex,
                                      attributeIndex,
                                      "name",
                                      event.target.value,
                                    )
                                  }
                                  className="h-11 border-white/10 bg-slate-900/80"
                                />

                                <Input
                                  placeholder="Value, e.g. 16 GB"
                                  value={attribute.value}
                                  onChange={(event) =>
                                    updateAttribute(
                                      variantIndex,
                                      attributeIndex,
                                      "value",
                                      event.target.value,
                                    )
                                  }
                                  className="h-11 border-white/10 bg-slate-900/80"
                                />

                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() =>
                                    removeAttribute(
                                      variantIndex,
                                      attributeIndex,
                                    )
                                  }
                                  className="h-11 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ),
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addAttribute(variantIndex)}
                          className="mt-3 border-white/10 bg-white/[0.025]"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add attribute
                        </Button>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] p-3">
                        <Label className="text-emerald-100">
                          Available qty
                        </Label>

                        <Input
                          type="number"
                          min="0"
                          value={variant.available_qty ?? 0}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "available_qty",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 border-emerald-500/20 bg-slate-950/80"
                        />
                      </div>

                      <div>
                        <Label>
                          Purchase price
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            Optional
                          </span>
                        </Label>

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.purchase_price ?? ""}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "purchase_price",
                              event.target.value,
                            )
                          }
                          placeholder="0.00"
                          className="mt-2 h-11 border-white/10 bg-slate-900/80"
                        />
                      </div>

                      <div>
                        <Label>Retail price</Label>

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.retail_price ?? 0}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "retail_price",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 border-white/10 bg-slate-900/80"
                        />
                      </div>

                      <div>
                        <Label>Wholesale price</Label>

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.wholesale_price ?? 0}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "wholesale_price",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 border-white/10 bg-slate-900/80"
                        />
                      </div>

                      <div>
                        <Label>Minimum selling</Label>

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.minimum_selling_price ?? 0}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "minimum_selling_price",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 border-white/10 bg-slate-900/80"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/inventory/products")}
            disabled={isSubmitting}
            className="sm:min-w-28"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-40 bg-blue-600 shadow-lg shadow-blue-950/40 hover:bg-blue-700"
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create product"}
          </Button>
        </div>
      </form>

      <Dialog open={stockConfirmOpen} onOpenChange={setStockConfirmOpen}>
        <DialogContent className="border-white/10 bg-slate-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm stock update</DialogTitle>
            <DialogDescription>
              This will change real branch stock and create a stock-movement
              audit entry with your user account and the current time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {pendingStockChanges.map((change) => (
              <div
                key={change.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div>
                  <p className="font-medium text-white">{change.label}</p>
                  <p className="text-xs text-slate-500">
                    {change.before} → {change.after}
                  </p>
                </div>
                <span
                  className={
                    change.difference > 0
                      ? "font-mono font-semibold text-emerald-400"
                      : "font-mono font-semibold text-red-400"
                  }
                >
                  {change.difference > 0 ? "+" : ""}
                  {change.difference}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStockConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmProductStockUpdate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm and update stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
