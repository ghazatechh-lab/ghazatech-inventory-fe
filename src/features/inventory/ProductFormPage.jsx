import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ProductFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const isEdit = Boolean(id);
  const { data } = useQuery({ queryKey: ["product", id], queryFn: async () => (isEdit ? unwrap(await api.get(`/products/${id}/`)) : null), enabled: isEdit });
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { brand: "Dell", category: "Battery", warranty_period_days: 180, reorder_level: 5, is_active: true },
  });
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);

  const submit = async (v) => {
    try {
      if (isEdit) await api.put(`/products/${id}/`, v);
      else await api.post("/products/", v);
      toast.success(`Product ${isEdit ? "updated" : "created"}`);
      navigate("/inventory/products");
    } catch {}
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title={isEdit ? "Edit product" : "New product"} subtitle="Catalog entry for a spare part" />
      <form onSubmit={handleSubmit(submit)} className="card-surface p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Product name</Label><Input {...register("product_name", { required: true })} className="mt-1.5" data-testid="product-name-input" /></div>
          <div><Label>SKU</Label><Input {...register("sku", { required: true })} className="mt-1.5" /></div>
          <div><Label>Barcode</Label><Input {...register("barcode")} className="mt-1.5" /></div>
          <div>
            <Label>Brand</Label>
            <Select value={watch("brand")} onValueChange={(v) => setValue("brand", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{["Dell","HP","Lenovo","Apple","Asus","Acer","MSI","Samsung","Toshiba","Sony"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{["Battery","Keyboard","Screen/LCD","Adapter/Charger","RAM","SSD/HDD","Motherboard","Fan/Cooling","Speaker","Camera","Trackpad","Hinges"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea {...register("description")} className="mt-1.5" rows={3} /></div>
          <div><Label>Purchase price (AED)</Label><Input type="number" step="0.01" {...register("purchase_price", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Retail price (AED)</Label><Input type="number" step="0.01" {...register("retail_price", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Wholesale price (AED)</Label><Input type="number" step="0.01" {...register("wholesale_price", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Min selling price (AED)</Label><Input type="number" step="0.01" {...register("minimum_selling_price", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Warranty (days)</Label><Input type="number" {...register("warranty_period_days", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Reorder level</Label><Input type="number" {...register("reorder_level", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div className="md:col-span-2"><Label>Rack location</Label><Input {...register("rack_location")} placeholder="e.g. R3-S2-B10" className="mt-1.5" /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={!!watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} /><Label>Active</Label></div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700" data-testid="product-save-btn">{isEdit ? "Save" : "Create product"}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/inventory/products")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
