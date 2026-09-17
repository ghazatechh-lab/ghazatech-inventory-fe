import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award,
  ChevronDown,
  Download,
  Eye,
  FileBadge2,
  FileText,
  LibraryBig,
  Plus,
  Search,
  TriangleAlert,
  Workflow,
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

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;

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

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const OTHER_LETTER_TYPES = {
  EMPLOYMENT: {
    label: "Employment Certificate",
    subject: "Employment Certificate",
    reasonLabel: "Purpose / Reason",
    detailsLabel: "Certificate Details",
  },
  NOC: {
    label: "NOC Letter",
    subject: "No Objection Certificate",
    reasonLabel: "NOC Purpose",
    detailsLabel: "Additional Details",
  },
  SALARY_TRANSFER: {
    label: "Salary Transfer Letter",
    subject: "Salary Transfer Letter",
    reasonLabel: "Bank / Purpose",
    detailsLabel: "Salary Transfer Details",
  },
  PROMOTION: {
    label: "Promotion Letter",
    subject: "Promotion Letter",
    reasonLabel: "Promotion Reason",
    detailsLabel: "New Designation / Salary / Effective Date",
  },
  TERMINATION: {
    label: "Termination Letter",
    subject: "Termination Letter",
    reasonLabel: "Termination Reason",
    detailsLabel: "Notice / Effective Date / Additional Details",
  },
  CUSTOM: {
    label: "Custom Letter",
    subject: "",
    reasonLabel: "Purpose / Reason",
    detailsLabel: "Letter Body / Details",
  },
};

