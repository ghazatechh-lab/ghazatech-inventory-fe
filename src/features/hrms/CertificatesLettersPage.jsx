import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Eye,
  FileBadge2,
  FileText,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { generateSalaryCertificatePdf } from "./salaryCertificatePdf";
import { generateEmployeeLetterPdf } from "./employeeLetterPdf";

const asRows = (value) => {
  const payload = value?.data ?? value;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.results)) {
    return payload.data.results;
  }

  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const salaryEmpty = {
  employee: "",
  certificate_date: today(),
  identity_number: "",
  basic_salary: "",
  housing_allowance: "0",
  transport_other_allowance: "",
  authorized_signatory: "",
  signatory_designation: "",
  purpose: "Official purposes",
  notes: "",
};

const warningEmpty = {
  letter_type: "WARNING",
  employee: "",
  letter_date: today(),
  subject: "Warning Letter",
  reason: "",
  details: "",
  authorized_signatory: "",
  signatory_designation: "",
  notes: "",
};

const experienceEmpty = {
  letter_type: "EXPERIENCE",
  employee: "",
  letter_date: today(),
  last_working_date: today(),
  experience_summary: "",
  conduct_note:
    "During the employment period, the employee carried out assigned duties and responsibilities.",
  authorized_signatory: "",
  signatory_designation: "",
  notes: "",
};

