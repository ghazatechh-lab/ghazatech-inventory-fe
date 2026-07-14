import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function BranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data } = useQuery({
    queryKey: ["branch", id],
    queryFn: async () => (isEdit ? unwrap(await api.get(`/branches/${id}/`)) : null),
    enabled: isEdit,
  });
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { branch_type: "retail", country: "UAE", is_active: true },
  });

  React.useEffect(() => { if (data) reset(data); }, [data, reset]);

  const submit = async (values) => {
    try {
      if (isEdit) await api.put(`/branches/${id}/`, values);
      else await api.post("/branches/", values);
      toast.success(`Branch ${isEdit ? "updated" : "created"}`);
      navigate("/branches");
    } catch (e) { /* toasted */ }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title={isEdit ? "Edit branch" : "New branch"} subtitle="Manage branch details" />
      <form onSubmit={handleSubmit(submit)} className="card-surface p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Branch code</Label><Input {...register("branch_code", { required: true })} className="mt-1.5" data-testid="branch-code-input" /></div>
          <div><Label>Branch name</Label><Input {...register("branch_name", { required: true })} className="mt-1.5" data-testid="branch-name-input" /></div>
          <div>
            <Label>Branch type</Label>
            <Select value={watch("branch_type")} onValueChange={(v) => setValue("branch_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="warehouse">Warehouse</SelectItem><SelectItem value="office">Office</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Manager</Label><Input {...register("manager")} className="mt-1.5" /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input {...register("address")} className="mt-1.5" /></div>
          <div><Label>City</Label><Input {...register("city")} className="mt-1.5" /></div>
          <div><Label>Emirate</Label><Input {...register("emirate")} className="mt-1.5" /></div>
          <div><Label>Phone</Label><Input {...register("phone")} className="mt-1.5" /></div>
          <div><Label>Email</Label><Input {...register("email")} className="mt-1.5" /></div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
          <Label>Active</Label>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700" data-testid="branch-save-btn">{isEdit ? "Save changes" : "Create branch"}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/branches")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
