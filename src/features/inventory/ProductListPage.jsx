import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus, Package, Barcode as BarcodeIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductListPage() {
  const { query, q, setQ, page, setPage, getFilter, setFilter } = useListQuery("products", "/products/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Laptop spare parts catalog"
        actions={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="new-product-btn"><Link to="/inventory/products/new"><Plus className="w-4 h-4 mr-1.5" /> New product</Link></Button>}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[220px]"><SearchInput value={q} onChange={setQ} placeholder="Search by name, SKU or barcode…" /></div>
        <Select value={getFilter("brand")} onValueChange={(v) => setFilter("brand", v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All brands</SelectItem>{["Dell","HP","Lenovo","Apple","Asus","Acer","MSI","Samsung","Toshiba","Sony"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={getFilter("category")} onValueChange={(v) => setFilter("category", v === "all" ? "" : v)}>
          <SelectTrigger className="w-44 bg-white/[0.02] border-white/10 h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{["Battery","Keyboard","Screen/LCD","Adapter/Charger","RAM","SSD/HDD","Motherboard","Fan/Cooling","Speaker","Camera","Trackpad","Hinges"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "product", header: "Product", cell: (r) => (
            <Link to={`/inventory/products/${r.id}`} className="flex items-center gap-3">
              <img src={r.product_image} alt="" className="w-9 h-9 rounded-md object-cover ring-1 ring-white/5" />
              <div>
                <div className="text-slate-100">{r.product_name}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5"><BarcodeIcon className="w-3 h-3" /> {r.barcode}</div>
              </div>
            </Link>
          )},
          { key: "sku", header: "SKU", cell: (r) => <span className="font-numeric text-slate-300">{r.sku}</span> },
          { key: "brand", header: "Brand" },
          { key: "category", header: "Category" },
          { key: "purchase_price", header: "Purchase", align: "right", cell: (r) => <CurrencyText value={r.purchase_price} /> },
          { key: "retail_price", header: "Retail", align: "right", cell: (r) => <CurrencyText value={r.retail_price} className="text-slate-100" /> },
          { key: "rack_location", header: "Rack", cell: (r) => <span className="font-numeric text-xs text-slate-400">{r.rack_location}</span> },
          { key: "is_active", header: "Status", cell: (r) => <StatusBadge status={r.is_active ? "active" : "closed"} label={r.is_active ? "Active" : "Inactive"} /> },
        ]}
        data={data.results}
        isLoading={query.isLoading}
        page={page}
        total={data.count}
        onPageChange={setPage}
      />
    </div>
  );
}
