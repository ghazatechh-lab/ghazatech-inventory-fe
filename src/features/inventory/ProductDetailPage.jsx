import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Barcode,
  Boxes,
  Building2,
  CircleDollarSign,
  Layers3,
  MapPin,
  Package,
  Pencil,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";

const money = (value) =>
  value == null || value === "" ? "—" : `AED ${Number(value).toFixed(2)}`;

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.025]">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  </div>
);

export default function ProductDetailPage() {
  const { id } = useParams();
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 p-2">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/5">
        <Package className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
          Product not found
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          The product may have been removed or you may not have access.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/inventory/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to products
          </Link>
        </Button>
      </div>
    );
  }

  const variants = product.variants || [];
  const visibleVariants = product.has_variants
    ? variants.filter((item) => !item.is_base)
    : variants.slice(0, 1);
  const image = product.product_image_url || product.product_image;
  const availableQty = Number(
    product.total_available_qty ?? product.available_qty ?? 0,
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_32%)]" />
        <div className="relative flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Package className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  Product profile
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${product.is_active !== false ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"}`}
                >
                  {product.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <h1
                className="mt-2 truncate text-2xl font-extrabold tracking-tight !text-white sm:text-3xl"
                style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
              >
                {product.product_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Barcode className="h-4 w-4" />
                  {product.sku || "No SKU"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {product.branch_name || "No branch"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Products
              </Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Link to={`/inventory/products/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit product
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Available quantity
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
            {Number.isFinite(availableQty) ? availableQty : 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Current branch stock</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Product type
          </p>
          <p className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
            {product.has_variants ? "With variants" : "Standard"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {visibleVariants.length} stock/pricing record(s)
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Retail price
          </p>
          <p className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
            {money(product.retail_price ?? visibleVariants[0]?.retail_price)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Primary selling price</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Storage rack
          </p>
          <p className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
            {product.rack_code || product.rack_name || "Unassigned"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Physical location</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70 lg:col-span-2">
          <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Product information
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Catalogue, sourcing and storage information.
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem icon={Tag} label="Brand" value={product.brand_name} />
            <DetailItem
              icon={Boxes}
              label="Category"
              value={product.category_name}
            />
            <DetailItem
              icon={Building2}
              label="Branch"
              value={product.branch_name}
            />
            <DetailItem
              icon={MapPin}
              label="Rack"
              value={product.rack_code || product.rack_name}
            />
            <DetailItem
              icon={Truck}
              label="Supplier"
              value={product.supplier_name}
            />
            <DetailItem
              icon={ShieldCheck}
              label="Condition"
              value={product.condition}
            />
            <DetailItem
              icon={Barcode}
              label="Barcode"
              value={product.barcode}
            />
            <DetailItem icon={Layers3} label="Unit" value={product.unit} />
            <DetailItem
              icon={CircleDollarSign}
              label="Tax treatment"
              value={
                product.tax_treatment === "ZERO_VAT"
                  ? "Zero VAT (0%)"
                  : product.tax_treatment === "NON_VAT"
                    ? "Non-VAT"
                    : `VAT (5%) ${product.vat_inclusive ? "inclusive" : "exclusive"}`
              }
            />
          </div>
          {(product.compatible_models || product.description) && (
            <div className="grid gap-4 border-t border-slate-200 p-6 dark:border-white/10 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Compatible models
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {product.compatible_models || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Description
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {product.description || "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.025]">
            {image ? (
              <img
                src={image}
                alt={product.product_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <Package className="h-12 w-12" />
                <p className="mt-3 text-sm font-semibold">No product image</p>
              </div>
            )}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.025]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Stock control
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Reorder level</span>
                <span className="font-bold text-slate-950 dark:text-white">
                  {product.reorder_level ?? 0}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Warranty</span>
                <span className="font-bold text-slate-950 dark:text-white">
                  {product.warranty_period_days
                    ? `${product.warranty_period_days} days`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              {product.has_variants
                ? "Variants, stock and prices"
                : "Stock and prices"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current quantities and selling-price controls.
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {visibleVariants.length} record(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left dark:bg-white/[0.025]">
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:border-white/10">
                {product.has_variants && (
                  <th className="px-6 py-4">Attributes</th>
                )}
                <th className="px-6 py-4 text-right">Available</th>
                <th className="px-6 py-4 text-right">Purchase</th>
                <th className="px-6 py-4 text-right">Retail</th>
                <th className="px-6 py-4 text-right">Wholesale</th>
                <th className="px-6 py-4 text-right">Minimum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {visibleVariants.length === 0 ? (
                <tr>
                  <td
                    colSpan={product.has_variants ? 6 : 5}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No stock or pricing record is available.
                  </td>
                </tr>
              ) : (
                visibleVariants.map((variant, index) => (
                  <tr
                    key={variant.id || index}
                    className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  >
                    {product.has_variants && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(variant.attributes || {}).map(
                            ([key, value]) => (
                              <span
                                key={key}
                                className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              >
                                {key}: {value}
                              </span>
                            ),
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right font-extrabold text-slate-950 dark:text-white">
                      {variant.available_qty ?? variant.total_quantity ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {money(variant.purchase_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-700 dark:text-blue-300">
                      {money(variant.retail_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {money(variant.wholesale_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {money(variant.minimum_selling_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
