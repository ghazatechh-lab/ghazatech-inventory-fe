import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Search,
  Package,
  CheckCircle2,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  racks: [],
  initial_stock: 0,
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
  supplier: "",
  has_variants: false,
  compatible_models: "",
  condition: "NEW",
  unit: "PCS",
  tax_treatment: "VAT",
  vat_inclusive: true,
  description: "",
  warranty_period_days: 0,
  reorder_level: 5,
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

function normalizedRackIds(items) {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((item) => {
    const id = item && typeof item === "object"
      ? (item.id ?? item.rack_id ?? item.rack?.id)
      : item;
    return id == null || id === "" ? "" : String(id);
  }).filter(Boolean))];
}

function variantFromApi(item) {
  return {
    id: item.id,
    attributes: Object.entries(item.attributes || {}).map(([name, value]) => ({
      name,
      value,
    })),
    racks: normalizedRackIds(item.racks?.length ? item.racks : item.rack_details),
    // Existing stock is a balance, not a new opening quantity.
    initial_stock: item.current_stock ?? item.available_qty ?? item.total_quantity ?? 0,
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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const requestedReturnTo = searchParams.get("return_to") || "";
  const returnTo = requestedReturnTo.startsWith("/sales/invoices")
    ? requestedReturnTo
    : "/inventory/products";
  const { branchId: branchOverride } = useActiveBranchFilter();
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
  const [collapsedVariants, setCollapsedVariants] = React.useState([]);
  const [rackSearch, setRackSearch] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: defaults });
  const selectedBranch = watch("branch");
  const hasVariants = Boolean(watch("has_variants"));

  // Product IDs can overlap across physical tenants. An edit link must
  // fetch the product from its source branch, not the active Consolidated view.
  const editSourceBranch = searchParams.get("branch") || (
    branchOverride && String(branchOverride) !== "1" ? String(branchOverride) : ""
  );
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id, editSourceBranch],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`, {
      params: editSourceBranch ? { branch: editSourceBranch } : {},
    })),
    enabled: isEdit,
    staleTime: 0,
  });
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands", "product-options", selectedBranch],
    queryFn: async () =>
      list(
        await api.get("/brands/", {
          params: { page_size: 500, is_active: true, branch: selectedBranch },
        }),
      ),
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", "product-options", selectedBranch],
    queryFn: async () =>
      list(
        await api.get("/categories/", {
          params: { page_size: 500, is_active: true, branch: selectedBranch },
        }),
      ),
  });
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", "product-options"],
    queryFn: async () =>
      list(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const physicalBranches = React.useMemo(
    () =>
      branches.filter((branch) =>
        ["VAT", "NON_VAT"].includes(String(branch.tax_mode || "").toUpperCase()),
      ),
    [branches],
  );

  const activeHeaderBranch = React.useMemo(
    () =>
      branches.find(
        (branch) => String(branch.id) === String(branchOverride || ""),
      ) || null,
    [branches, branchOverride],
  );

  const isCombinedHeader =
    Boolean(activeHeaderBranch) && !["VAT", "NON_VAT"].includes(String(activeHeaderBranch.tax_mode || "").toUpperCase());

  const physicalBranchLabel = React.useCallback(
    (branchId) => {
      const branch = branches.find(
        (item) => String(item.id) === String(branchId || ""),
      );
      const code = String(branch?.tax_mode || "").toUpperCase();
      if (code === "VAT") return branch?.branch_name || "VAT branch";
      if (code === "NON_VAT") return branch?.branch_name || "Non-VAT branch";
      return branch?.branch_name || "selected branch";
    },
    [branches],
  );

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", "product-options", selectedBranch],
    queryFn: async () =>
      list(
        await api.get("/suppliers/", {
          params: {
            page_size: 500,
            is_active: true,
            branch: selectedBranch,
          },
          headers: { "X-Branch-ID": String(selectedBranch) },
        }),
      ),
    enabled: Boolean(selectedBranch) && physicalBranches.some((b) => String(b.id) === String(selectedBranch)),
    staleTime: 0,
    refetchOnMount: "always",
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
      setValue("branch", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      previousBranchRef.current = "";
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

    if (!["VAT", "NON_VAT"].includes(String(matchingBranch.tax_mode || "").toUpperCase())) {
      // BR03 is virtual. Product writes must explicitly target BR01 or BR02.
      setValue("branch", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue("supplier", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("sku");
      previousBranchRef.current = "";
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

    previousBranchRef.current = branchId;
  }, [
    isEdit,
    branchesLoading,
    branches,
    branchOverride,
    setValue,
    clearErrors,
  ]);
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
        headers: { "X-Branch-ID": String(selectedBranch) },
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

  const [showRackForm, setShowRackForm] = React.useState(false);
  const [rackTargetVariantIndex, setRackTargetVariantIndex] =
    React.useState(null);
  const [rackForm, setRackForm] = React.useState({
    rack_code: "",
    rack_name: "",
  });
  const [rackSaving, setRackSaving] = React.useState(false);

  const racks = React.useMemo(
    () =>
      rackResponse.filter((rack) => {
        const rackBranchId =
          rack?.branch_id ?? rack?.branch?.id ?? rack?.branch ?? "";

        // Some tenant-scoped rack endpoints omit the branch field.
        // Those rows are already scoped by the selected branch request.
        return !rackBranchId || !selectedBranch ||
          String(rackBranchId) === String(selectedBranch);
      }),
    [rackResponse, selectedBranch],
  );

  const refreshRacks = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["racks", "product-options", selectedBranch],
    });
  };

  const addRack = async () => {
    if (!selectedBranch) {
      toast.error("Select a branch before adding a rack.");
      return;
    }

    if (!rackForm.rack_code.trim())
      return toast.error("Rack code is required.");
    setRackSaving(true);
    try {
      const response = await api.post(
        "/racks/",
        {
          branch: Number(selectedBranch),
          rack_code: rackForm.rack_code.trim(),
          rack_name: rackForm.rack_name.trim(),
          is_active: true,
        },
        { skipGlobalErrorToast: true },
      );
      const created = unwrap(response);
      await refreshRacks();

      if (rackTargetVariantIndex !== null) {
        setVariants((current) =>
          current.map((variant, index) =>
            index === rackTargetVariantIndex
              ? {
                  ...variant,
                  racks: Array.from(
                    new Set([...(variant.racks || []), String(created.id)]),
                  ),
                }
              : variant,
          ),
        );
      }

      setRackForm({ rack_code: "", rack_name: "" });
      setShowRackForm(false);
      setRackTargetVariantIndex(null);
      toast.success("Rack added and assigned to the variant.");
    } catch (error) {
      const message =
        error?.response?.data?.rack_code?.[0] ||
        error?.response?.data?.detail ||
        "Unable to add rack.";
      toast.error(message);
    } finally {
      setRackSaving(false);
    }
  };

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
      supplier: relatedId(product, "supplier"),
      has_variants: Boolean(product.has_variants),
      compatible_models: product.compatible_models || "",
      condition: product.condition || "NEW",
      unit: product.unit || "PCS",
      tax_treatment: product.tax_treatment || "VAT",
      vat_inclusive:
        (product.tax_treatment || "VAT") === "VAT"
          ? (product.vat_inclusive ?? true)
          : false,
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
    console.groupEnd();
    reset(values);
    const apiVariants = (product.variants || []).map(variantFromApi);
    // For older single-configuration products, the detail API may expose
    // rack IDs on the base stock row rather than its variant relation.
    const productRackIds = normalizedRackIds(product.racks);
    const stockRackIds = normalizedRackIds(
      Array.isArray(product.stocks)
        ? product.stocks.flatMap((stock) => stock.racks || stock.rack_details || [])
        : [],
    );
    // For non-variant products stock is stored with variant_id=null.
    // Use the actual stock balance when supplied by the detail API.
    const stockRows = Array.isArray(product.stocks) ? product.stocks : [];
    const hydratedVariants = apiVariants.map((variant) => {
      const matchingStock = stockRows.find((stock) =>
        product.has_variants
          ? String(stock.variant_id ?? stock.variant ?? "") === String(variant.id)
          : (stock.variant_id == null && stock.variant == null)
      );
      return matchingStock
        ? { ...variant, initial_stock: Number(matchingStock.current_stock ?? variant.initial_stock ?? 0) }
        : variant;
    });
    const savedVariants = hydratedVariants.length ? hydratedVariants : [{ ...emptyBaseStock }];
    if (!product.has_variants && savedVariants.length === 1 && !savedVariants[0].racks.length) {
      savedVariants[0] = {
        ...savedVariants[0],
        racks: productRackIds.length ? productRackIds : stockRackIds,
      };
    }
    setVariants(savedVariants);
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

    const previousBranch = previousBranchRef.current;
    if (isEdit && !hydratedRef.current) {
      previousBranchRef.current = String(selectedBranch);
      return;
    }

    if (previousBranch && String(previousBranch) !== String(selectedBranch)) {
      console.log(
        "[Product Form] Branch changed manually. Clearing variant racks.",
        {
          previousBranch,
          selectedBranch,
        },
      );

      setVariants((current) =>
        current.map((variant) => ({ ...variant, racks: [] })),
      );
      setValue("supplier", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("sku");
    }

    previousBranchRef.current = String(selectedBranch);
  }, [selectedBranch, setValue, clearErrors, isEdit]);

  const updateVariant = (index, field, value) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );

  const toggleVariantRack = (variantIndex, rackId) => {
    const normalizedRackId = String(rackId);

    setVariants((current) =>
      current.map((variant, index) => {
        if (index !== variantIndex) return variant;

        const currentRacks = (variant.racks || []).map(String);
        const nextRacks = currentRacks.includes(normalizedRackId)
          ? currentRacks.filter((id) => id !== normalizedRackId)
          : [...currentRacks, normalizedRackId];

        return { ...variant, racks: nextRacks };
      }),
    );
  };
  const getVariantCombinationError = (variant, index) => {
    const combinationNumber = index + 1;
    const attributes = variant.attributes || [];

    if (!attributes.length) {
      return `Complete attribute combination ${combinationNumber} first.`;
    }

    const hasEmptyAttribute = attributes.some(
      (attribute) =>
        !String(attribute.name || "").trim() ||
        !String(attribute.value || "").trim(),
    );

    if (hasEmptyAttribute) {
      return `Complete all attribute names and values in combination ${combinationNumber} first.`;
    }

    const normalizedNames = attributes.map((attribute) =>
      String(attribute.name || "")
        .trim()
        .toLowerCase(),
    );

    if (new Set(normalizedNames).size !== normalizedNames.length) {
      return `Combination ${combinationNumber} contains duplicate attribute names.`;
    }

    return "";
  };

  const addVariant = () => {
    const invalidIndex = variants.findIndex((variant, index) =>
      Boolean(getVariantCombinationError(variant, index)),
    );

    if (invalidIndex !== -1) {
      toast.error(
        getVariantCombinationError(variants[invalidIndex], invalidIndex),
      );
      return;
    }

    setVariants((current) => [
      ...current,
      { ...emptyBaseStock, attributes: [{ name: "", value: "" }] },
    ]);
  };
  const duplicateVariant = (index) => {
    const source = variants[index];
    if (!source) return;
    // Do not copy the database ID or existing stock balance into a new row.
    const duplicate = {
      ...source,
      id: undefined,
      attributes: (source.attributes || []).map((a) => ({ ...a })),
      racks: [...(source.racks || [])],
      initial_stock: 0,
    };
    setVariants((current) => [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)]);
    setCollapsedVariants([]);
    toast.info("Variant duplicated. Change its attributes before saving.");
  };
  const removeVariant = (index) => {
    if (variants.length < 2) return;
    const variant = variants[index];
    if (variant?.id && !window.confirm("Remove this saved variant? Its existing configuration may be affected when you save.")) return;
    setVariants((current) => current.filter((_, i) => i !== index));
    setCollapsedVariants([]);
  };
  const toggleCollapsedVariant = (index) =>
    setCollapsedVariants((current) => current.includes(index)
      ? current.filter((value) => value !== index)
      : [...current, index]);
  const addAttribute = (variantIndex) => {
    const variant = variants[variantIndex];
    const attributes = variant?.attributes || [];

    const hasIncompleteAttribute = attributes.some(
      (attribute) =>
        !String(attribute.name || "").trim() ||
        !String(attribute.value || "").trim(),
    );

    if (hasIncompleteAttribute) {
      toast.error(
        `Complete the existing attribute in combination ${variantIndex + 1} first.`,
      );
      return;
    }

    setVariants((current) =>
      current.map((item, i) =>
        i === variantIndex
          ? {
              ...item,
              attributes: [...item.attributes, { name: "", value: "" }],
            }
          : item,
      ),
    );
  };
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
      const normalizedSku = String(values.sku || "").trim();
      const branchLabel = physicalBranchLabel(values.branch);

      // Frontend preflight for immediate feedback. Backend performs the same
      // validation against the physical database, so this is not the security
      // or consistency boundary.
      try {
        const response = await api.get("/products/", {
          params: {
            branch: Number(values.branch),
            search: normalizedSku,
            page_size: 100,
          },
          skipGlobalErrorToast: true,
        });
        const duplicate = list(response).find(
          (item) =>
            String(item.sku || "")
              .trim()
              .toLowerCase() === normalizedSku.toLowerCase() &&
            (!isEdit || String(item.id) !== String(id)),
        );
        if (duplicate) {
          const message = `${normalizedSku} already exists in ${branchLabel}.`;
          setError("sku", { type: "validate", message });
          toast.error(message);
          return;
        }
        clearErrors("sku");
      } catch (preflightError) {
        // Do not block saving if the availability lookup itself fails. The
        // backend still performs authoritative same-database validation.
        console.warn("[Product Form] SKU preflight failed:", preflightError);
      }

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
          racks: (variant.racks || []).map((rackId) => Number(rackId)),
          // Initial quantity is only valid at creation. Existing stock must
          // never be resubmitted as opening stock during a price edit.
          ...(!isEdit ? { initial_stock: Math.max(0, Number(variant.initial_stock || 0)) } : {}),
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

      if (hasVariants) {
        const seen = new Set();
        for (const [index, variant] of normalizedVariants.entries()) {
          const signature = JSON.stringify(Object.entries(variant.attributes || {})
            .map(([name, value]) => [name.trim().toLowerCase(), String(value).trim().toLowerCase()])
            .sort(([a], [b]) => a.localeCompare(b)));
          if (seen.has(signature)) {
            throw new Error(`Variant ${index + 1} duplicates another attribute combination. Change its attributes before saving.`);
          }
          seen.add(signature);
        }
      }

      const formData = new FormData();
      const payload = {
        product_name: values.product_name.trim(),
        sku: normalizedSku,
        barcode: values.barcode?.trim() || "",
        brand: Number(values.brand),
        category: Number(values.category),
        branch: Number(values.branch),
        supplier: values.supplier ? Number(values.supplier) : "",
        has_variants: Boolean(values.has_variants),
        compatible_models: values.compatible_models?.trim() || "",
        condition: values.condition,
        unit: values.unit,
        tax_treatment: values.tax_treatment,
        vat_inclusive:
          values.tax_treatment === "VAT"
            ? Boolean(values.vat_inclusive)
            : false,
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

      if (isEdit) {
        await api.patch(`/products/${id}/`, formData, {
          params: { branch: Number(values.branch) },
        });
      } else {
        await api.post("/products/", formData);
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", id] });
      await queryClient.invalidateQueries({
        queryKey: ["sales-invoice-form-options"],
      });

      toast.success(
        isEdit
          ? "Product updated successfully."
          : "Product created successfully.",
      );

      navigate(!isEdit ? returnTo : "/inventory/products");
    } catch (error) {
      console.error("[Product Form] Save failed:", error);
      const responseData = error?.response?.data || {};
      const skuError =
        responseData?.sku?.[0] ||
        responseData?.sku ||
        responseData?.errors?.sku?.[0] ||
        responseData?.errors?.sku ||
        responseData?.data?.sku?.[0] ||
        responseData?.data?.sku;

      if (skuError) {
        const message = String(skuError);
        setError("sku", { type: "server", message });
        toast.error(message);
        return;
      }

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
        const before = Number(
          original?.available_qty ?? original?.total_quantity ?? 0,
        );
        const after = Number(variant.initial_stock || 0);
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
    <div className="w-full space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/20 bg-gradient-to-r from-[#082a4a] via-[#0d4678] to-[#2e7197] text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-300 shadow-inner backdrop-blur">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.18em] !text-sky-200"
                style={{ color: "#bae6fd" }}
              >
                Product management
              </p>
              <h1
                className="mt-1 text-2xl font-extrabold tracking-tight !text-white sm:text-3xl"
                style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
              >
                {isEdit ? "Edit product" : "Create product"}
              </h1>
              <p
                className="mt-2 max-w-2xl text-sm leading-6 !text-slate-100"
                style={{ color: "#f1f5f9" }}
              >
                Maintain catalogue details, branch stock, rack placement,
                variants, tax and selling prices.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => navigate(!isEdit ? returnTo : "/inventory/products")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {returnTo.startsWith("/sales/invoices")
              ? "Back to Invoice"
              : "Back to products"}
          </Button>
        </div>
      </section>

      <form
        onSubmit={handleSubmit(requestSubmit, (formErrors) => {
          console.error("[Product Form] Validation failed:", formErrors);

          toast.error("Please complete the required fields.");
        })}
        className="space-y-6"
      >
        <section aria-label="Product branch selection" className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d4678] text-sm font-bold text-white">1</span>
            <div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Choose product branch</h2><p className="text-xs text-slate-500 dark:text-slate-400">All subsequent options belong to this branch.</p></div>
          </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/[0.07] sm:p-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Branch</h3>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Choose the physical branch first. Brand, category, supplier and rack options use its tenant schema.
                </p>
              </div>

              {isEdit ? (
                <div className="rounded-xl border border-sky-200 bg-white/90 p-4 text-sm font-medium text-slate-800 dark:border-sky-500/20 dark:bg-slate-900 dark:text-slate-100">
                  {physicalBranches.find((b) => String(b.id) === String(selectedBranch))?.branch_code || "Branch"} — {physicalBranchLabel(selectedBranch)}
                  <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">Branch ownership is fixed after product creation.</p>
                </div>
              ) : isCombinedHeader ? (
                <div>
                  <Label>Target physical branch *</Label>
                  <select
                    value={selectedBranch || ""}
                    onChange={(event) =>
                      setValue("branch", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select a physical branch</option>
                    {physicalBranches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.branch_code || branch.tax_mode}
                        {branch.branch_name ? ` - ${branch.branch_name}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Consolidated is a combined view only. Suppliers and racks are
                    loaded from the physical branch selected here.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-sky-200 bg-white/80 p-4 text-sm text-slate-700 dark:border-sky-500/20 dark:bg-slate-900/60 dark:text-slate-200">
                  Branch is automatically selected from the global branch
                  filter.
                  {!selectedBranch ? (
                    <p className="mt-2 font-semibold text-amber-700 dark:text-amber-300">
                      Select a physical branch from the top branch filter
                      before saving this product.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/70 shadow-xl shadow-black/10">
          <div className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              2. Product information
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Enter the product details after choosing its destination branch.
            </p>
          </div>

          <div className="space-y-7 p-6">
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
              <Label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <ImagePlus className="h-4 w-4 text-blue-500" /> Product image
              </Label>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-3 text-center text-xs text-slate-500 dark:text-slate-500">
                      No image selected
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="cursor-pointer border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 file:mr-4 file:rounded-md file:border-0 file:bg-amber-400 file:text-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950 dark:text-white hover:file:bg-blue-700"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;

                      setImage(file);

                      if (file) {
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
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
                  className="mt-2 h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
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
                  className="mt-2 h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
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
                  placeholder="Automatically generated as GHZ... if left empty"
                  className="mt-2 h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
                />
                <p className="mt-1 text-xs text-slate-500">Leave blank to assign a unique GHZ barcode when saving. Download the scannable label from Product Details.</p>
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
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                <Label htmlFor="product-supplier">Supplier</Label>
                <select
                  id="product-supplier"
                  {...register("supplier")}
                  disabled={!selectedBranch || suppliersLoading}
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">{!selectedBranch ? "Select branch first" : suppliersLoading ? "Loading branch suppliers…" : "No supplier"}</option>

                  {suppliers.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.supplier_name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 min-h-4 text-xs text-slate-500 dark:text-slate-400">Only suppliers from the selected physical branch are listed.</p>
                {selectedBranch && !suppliersLoading && suppliers.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">No active suppliers found for this branch. Create a supplier in Purchases → Suppliers first.</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <Label>Compatible models</Label>

                <Input
                  {...register("compatible_models")}
                  placeholder="e.g. Dell Latitude 5420"
                  className="mt-2 h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
                />
              </div>

              <div>
                <Label>Condition</Label>

                <select
                  {...register("condition")}
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                className="mt-2 min-h-28 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
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
                    className="h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80 pr-14"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-500">
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
                  className="mt-2 h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/80"
                />
              </div>

              <div>
                <Label>Tax treatment</Label>

                <select
                  {...register("tax_treatment")}
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm dark:border-white/10 dark:bg-slate-900/80"
                  onChange={(event) => {
                    setValue("tax_treatment", event.target.value);
                    if (event.target.value !== "VAT") {
                      setValue("vat_inclusive", false);
                    }
                  }}
                >
                  <option value="VAT">VAT (5%)</option>
                  <option value="ZERO_VAT">Zero VAT (0%)</option>
                  <option value="NON_VAT">Non-VAT</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    VAT inclusive
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Prices already include VAT.
                  </p>
                </div>

                <Switch
                  checked={
                    watch("tax_treatment") === "VAT" &&
                    Boolean(watch("vat_inclusive"))
                  }
                  disabled={watch("tax_treatment") !== "VAT"}
                  onCheckedChange={(value) => setValue("vat_inclusive", value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Product variants
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
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

              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Active product
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-500">
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.025]">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {hasVariants
                  ? "Product variants"
                  : "Stock & pricing"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {hasVariants
                  ? "Define each configuration, then set its stock, prices and rack locations in separate panels."
                  : "Set the opening stock, selling prices and rack locations in clearly separated panels."}
              </p>
            </div>

            {hasVariants ? (
              <Button
                type="button"
                variant="outline"
                onClick={addVariant}
                className="border-blue-500/30 bg-blue-500/5 text-blue-700 hover:bg-blue-500/10 hover:text-blue-800 dark:text-blue-200 dark:hover:text-blue-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add combination
              </Button>
            ) : null}
          </div>

          <div className="space-y-5 p-6">
            {(hasVariants ? variants : [variants[0] || emptyBaseStock]).map(
              (variant, variantIndex) => (
                <div
                  key={variant.id || variantIndex}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950 dark:shadow-black/10"
                >
                  {hasVariants ? (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.025]">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          Variant {variantIndex + 1}
                        </p>
                        <p className="mt-0.5 max-w-xl break-words text-xs text-slate-500">
                          {(variant.attributes || []).filter((a) => a.name && a.value)
                            .map((a) => `${a.name}: ${a.value}`).join(" · ") || "Add configuration attributes"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button type="button" size="sm" variant="ghost"
                          aria-label={`Duplicate variant ${variantIndex + 1}`}
                          title="Duplicate variant" onClick={() => duplicateVariant(variantIndex)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost"
                          aria-label={`${collapsedVariants.includes(variantIndex) ? "Expand" : "Collapse"} variant ${variantIndex + 1}`}
                          onClick={() => toggleCollapsedVariant(variantIndex)}>
                          {collapsedVariants.includes(variantIndex) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                        <Button type="button" size="sm" variant="ghost"
                          aria-label={`Remove variant ${variantIndex + 1}`}
                          onClick={() => removeVariant(variantIndex)}
                          disabled={variants.length === 1}
                          className="text-red-500 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {(!hasVariants || !collapsedVariants.includes(variantIndex)) && (
                  <div className="space-y-5 p-5">
                    {hasVariants ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/[0.04] dark:shadow-none">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Variant attributes</h3>
                        <p className="mb-3 mt-1 text-xs text-slate-500">Describe this configuration (for example RAM: 16 GB or Colour: Black). Pricing is set separately below.</p>
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
                                  className="h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
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
                                  className="h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
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
                          className="mt-3 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.025]"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add attribute
                        </Button>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04]">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Stock quantity</h3>
                      <p className="mb-3 mt-1 text-xs text-slate-500">{isEdit ? "Current quantity is read-only; use stock adjustments to change it." : "Set the opening quantity for this configuration."}</p>
                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] p-3">
                        <Label className="text-emerald-700 dark:text-emerald-100">
                          {isEdit ? "Current quantity (read-only)" : "Initial quantity"}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.initial_stock ?? 0}
                          readOnly={isEdit}
                          onChange={(event) =>
                            updateVariant(
                              variantIndex,
                              "initial_stock",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 border-emerald-500/20 bg-white dark:bg-slate-950/80"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Product pricing</h3>
                      <p className="mt-1 mb-4 text-xs text-slate-500">All amounts in AED. Purchase cost and selling price levels are managed independently from stock and variant attributes.</p>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                          className="mt-2 h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
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
                          className="mt-2 h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
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
                          className="mt-2 h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
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
                          className="mt-2 h-11 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
                        />
                      </div>
                      </div>
                    </div>

                    {/* Rack assignments are separate from prices and quantity. */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.06]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-semibold">Rack locations</Label>
                              {(variant.racks || []).length ? (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                                  {(variant.racks || []).length}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Assign one or more rack locations for this {hasVariants ? "variant" : "product"}.
                            </p>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 shrink-0 px-2 text-xs text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/10"
                            disabled={!selectedBranch}
                            onClick={() => {
                              setRackTargetVariantIndex(variantIndex);
                              setRackForm({ rack_code: "", rack_name: "" });
                              setShowRackForm(true);
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            New
                          </Button>
                        </div>

                        <div className="relative mt-3">
                          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input value={rackSearch} onChange={(event) => setRackSearch(event.target.value)}
                            aria-label="Search rack locations" placeholder="Search rack code or name"
                            className="h-10 pl-9" disabled={!selectedBranch || racksLoading} />
                        </div>
                        <Select
                          value=""
                          disabled={!selectedBranch || racksLoading || Boolean(racksError)}
                          onValueChange={(rackId) => {
                            if (!(variant.racks || []).map(String).includes(rackId)) {
                              toggleVariantRack(variantIndex, rackId);
                            }
                          }}
                        >
                          <SelectTrigger
                            aria-label={`Add rack to ${hasVariants ? `variant ${variantIndex + 1}` : "product"}`}
                            className="mt-3 h-11 w-full border-blue-200 bg-white text-left dark:border-blue-500/20 dark:bg-slate-950/70"
                          >
                            <SelectValue
                              placeholder={
                                racksLoading
                                  ? "Loading racks..."
                                  : !selectedBranch
                                    ? "Select branch first"
                                    : racksError
                                      ? "Unable to load racks"
                                      : racks.length
                                        ? "Add a rack location"
                                        : "No racks available"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {racks.filter((rack) => `${rack.rack_code || ""} ${rack.rack_name || ""}`
                              .toLowerCase().includes(rackSearch.trim().toLowerCase())).map((rack) => (
                              <SelectItem
                                key={rack.id}
                                value={String(rack.id)}
                                disabled={(variant.racks || []).map(String).includes(String(rack.id))}
                              >
                                {rack.rack_code}
                                {rack.rack_name ? ` — ${rack.rack_name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(variant.racks || []).length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(variant.racks || []).map((rackId) => {
                              const selectedRack = racks.find(
                                (rack) => String(rack.id) === String(rackId),
                              ) || (product?.variants || []).flatMap(
                                (item) => item.rack_details || [],
                              ).find((rack) => String(rack.id ?? rack.rack_id) === String(rackId));

                              return (
                                <span
                                  key={rackId}
                                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/20 dark:bg-slate-950/60 dark:text-blue-300"
                                >
                                  <span className="min-w-0 break-all">
                                    {selectedRack?.rack_code ||
                                      `Rack #${rackId}`}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-blue-600 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-red-500/10"
                                    title="Remove rack"
                                    aria-label={`Remove rack ${selectedRack?.rack_code || rackId}`}
                                    onClick={() =>
                                      toggleVariantRack(variantIndex, rackId)
                                    }
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-lg border border-dashed border-blue-200 px-3 py-3 text-xs text-slate-500 dark:border-blue-500/20">
                            No rack locations selected yet.
                          </p>
                        )}

                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          Rack assignments are shared locations for this configuration. Stock quantity is not divided by rack in the current inventory model.
                        </p>

                        {racksError ? (
                          <p className="mt-2 text-xs text-red-500">
                            Unable to load racks for this branch.
                          </p>
                        ) : null}
                      </div>
                  </div>
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        {showRackForm && (
          <Dialog
            open={showRackForm}
            onOpenChange={(open) => {
              setShowRackForm(open);
              if (!open) {
                setRackTargetVariantIndex(null);
                setRackForm({ rack_code: "", rack_name: "" });
              }
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Rack</DialogTitle>
                <DialogDescription>
                  Create a rack for the selected branch. It will be assigned
                  automatically to this variant.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div>
                  <Label>Rack Code *</Label>
                  <Input
                    className="mt-2"
                    value={rackForm.rack_code}
                    onChange={(event) =>
                      setRackForm((current) => ({
                        ...current,
                        rack_code: event.target.value,
                      }))
                    }
                    placeholder="e.g. RACK-A01"
                    autoFocus
                  />
                </div>

                <div>
                  <Label>Rack Name</Label>
                  <Input
                    className="mt-2"
                    value={rackForm.rack_name}
                    onChange={(event) =>
                      setRackForm((current) => ({
                        ...current,
                        rack_name: event.target.value,
                      }))
                    }
                    placeholder="Optional rack name"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRackForm(false)}
                  disabled={rackSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={addRack} disabled={rackSaving}>
                  {rackSaving ? "Saving..." : "Add Rack"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(!isEdit ? returnTo : "/inventory/products")}
            disabled={isSubmitting}
            className="sm:min-w-28"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-44 rounded-xl bg-amber-400 font-bold text-slate-950 shadow-lg hover:bg-amber-300"
          >
            {isSubmitting ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isEdit ? "Save changes" : "Create product"}
              </>
            )}
          </Button>
        </div>
      </form>

      <Dialog open={stockConfirmOpen} onOpenChange={setStockConfirmOpen}>
        <DialogContent className="border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 sm:max-w-lg">
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
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] p-4"
              >
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">
                    {change.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
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
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              Confirm and update stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