export default function CertificatesLettersPage() {
  const queryClient = useQueryClient();
  const { branchParams } = useActiveBranchFilter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalType, setModalType] = useState("");
  const [preview, setPreview] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const [salaryForm, setSalaryForm] = useState(salaryEmpty);
  const [warningForm, setWarningForm] = useState(warningEmpty);
  const [experienceForm, setExperienceForm] = useState(experienceEmpty);
  const [otherLetterForm, setOtherLetterForm] = useState({
    letter_type: "EMPLOYMENT",
    employee: "",
    letter_date: today(),
    subject: "",
    reason: "",
    details: "",
    authorized_signatory: "",
    signatory_designation: "",
    notes: "",
  });

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

  const allRows = useMemo(() => {
    const salaryRows = certificates.map((item) => ({
      ...item,
      document_type: "SALARY",
      document_type_label: "Salary Certificate",
      document_date: item.certificate_date,
      status_label: "Issued",
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
      status_label: "Issued",
    }));

    return [...salaryRows, ...letterRows].sort(
      (a, b) =>
        String(b.document_date || "").localeCompare(
          String(a.document_date || ""),
        ) || Number(b.id || 0) - Number(a.id || 0),
    );
  }, [certificates, letters]);

  const visibleRows = useMemo(
    () =>
      tab === "ALL"
        ? allRows
        : allRows.filter((item) => item.document_type === tab),
    [allRows, tab],
  );

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

  const issuedThisMonth = allRows.filter((item) =>
    String(item.document_date || "").startsWith(currentMonthKey()),
  ).length;

  const openSalary = () => {
    setSalaryForm(salaryEmpty);
    setModalType("SALARY");
    setMoreOpen(false);
  };

  const openWarning = () => {
    setWarningForm(warningEmpty);
    setModalType("WARNING");
    setMoreOpen(false);
  };

  const openExperience = () => {
    setExperienceForm(experienceEmpty);
    setModalType("EXPERIENCE");
    setMoreOpen(false);
  };

  const openOtherLetter = (letterType) => {
    const meta = OTHER_LETTER_TYPES[letterType];
    if (!meta) return;

    setOtherLetterForm({
      letter_type: letterType,
      employee: "",
      letter_date: today(),
      subject: meta.subject,
      reason: "",
      details: "",
      authorized_signatory: "",
      signatory_designation: "",
      notes: "",
    });
    setModalType(letterType);
    setMoreOpen(false);
  };

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

  useEffect(() => {
    const employeeId = searchParams.get("employee");
    const requestedType = String(
      searchParams.get("type") || "SALARY",
    ).toUpperCase();

    if (!employeeId || !employees.length) return;

    const employee = employees.find(
      (item) => String(item.id) === String(employeeId),
    );

    if (!employee) return;

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
    setSearchParams(next, { replace: true });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]);

  const salaryMutation = useMutation({
    mutationFn: async () => {
      if (!salaryForm.employee) {
        throw new Error("Select an employee.");
      }

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
        { skipGlobalErrorToast: true },
      );
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await queryClient.invalidateQueries({
        queryKey: ["salary-certificates"],
      });

      toast.success(`Salary certificate ${saved.reference_number} issued.`);
      setModalType("");
      setPreview({ ...saved, document_type: "SALARY" });
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
        { skipGlobalErrorToast: true },
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

  const previewRow = preview || visibleRows[0] || null;

  return (
    <div className="w-full space-y-5 pb-10">
      <PageHeader
        title="Certificates & Letters"
        subtitle="Create, issue, preview and archive official employee certificates and HR letters."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={openSalary}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Salary Certificate
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMoreOpen((current) => !current)}
              >
                <FileText className="mr-2 h-4 w-4" />
                More Letters
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>

              {moreOpen && (
                <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={openWarning}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-500" />
                    <span>
                      <span className="block text-sm font-semibold">
                        Warning Letter
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Record a formal employee warning.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openExperience}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted"
                  >
                    <Award className="mt-0.5 h-4 w-4 text-blue-500" />
                    <span>
                      <span className="block text-sm font-semibold">
                        Experience Letter
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Issue service and employment experience details.
                      </span>
                    </span>
                  </button>

                  {[
                    ["EMPLOYMENT", "Employment Certificate"],
                    ["NOC", "NOC Letter"],
                    ["SALARY_TRANSFER", "Salary Transfer Letter"],
                    ["PROMOTION", "Promotion Letter"],
                    ["TERMINATION", "Termination Letter"],
                    ["CUSTOM", "Custom Letter"],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => openOtherLetter(type)}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted"
                    >
                      <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
                      <span>
                        <span className="block text-sm font-semibold">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Create and issue this employee document.
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PrototypeKpi
          label="All Documents"
          value={allRows.length}
          hint="All certificates & letters"
        />
        <PrototypeKpi
          label="Issued This Month"
          value={issuedThisMonth}
          hint={new Date().toLocaleString("en", {
            month: "long",
            year: "numeric",
          })}
        />
        <PrototypeKpi
          label="Salary Certificates"
          value={certificates.length}
          hint="Issued salary documents"
        />
        <PrototypeKpi
          label="Warning Letters"
          value={
            letters.filter((item) => item.letter_type === "WARNING").length
          }
          hint="Formal warning records"
        />
        <PrototypeKpi
          label="Experience Letters"
          value={
            letters.filter((item) => item.letter_type === "EXPERIENCE").length
          }
          hint="Employment experience records"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickCard
          icon={FileBadge2}
          title="Salary Certificate"
          description="Auto-fill salary, allowances, designation and employee identity."
          onClick={openSalary}
          tone="blue"
        />
        <QuickCard
          icon={Award}
          title="Experience Letter"
          description="Generate service period, role and final designation details."
          onClick={openExperience}
          tone="violet"
        />
        <QuickCard
          icon={TriangleAlert}
          title="Warning Letter"
          description="Record warning reason, incident details and improvement required."
          onClick={openWarning}
          tone="amber"
        />
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex gap-1 overflow-x-auto border-b p-1.5">
          {[
            ["ALL", "All"],
            ["SALARY", "Salary Certificates"],
            ["WARNING", "Warning Letters"],
            ["EXPERIENCE", "Experience Letters"],
            ["EMPLOYMENT", "Employment"],
            ["NOC", "NOC"],
            ["SALARY_TRANSFER", "Salary Transfer"],
            ["PROMOTION", "Promotion"],
            ["TERMINATION", "Termination"],
            ["CUSTOM", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="relative w-full xl:max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, employee, designation, purpose or reason..."
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-muted/35">
              <tr>
                {[
                  "Reference",
                  "Type",
                  "Date",
                  "Employee",
                  "Designation",
                  "Purpose / Details",
                  "Status",
                  "Issued By",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((item) => (
                <tr
                  key={`${item.document_type}-${item.id}`}
                  className="border-t transition hover:bg-muted/20"
                >
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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.employee_code}
                    </p>
                  </td>

                  <td className="px-4 py-3">{item.designation_name || "â€”"}</td>

                  <td className="max-w-[360px] px-4 py-3">
                    {item.document_type === "SALARY" ? (
                      <span>
                        {item.purpose || "Official purposes"} Â·{" "}
                        <CurrencyText value={item.total_monthly_salary} />
                      </span>
                    ) : item.document_type === "WARNING" ? (
                      <span className="line-clamp-2">
                        {item.reason || item.subject || "â€”"}
                      </span>
                    ) : item.document_type === "EXPERIENCE" ? (
                      <span>
                        Employment period: {item.joining_date || "â€”"} â†’{" "}
                        {item.last_working_date || "â€”"}
                      </span>
                    ) : (
                      <span className="line-clamp-2">
                        {item.reason || item.details || item.subject || "â€”"}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Issued
                    </span>
                  </td>

                  <td className="px-4 py-3">{item.issued_by_name || "â€”"}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPreview(item)}
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        Preview
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
                    colSpan={9}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    No certificates or letters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {visibleRows.length} document
            {visibleRows.length === 1 ? "" : "s"}
          </span>
          <span>Branch scope follows the active header branch filter.</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Document Workflow</h2>
              <p className="text-xs text-muted-foreground">
                Current issue process in the HRMS.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              [
                "1",
                "Choose document type",
                "Select Salary Certificate, Warning Letter or Experience Letter.",
              ],
              [
                "2",
                "Select employee",
                "ERP uses the employee profile and available HR/payroll data.",
              ],
              [
                "3",
                "Review details",
                "Confirm designation, dates, salary values, purpose and document wording.",
              ],
              [
                "4",
                "Issue document",
                "The system generates a reference number and stores the issued record.",
              ],
              [
                "5",
                "Preview or download",
                "Open the saved document and generate its official PDF when required.",
              ],
            ].map(([step, title, copy]) => (
              <div key={step} className="flex gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <LibraryBig className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Template Library</h2>
              <p className="text-xs text-muted-foreground">
                Available document templates.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TemplateCard
              title="Salary Certificate"
              description="Employee salary, allowance, designation and purpose."
              onClick={openSalary}
            />
            <TemplateCard
              title="Experience Letter"
              description="Employment dates, role, service and conduct."
              onClick={openExperience}
            />
            <TemplateCard
              title="Warning Letter"
              description="Formal reason, details and required improvement."
              onClick={openWarning}
            />
            {Object.entries(OTHER_LETTER_TYPES).map(([type, meta]) => (
              <TemplateCard
                key={type}
                title={meta.label}
                description="Create from the employee profile and issue an official HR document."
                onClick={() => openOtherLetter(type)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Document Preview</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview the latest visible document or open any row above.
            </p>
          </div>

          {previewRow && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPreview(previewRow)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Full Preview
              </Button>
              <Button size="sm" onClick={() => download(previewRow)}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {previewRow ? (
          <div className="rounded-xl border bg-white p-6 text-slate-900 shadow-sm dark:bg-slate-50">
            <div className="mx-auto max-w-3xl">
              <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Ghaza Computer
              </p>
              <h3 className="mt-3 text-center text-xl font-bold">
                {previewRow.document_type_label ||
                  (previewRow.document_type === "SALARY"
                    ? "Salary Certificate"
                    : previewRow.document_type === "WARNING"
                      ? "Warning Letter"
                      : previewRow.document_type === "EXPERIENCE"
                        ? "Experience Letter"
                        : OTHER_LETTER_TYPES[previewRow.document_type]?.label ||
                          "Employee Letter")}
              </h3>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <PreviewMeta
                  label="Reference"
                  value={previewRow.reference_number}
                />
                <PreviewMeta
                  label="Date"
                  value={previewRow.document_date || previewRow.letter_date}
                />
                <PreviewMeta
                  label="Employee"
                  value={previewRow.employee_name}
                />
                <PreviewMeta
                  label="Designation"
                  value={previewRow.designation_name || "â€”"}
                />
              </div>

              <div className="mt-6 border-t pt-5 text-sm leading-7 text-slate-700">
                {previewRow.document_type === "SALARY" ? (
                  <p>
                    This is to certify that{" "}
                    <strong>{previewRow.employee_name}</strong> is employed as{" "}
                    <strong>
                      {previewRow.designation_name || "an employee"}
                    </strong>
                    . The recorded monthly salary is{" "}
                    <strong>
                      <CurrencyText value={previewRow.total_monthly_salary} />
                    </strong>
                    .
                  </p>
                ) : previewRow.document_type === "WARNING" ? (
                  <p>
                    <strong>Reason:</strong>{" "}
                    {previewRow.reason || previewRow.subject || "â€”"}
                  </p>
                ) : previewRow.document_type === "EXPERIENCE" ? (
                  <p>
                    This document confirms the employment experience of{" "}
                    <strong>{previewRow.employee_name}</strong> for the recorded
                    service period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {previewRow.subject && (
                      <p>
                        <strong>Subject:</strong> {previewRow.subject}
                      </p>
                    )}
                    {previewRow.reason && (
                      <p>
                        <strong>Purpose / Reason:</strong> {previewRow.reason}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">
                      {previewRow.details ||
                        previewRow.notes ||
                        "Employee letter issued by HRMS."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No document is available for preview.
          </div>
        )}
      </section>

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

      {OTHER_LETTER_TYPES[modalType] && (
        <OtherLetterModal
          form={otherLetterForm}
          setForm={setOtherLetterForm}
          employees={employees}
          meta={OTHER_LETTER_TYPES[modalType]}
          onClose={() => setModalType("")}
          onSave={() => {
            if (!otherLetterForm.employee) {
              toast.error("Select an employee.");
              return;
            }

            if (
              otherLetterForm.letter_type === "TERMINATION" &&
              !otherLetterForm.reason.trim()
            ) {
              toast.error("Termination reason is required.");
              return;
            }

            if (
              otherLetterForm.letter_type === "PROMOTION" &&
              !otherLetterForm.details.trim()
            ) {
              toast.error("Promotion details are required.");
              return;
            }

            if (
              otherLetterForm.letter_type === "CUSTOM" &&
              !otherLetterForm.subject.trim()
            ) {
              toast.error("Subject is required for a custom letter.");
              return;
            }

            letterMutation.mutate(otherLetterForm);
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

function PrototypeKpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function QuickCard({ icon: Icon, title, description, onClick, tone }) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : tone === "violet"
        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
        : "bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-md"
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

function TemplateCard({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-muted/20 p-3 text-left transition hover:border-blue-500/30 hover:bg-muted/35"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

function PreviewMeta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-medium">{value || "â€”"}</p>
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

function OtherLetterModal({
  form,
  setForm,
  employees,
  meta,
  onClose,
  onSave,
  pending,
}) {
  return (
    <ModalShell title={`Create ${meta.label}`} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee">
          <select
            value={form.employee}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                employee: event.target.value,
              }))
            }
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_code} - {employee.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Letter Date">
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

        <div className="md:col-span-2">
          <Field label="Subject">
            <Input
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
              placeholder={`${meta.label} subject`}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label={meta.reasonLabel}>
            <Textarea
              rows={3}
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder={meta.reasonLabel}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label={meta.detailsLabel}>
            <Textarea
              rows={6}
              value={form.details}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
              placeholder={meta.detailsLabel}
            />
          </Field>
        </div>

        <Field label="Authorized Signatory">
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

        <Field label="Signatory Designation">
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

        <div className="md:col-span-2">
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Issuing..." : `Issue ${meta.label}`}
        </Button>
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
              Reference No.: <strong>{item.reference_number || "â€”"}</strong>
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
          <strong>Employee Code:</strong> {letter.employee_code || "â€”"}
        </p>

        <p>
          <strong>Designation:</strong> {letter.designation_name || "â€”"}
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

        <span>{letter.department_name || "â€”"}</span>
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
          {employee.full_name} â€” {employee.employee_code}
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

function TypeBadge({ type }) {
  const styles = {
    SALARY: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    WARNING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    EXPERIENCE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    EMPLOYMENT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    NOC: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    SALARY_TRANSFER: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    PROMOTION: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    TERMINATION: "bg-red-500/10 text-red-600 dark:text-red-400",
    CUSTOM: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  };

  const labels = {
    SALARY: "Salary Certificate",
    WARNING: "Warning Letter",
    EXPERIENCE: "Experience Letter",
    EMPLOYMENT: "Employment Certificate",
    NOC: "NOC Letter",
    SALARY_TRANSFER: "Salary Transfer Letter",
    PROMOTION: "Promotion Letter",
    TERMINATION: "Termination Letter",
    CUSTOM: "Custom Letter",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[type] || styles.CUSTOM
      }`}
    >
      {labels[type] || "Employee Letter"}
    </span>
  );
}

