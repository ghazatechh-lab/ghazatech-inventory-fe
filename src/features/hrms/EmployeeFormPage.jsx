import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
  const [inlineForm, setInlineForm] = React.useState(null);
  const [inlineName, setInlineName] = React.useState("");
  const [inlineSaving, setInlineSaving] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState(null);
  const [profilePreview, setProfilePreview] = React.useState("");
  const [documents, setDocuments] = React.useState({
    passport: null,
    visa: null,
    labor_contract: null,
  });

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
    setProfilePreview(employee.profile_image || "");
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

  const uploadOptionalDocuments = async (employeeId) => {
    const documentDefinitions = [
      {
        key: "passport",
        type: "PASSPORT",
        title: "Passport",
        number: form.passport_number,
        issueDate: form.passport_issue_date,
        expiryDate: form.passport_expiry_date,
      },
      {
        key: "visa",
        type: "VISA",
        title: "Visa",
        number: form.visa_number,
        issueDate: form.visa_issue_date,
        expiryDate: form.visa_expiry_date,
      },
      {
        key: "labor_contract",
        type: "LABOR_CONTRACT",
        title: "Labor Contract",
        number: form.labor_contract_number,
        issueDate: form.labor_contract_start_date,
        expiryDate: form.labor_contract_end_date,
      },
    ];

    const uploads = documentDefinitions
      .filter((item) => documents[item.key])
      .map(async (item) => {
        const body = new FormData();
        body.append("document_type", item.type);
        body.append("title", item.title);
        body.append("file", documents[item.key]);

        if (item.number) body.append("document_number", item.number);
        if (item.issueDate) body.append("issue_date", item.issueDate);
        if (item.expiryDate) body.append("expiry_date", item.expiryDate);

        return api.post(`/hrms/employees/${employeeId}/documents/`, body, {
          skipGlobalErrorToast: true,
        });
      });

    await Promise.all(uploads);
  };

  const removeExistingDocument = useMutation({
    mutationFn: (documentId) =>
      api.delete(`/hrms/documents/${documentId}/`, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["employee", id],
      });
      toast.success("Document deleted.");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete document", {
        description: details.summary || details.message,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      const payload = {
        ...form,
        branch: form.branch ? Number(form.branch) : "",
        department: form.department ? Number(form.department) : "",
        designation: form.designation ? Number(form.designation) : "",
        basic_salary: Number(form.basic_salary || 0),
        allowances: Number(form.allowances || 0),
      };

      Object.entries(payload).forEach(([key, value]) => {
        if (key === "profile_image") return;

        if (value === null || value === undefined) return;

        if (
          value === "" &&
          [
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
          ].includes(key)
        ) {
          return;
        }

        body.append(key, typeof value === "boolean" ? String(value) : value);
      });

      if (profileImage) {
        body.append("profile_image", profileImage);
      }

      const response = isEdit
        ? await api.patch(`/hrms/employees/${id}/`, body, {
            skipGlobalErrorToast: true,
          })
        : await api.post("/hrms/employees/", body, {
            skipGlobalErrorToast: true,
          });

      const saved = unwrap(response);
      const employeeId = saved.id || id;
      await uploadOptionalDocuments(employeeId);

      return saved;
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({
          queryKey: ["employee", saved.id || id],
        }),
      ]);
      toast.success(isEdit ? "Employee updated." : "Employee created.");
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
    <div className="hrms-module-page hrms-workspace mx-auto max-w-7xl space-y-5">
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
              disabled={mutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />{" "}
              {mutation.isPending ? "Saving..." : "Save Employee"}
            </Button>
          </div>
        }
      />

      <section className="card-surface p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10">
            {profilePreview ? (
              <img
                src={profilePreview}
                alt="Employee preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="h-9 w-9 text-blue-500" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold">Employee Photo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional. Upload a JPG, JPEG, PNG, or WebP image.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Upload className="mr-2 h-4 w-4" />
                Choose Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error("Employee image must be 5 MB or smaller.");
                      event.target.value = "";
                      return;
                    }
                    setProfileImage(file);
                    if (file) {
                      setProfilePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>

              {profileImage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProfileImage(null);
                    setProfilePreview(employee?.profile_image || "");
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

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
            <Label>Designation</Label>
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

      <section className="card-surface p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Employee Documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All document uploads are optional. Maximum file size: 10 MB.
              Supported: PDF, JPG, PNG, DOC, and DOCX.
            </p>
          </div>
        </div>

        {isEdit && (employee?.documents || []).length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border">
            <div className="border-b bg-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold">Existing Documents</h3>
            </div>
            <div className="divide-y">
              {(employee.documents || []).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.title || item.document_type_display || "Document"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.document_type_display || item.document_type}
                      {item.document_number ? ` · ${item.document_number}` : ""}
                      {item.expiry_date ? ` · Expires ${item.expiry_date}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {(item.file_url || item.file) && (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a
                          href={item.file_url || item.file}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={removeExistingDocument.isPending}
                      onClick={() => {
                        if (window.confirm("Delete this employee document?")) {
                          removeExistingDocument.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            [
              "passport",
              isEdit ? "Replace / Add Passport" : "Passport Document",
            ],
            ["visa", isEdit ? "Replace / Add Visa" : "Visa Document"],
            [
              "labor_contract",
              isEdit
                ? "Replace / Add Labor Contract"
                : "Labor Contract Document",
            ],
          ].map(([key, label]) => (
            <div key={key} className="rounded-xl border p-4">
              <Label>{label}</Label>
              <Input
                type="file"
                className="mt-2"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    toast.error("Document must be 10 MB or smaller.");
                    event.target.value = "";
                    return;
                  }
                  setDocuments((current) => ({
                    ...current,
                    [key]: file,
                  }));
                }}
              />

              {documents[key] && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                  <span className="truncate">{documents[key].name}</span>
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() =>
                      setDocuments((current) => ({
                        ...current,
                        [key]: null,
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
