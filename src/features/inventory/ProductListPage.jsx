import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Barcode as BarcodeIcon,
  Eye,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import api, { getApiErrorMessage, unwrap } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getResults = (response) => {
  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data?.results || [];
};

const getProductImage = (product) =>
  product?.product_image_url || product?.product_image || null;

const getAvailableQuantity = (product) => {
  // The backend calculates this value from ProductStock rows belonging to
  // the currently selected branch. It is the authoritative branch quantity.
  const branchTotal = Number(product?.total_available_qty);

  if (Number.isFinite(branchTotal)) {
    return Math.max(0, branchTotal);
  }

  // Compatibility fallback for older API responses that do not yet include
  // total_available_qty.
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  if (variants.length) {
    return variants.reduce((total, variant) => {
      const quantity = Number(variant?.available_qty ?? 0);
      return total + (Number.isFinite(quantity) ? Math.max(0, quantity) : 0);
    }, 0);
  }

  const fallback = Number(product?.available_qty ?? 0);
  return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
};

const getRelatedName = (value, fallback) => {
  if (value && typeof value === "object") {
    return value.name || fallback || "—";
  }

  return fallback || value || "—";
};

export default function ProductListPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { branchId, isAllBranches } = useActiveBranchFilter();

  const page = Number(searchParams.get("page") || 1);
  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";
  const debouncedSearch = useDebouncedValue(search, 350);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, String(value));
    } else {
      next.delete(key);
    }

    if (key !== "page") {
      next.set("page", "1");
    }

    setSearchParams(next);
  };

  const brandsQuery = useQuery({
    queryKey: ["brands", "product-filter"],
    queryFn: async () =>
      getResults(
        await api.get("/brands/", {
          params: {
            page_size: 500,
            is_active: true,
          },
        }),
      ),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "product-filter"],
    queryFn: async () =>
      getResults(
        await api.get("/categories/", {
          params: {
            page_size: 500,
            is_active: true,
          },
        }),
      ),
  });

  const productsQuery = useQuery({
    queryKey: [
      "products",
      isAllBranches ? "all-branches" : branchId,
      page,
      debouncedSearch,
      brand,
      category,
    ],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page: isAllBranches ? undefined : page,
            page_size: isAllBranches ? 1000 : 12,
            search: debouncedSearch || undefined,
            brand: brand || undefined,
            category: category || undefined,
            branch: branchId || undefined,
          },
        }),
      ),
    keepPreviousData: true,
  });

  const allBranchStockQuery = useQuery({
    queryKey: [
      "product-list-all-branch-stock",
      debouncedSearch,
      brand,
      category,
    ],
    enabled: isAllBranches,
    queryFn: async () =>
      unwrap(
        await api.get("/inventory/stock/", {
          params: {
            page_size: 5000,
            search: debouncedSearch || undefined,
            brand: brand || undefined,
            category: category || undefined,
          },
        }),
      ),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const productData = useMemo(() => {
    const data = productsQuery.data;
    const products = Array.isArray(data) ? data : data?.results || [];

    if (!isAllBranches) {
      return {
        results: products,
        count: data?.count || products.length,
      };
    }

    const stockData = allBranchStockQuery.data;
    const stockGroups = Array.isArray(stockData)
      ? stockData
      : stockData?.results || [];

    const productById = new Map(
      products.map((product) => [String(product.id), product]),
    );

    const productBySku = new Map(
      products
        .filter((product) => product.sku)
        .map((product) => [String(product.sku), product]),
    );

    /*
     * All branches mode:
     * Aggregate all base-stock and attribute rows into one Product + Branch
     * row. This prevents the same product from appearing multiple times in
     * the same branch.
     */
    const branchRowMap = new Map();

    stockGroups.forEach((group) => {
      const productId = group.product_id ?? group.product?.id ?? group.id;

      const product = productById.get(String(productId)) ||
        productBySku.get(String(group.sku || group.product_sku || "")) || {
          id: productId,
          product_name: group.product_name,
          sku: group.sku || group.product_sku,
          barcode: group.barcode,
          brand_name: group.brand_name,
          category_name: group.category_name,
          retail_price: group.retail_price,
          is_active: group.is_active !== false,
        };

      const branchStocks = Array.isArray(group.branch_stocks)
        ? group.branch_stocks
        : [];

      branchStocks.forEach((stock) => {
        const branchIdValue =
          stock.branch_id ?? stock.branch?.id ?? stock.branch;

        if (!branchIdValue) {
          return;
        }

        const rowKey = `${product.id}-${branchIdValue}`;

        const currentRow = branchRowMap.get(rowKey) || {
          ...product,
          row_key: rowKey,
          branch_id: branchIdValue,
          branch_code:
            stock.branch_code ||
            stock.branch?.branch_code ||
            stock.branch?.code ||
            "",
          branch_name:
            stock.branch_name ||
            stock.branch?.branch_name ||
            stock.branch?.name ||
            "",
          rack_codes: new Set(),
          rack_names: new Set(),
          total_available_qty: 0,
          total_available_regular: 0,
          total_available_restricted: 0,
          stock_row_count: 0,
        };

        const availableQuantity = Number(
          stock.total_available_quantity ??
            stock.available_stock ??
            stock.available_qty ??
            stock.current_stock ??
            stock.quantity ??
            0,
        );

        const regularAvailable = Number(stock.available_regular_quantity ?? 0);

        const restrictedAvailable = Number(
          stock.available_restricted_quantity ?? 0,
        );

        const rackCode =
          stock.rack_code || stock.rack?.rack_code || stock.rack?.code || "";

        const rackName =
          stock.rack_name || stock.rack?.rack_name || stock.rack?.name || "";

        if (rackCode) {
          currentRow.rack_codes.add(rackCode);
        }

        if (rackName) {
          currentRow.rack_names.add(rackName);
        }

        currentRow.total_available_qty += Number.isFinite(availableQuantity)
          ? Math.max(0, availableQuantity)
          : 0;

        currentRow.total_available_regular += Number.isFinite(regularAvailable)
          ? Math.max(0, regularAvailable)
          : 0;

        currentRow.total_available_restricted += Number.isFinite(
          restrictedAvailable,
        )
          ? Math.max(0, restrictedAvailable)
          : 0;

        currentRow.stock_row_count += 1;

        branchRowMap.set(rowKey, currentRow);
      });
    });

    const rows = Array.from(branchRowMap.values()).map((row) => ({
      ...row,
      rack_code: Array.from(row.rack_codes).join(", "),
      rack_name: Array.from(row.rack_names).join(", "),
    }));

    products.forEach((product) => {
      const alreadyIncluded = rows.some(
        (row) => String(row.id) === String(product.id),
      );

      if (!alreadyIncluded) {
        rows.push({
          ...product,
          row_key: `${product.id}-unassigned`,
          branch_code: product.branch_code || product.branch?.branch_code || "",
          branch_name: product.branch_name || product.branch?.branch_name || "",
          total_available_qty: 0,
          total_available_regular: 0,
          total_available_restricted: 0,
          stock_row_count: 0,
        });
      }
    });

    rows.sort((first, second) => {
      const nameCompare = String(first.product_name || "").localeCompare(
        String(second.product_name || ""),
      );

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return String(first.branch_code || first.branch_name || "").localeCompare(
        String(second.branch_code || second.branch_name || ""),
      );
    });

    const start = (page - 1) * 12;

    return {
      results: rows.slice(start, start + 12),
      count: rows.length,
    };
  }, [productsQuery.data, allBranchStockQuery.data, isAllBranches, page]);

  const deleteMutation = useMutation({
    mutationFn: async (productId) => api.delete(`/products/${productId}/`),
    onSuccess: () => {
      toast.success("Product deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock"] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      if (!error?.__apiErrorShown) {
        toast.error(getApiErrorMessage(error, "Unable to delete product."));
      }
    },
  });

  const columns = [
    {
      key: "product",
      header: "Product",
      cell: (product) => {
        const image = getProductImage(product);

        return (
          <Link
            to={`/inventory/products/${product.id}`}
            className="flex items-center gap-3"
          >
            {image ? (
              <img
                src={image}
                alt={product.product_name || "Product"}
                className="h-10 w-10 rounded-md object-cover ring-1 ring-white/5"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/5">
                <Package className="h-4 w-4 text-slate-500" />
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-slate-100">
                {product.product_name}
              </div>

              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                <BarcodeIcon className="h-3 w-3" />
                {product.barcode || "No barcode"}
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      key: "sku",
      header: "SKU",
      cell: (product) => (
        <span className="font-numeric text-slate-300">
          {product.sku || "—"}
        </span>
      ),
    },
    {
      key: "brand",
      header: "Brand",
      cell: (product) => getRelatedName(product.brand, product.brand_name),
    },
    {
      key: "category",
      header: "Category",
      cell: (product) =>
        getRelatedName(product.category, product.category_name),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (product) => product.branch_code || product.branch_name || "—",
    },
    {
      key: "available_qty",
      header: "Available Qty",
      align: "right",
      cell: (product) => (
        <div className="text-right">
          <span
            className="font-numeric font-medium text-slate-200"
            title={
              isAllBranches
                ? `Regular: ${Number(
                    product.total_available_regular || 0,
                  )}, Restricted: ${Number(
                    product.total_available_restricted || 0,
                  )}`
                : undefined
            }
          >
            {getAvailableQuantity(product)}
          </span>

          {isAllBranches && Number(product.stock_row_count || 0) > 1 && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              Total across attributes
            </p>
          )}
        </div>
      ),
    },
    {
      key: "rack_location",
      header: "Rack",
      cell: (product) => (
        <span className="font-numeric text-xs font-bold text-slate-200">
          {product.rack_code || product.rack_name || "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      cell: (product) => (
        <StatusBadge
          status={product.is_active ? "active" : "closed"}
          label={product.is_active ? "Active" : "Inactive"}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (product) => (
        <div className="flex justify-end gap-1">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon"
            title="View product"
          >
            <Link to={`/inventory/products/${product.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon"
            title="Edit product"
          >
            <Link to={`/inventory/products/${product.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Delete product"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setDeleteTarget(product)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Laptop spare parts catalog"
        actions={
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="new-product-btn"
          >
            <Link to="/inventory/products/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New product
            </Link>
          </Button>
        }
      />

      {isAllBranches && (
        <div className="mb-4 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          All Branches is selected. Each product is shown once per branch, with
          the available quantity totalled across all attributes.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[240px] flex-1">
          <SearchInput
            value={search}
            onChange={(value) => updateParam("search", value)}
            placeholder="Search name, SKU, barcode or model…"
          />
        </div>

        <Select
          value={brand || "all"}
          onValueChange={(value) =>
            updateParam("brand", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-9 w-44 border-white/10 bg-white/[0.02] text-sm">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>

            {(brandsQuery.data || []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category || "all"}
          onValueChange={(value) =>
            updateParam("category", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-9 w-48 border-white/10 bg-white/[0.02] text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>

            {(categoriesQuery.data || []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || brand || category) && (
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => setSearchParams({ page: "1" })}
          >
            Clear filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={productData.results}
        isLoading={
          productsQuery.isLoading ||
          (isAllBranches && allBranchStockQuery.isLoading)
        }
        page={page}
        total={productData.count}
        onPageChange={(nextPage) => updateParam("page", nextPage)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
        title="Delete product?"
        description={`Are you sure you want to delete ${
          deleteTarget?.product_name || "this product"
        }? This action cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        onConfirm={() => {
          if (deleteTarget?.id) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
