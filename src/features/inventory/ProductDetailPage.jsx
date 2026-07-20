import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Barcode as BarcodeIcon, Boxes, Pencil, Printer } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";

const relatedName = (value, fallback) => {
  if (value && typeof value === "object") return value.name || fallback || "—";
  return fallback || value || "—";
};

const modelList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function ProductDetailPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`)),
  });

  if (isLoading) return <LoadingState />;

  const product = data || {};
  const variants = product.variants || [];
  const image = product.product_image_url || product.product_image;
  const compatibleModels = modelList(product.compatible_models);

  return (
    <div>
      <PageHeader
        title={product.product_name || "Product"}
        subtitle={`SKU ${product.sku || "—"} · ${relatedName(
          product.brand,
          product.brand_name,
        )} · ${relatedName(product.category, product.category_name)}`}
        actions={
          <>
            <Button variant="outline" data-testid="print-barcode-btn">
              <Printer className="mr-1.5 h-4 w-4" />
              Print barcode
            </Button>
            <Button asChild variant="outline">
              <Link to={`/inventory/products/${id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-1">
          {image ? (
            <img
              src={image}
              alt={product.product_name || "Product"}
              className="h-56 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-lg bg-white/[0.03]">
              <Boxes className="h-10 w-10 text-slate-600" />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <BarcodeIcon className="h-3.5 w-3.5" />
              <span className="font-numeric">
                {product.barcode || "No barcode"}
              </span>
            </span>
            <span>
              Rack{" "}
              <span className="font-numeric text-slate-200">
                {product.rack_location || "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="card-surface space-y-4 p-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Price label="Purchase price" value={product.purchase_price} />
            <Price label="Retail price" value={product.retail_price} />
            <Price label="Wholesale price" value={product.wholesale_price} />
            <Price
              label="Minimum selling"
              value={product.minimum_selling_price}
            />

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Warranty
              </div>
              <div className="mt-0.5 font-numeric text-slate-200">
                {product.warranty_period_days || 0} days
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Reorder level
              </div>
              <div className="mt-0.5 font-numeric text-slate-200">
                {product.reorder_level || 0}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              Compatible models
            </div>
            <div className="flex flex-wrap gap-1.5">
              {compatibleModels.length ? (
                compatibleModels.map((model) => (
                  <span
                    key={model}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {model}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              Description
            </div>
            <p className="text-sm text-slate-300">
              {product.description || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="card-surface mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Product variants
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Variant-specific SKUs, barcodes, attributes, and price overrides.
            </p>
          </div>
          <Badge variant="secondary">{variants.length} variants</Badge>
        </div>

        {variants.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3">Variant</th>
                  <th className="px-3 py-3">Attributes</th>
                  <th className="px-3 py-3">SKU / Barcode</th>
                  <th className="px-3 py-3 text-right">Purchase</th>
                  <th className="px-3 py-3 text-right">Retail</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr
                    key={variant.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-100">
                        {variant.variant_name}
                      </div>
                      {variant.is_default && (
                        <Badge className="mt-1" variant="outline">
                          Default
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(variant.attributes || {}).map(
                          ([name, value]) => (
                            <span
                              key={`${name}-${value}`}
                              className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-300"
                            >
                              {name}: {value}
                            </span>
                          ),
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      <div className="font-numeric text-slate-200">
                        {variant.sku}
                      </div>
                      <div className="mt-1 font-numeric">
                        {variant.barcode || "No barcode"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <CurrencyText value={variant.effective_purchase_price} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <CurrencyText
                        value={variant.effective_retail_price}
                        className="text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={variant.is_active ? "active" : "closed"}
                        label={variant.is_active ? "Active" : "Inactive"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-surface mt-4 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Stock by branch
        </h3>
        {(product.stock_by_branch || []).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.stock_by_branch.map((stock) => (
              <div
                key={stock.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100">
                    {stock.branch?.name || stock.branch_name || "Branch"}
                  </div>
                  <StatusBadge status={stock.status} />
                </div>
                <div className="mt-2 text-2xl font-semibold font-numeric text-white">
                  {stock.quantity ?? stock.current_stock ?? 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Price({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="mt-0.5">
        <CurrencyText value={value} className="text-slate-100" />
      </div>
    </div>
  );
}
