import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EmployeeFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const isEdit = Boolean(id);
  const { data } = useQuery({ queryKey: ["employee", id], queryFn: async () => unwrap(await api.get(`/hrms/employees/${id}/`)), enabled: isEdit });
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({ defaultValues: { gender: "M", employment_type: "Full-time" } });
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);
  const submit = async (v) => {
    try {
      if (isEdit) await api.put(`/hrms/employees/${id}/`, v); else await api.post("/hrms/employees/", v);
      toast.success(`Employee ${isEdit ? "updated" : "created"}`); navigate("/hrms/employees");
    } catch {}
  };
  return (
    <div className="max-w-4xl">
      <PageHeader title={isEdit ? "Edit employee" : "New employee"} />
      <form onSubmit={handleSubmit(submit)} className="card-surface p-6">
        <Tabs defaultValue="personal">
          <TabsList><TabsTrigger value="personal">Personal</TabsTrigger><TabsTrigger value="employment">Employment</TabsTrigger><TabsTrigger value="salary">Salary</TabsTrigger></TabsList>
          <TabsContent value="personal" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>First name</Label><Input {...register("first_name", { required: true })} className="mt-1.5" data-testid="emp-first-name" /></div>
            <div><Label>Last name</Label><Input {...register("last_name", { required: true })} className="mt-1.5" data-testid="emp-last-name" /></div>
            <div><Label>Gender</Label>
              <Select value={watch("gender")} onValueChange={v => setValue("gender", v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Nationality</Label><Input {...register("nationality")} className="mt-1.5" /></div>
            <div><Label>Personal mobile</Label><Input {...register("personal_mobile")} className="mt-1.5" /></div>
            <div><Label>Personal email</Label><Input {...register("personal_email")} className="mt-1.5" /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input {...register("address")} className="mt-1.5" /></div>
          </TabsContent>
          <TabsContent value="employment" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Branch</Label>
              <Select value={watch("branch_id")} onValueChange={v => setValue("branch_id", v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Department</Label><Input {...register("department")} className="mt-1.5" /></div>
            <div><Label>Designation</Label><Input {...register("designation")} className="mt-1.5" /></div>
            <div><Label>Employment type</Label>
              <Select value={watch("employment_type")} onValueChange={v => setValue("employment_type", v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["Full-time","Part-time","Contract"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Joining date</Label><Input type="date" {...register("joining_date")} className="mt-1.5" /></div>
            <div><Label>Work email</Label><Input {...register("work_email")} className="mt-1.5" /></div>
          </TabsContent>
          <TabsContent value="salary" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Basic salary</Label><Input type="number" step="0.01" {...register("basic_salary", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
            <div><Label>Housing allowance</Label><Input type="number" step="0.01" {...register("housing_allowance", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
            <div><Label>Transport allowance</Label><Input type="number" step="0.01" {...register("transport_allowance", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
            <div><Label>Other allowance</Label><Input type="number" step="0.01" {...register("other_allowance", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
            <div><Label>Bank name</Label><Input {...register("bank_name")} className="mt-1.5" /></div>
            <div><Label>IBAN</Label><Input {...register("iban")} className="mt-1.5 font-numeric" /></div>
          </TabsContent>
        </Tabs>
        <div className="flex gap-2 mt-6"><Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700" data-testid="emp-save-btn">{isEdit ? "Save" : "Create employee"}</Button><Button type="button" variant="ghost" onClick={() => navigate("/hrms/employees")}>Cancel</Button></div>
      </form>
    </div>
  );
}