export default function CertificatesLettersPage() {
  const queryClient = useQueryClient();

  const { branchParams } = useActiveBranchFilter();

  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = React.useState("ALL");

  const [search, setSearch] = React.useState("");

  const [modalType, setModalType] = React.useState("");

  const [preview, setPreview] = React.useState(null);

  const [salaryForm, setSalaryForm] = React.useState(salaryEmpty);

  const [warningForm, setWarningForm] = React.useState(warningEmpty);

  const [experienceForm, setExperienceForm] = React.useState(experienceEmpty);

  const certificatesQ = useQuery({
    queryKey: ["salary-certificates", branchParams, search],

    queryFn: () =>
      api.get("/hrms/salary-certificates/", {
        params: {
          ...branchParams,
          search: search || undefined,
          page_size: 1000,
        },
      }),

    staleTime: 0,
  });

  const lettersQ = useQuery({
    queryKey: ["employee-letters", branchParams, search],

    queryFn: () =>
      api.get("/hrms/employee-letters/", {
        params: {
          ...branchParams,
          search: search || undefined,
          page_size: 1000,
        },
      }),

    staleTime: 0,
  });

  const employeesQ = useQuery({
    queryKey: ["certificate-letter-employees", branchParams],

    queryFn: () =>
      api.get("/hrms/employees/", {
        params: {
          ...branchParams,
          page_size: 1000,
          ordering: "first_name",
        },
      }),
  });

  const certificates = asRows(certificatesQ.data);

  const letters = asRows(lettersQ.data);

  const employees = asRows(employeesQ.data);

  const allRows = React.useMemo(() => {
    const salaryRows = certificates.map((item) => ({
      ...item,

      document_type: "SALARY",

      document_type_label: "Salary Certificate",

      document_date: item.certificate_date,
    }));

    const letterRows = letters.map((item) => ({
      ...item,

      document_type: item.letter_type,

      document_type_label:
        item.letter_type_display ||
        (item.letter_type === "WARNING"
          ? "Warning Letter"
          : "Experience Letter"),

      document_date: item.letter_date,
    }));

    return [...salaryRows, ...letterRows].sort(
      (a, b) =>
        String(b.document_date || "").localeCompare(
          String(a.document_date || ""),
        ) || Number(b.id || 0) - Number(a.id || 0),
    );
  }, [certificates, letters]);

  const visibleRows =
    tab === "ALL"
      ? allRows
      : allRows.filter((item) => item.document_type === tab);

  const activeEmployees = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(
      String(employee.employment_status || "").toUpperCase(),
    ),
  );

  const salaryEmployee = employees.find(
    (employee) => String(employee.id) === String(salaryForm.employee),
  );

  const salaryTotal =
    Number(salaryForm.basic_salary || 0) +
    Number(salaryForm.housing_allowance || 0) +
    Number(salaryForm.transport_other_allowance || 0);

  const handleSalaryEmployee = async (employeeId) => {
    const employee = employees.find(
      (item) => String(item.id) === String(employeeId),
    );

    if (!employee) {
      setSalaryForm((current) => ({
        ...current,
        employee: employeeId,
      }));

      return;
    }

    try {
      const detail = unwrap(
        await api.get(
          `/hrms/employees/${employee.id}/salary-certificate-data/`,
        ),
      );

      setSalaryForm((current) => ({
        ...current,

        employee: String(employee.id),

        identity_number: detail.identity_number || "",

        basic_salary: String(detail.basic_salary || 0),

        housing_allowance: String(detail.housing_allowance || 0),

        transport_other_allowance: String(
          detail.transport_other_allowance ?? detail.allowances ?? 0,
        ),
      }));
    } catch {
      setSalaryForm((current) => ({
        ...current,

        employee: String(employee.id),

        identity_number:
          employee.passport_number || employee.emirates_id_number || "",

        basic_salary: String(employee.basic_salary || 0),

        housing_allowance: "0",

        transport_other_allowance: String(employee.allowances || 0),
      }));
    }
  };

  React.useEffect(() => {
    const employeeId = searchParams.get("employee");

    const requestedType = String(
      searchParams.get("type") || "SALARY",
    ).toUpperCase();

    if (!employeeId || !employees.length) {
      return;
    }

    const employee = employees.find(
      (item) => String(item.id) === String(employeeId),
    );

    if (!employee) {
      return;
    }

    if (requestedType === "WARNING") {
      setWarningForm((current) => ({
        ...current,

        employee: String(employee.id),
      }));

      setModalType("WARNING");
    } else if (requestedType === "EXPERIENCE") {
      setExperienceForm((current) => ({
        ...current,

        employee: String(employee.id),
      }));

      setModalType("EXPERIENCE");
    } else {
      handleSalaryEmployee(employeeId);

      setModalType("SALARY");
    }

    const next = new URLSearchParams(searchParams);

    next.delete("employee");

    next.delete("type");

    setSearchParams(next, {
      replace: true,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]);

  const salaryMutation = useMutation({
    mutationFn: async () => {
      if (!salaryForm.employee) {
        throw new Error("Select an employee.");
      }

      /*
       * Authorized Signatory and Signatory Designation
       * are OPTIONAL for Salary Certificate.
       */
      return api.post(
        "/hrms/salary-certificates/",
        {
          ...salaryForm,

          employee: Number(salaryForm.employee),

          basic_salary: Number(salaryForm.basic_salary || 0),

          housing_allowance: Number(salaryForm.housing_allowance || 0),

          transport_other_allowance: Number(
            salaryForm.transport_other_allowance || 0,
          ),

          authorized_signatory: salaryForm.authorized_signatory.trim(),

          signatory_designation: salaryForm.signatory_designation.trim(),
        },
        {
          skipGlobalErrorToast: true,
        },
      );
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await queryClient.invalidateQueries({
        queryKey: ["salary-certificates"],
      });

      toast.success(`Salary certificate ${saved.reference_number} issued.`);

      setModalType("");

      setPreview({
        ...saved,
        document_type: "SALARY",
      });
    },

    onError: showError("Unable to issue salary certificate"),
  });

  const letterMutation = useMutation({
    mutationFn: async (form) =>
      api.post(
        "/hrms/employee-letters/",
        {
          ...form,
          employee: Number(form.employee),
        },
        {
          skipGlobalErrorToast: true,
        },
      ),

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await queryClient.invalidateQueries({
        queryKey: ["employee-letters"],
      });

      toast.success(
        `${
          saved.letter_type_display || "Employee letter"
        } ${saved.reference_number} issued.`,
      );

      setModalType("");

      setPreview({
        ...saved,
        document_type: saved.letter_type,
      });
    },

    onError: showError("Unable to issue employee letter"),
  });

  const openPreview = async (row) => {
    try {
      if (row.document_type === "SALARY") {
        const detail = unwrap(
          await api.get(`/hrms/salary-certificates/${row.id}/`),
        );

        setPreview({
          ...detail,
          document_type: "SALARY",
        });
      } else {
        const detail = unwrap(
          await api.get(`/hrms/employee-letters/${row.id}/`),
        );

        setPreview({
          ...detail,
          document_type: detail.letter_type,
        });
      }
    } catch (error) {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to open certificate / letter");
    }
  };

  const download = (item) => {
    if (item.document_type === "SALARY") {
      generateSalaryCertificatePdf(item);

      return;
    }

    generateEmployeeLetterPdf(item);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Certificates & Letters"
        subtitle="Issue, preview and download official employee certificates and letters."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setWarningForm(warningEmpty);

                setModalType("WARNING");
              }}
            >
              <TriangleAlert className="mr-2 h-4 w-4" />
              Warning Letter
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setExperienceForm(experienceEmpty);

                setModalType("EXPERIENCE");
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Experience Letter
            </Button>

            <Button
              onClick={() => {
                setSalaryForm(salaryEmpty);

                setModalType("SALARY");
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Salary Certificate
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="All Documents" value={allRows.length} />

        <Kpi label="Salary Certificates" value={certificates.length} />

        <Kpi
          label="Warning Letters"
          value={
            letters.filter((item) => item.letter_type === "WARNING").length
          }
        />

        <Kpi
          label="Experience Letters"
          value={
            letters.filter((item) => item.letter_type === "EXPERIENCE").length
          }
        />
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-1.5">
        {[
          ["ALL", "All"],
          ["SALARY", "Salary Certificates"],
          ["WARNING", "Warning Letters"],
          ["EXPERIENCE", "Experience Letters"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${
              tab === value
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reference, employee, reason or designation..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {[
                "Reference",
                "Type",
                "Date",
                "Employee",
                "Designation",
                "Details",
                "Issued By",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((item) => (
              <tr key={`${item.document_type}-${item.id}`} className="border-t">
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {item.reference_number}
                </td>

                <td className="px-4 py-3">
                  <TypeBadge type={item.document_type} />
                </td>

                <td className="px-4 py-3">
                  <DateText value={item.document_date} />
                </td>

                <td className="px-4 py-3">
                  <p className="font-semibold">{item.employee_name}</p>

                  <p className="text-xs text-muted-foreground">
                    {item.employee_code}
                  </p>
                </td>

                <td className="px-4 py-3">{item.designation_name || "—"}</td>

                <td className="max-w-[340px] px-4 py-3">
                  {item.document_type === "SALARY" ? (
                    <span>
                      Monthly salary:{" "}
                      <CurrencyText value={item.total_monthly_salary} />
                    </span>
                  ) : item.document_type === "WARNING" ? (
                    <span className="line-clamp-2">
                      {item.reason || item.subject || "—"}
                    </span>
                  ) : (
                    <span>
                      {item.joining_date || "—"} →{" "}
                      {item.last_working_date || "—"}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">{item.issued_by_name || "—"}</td>

                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Preview"
                      onClick={() => openPreview(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      title="Download PDF"
                      onClick={() => download(item)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {!visibleRows.length && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No certificates or letters found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalType === "SALARY" && (
        <SalaryModal
          form={salaryForm}
          setForm={setSalaryForm}
          employees={activeEmployees}
          selectedEmployee={salaryEmployee}
          total={salaryTotal}
          onEmployeeChange={handleSalaryEmployee}
          onClose={() => setModalType("")}
          onSave={() => salaryMutation.mutate()}
          pending={salaryMutation.isPending}
        />
      )}

      {modalType === "WARNING" && (
        <WarningModal
          form={warningForm}
          setForm={setWarningForm}
          employees={activeEmployees}
          onClose={() => setModalType("")}
          onSave={() => {
            if (!warningForm.employee) {
              toast.error("Select an employee.");

              return;
            }

            if (!warningForm.reason.trim()) {
              toast.error("Warning reason is required.");

              return;
            }

            letterMutation.mutate(warningForm);
          }}
          pending={letterMutation.isPending}
        />
      )}

      {modalType === "EXPERIENCE" && (
        <ExperienceModal
          form={experienceForm}
          setForm={setExperienceForm}
          employees={employees}
          onClose={() => setModalType("")}
          onSave={() => {
            if (!experienceForm.employee) {
              toast.error("Select an employee.");

              return;
            }

            if (!experienceForm.last_working_date) {
              toast.error("Last working date is required.");

              return;
            }

            letterMutation.mutate(experienceForm);
          }}
          pending={letterMutation.isPending}
        />
      )}

      {preview && (
        <Preview
          item={preview}
          onClose={() => setPreview(null)}
          onDownload={() => download(preview)}
        />
      )}
    </div>
  );
}

function showError(fallback) {
  return (error) => {
    const details = getApiErrorDetails(error);

    toast.error(
      error?.message && !error?.response
        ? error.message
        : details.title || fallback,
      {
        description:
          error?.response?.data?.detail || details.summary || details.message,
      },
    );
  };
}

function SalaryModal({
  form,
  setForm,
  employees,
  selectedEmployee,
  total,
  onEmployeeChange,
  onClose,
  onSave,
  pending,
}) {
  return (
    <ModalShell
      title="Issue Salary Certificate"
      description="Employee and salary information is stored as a permanent certificate snapshot."
      onClose={onClose}
      footer={
        <Button
          disabled={pending}
          onClick={onSave}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <FileBadge2 className="mr-2 h-4 w-4" />

          {pending ? "Issuing..." : "Issue Certificate"}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee *">
          <EmployeeSelect
            employees={employees}
            value={form.employee}
            onChange={onEmployeeChange}
          />
        </Field>

        <Field label="Certificate Date *">
          <Input
            type="date"
            value={form.certificate_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                certificate_date: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Designation">
          <Input disabled value={selectedEmployee?.designation_name || ""} />
        </Field>

        <Field label="Passport / Emirates ID">
          <Input
            value={form.identity_number}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                identity_number: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Basic Salary (AED)">
          <Input
            type="number"
            min="0"
            value={form.basic_salary}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                basic_salary: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Housing Allowance (AED)">
          <Input
            type="number"
            min="0"
            value={form.housing_allowance}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                housing_allowance: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Transport / Other Allowance (AED)">
          <Input
            type="number"
            min="0"
            value={form.transport_other_allowance}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                transport_other_allowance: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Total Monthly Salary">
          <Input disabled value={total.toFixed(2)} />
        </Field>

        <Field label="Authorized Signatory (Optional)">
          <Input
            value={form.authorized_signatory}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                authorized_signatory: event.target.value,
              }))
            }
            placeholder="Leave blank if not required"
          />
        </Field>

        <Field label="Signatory Designation (Optional)">
          <Input
            value={form.signatory_designation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                signatory_designation: event.target.value,
              }))
            }
            placeholder="Leave blank if not required"
          />
        </Field>
      </div>
    </ModalShell>
  );
}

function WarningModal({ form, setForm, employees, onClose, onSave, pending }) {
  return (
    <ModalShell
      title="Issue Warning Letter"
      description="Create a formal warning for an employee and record the exact reason."
      onClose={onClose}
      footer={
        <Button
          disabled={pending}
          onClick={onSave}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          <TriangleAlert className="mr-2 h-4 w-4" />

          {pending ? "Issuing..." : "Issue Warning Letter"}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee *">
          <EmployeeSelect
            employees={employees}
            value={form.employee}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                employee: value,
              }))
            }
          />
        </Field>

        <Field label="Letter Date *">
          <Input
            type="date"
            value={form.letter_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                letter_date: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Subject">
          <Input
            value={form.subject}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                subject: event.target.value,
              }))
            }
          />
        </Field>

        <div />

        <Field label="Reason *" full>
          <Textarea
            rows={4}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            placeholder="Example: Repeated late attendance despite previous verbal reminders."
          />
        </Field>

        <Field label="Required Improvement / Details" full>
          <Textarea
            rows={5}
            value={form.details}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                details: event.target.value,
              }))
            }
            placeholder="Explain expected corrective action, deadline, or any relevant incident details."
          />
        </Field>

        <Field label="Authorized Signatory *">
          <Input
            value={form.authorized_signatory}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                authorized_signatory: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Signatory Designation *">
          <Input
            value={form.signatory_designation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                signatory_designation: event.target.value,
              }))
            }
          />
        </Field>
      </div>
    </ModalShell>
  );
}

