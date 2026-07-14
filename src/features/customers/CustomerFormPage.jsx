import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CustomerFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const isEdit = Boolean(id);
  const { data } = useQuery({ queryKey: ["customer", id], queryFn: async () => unwrap(await api.get(`/customers/${id}/`)), enabled: isEdit });
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({ defaultValues: { customer_type: "retail", country: "UAE", is_active: true } });
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);

  const submit = async (v) => {
    try {
      if (isEdit) await api.put(`/customers/${id}/`, v); else await api.post("/customers/", v);
      toast.success(`Customer ${isEdit ? "updated" : "created"}`);
      navigate("/customers");
    } catch {}
  };
  return (
    <div className="max-w-4xl">
      <PageHeader title={isEdit ? "Edit customer" : "New customer"} subtitle="Customer master record" />
      <form onSubmit={handleSubmit(submit)} className="card-surface p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Customer name</Label><Input {...register("customer_name", { required: true })} className="mt-1.5" data-testid="customer-name-input" /></div>
          <div>
            <Label>Customer type</Label>
            <Select value={watch("customer_type")} onValueChange={(v) => setValue("customer_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="wholesale">Wholesale</SelectItem><SelectItem value="corporate">Corporate</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Contact person</Label><Input {...register("contact_person")} className="mt-1.5" /></div>
          <div><Label>Phone</Label><Input {...register("phone")} className="mt-1.5" /></div>
          <div><Label>WhatsApp</Label><Input {...register("whatsapp_number")} className="mt-1.5" /></div>
          <div><Label>Email</Label><Input {...register("email")} className="mt-1.5" /></div>
          <div><Label>TRN</Label><Input {...register("trn_number")} className="mt-1.5" /></div>
          <div className="md:col-span-2"><Label>Address</Label><Textarea {...register("address")} className="mt-1.5" rows={2} /></div>
          <div><Label>City</Label><Input {...register("city")} className="mt-1.5" /></div>
          <div><Label>Emirate</Label><Input {...register("emirate")} className="mt-1.5" /></div>
          <div><Label>Credit limit (AED)</Label><Input type="number" step="0.01" {...register("credit_limit", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
          <div><Label>Payment terms (days)</Label><Input type="number" {...register("payment_terms_days", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700" data-testid="customer-save-btn">{isEdit ? "Save" : "Create customer"}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
