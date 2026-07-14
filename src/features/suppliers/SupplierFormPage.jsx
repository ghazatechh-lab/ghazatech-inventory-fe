import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SupplierFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const isEdit = Boolean(id);
  const { data } = useQuery({ queryKey: ["supplier", id], queryFn: async () => unwrap(await api.get(`/suppliers/${id}/`)), enabled: isEdit });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { country: "UAE", payment_terms_days: 30, is_active: true } });
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);
  const submit = async (v) => { try { if (isEdit) await api.put(`/suppliers/${id}/`, v); else await api.post("/suppliers/", v); toast.success(`Supplier ${isEdit ? "updated" : "created"}`); navigate("/suppliers"); } catch {} };
  return (
    <div className="max-w-3xl">
      <PageHeader title={isEdit ? "Edit supplier" : "New supplier"} />
      <form onSubmit={handleSubmit(submit)} className="card-surface p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Supplier name</Label><Input {...register("supplier_name", { required: true })} className="mt-1.5" /></div>
          <div><Label>Contact person</Label><Input {...register("contact_person")} className="mt-1.5" /></div>
          <div><Label>Phone</Label><Input {...register("phone")} className="mt-1.5" /></div>
          <div><Label>Email</Label><Input {...register("email")} className="mt-1.5" /></div>
          <div><Label>TRN</Label><Input {...register("trn_number")} className="mt-1.5" /></div>
          <div className="md:col-span-2"><Label>Address</Label><Input {...register("address")} className="mt-1.5" /></div>
          <div><Label>City</Label><Input {...register("city")} className="mt-1.5" /></div>
          <div><Label>Emirate</Label><Input {...register("emirate")} className="mt-1.5" /></div>
          <div><Label>Payment terms (days)</Label><Input type="number" {...register("payment_terms_days", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
        </div>
        <div className="flex gap-2"><Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">{isEdit ? "Save" : "Create supplier"}</Button><Button type="button" variant="ghost" onClick={() => navigate("/suppliers")}>Cancel</Button></div>
      </form>
    </div>
  );
}