function ExperienceModal({
  form,
  setForm,
  employees,
  onClose,
  onSave,
  pending,
}) {
  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === String(form.employee),
  );

  return (
    <ModalShell
      title="Issue Experience Letter"
      description="Generate an official employment experience letter from the employee HR record."
      onClose={onClose}
      footer={
        <Button
          disabled={pending}
          onClick={onSave}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <FileText className="mr-2 h-4 w-4" />

          {pending ? "Issuing..." : "Issue Experience Letter"}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee *">
          <EmployeeSelect
            employees={employees}
            value={form.employee}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                employee: value,
              }))
            }
          />
        </Field>

        <Field label="Letter Date *">
          <Input
            type="date"
            value={form.letter_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                letter_date: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Joining Date">
          <Input disabled value={selectedEmployee?.joining_date || ""} />
        </Field>

        <Field label="Last Working Date *">
          <Input
            type="date"
            value={form.last_working_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                last_working_date: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Experience / Responsibility Summary" full>
          <Textarea
            rows={5}
            value={form.experience_summary}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                experience_summary: event.target.value,
              }))
            }
            placeholder="Optional: briefly describe the employee's role and main responsibilities."
          />
        </Field>

        <Field label="Conduct / Performance Note" full>
          <Textarea
            rows={4}
            value={form.conduct_note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                conduct_note: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Authorized Signatory *">
          <Input
            value={form.authorized_signatory}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                authorized_signatory: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Signatory Designation *">
          <Input
            value={form.signatory_designation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                signatory_designation: event.target.value,
              }))
            }
          />
        </Field>
      </div>
    </ModalShell>
  );
}

