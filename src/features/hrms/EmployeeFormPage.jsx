import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
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

const REQUIRED_FIELDS = {
  first_name: "First name",
  last_name: "Last name",
  phone: "Phone",
  nationality: "Nationality",
  date_of_birth: "Date of birth",
  joining_date: "Joining date",
  branch: "Branch",
  department: "Department",
  designation: "Designation",
  emirates_id_number: "Emirates ID number",
  emirates_id_issue_date: "Emirates ID issue date",
  emirates_id_expiry_date: "Emirates ID expiry date",
  basic_salary: "Basic salary",
};

const DATE_FIELDS = [
  "date_of_birth",
  "joining_date",
  "passport_issue_date",
  "passport_expiry_date",
  "emirates_id_issue_date",
  "emirates_id_expiry_date",
  "visa_issue_date",
  "visa_expiry_date",
  "labor_contract_start_date",
  "labor_contract_end_date",
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const requiredLabel = (label, key) => (
  <>
    {label}
    {Object.prototype.hasOwnProperty.call(REQUIRED_FIELDS, key) && (
      <span className="ml-1 text-red-500">*</span>
    )}
  </>
);

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(initial);
  const [inlineForm, setInlineForm] = React.useState(null);
  const [inlineName, setInlineName] = React.useState("");
  const [inlineSaving, setInlineSaving] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState({});

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
    const normalized = {
      ...initial,
      ...employee,
      branch: employee.branch ? String(employee.branch) : "",
      department: employee.department ? String(employee.department) : "",
      designation: employee.designation ? String(employee.designation) : "",
    };

    DATE_FIELDS.forEach((fieldName) => {
      normalized[fieldName] = normalizeDateValue(employee[fieldName]);
    });

    setForm(normalized);
  }, [employee]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: "" }));
  };

  const refreshOptions = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["employee-form-options"],
    });
  };

  const createDepartment = async () => {
    if (!inlineName.trim()) return toast.error("Department name is required.");
    setInlineSaving(true);
    try {
      const response = await api.post(
        "/hrms/departments/",
        {
          name: inlineName.trim(),
          is_active: true,
        },
        { skipGlobalErrorToast: true },
      );
      const created = unwrap(response);
      await refreshOptions();
      update("department", String(created.id));
      setInlineName("");
      setInlineForm(null);
      toast.success("Department added.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to add department", {
        description: details.summary || details.message,
      });
    } finally {
      setInlineSaving(false);
    }
  };

  const deleteDepartment = async () => {
    if (!form.department) return toast.error("Select a department first.");
    const item = normalizeList(options.departments).find(
      (row) => String(row.id) === String(form.department),
    );
    if (
      !window.confirm(
        `Delete department "${item?.name || "selected department"}"?`,
      )
    )
      return;

    try {
      await api.delete(`/hrms/departments/${form.department}/`, {
        skipGlobalErrorToast: true,
      });
      update("department", "");
      update("designation", "");
      await refreshOptions();
      toast.success("Department deleted.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete department", {
        description: details.summary || details.message,
      });
    }
  };

  const createDesignation = async () => {
    if (!form.department) return toast.error("Select a department first.");
    if (!inlineName.trim()) return toast.error("Designation name is required.");
    setInlineSaving(true);
    try {
      const response = await api.post(
        "/hrms/designations/",
        {
          name: inlineName.trim(),
          designation_name: inlineName.trim(),
          department: Number(form.department),
          is_active: true,
        },
        { skipGlobalErrorToast: true },
      );
      const created = unwrap(response);
      await refreshOptions();
      update("designation", String(created.id));
      setInlineName("");
      setInlineForm(null);
      toast.success("Designation added.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to add designation", {
        description: details.summary || details.message,
      });
    } finally {
      setInlineSaving(false);
    }
  };

  const deleteDesignation = async () => {
    if (!form.designation) return toast.error("Select a designation first.");
    const item = normalizeList(options.designations).find(
      (row) => String(row.id) === String(form.designation),
    );
    if (
      !window.confirm(
        `Delete designation "${item?.name || "selected designation"}"?`,
      )
    )
      return;

    try {
      await api.delete(`/hrms/designations/${form.designation}/`, {
        skipGlobalErrorToast: true,
      });
      update("designation", "");
      await refreshOptions();
      toast.success("Designation deleted.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete designation", {
        description: details.summary || details.message,
      });
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    Object.entries(REQUIRED_FIELDS).forEach(([key, label]) => {
      const value = form[key];
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      ) {
        nextErrors[key] = `${label} is required.`;
      }
    });

    if (
      form.date_of_birth &&
      form.date_of_birth >= new Date().toISOString().slice(0, 10)
    ) {
      nextErrors.date_of_birth = "Date of birth must be before today.";
    }

    if (
      form.emirates_id_issue_date &&
      form.emirates_id_expiry_date &&
      form.emirates_id_expiry_date <= form.emirates_id_issue_date
    ) {
      nextErrors.emirates_id_expiry_date =
        "Emirates ID expiry date must be after its issue date.";
    }

    if (Number(form.basic_salary) < 0) {
      nextErrors.basic_salary = "Basic salary cannot be negative.";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error("Complete the required employee fields.");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const payload = {
      ...form,
      branch: form.branch ? Number(form.branch) : null,
      department: form.department ? Number(form.department) : null,
      designation: form.designation ? Number(form.designation) : null,
      basic_salary: Number(form.basic_salary || 0),
      allowances: Number(form.allowances || 0),
    };

    // Employee code is generated by the backend and must not be submitted.
    delete payload.employee_code;

    DATE_FIELDS.forEach((fieldName) => {
      payload[fieldName] = form[fieldName]
        ? normalizeDateValue(form[fieldName])
        : null;
    });

    return payload;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();

      return isEdit
        ? api.patch(`/hrms/employees/${id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/hrms/employees/", payload, {
            skipGlobalErrorToast: true,
          });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(isEdit ? "Employee updated." : "Employee created.");
      const saved = unwrap(response);
      navigate(`/hrms/employees/${saved.id || id}`);
    },
    onError: (error) => {
      const responseErrors = error?.response?.data;
      if (responseErrors && typeof responseErrors === "object") {
        const nextErrors = {};
        Object.entries(responseErrors).forEach(([key, value]) => {
          nextErrors[key] = Array.isArray(value) ? value[0] : String(value);
        });
        setFormErrors(nextErrors);
      }

      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save employee", {
        description: details.summary || details.message,
      });
    },
  });

  const field = (label, key, type = "text", options = {}) => (
    <div>
      <Label>{requiredLabel(label, key)}</Label>
      <Input
        type={type}
        className="mt-2"
        value={form[key] ?? ""}
        min={type === "number" ? (options.min ?? "0") : undefined}
        step={type === "number" ? (options.step ?? "0.01") : undefined}
        onChange={(event) => update(key, event.target.value)}
        aria-invalid={Boolean(formErrors[key])}
      />
      {formErrors[key] && (
        <p className="mt-1 text-xs text-red-500">{formErrors[key]}</p>
      )}
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
              onClick={() => {
                if (validateForm()) mutation.mutate();
              }}
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
          <div>
            <Label>Employee Code</Label>
            <Input
              className="mt-2 bg-muted"
              value={
                isEdit ? form.employee_code || "" : "Auto-generated on save"
              }
              readOnly
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Generated automatically in the format EMP00001.
            </p>
          </div>
          {field("First Name", "first_name")}
          {field("Last Name", "last_name")}
          {field("Email", "email", "email")}
          {field("Phone", "phone")}
          {field("Nationality", "nationality")}
          {field("Date of Birth", "date_of_birth", "date")}
          {field("Joining Date", "joining_date", "date")}
          <div>
            <Label>{requiredLabel("Branch", "branch")}</Label>
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
            {formErrors.branch && (
              <p className="mt-1 text-xs text-red-500">{formErrors.branch}</p>
            )}
          </div>
          <div>
            <Label>{requiredLabel("Department", "department")}</Label>
            <div className="mt-2 flex gap-2">
              <Select
                value={form.department}
                onValueChange={(value) => {
                  update("department", value);
                  update("designation", "");
                }}
              >
                <SelectTrigger className="flex-1">
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
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Add department"
                onClick={() => {
                  setInlineForm(
                    inlineForm === "department" ? null : "department",
                  );
                  setInlineName("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Delete selected department"
                disabled={!form.department}
                onClick={deleteDepartment}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            {formErrors.department && (
              <p className="mt-1 text-xs text-red-500">
                {formErrors.department}
              </p>
            )}
            {inlineForm === "department" && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/5">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Add New Department
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The new department will be selected automatically.
                  </p>
                </div>
                <Input
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                  placeholder="Enter department name"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInlineForm(null);
                      setInlineName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={inlineSaving}
                    onClick={createDepartment}
                  >
                    {inlineSaving ? "Saving..." : "Add Department"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label>{requiredLabel("Designation", "designation")}</Label>
            <div className="mt-2 flex gap-2">
              <Select
                value={form.designation}
                onValueChange={(value) => update("designation", value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {normalizeList(options.designations)
                    .filter(
                      (item) =>
                        !form.department ||
                        String(item.department) === String(form.department),
                    )
                    .map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name || item.designation_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Add designation"
                disabled={!form.department}
                onClick={() => {
                  setInlineForm(
                    inlineForm === "designation" ? null : "designation",
                  );
                  setInlineName("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Delete selected designation"
                disabled={!form.designation}
                onClick={deleteDesignation}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            {formErrors.designation && (
              <p className="mt-1 text-xs text-red-500">
                {formErrors.designation}
              </p>
            )}
            {inlineForm === "designation" && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/5">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Add New Designation
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    It will be added under the selected department.
                  </p>
                </div>
                <Input
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                  placeholder="Enter designation name"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInlineForm(null);
                      setInlineName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={inlineSaving}
                    onClick={createDesignation}
                  >
                    {inlineSaving ? "Saving..." : "Add Designation"}
                  </Button>
                </div>
              </div>
            )}
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
