import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeList } from "./hrmsUtils";

const initial = {
  employee_code: "",
  branch: "",
  department: "",
  designation: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  nationality: "",
  date_of_birth: "",
  joining_date: "",
  employment_type: "FULL_TIME",
  employment_status: "ACTIVE",
  passport_number: "",
  passport_issue_date: "",
  passport_expiry_date: "",
  emirates_id_number: "",
  emirates_id_issue_date: "",
  emirates_id_expiry_date: "",
  visa_number: "",
  visa_type: "",
  visa_sponsor: "",
  visa_issue_date: "",
  visa_expiry_date: "",
  visa_status: "VALID",
  labor_contract_number: "",
  labor_contract_type: "",
  labor_contract_start_date: "",
  labor_contract_end_date: "",
  labor_contract_status: "ACTIVE",
  basic_salary: 0,
  allowances: 0,
  address: "",
  notes: "",
  is_active: true,
};

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initial);

  const { data: options = {} } = useQuery({
    queryKey: ["employee-form-options"],
    queryFn: async () => unwrap(await api.get("/hrms/employees/form-options/")),
  });

  const { data: employee } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => unwrap(await api.get(`/hrms/employees/${id}/`)),
    enabled: isEdit,
  });

  React.useEffect(() => {
    if (!employee) return;
    setForm({
      ...initial,
      ...employee,
      branch: employee.branch ? String(employee.branch) : "",
      department: employee.department ? String(employee.department) : "",
      designation: employee.designation ? String(employee.designation) : "",
    });
  }, [employee]);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        branch: form.branch ? Number(form.branch) : null,
        department: form.department ? Number(form.department) : null,
        designation: form.designation ? Number(form.designation) : null,
        basic_salary: Number(form.basic_salary || 0),
        allowances: Number(form.allowances || 0),
      };
      return isEdit
        ? api.patch(`/hrms/employees/${id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/hrms/employees/", payload, { skipGlobalErrorToast: true });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(isEdit ? "Employee updated." : "Employee created.");
      const saved = unwrap(response);
      navigate(`/hrms/employees/${saved.id || id}`);
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save employee", {
        description: details.summary || details.message,
      });
    },
  });

  const field = (label, key, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        className="mt-2"
        value={form[key] || ""}
        onChange={(event) => update(key, event.target.value)}
      />
    </div>
  );

  const section = (title, children) => (
    <section className="card-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={isEdit ? "Edit Employee" : "New Employee"}
        subtitle="Personal, employment, immigration, and labor contract information"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/hrms/employees">Cancel</Link>
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              className="bg-blue-600 text-white"
            >
              <Save className="mr-2 h-4 w-4" /> Save Employee
            </Button>
          </div>
        }
      />

      {section(
        "Basic Details",
        <>
          {field("Employee Code", "employee_code")}
          {field("First Name", "first_name")}
          {field("Last Name", "last_name")}
          {field("Email", "email", "email")}
          {field("Phone", "phone")}
          {field("Nationality", "nationality")}
          {field("Date of Birth", "date_of_birth", "date")}
          {field("Joining Date", "joining_date", "date")}
          <div>
            <Label>Branch</Label>
            <Select
              value={form.branch}
              onValueChange={(value) => update("branch", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {normalizeList(options.branches).map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select
              value={form.department}
              onValueChange={(value) => update("department", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {normalizeList(options.departments).map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Designation</Label>
            <Select
              value={form.designation}
              onValueChange={(value) => update("designation", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {normalizeList(options.designations).map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>,
      )}

      {section(
        "Passport & Emirates ID",
        <>
          {field("Passport Number", "passport_number")}
          {field("Passport Issue Date", "passport_issue_date", "date")}
          {field("Passport Expiry Date", "passport_expiry_date", "date")}
          {field("Emirates ID Number", "emirates_id_number")}
          {field("Emirates ID Issue Date", "emirates_id_issue_date", "date")}
          {field("Emirates ID Expiry Date", "emirates_id_expiry_date", "date")}
        </>,
      )}

      {section(
        "Visa Details",
        <>
          {field("Visa Number", "visa_number")}
          {field("Visa Type", "visa_type")}
          {field("Visa Sponsor", "visa_sponsor")}
          {field("Visa Issue Date", "visa_issue_date", "date")}
          {field("Visa Expiry Date", "visa_expiry_date", "date")}
          {field("Visa Status", "visa_status")}
        </>,
      )}

      {section(
        "Labor Contract Details",
        <>
          {field("Labor Contract Number", "labor_contract_number")}
          {field("Contract Type", "labor_contract_type")}
          {field("Contract Start Date", "labor_contract_start_date", "date")}
          {field("Contract End Date", "labor_contract_end_date", "date")}
          {field("Contract Status", "labor_contract_status")}
        </>,
      )}

      {section(
        "Salary",
        <>
          {field("Basic Salary", "basic_salary", "number")}
          {field("Allowances", "allowances", "number")}
        </>,
      )}

      <section className="card-surface p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Address</Label>
            <Textarea
              className="mt-2"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              className="mt-2"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
