import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

const money = (value) =>
  value == null || value === "" ? "—" : `AED ${Number(value).toFixed(2)}`;

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.get(`/products/${id}/`)),
  });
  if (isLoading) return <div>Loading product...</div>;
  if (!product) return <div>Product not found.</div>;
  const variants = product.variants || [];
  const visibleVariants = product.has_variants
    ? variants.filter((item) => !item.is_base)
    : variants.slice(0, 1);

  return (
    <div>
      <PageHeader
        title={product.product_name}
        subtitle={`${product.sku} • ${product.branch_name || "No branch"}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/inventory/products/${id}/edit`}>Edit</Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-surface p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Product details</h2>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-slate-400">Brand</dt>
              <dd>{product.brand_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Category</dt>
              <dd>{product.category_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Branch</dt>
              <dd>{product.branch_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Rack</dt>
              <dd>{product.rack_code || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Supplier</dt>
              <dd>{product.supplier_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Available qty</dt>
              <dd>{product.total_available_qty ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Type</dt>
              <dd>
                {product.has_variants
                  ? "Attribute variants"
                  : "Product without variants"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Condition</dt>
              <dd>{product.condition || "—"}</dd>
            </div>
          </dl>
        </section>
        {product.product_image_url && (
          <section className="card-surface p-6">
            <img
              src={product.product_image_url}
              alt={product.product_name}
              className="w-full rounded-lg object-cover"
            />
          </section>
        )}
      </div>
      <section className="card-surface mt-6 overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold">
            {product.has_variants
              ? "Attributes, stock and prices"
              : "Stock and prices"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                {product.has_variants && <th className="p-4">Attributes</th>}
                <th className="p-4">Available Qty</th>
                <th className="p-4">Purchase</th>
                <th className="p-4">Retail</th>
                <th className="p-4">Wholesale</th>
                <th className="p-4">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {visibleVariants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center">
                    No stock or pricing record.
                  </td>
                </tr>
              ) : (
                visibleVariants.map((variant) => (
                  <tr key={variant.id} className="border-b border-white/5">
                    {product.has_variants && (
                      <td className="p-4">
                        {Object.entries(variant.attributes || {}).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className="mr-2 inline-flex rounded bg-white/5 px-2 py-1"
                            >
                              {key}: {value}
                            </span>
                          ),
                        )}
                      </td>
                    )}
                    <td className="p-4">{variant.available_qty ?? 0}</td>
                    <td className="p-4">{money(variant.purchase_price)}</td>
                    <td className="p-4">{money(variant.retail_price)}</td>
                    <td className="p-4">{money(variant.wholesale_price)}</td>
                    <td className="p-4">
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
