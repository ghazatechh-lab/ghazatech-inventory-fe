import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateText } from "@/components/common/CurrencyText";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function StockAdjustmentPage() {
  const qc = useQueryClient();
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });
  const { data: products } = useQuery({ queryKey: ["products-sel"], queryFn: async () => unwrap(await api.get("/products/", { params: { page_size: 60 } })) });
  const { data: adjustments } = useQuery({ queryKey: ["adjustments"], queryFn: async () => unwrap(await api.get("/inventory/adjustments/")) });
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({ defaultValues: { adjustment_type: "increase" } });

  const submit = async (values) => {
    try {
      await api.post("/inventory/adjustments/", values);
      toast.success("Adjustment submitted");
      reset();
      qc.invalidateQueries({ queryKey: ["adjustments"] });
    } catch {}
  };
  return (
    <div>
      <PageHeader title="Stock adjustments" subtitle="Submit corrections to on-hand inventory" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={handleSubmit(submit)} className="card-surface p-5 lg:col-span-1 space-y-4">
          <div>
            <Label>Branch</Label>
            <Select value={watch("branch_id")} onValueChange={(v) => setValue("branch_id", v)}>
              <SelectTrigger className="mt-1.5" data-testid="adj-branch-select"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product</Label>
            <Select value={watch("product_id")} onValueChange={(v) => setValue("product_id", v)}>
              <SelectTrigger className="mt-1.5" data-testid="adj-product-select"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent className="max-h-72">{(products?.results || []).map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Adjustment type</Label>
            <Select value={watch("adjustment_type")} onValueChange={(v) => setValue("adjustment_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem><SelectItem value="damaged">Damaged write-off</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" {...register("quantity", { valueAsNumber: true, required: true })} className="mt-1.5 font-numeric" data-testid="adj-quantity-input" /></div>
          <div><Label>Reason</Label><Input {...register("reason", { required: true })} className="mt-1.5" placeholder="Physical count / damage / theft" /></div>
          <div><Label>Remarks</Label><Textarea {...register("remarks")} className="mt-1.5" rows={3} /></div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="adj-submit-btn">Submit for approval</Button>
        </form>

        <div className="lg:col-span-2 card-surface p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-slate-200">Recent adjustments</h3>
          </div>
          <DataTable
            testId="adjustments-table"
            columns={[
              { key: "created_at", header: "Date", cell: (r) => <DateText value={r.created_at} /> },
              { key: "product_id", header: "Product", cell: (r) => <span className="font-numeric text-xs">{r.product_id}</span> },
              { key: "adjustment_type", header: "Type", cell: (r) => <span className="capitalize text-slate-300">{r.adjustment_type}</span> },
              { key: "quantity", header: "Qty", align: "right", cell: (r) => <span className="font-numeric text-white">{r.quantity}</span> },
              { key: "reason", header: "Reason" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={(adjustments?.results || [])}
            total={(adjustments?.count || 0)}
            page={1}
          />
        </div>
      </div>
    </div>
  );
}
