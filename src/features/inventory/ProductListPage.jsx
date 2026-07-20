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
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { CurrencyText } from "@/components/common/CurrencyText";
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
    queryKey: ["products", page, debouncedSearch, brand, category],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: {
            page,
            page_size: 20,
            search: debouncedSearch || undefined,
            brand: brand || undefined,
            category: category || undefined,
          },
        }),
      ),
    keepPreviousData: true,
  });

  const productData = useMemo(() => {
    const data = productsQuery.data;

    if (Array.isArray(data)) {
      return {
        results: data,
        count: data.length,
      };
    }

    return {
      results: data?.results || [],
      count: data?.count || 0,
    };
  }, [productsQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: async (productId) => api.delete(`/products/${productId}/`),
    onSuccess: () => {
      toast.success("Product deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      key: "purchase_price",
      header: "Purchase",
      align: "right",
      cell: (product) => <CurrencyText value={product.purchase_price} />,
    },
    {
      key: "retail_price",
      header: "Retail",
      align: "right",
      cell: (product) => (
        <CurrencyText value={product.retail_price} className="text-slate-100" />
      ),
    },
    {
      key: "rack_location",
      header: "Rack",
      cell: (product) => (
        <span className="font-numeric text-xs text-slate-400">
          {product.rack_location || "—"}
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
        isLoading={productsQuery.isLoading}
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
