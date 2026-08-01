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
    <div className="mx-auto max-w-7xl space-y-5">
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
            ["payroll", "Payroll & Salary"],
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

      {activeTab === "payroll" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Salary History</h2>
              <p className="text-sm text-muted-foreground">
                Effective-dated salary ledger, from joining to today
              </p>
            </div>
            <Button
              onClick={openRevision}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Revision
            </Button>
          </div>

          <section className="card-surface p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <select
                className="h-10 min-w-[260px] rounded-md border bg-background px-3 text-sm"
                value={employee.id}
                disabled
              >
                <option value={employee.id}>
                  {employee.full_name} —{" "}
                  {employee.designation_name || "Employee"}
                </option>
              </select>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Joining Salary
                  </p>
                  <p className="font-semibold">
                    <CurrencyText value={joiningSalary} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Current Salary
                  </p>
                  <p className="font-semibold text-blue-600">
                    <CurrencyText value={currentSalary} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Total Growth
                  </p>
                  <p className="font-semibold text-emerald-600">+{growth}%</p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="card-surface p-5">
              <h3 className="font-semibold">Revision Timeline</h3>
              <div className="relative mt-5">
                <div className="absolute bottom-5 left-[7px] top-5 w-px bg-slate-200" />
                {sortedHistory.map((item, index) => {
                  const previous = sortedHistory[index + 1];
                  const increase =
                    Number(item.total_salary || 0) -
                    Number(previous?.total_salary || 0);
                  return (
                    <div
                      key={item.id}
                      className="relative flex gap-4 pb-7 last:pb-0"
                    >
                      <div
                        className={
                          index === 0
                            ? "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-blue-100 bg-blue-600"
                            : "relative z-10 mt-1 h-4 w-4 rounded-full border-4 border-slate-100 bg-slate-400"
                        }
                      />
                      <div className="min-w-0 flex-1">
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
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Basic
                            </p>
                            <CurrencyText value={item.basic_salary} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Allowances
                            </p>
                            <CurrencyText value={item.allowances} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <CurrencyText value={item.total_salary} />
                          </div>
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

            <div className="space-y-5">
              <section className="card-surface p-5">
                <h3 className="font-semibold">Current Structure</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <CurrencyText value={employee.basic_salary} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allowances</span>
                    <CurrencyText value={employee.allowances} />
                  </div>
                  <div className="flex justify-between border-t pt-3 font-semibold">
                    <span>Total Package</span>
                    <CurrencyText value={employee.total_salary} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Effective From
                    </span>
                    <span>
                      {sortedHistory[0]?.effective_from ||
                        employee.joining_date ||
                        "—"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="card-surface p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Salary Growth</h3>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-6 flex h-40 items-end gap-4">
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

      {["leave", "payroll"].includes(activeTab) && (
        <div className="grid gap-5">
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
                          <DateText value={leave.to_date} /> · {leave.days}{" "}
                          day(s)
                        </p>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-foreground">
                          Reason:
                        </span>{" "}
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
            <section className="card-surface p-5">
              <div className="flex items-center gap-3">
                <WalletCards className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold">Payroll History</h2>
              </div>
              <div className="mt-4 space-y-3">
                {(profile?.payroll || []).slice(0, 12).map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.period}</p>
                        <p className="text-xs text-muted-foreground">
                          Payable days:{" "}
                          {entry.payable_days || entry.total_period_days || 30}/
                          {entry.total_period_days || 30} · Unpaid leave:{" "}
                          {entry.unpaid_leave_days || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyText value={entry.net_salary} />
                        <div className="mt-1">
                          <StatusBadge status={entry.status} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 border-t pt-3 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Basic</p>
                        <CurrencyText value={entry.basic_salary} />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Allowances</p>
                        <CurrencyText value={entry.allowances} />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deductions</p>
                        <CurrencyText value={entry.deductions} />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Method</p>
                        <p className="font-medium">
                          {String(
                            entry.salary_calculation_method || "FULL_MONTH",
                          ).replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
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
