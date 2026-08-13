import React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
  Download,
  Mail,
  MapPin,
  Phone,
  UserRound,
  ExternalLink,
  FileText,
  ImageIcon,
  Pencil,
  Plus,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function EmployeeDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [revision, setRevision] = React.useState({
    reason: "ANNUAL_INCREMENT",
    effective_from: "",
    basic_salary: "",
    allowances: "",
    approved_by_name: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["employee-profile", id],
    queryFn: async () =>
      unwrap(await api.get(`/hrms/employees/${id}/profile/`)),
  });

  const employee = profile?.employee;

  const { data: legacyHistory = [] } = useQuery({
    queryKey: ["salary-history", id],
    queryFn: async () =>
      unwrap(await api.get(`/hrms/employees/${id}/salary-history/`)),
  });

  const addRevision = useMutation({
    mutationFn: () =>
      api.post(`/hrms/employees/${id}/salary-revisions/`, {
        ...revision,
        basic_salary: Number(revision.basic_salary || 0),
        allowances: Number(revision.allowances || 0),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employee", id] }),
        queryClient.invalidateQueries({ queryKey: ["employee-profile", id] }),
        queryClient.invalidateQueries({ queryKey: ["salary-history", id] }),
      ]);
      toast.success("Salary revision added.");
      setRevisionOpen(false);
    },
  });

  if (!employee)
    return <div className="card-surface p-6">Loading employee...</div>;

  const employeeDocuments = Array.isArray(profile?.documents)
    ? profile.documents
    : Array.isArray(employee.documents)
      ? employee.documents
      : Array.isArray(employee.employee_documents)
        ? employee.employee_documents
        : Array.isArray(employee.document_files)
          ? employee.document_files
          : [];

  const history = profile?.salary_history || legacyHistory || [];
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.effective_from) - new Date(a.effective_from),
  );
  const joiningRevision =
    [...sortedHistory].reverse().find((item) => item.reason === "JOINING") ||
    sortedHistory[sortedHistory.length - 1];
  const joiningSalary = Number(
    joiningRevision?.total_salary || employee.total_salary || 0,
  );
  const currentSalary = Number(employee.total_salary || 0);
  const growth = joiningSalary
    ? Math.round(((currentSalary - joiningSalary) / joiningSalary) * 100)
    : 0;
  const chartItems = [...sortedHistory].reverse().slice(-4);
  const maxSalary = Math.max(
    1,
    ...chartItems.map((item) => Number(item.total_salary || 0)),
  );

  const openRevision = () => {
    setRevision({
      reason: "ANNUAL_INCREMENT",
      effective_from: "",
      basic_salary: employee.basic_salary || "",
      allowances: employee.allowances || "",
      approved_by_name: "",
    });
    setRevisionOpen(true);
  };

  const info = (label, value) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value || "—"}</div>
    </div>
  );

  return (
    <div className="hrms-module-page hrms-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={employee.full_name}
        subtitle={`${employee.employee_code} · ${employee.designation_name || "Employee"}`}
        actions={
          <Button asChild className="bg-blue-600 text-white">
            <Link to={`/hrms/employees/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>
        }
      />

      <section className="card-surface p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
            {employee.profile_image ? (
              <img
                src={employee.profile_image}
                alt={employee.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="grid flex-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {info("Branch", employee.branch_name)}
            {info("Department", employee.department_name)}
            {info("Designation", employee.designation_name)}
            {info(
              "Joining Date",
              employee.joining_date ? (
                <DateText value={employee.joining_date} />
              ) : (
                "—"
              ),
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-2">
                <StatusBadge status={employee.employment_status} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="card-surface overflow-x-auto px-4">
        <div className="flex min-w-max gap-1 border-b">
          {[
            ["overview", "Basic Details"],
            ["leave", "Leave History"],
            ["attendance", "Attendance"],
            ["salary", "Salary Revision"],
            ["payroll", "Payroll"],
            ["documents", "Documents"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          <section className="card-surface p-5">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-semibold">
                  Personal & Contact Information
                </h2>
                <p className="text-sm text-muted-foreground">
                  Employee contact, nationality, address, and employment
                  information.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {info(
                "Email",
                employee.email ? (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {employee.email}
                  </span>
                ) : (
                  "—"
                ),
              )}
              {info(
                "Phone",
                employee.phone ? (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {employee.phone}
                  </span>
                ) : (
                  "—"
                ),
              )}
              {info("Nationality", employee.nationality)}
              {info(
                "Date of Birth",
                employee.date_of_birth ? (
                  <DateText value={employee.date_of_birth} />
                ) : (
                  "—"
                ),
              )}
              {info(
                "Employment Type",
                String(employee.employment_type || "").replace(/_/g, " "),
              )}
              {info("Employee Code", employee.employee_code)}
              {info(
                "Address",
                employee.address ? (
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {employee.address}
                  </span>
                ) : (
                  "—"
                ),
              )}
              {info("Notes", employee.notes)}
            </div>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-semibold">Leave Balance Summary</h2>
                <p className="text-sm text-muted-foreground">
                  Current annual, sick, used, unpaid, and pending leave totals.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                [
                  "Annual Leave Left",
                  profile?.leave_summary?.annual_leave_left || 0,
                  "days",
                ],
                [
                  "Sick Leave Left",
                  profile?.leave_summary?.sick_leave_left || 0,
                  "days",
                ],
                [
                  "Used This Year",
                  profile?.leave_summary?.used_this_year || 0,
                  "days",
                ],
                [
                  "Unpaid Days Taken",
                  profile?.leave_summary?.unpaid_days_taken || 0,
                  "days",
                ],
                [
                  "Pending Requests",
                  profile?.leave_summary?.pending_requests || 0,
                  "request(s)",
                ],
                [
                  "Approved Requests",
                  profile?.leave_summary?.approved_requests || 0,
                  "request(s)",
                ],
              ].map(([label, value, suffix]) => (
                <div key={label} className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">
                    {value}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {suffix}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card-surface p-5">
              <h2 className="font-semibold">Identity & Immigration</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {info("Passport Number", employee.passport_number)}
                {info(
                  "Passport Issue Date",
                  employee.passport_issue_date ? (
                    <DateText value={employee.passport_issue_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info(
                  "Passport Expiry",
                  employee.passport_expiry_date ? (
                    <DateText value={employee.passport_expiry_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info("Emirates ID", employee.emirates_id_number)}
                {info(
                  "Emirates ID Issue Date",
                  employee.emirates_id_issue_date ? (
                    <DateText value={employee.emirates_id_issue_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info(
                  "Emirates ID Expiry",
                  employee.emirates_id_expiry_date ? (
                    <DateText value={employee.emirates_id_expiry_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info("Visa Number", employee.visa_number)}
                {info("Visa Type", employee.visa_type)}
                {info(
                  "Visa Issue Date",
                  employee.visa_issue_date ? (
                    <DateText value={employee.visa_issue_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info("Visa Sponsor", employee.visa_sponsor)}
                {info("Visa Status", employee.visa_status)}
                {info(
                  "Visa Expiry",
                  employee.visa_expiry_date ? (
                    <DateText value={employee.visa_expiry_date} />
                  ) : (
                    "—"
                  ),
                )}
              </div>
            </section>

            <section className="card-surface p-5">
              <h2 className="font-semibold">Labor Contract</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {info("Contract Number", employee.labor_contract_number)}
                {info("Contract Type", employee.labor_contract_type)}
                {info("Contract Status", employee.labor_contract_status)}
                {info(
                  "Start Date",
                  employee.labor_contract_start_date ? (
                    <DateText value={employee.labor_contract_start_date} />
                  ) : (
                    "—"
                  ),
                )}
                {info(
                  "End Date",
                  employee.labor_contract_end_date ? (
                    <DateText value={employee.labor_contract_end_date} />
                  ) : (
                    "—"
                  ),
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {activeTab === "documents" && (
        <section className="card-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">Employee Documents</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uploaded Passport, Visa, Labor Contract, Emirates ID, and
                  other employee documents.
                </p>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link to={`/hrms/employees/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Manage Documents
              </Link>
            </Button>
          </div>

          {employeeDocuments.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {employeeDocuments.map((item) => {
                const fileUrl = item.file_url || item.file || item.document_url;

                return (
                  <article
                    key={item.id || `${item.document_type}-${item.title}`}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            {item.title ||
                              item.document_type_display ||
                              "Employee Document"}
                          </h3>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.document_type_display ||
                              String(item.document_type || "OTHER").replace(
                                /_/g,
                                " ",
                              )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Number</p>
                        <p className="mt-1 truncate font-medium">
                          {item.document_number || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Issue Date
                        </p>
                        <p className="mt-1 font-medium">
                          {item.issue_date ? (
                            <DateText value={item.issue_date} />
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expiry Date
                        </p>
                        <p className="mt-1 font-medium">
                          {item.expiry_date ? (
                            <DateText value={item.expiry_date} />
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded
                        </p>
                        <p className="mt-1 font-medium">
                          {item.uploaded_at || item.created_at ? (
                            <DateText
                              value={item.uploaded_at || item.created_at}
                            />
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t pt-4">
                      {fileUrl ? (
                        <>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <a href={fileUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View
                            </a>
                          </Button>

                          <Button
                            asChild
                            size="sm"
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <a href={fileUrl} download>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </>
                      ) : (
                        <p className="w-full text-center text-sm text-muted-foreground">
                          Document file is unavailable.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
              <FileText className="mx-auto h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No documents uploaded</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add Passport, Visa, or Labor Contract files from the employee
                edit page.
              </p>
              <Button
                asChild
                className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Link to={`/hrms/employees/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Employee
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {activeTab === "salary" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border bg-gradient-to-r from-blue-50/70 via-background to-cyan-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:from-blue-500/5 dark:to-cyan-500/5">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-base font-semibold">Salary Revision</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Track joining salary and effective-dated revisions.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={openRevision}
              size="sm"
              className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Revision
            </Button>
          </div>

          <section className="card-surface overflow-hidden p-0">
            <div className="border-b bg-muted/20 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Salary Overview
              </p>
            </div>

            <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-[minmax(280px,1.35fr)_repeat(3,minmax(150px,0.55fr))] xl:items-center">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Employee
                </p>

                <select
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value={employee.id}
                  disabled
                >
                  <option value={employee.id}>
                    {employee.full_name} —{" "}
                    {employee.designation_name || "Employee"}
                  </option>
                </select>
              </div>

              <SalaryMetric
                label="Joining Salary"
                value={<CurrencyText value={joiningSalary} />}
              />

              <SalaryMetric
                label="Current Salary"
                value={<CurrencyText value={currentSalary} />}
                valueClassName="text-blue-600"
              />

              <SalaryMetric
                label="Total Growth"
                value={`${growth >= 0 ? "+" : ""}${growth}%`}
                valueClassName={
                  growth >= 0 ? "text-emerald-600" : "text-red-600"
                }
              />
            </div>
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="card-surface min-h-[420px] overflow-hidden p-0">
              <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
                <div>
                  <h3 className="font-semibold">Revision Timeline</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Chronological salary changes for this employee.
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
                  {sortedHistory.length} record
                  {sortedHistory.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="relative p-5">
                <div className="absolute bottom-5 left-[7px] top-5 w-px bg-slate-200" />
                {sortedHistory.map((item, index) => {
                  const previous = sortedHistory[index + 1];
                  const increase =
                    Number(item.total_salary || 0) -
                    Number(previous?.total_salary || 0);
                  return (
                    <div
                      key={item.id}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      <div
                        className={
                          index === 0
                            ? "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-blue-100 bg-blue-600"
                            : "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-slate-100 bg-slate-400"
                        }
                      />
                      <div className="min-w-0 flex-1 rounded-xl border bg-background p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.reason_display}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Effective {item.effective_from}
                            </p>
                          </div>
                          <StatusBadge
                            status={
                              index === 0
                                ? "CURRENT"
                                : item.reason === "JOINING"
                                  ? "JOINING"
                                  : "REVISION"
                            }
                          />
                        </div>
                        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
                          <RevisionValue
                            label="Basic Salary"
                            value={<CurrencyText value={item.basic_salary} />}
                          />

                          <RevisionValue
                            label="Allowances"
                            value={<CurrencyText value={item.allowances} />}
                          />

                          <RevisionValue
                            label="Total Salary"
                            value={<CurrencyText value={item.total_salary} />}
                          />
                        </div>
                        {previous && increase !== 0 && (
                          <p className="mt-3 text-xs font-medium text-emerald-600">
                            +<CurrencyText value={increase} /> from previous
                          </p>
                        )}
                        {item.approved_by_name && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Approved by {item.approved_by_name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!sortedHistory.length && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No salary revisions found.
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-4">
              <section className="card-surface overflow-hidden p-0">
                <div className="border-b bg-muted/20 px-5 py-4">
                  <h3 className="font-semibold">Current Structure</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Current active salary package.
                  </p>
                </div>

                <div className="space-y-4 p-5 text-sm">
                  <StructureRow
                    label="Basic Salary"
                    value={<CurrencyText value={employee.basic_salary} />}
                  />

                  <StructureRow
                    label="Allowances"
                    value={<CurrencyText value={employee.allowances} />}
                  />

                  <div className="border-t pt-4">
                    <StructureRow
                      label="Total Package"
                      value={<CurrencyText value={employee.total_salary} />}
                      strong
                    />
                  </div>

                  <StructureRow
                    label="Effective From"
                    value={
                      sortedHistory[0]?.effective_from ||
                      employee.joining_date ||
                      "—"
                    }
                  />
                </div>
              </section>

              <section className="card-surface overflow-hidden p-0">
                <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
                  <div>
                    <h3 className="font-semibold">Salary Growth</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Salary progression over time.
                    </p>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>

                <div className="p-5">
                  {chartItems.length ? (
                    <div className="flex h-40 items-end gap-4">
                      {chartItems.map((item) => {
                        const value = Number(item.total_salary || 0);
                        const height = Math.max(
                          18,
                          Math.round((value / maxSalary) * 100),
                        );

                        return (
                          <div
                            key={item.id}
                            className="flex flex-1 flex-col items-center justify-end gap-2"
                          >
                            <div
                              className="w-full rounded-t-md bg-blue-100"
                              style={{ height: `${height}%` }}
                              title={`AED ${value.toLocaleString("en-US")}`}
                            />

                            <span className="text-[10px] text-muted-foreground">
                              {String(item.effective_from || "").slice(0, 4)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      No salary growth data available.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      )}

      {activeTab === "attendance" && (
        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Attendance Overview</h2>
              <p className="text-sm text-muted-foreground">
                Recent attendance and lifetime totals for this employee.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Present", profile?.attendance_summary?.present || 0],
              ["Absent", profile?.attendance_summary?.absent || 0],
              ["Late", profile?.attendance_summary?.late || 0],
              ["Leave", profile?.attendance_summary?.leave || 0],
              ["Half Day", profile?.attendance_summary?.half_day || 0],
              ["Records", profile?.attendance_summary?.total_records || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Check In</th>
                  <th className="p-3">Check Out</th>
                  <th className="p-3">Hours</th>
                </tr>
              </thead>
              <tbody>
                {(profile?.attendance || []).slice(0, 10).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">
                      <DateText value={row.date} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="p-3">{row.check_in || "—"}</td>
                    <td className="p-3">{row.check_out || "—"}</td>
                    <td className="p-3">{row.working_hours || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "leave" && (
        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Leave History & Balances</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(profile?.leave_balances || []).map((balance) => (
              <div key={balance.id} className="rounded-xl border p-3">
                <p className="font-medium">{balance.leave_type_name}</p>
                <p className="text-sm text-muted-foreground">
                  Remaining: {balance.remaining_days} day(s)
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {(profile?.leaves || []).slice(0, 10).map((leave) => (
              <div key={leave.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{leave.leave_type_name}</p>
                    <p className="text-xs text-muted-foreground">
                      <DateText value={leave.from_date} /> –{" "}
                      <DateText value={leave.to_date} /> · {leave.days} day(s)
                    </p>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>

                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-foreground">Reason:</span>{" "}
                    {leave.reason || "—"}
                  </p>

                  <p>
                    <span className="font-medium text-foreground">
                      Actioned by:
                    </span>{" "}
                    {leave.actioned_by_name || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "payroll" && (
        <EmployeePayrollHistory
          entries={profile?.payroll || []}
          employeeId={id}
        />
      )}

      {revisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">Add Salary Revision</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  New ledger entry for {employee.full_name}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRevisionOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This closes the current salary entry and opens a new
                effective-dated record. Past payroll runs are unaffected.
              </div>
              <div>
                <Label>Reason</Label>
                <Select
                  value={revision.reason}
                  onValueChange={(value) =>
                    setRevision((current) => ({ ...current, reason: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL_INCREMENT">
                      Annual Increment
                    </SelectItem>
                    <SelectItem value="PROMOTION">Promotion</SelectItem>
                    <SelectItem value="CORRECTION">
                      Salary Correction
                    </SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  className="mt-2"
                  value={revision.effective_from}
                  onChange={(event) =>
                    setRevision((current) => ({
                      ...current,
                      effective_from: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>New Basic Salary</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={revision.basic_salary}
                    onChange={(event) =>
                      setRevision((current) => ({
                        ...current,
                        basic_salary: event.target.value,
                      }))
                    }
                    placeholder="e.g. 6500"
                  />
                </div>
                <div>
                  <Label>New Allowances</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={revision.allowances}
                    onChange={(event) =>
                      setRevision((current) => ({
                        ...current,
                        allowances: event.target.value,
                      }))
                    }
                    placeholder="e.g. 900"
                  />
                </div>
              </div>
              <div>
                <Label>Approved By</Label>
                <Input
                  className="mt-2"
                  value={revision.approved_by_name}
                  onChange={(event) =>
                    setRevision((current) => ({
                      ...current,
                      approved_by_name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Super Admin"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setRevisionOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={addRevision.isPending || !revision.effective_from}
                onClick={() => addRevision.mutate()}
                className="bg-blue-600 text-white"
              >
                Save Revision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryMetric({ label, value, valueClassName = "" }) {
  return (
    <div className="rounded-xl border bg-background px-4 py-3 shadow-sm xl:text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>

      <div
        className={`mt-1 whitespace-nowrap text-[15px] font-semibold ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

function RevisionValue({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 whitespace-nowrap font-medium">{value}</div>
    </div>
  );
}

function StructureRow({ label, value, strong = false }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </span>

      <div
        className={`whitespace-nowrap text-right ${strong ? "font-semibold" : "font-medium"}`}
      >
        {value}
      </div>
    </div>
  );
}

function EmployeePayrollHistory({ entries, employeeId }) {
  const payrollEntries = Array.isArray(entries) ? entries : [];

  const paidEntries = payrollEntries.filter(
    (entry) => String(entry.status || "").toUpperCase() === "PAID",
  );

  const lastTwelvePaid = paidEntries.slice(0, 12);

  const totalPaid = lastTwelvePaid.reduce(
    (sum, entry) => sum + Number(entry.net_salary || 0),
    0,
  );

  const averageNet = lastTwelvePaid.length
    ? totalPaid / lastTwelvePaid.length
    : 0;

  const onTimeRate = paidEntries.length
    ? Math.round(
        (paidEntries.filter((entry) => Boolean(entry.paid_at)).length /
          paidEntries.length) *
          100,
      )
    : 0;

  const latestPayroll = payrollEntries[0];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-gradient-to-r from-blue-50/70 via-background to-cyan-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:from-blue-500/5 dark:to-cyan-500/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
            <WalletCards className="h-4 w-4" />
          </div>

          <div>
            <h2 className="text-base font-semibold">Payroll History</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monthly payroll, payable days, deductions, allowances, and net
              salary.
            </p>
          </div>
        </div>

        {latestPayroll && (
          <div className="rounded-xl border bg-background px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Latest Payroll
            </p>

            <div className="mt-1 flex items-center gap-3">
              <span className="font-semibold">
                {latestPayroll.period || "—"}
              </span>
              <StatusBadge status={latestPayroll.status} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PayrollMetric
          label="Total Paid (12 Mo)"
          value={<CurrencyText value={totalPaid} />}
          description={`${lastTwelvePaid.length} paid payroll record${
            lastTwelvePaid.length === 1 ? "" : "s"
          }`}
          icon="total"
        />

        <PayrollMetric
          label="Avg Net / Month"
          value={<CurrencyText value={averageNet} />}
          description="Average across paid payroll"
          icon="average"
        />

        <PayrollMetric
          label="On-Time Rate"
          value={`${onTimeRate}%`}
          valueClassName="text-emerald-600"
          description="Payroll records with payment timestamp"
          icon="rate"
        />
      </div>

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Monthly Payroll Records</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Latest payroll periods are shown first.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
            {payrollEntries.length} record
            {payrollEntries.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <PayrollTh>Period</PayrollTh>
                <PayrollTh>Status</PayrollTh>
                <PayrollTh>Payable Days</PayrollTh>
                <PayrollTh right>Deductions</PayrollTh>
                <PayrollTh right>Allowances</PayrollTh>
                <PayrollTh>Method</PayrollTh>
                <PayrollTh right>Net</PayrollTh>
                <PayrollTh right>Action</PayrollTh>
              </tr>
            </thead>

            <tbody>
              {payrollEntries.slice(0, 24).map((entry) => {
                const payableDays = Number(entry.payable_days || 0);

                const totalPeriodDays = Number(
                  entry.total_period_days || payableDays || 0,
                );

                const totalDeductions =
                  Number(entry.deductions || 0) +
                  Number(entry.advance_deduction || 0);

                return (
                  <tr
                    key={entry.id}
                    className="border-b transition hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">
                        {entry.period || "—"}
                      </div>

                      {entry.payroll_date && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <DateText value={entry.payroll_date} />
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={entry.status} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium tabular-nums">
                        {payableDays.toFixed(2)} / {totalPeriodDays.toFixed(2)}
                      </div>

                      {Number(entry.unpaid_leave_days || 0) > 0 && (
                        <div className="mt-0.5 text-[11px] text-amber-600">
                          {Number(entry.unpaid_leave_days || 0).toFixed(2)}{" "}
                          unpaid
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums">
                      <div className="font-medium text-red-500">
                        <CurrencyText value={totalDeductions} />
                      </div>

                      {Number(entry.advance_deduction || 0) > 0 && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          Incl. advance
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums">
                      <CurrencyText value={entry.allowances || 0} />
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {String(
                          entry.salary_calculation_method || "FULL",
                        ).replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-semibold tabular-nums text-emerald-600">
                        <CurrencyText value={entry.net_salary || 0} />
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                      >
                        <Link to={`/hrms/payroll?employee=${employeeId}`}>
                          View Payroll
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {!payrollEntries.length && (
                <tr>
                  <td colSpan="8" className="px-4 py-14 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                      <WalletCards className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <h3 className="mt-3 font-semibold">No payroll history</h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Payroll records for this employee will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function PayrollMetric({
  label,
  value,
  valueClassName = "",
  description = "",
  icon = "total",
}) {
  const iconStyles = {
    total: "bg-blue-50 text-blue-600 dark:bg-blue-500/10",
    average: "bg-violet-50 text-violet-600 dark:bg-violet-500/10",
    rate: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
  };

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>

          <div className={`mt-2 text-xl font-semibold ${valueClassName}`}>
            {value}
          </div>

          {description && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            iconStyles[icon] || iconStyles.total
          }`}
        >
          {icon === "rate" ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <WalletCards className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
}

function PayrollTh({ children, right = false }) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