function Preview({ item, onClose, onDownload }) {
  const type = item.document_type || item.letter_type;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 p-4">
      <div className="mx-auto my-4 w-full max-w-[900px]">
        <div className="mb-3 flex justify-end gap-2">
          <Button onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>

          <Button size="icon" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <article className="min-h-[820px] bg-white px-12 py-10 text-[#222] shadow-2xl">
          <div className="text-center">
            <div className="text-6xl font-black tracking-tighter">GC</div>

            <div className="mt-1 text-lg font-black">
              GHAZA COMPUTER TRADING LLC
            </div>

            <div className="mt-8 text-xl font-black text-red-600">
              {type === "SALARY"
                ? "SALARY CERTIFICATE"
                : type === "WARNING"
                  ? "WARNING LETTER"
                  : "EXPERIENCE LETTER"}
            </div>
          </div>

          <div className="mt-8 flex justify-between text-sm text-gray-600">
            <span>
              Reference No.: <strong>{item.reference_number || "—"}</strong>
            </span>

            <span>
              Date:{" "}
              <DateText value={item.certificate_date || item.letter_date} />
            </span>
          </div>

          {type === "SALARY" ? (
            <SalaryPreviewBody certificate={item} />
          ) : type === "WARNING" ? (
            <WarningPreviewBody letter={item} />
          ) : (
            <ExperiencePreviewBody letter={item} />
          )}
        </article>
      </div>
    </div>
  );
}

