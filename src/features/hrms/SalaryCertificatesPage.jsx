import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Eye,
  FileBadge2,
  Plus,
  Printer,
  Search,
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
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { generateSalaryCertificatePdf } from "./salaryCertificatePdf";

const asRows = (value) => {
  const payload = value?.data ?? value;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
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

export default function SalaryCertificatesPage() {
  const queryClient = useQueryClient();
  const { branchParams } = useActiveBranchFilter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);

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

  const employeesQ = useQuery({
    queryKey: ["salary-certificate-employees", branchParams],
    queryFn: () =>
      api.get("/hrms/employees/", {
        params: {
          ...branchParams,
          employment_status: "ACTIVE",
          page_size: 1000,
          ordering: "first_name",
        },
      }),
  });

  const certificates = asRows(certificatesQ.data);
  const employees = asRows(employeesQ.data);

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === String(form.employee),
  );

  const total =
    Number(form.basic_salary || 0) +
    Number(form.housing_allowance || 0) +
    Number(form.transport_other_allowance || 0);

  React.useEffect(() => {
    const employeeId = searchParams.get("employee");

    if (!employeeId || !employees.length) return;

    const exists = employees.some(
      (item) => String(item.id) === String(employeeId),
    );

    if (!exists) return;

    handleEmployeeChange(employeeId);
    setCreateOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("employee");
    setSearchParams(next, { replace: true });
    // Run only when employee options become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]);

  const handleEmployeeChange = async (employeeId) => {
    const employee = employees.find(
      (item) => String(item.id) === String(employeeId),
    );

    if (!employee) {
      setForm((current) => ({ ...current, employee: employeeId }));
      return;
    }

    try {
      const detail = unwrap(
        await api.get(
          `/hrms/employees/${employee.id}/salary-certificate-data/`,
        ),
      );

      setForm((current) => ({
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
      setForm((current) => ({
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.employee) throw new Error("Select an employee.");
      if (!form.authorized_signatory.trim()) {
        throw new Error("Authorized signatory is required.");
      }
      if (!form.signatory_designation.trim()) {
        throw new Error("Signatory designation is required.");
      }

      return api.post(
        "/hrms/salary-certificates/",
        {
          ...form,
          employee: Number(form.employee),
          basic_salary: Number(form.basic_salary || 0),
          housing_allowance: Number(form.housing_allowance || 0),
          transport_other_allowance: Number(
            form.transport_other_allowance || 0,
          ),
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
      setCreateOpen(false);
      setPreview(saved);
    },
    onError: (error) => {
      const d = getApiErrorDetails(error);
      toast.error(
        error?.message && !error?.response
          ? error.message
          : d.title || "Unable to issue salary certificate",
        { description: d.summary || d.message },
      );
    },
  });

  const openPreview = async (row) => {
    try {
      const detail = unwrap(
        await api.get(`/hrms/salary-certificates/${row.id}/`),
      );
      setPreview(detail);
    } catch (error) {
      const d = getApiErrorDetails(error);
      toast.error(d.title || "Unable to open certificate");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title="Salary Certificates"
        subtitle="Issue, preview, print and download official employee salary certificates."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setCreateOpen(true);
            }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Issue Certificate
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Certificates Issued" value={certificates.length} />
        <Kpi
          label="This Month"
          value={
            certificates.filter((item) =>
              String(item.certificate_date || "").startsWith(
                today().slice(0, 7),
              ),
            ).length
          }
        />
        <Kpi label="Active Employees" value={employees.length} />
        <Kpi
          label="Latest Reference"
          value={certificates[0]?.reference_number || "—"}
        />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, employee, passport or Emirates ID..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {[
                "Reference",
                "Date",
                "Employee",
                "Designation",
                "ID / Passport",
                "Basic",
                "Allowances",
                "Total Salary",
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
            {certificates.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {item.reference_number}
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.certificate_date} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{item.employee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.employee_code}
                  </p>
                </td>
                <td className="px-4 py-3">{item.designation_name || "—"}</td>
                <td className="px-4 py-3">{item.identity_number || "—"}</td>
                <td className="px-4 py-3">
                  <CurrencyText value={item.basic_salary} />
                </td>
                <td className="px-4 py-3">
                  <CurrencyText
                    value={
                      Number(item.housing_allowance || 0) +
                      Number(item.transport_other_allowance || 0)
                    }
                  />
                </td>
                <td className="px-4 py-3 font-semibold">
                  <CurrencyText value={item.total_monthly_salary} />
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
                      onClick={() => generateSalaryCertificatePdf(item)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!certificates.length && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No salary certificates issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateCertificateModal
          form={form}
          setForm={setForm}
          employees={employees}
          selectedEmployee={selectedEmployee}
          total={total}
          onEmployeeChange={handleEmployeeChange}
          onClose={() => setCreateOpen(false)}
          onSave={() => createMutation.mutate()}
          pending={createMutation.isPending}
        />
      )}

      {preview && (
        <CertificatePreview
          certificate={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function CreateCertificateModal({
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
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-bold">Issue Salary Certificate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Employee data is loaded from HRMS. Salary values are saved as a
              permanent certificate snapshot.
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Employee *">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.employee}
                onChange={(e) => onEmployeeChange(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} — {employee.employee_code}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Certificate Date *">
              <Input
                type="date"
                value={form.certificate_date}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    certificate_date: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Designation">
              <Input
                disabled
                value={selectedEmployee?.designation_name || ""}
              />
            </Field>

            <Field label="Joining Date">
              <Input disabled value={selectedEmployee?.joining_date || ""} />
            </Field>

            <Field label="Passport / Emirates ID No.">
              <Input
                value={form.identity_number}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    identity_number: e.target.value,
                  }))
                }
              />
            </Field>
          </section>

          <section>
            <h3 className="mb-4 font-semibold">Monthly Salary Structure</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Basic Salary (AED) *">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basic_salary}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      basic_salary: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Housing / Accommodation Allowance (AED)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.housing_allowance}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      housing_allowance: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Transport / Other Allowance (AED)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.transport_other_allowance}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      transport_other_allowance: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Total Monthly Salary (AED)">
                <Input disabled value={total.toFixed(2)} />
              </Field>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Authorized Signatory *">
              <Input
                value={form.authorized_signatory}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    authorized_signatory: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Signatory Designation *">
              <Input
                value={form.signatory_designation}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    signatory_designation: e.target.value,
                  }))
                }
              />
            </Field>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/30 p-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={onSave}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <FileBadge2 className="mr-2 h-4 w-4" />
            {pending ? "Issuing..." : "Issue Certificate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CertificatePreview({ certificate, onClose }) {
  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/70 p-4">
      <div className="mx-auto my-4 w-full max-w-[900px]">
        <div className="mb-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={() => generateSalaryCertificatePdf(certificate)}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button size="icon" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <article className="min-h-[1120px] bg-white px-12 py-10 text-[#222] shadow-2xl print:shadow-none">
          <div className="text-center">
            <div className="text-6xl font-black tracking-tighter">GC</div>
            <div className="mt-1 text-lg font-black">
              GHAZA COMPUTER TRADING LLC
            </div>
            <div className="mt-8 text-xl font-black text-red-600">
              SALARY CERTIFICATE
            </div>
          </div>

          <div className="mt-8 flex justify-between text-sm text-gray-600">
            <span>
              Reference No.:{" "}
              <strong>{certificate.reference_number || "—"}</strong>
            </span>
            <span>
              Date: <DateText value={certificate.certificate_date} />
            </span>
          </div>

          <h2 className="mt-10 text-lg font-black">TO WHOM IT MAY CONCERN</h2>
          <p className="mt-3 leading-7">
            This is to certify that the following employee is currently employed
            with <strong>Ghaza Computer Trading LLC</strong> under the
            employment details stated below.
          </p>

          <InfoTable
            rows={[
              ["Employee Name", certificate.employee_name],
              ["Passport / Emirates ID No.", certificate.identity_number],
              ["Designation", certificate.designation_name],
              [
                "Date of Joining",
                <DateText value={certificate.joining_date} />,
              ],
            ]}
          />

          <p className="mt-6">
            The employee’s current monthly salary is structured as follows:
          </p>

          <div className="mt-3 overflow-hidden border">
            <div className="grid grid-cols-[1fr_220px] bg-[#202124] font-bold text-white">
              <div className="px-3 py-3">Salary Component</div>
              <div className="px-3 py-3 text-right">Amount (AED)</div>
            </div>
            {[
              ["Basic Salary", certificate.basic_salary],
              [
                "Housing / Accommodation Allowance",
                certificate.housing_allowance,
              ],
              [
                "Transport / Other Allowance",
                certificate.transport_other_allowance,
              ],
              ["Total Monthly Salary", certificate.total_monthly_salary],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`grid grid-cols-[1fr_220px] border-t ${
                  index === 3 ? "bg-red-50 font-black" : ""
                }`}
              >
                <div className="px-3 py-3">{label}</div>
                <div className="border-l px-3 py-3 text-right">
                  <CurrencyText value={value} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 leading-7">
            This certificate is issued at the employee’s request for official
            purposes. The company assumes no responsibility beyond confirming
            the employment and salary information stated above.
          </p>

          <div className="mt-8 font-bold">For Ghaza Computer Trading LLC</div>

          <div className="mt-6 grid grid-cols-[220px_1fr] gap-y-5">
            <strong>Authorized Signatory</strong>
            <span>{certificate.authorized_signatory || "—"}</span>
            <strong>Designation</strong>
            <span>{certificate.signatory_designation || "—"}</span>
            <strong>Company Stamp</strong>
            <span className="h-20 rounded border border-dashed" />
          </div>

          <div className="mt-24 border-t pt-4 text-center text-xs text-gray-500">
            Ghaza Computer Trading LLC &nbsp; | &nbsp; Salary Certificate
          </div>
        </article>
      </div>
    </div>
  );
}

function InfoTable({ rows }) {
  return (
    <div className="mt-5 overflow-hidden border">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[1fr_1fr] border-t first:border-t-0"
        >
          <div className="bg-gray-50 px-3 py-3 font-bold">{label}</div>
          <div className="border-l px-3 py-3">{value || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
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