function SalaryPreviewBody({ certificate }) {
  return (
    <>
      <h2 className="mt-10 text-lg font-black">TO WHOM IT MAY CONCERN</h2>

      <p className="mt-3 leading-7">
        This is to certify that <strong>{certificate.employee_name}</strong> is
        employed with Ghaza Computer Trading LLC as{" "}
        <strong>{certificate.designation_name || "Employee"}</strong>.
      </p>

      <div className="mt-6 rounded border p-4">
        <p>
          Basic Salary:{" "}
          <strong>
            <CurrencyText value={certificate.basic_salary} />
          </strong>
        </p>

        <p className="mt-2">
          Allowances:{" "}
          <strong>
            <CurrencyText
              value={
                Number(certificate.housing_allowance || 0) +
                Number(certificate.transport_other_allowance || 0)
              }
            />
          </strong>
        </p>

        <p className="mt-2">
          Total Monthly Salary:{" "}
          <strong>
            <CurrencyText value={certificate.total_monthly_salary} />
          </strong>
        </p>
      </div>

      {(certificate.authorized_signatory ||
        certificate.signatory_designation) && (
        <div className="mt-12">
          {certificate.authorized_signatory && (
            <p className="font-semibold">{certificate.authorized_signatory}</p>
          )}

          {certificate.signatory_designation && (
            <p className="text-sm text-gray-600">
              {certificate.signatory_designation}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function WarningPreviewBody({ letter }) {
  return (
    <>
      <div className="mt-10 space-y-2">
        <p>
          <strong>To:</strong> {letter.employee_name}
        </p>

        <p>
          <strong>Employee Code:</strong> {letter.employee_code || "—"}
        </p>

        <p>
          <strong>Designation:</strong> {letter.designation_name || "—"}
        </p>
      </div>

      <h2 className="mt-8 font-black">
        Subject: {letter.subject || "Warning Letter"}
      </h2>

      <p className="mt-5 leading-7">
        This letter serves as a formal warning for the following reason:
      </p>

      <div className="mt-3 rounded border bg-red-50 p-4">{letter.reason}</div>

      {letter.details && (
        <div className="mt-5">
          <strong>Required Improvement / Details</strong>

          <p className="mt-2 whitespace-pre-wrap leading-7">{letter.details}</p>
        </div>
      )}
    </>
  );
}

function ExperiencePreviewBody({ letter }) {
  return (
    <>
      <h2 className="mt-10 text-lg font-black">TO WHOM IT MAY CONCERN</h2>

      <p className="mt-4 leading-7">
        This is to certify that <strong>{letter.employee_name}</strong> was
        employed with Ghaza Computer Trading LLC as{" "}
        <strong>{letter.designation_name || "Employee"}</strong>.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-y-3 rounded border p-4">
        <strong>Date of Joining</strong>

        <DateText value={letter.joining_date} />

        <strong>Last Working Date</strong>

        <DateText value={letter.last_working_date} />

        <strong>Department</strong>

        <span>{letter.department_name || "—"}</span>
      </div>

      {letter.experience_summary && (
        <p className="mt-6 whitespace-pre-wrap leading-7">
          {letter.experience_summary}
        </p>
      )}

      <p className="mt-6 whitespace-pre-wrap leading-7">
        {letter.conduct_note}
      </p>

      <p className="mt-6">
        We wish the employee success in future professional endeavors.
      </p>
    </>
  );
}

function EmployeeSelect({ employees, value, onChange }) {
  return (
    <select
      className="h-10 w-full rounded-md border bg-background px-3"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select employee</option>

      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name} — {employee.employee_code}
        </option>
      ))}
    </select>
  );
}

function ModalShell({ title, description, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>

            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>

          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5">{children}</div>

        <div className="flex justify-end gap-2 border-t bg-muted/30 p-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          {footer}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label>{label}</Label>

      <div className="mt-2">{children}</div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function TypeBadge({ type }) {
  const config = {
    SALARY: {
      label: "Salary Certificate",

      cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    },

    WARNING: {
      label: "Warning Letter",

      cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    },

    EXPERIENCE: {
      label: "Experience Letter",

      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
  }[type] || {
    label: type,

    cls: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.cls}`}
    >
      {config.label}
    </span>
  );
}
