import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  Paperclip,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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
import { DateText } from "@/components/common/CurrencyText";

const DOCUMENT_TYPES = [
  ["PASSPORT", "Passport"],
  ["EMIRATES_ID", "Emirates ID"],
  ["VISA", "Visa"],
  ["LABOR_CONTRACT", "Labour Contract"],
  ["EDUCATION", "Education Certificate"],
  ["MEDICAL", "Medical"],
  ["INSURANCE", "Insurance"],
  ["OTHER", "Other"],
];

const emptyDocument = () => ({
  employee: "",
  document_type: "",
  title: "",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  file: null,
  notes: "",
});

const asRows = (value) => {
  const payload = value?.data ?? value;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;

  return [];
};

const daysUntil = (value) => {
  if (!value) return null;

  const expiry = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
};

const expiryStatus = (daysLeft) => {
  if (daysLeft === null) return "UNKNOWN";
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 7) return "URGENT";
  if (daysLeft <= 30) return "EXPIRING";
  return "VALID";
};

const initials = (name) =>
  String(name || "ED")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function DocumentExpiryPage() {
  const queryClient = useQueryClient();
  const { branchParams } = useActiveBranchFilter();

  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [expiryWindow, setExpiryWindow] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyDocument());

  const documentsQ = useQuery({
    queryKey: ["document-expiry", branchParams, documentType, department],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/document-expiry/", {
          params: {
            ...branchParams,
            days: 36500,
            document_type: documentType || undefined,
            department: department || undefined,
            page_size: 2000,
          },
        }),
      ),
    staleTime: 0,
  });

  const employeesQ = useQuery({
    queryKey: ["document-expiry-employees", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/employees/", {
          params: {
            ...branchParams,
            page_size: 2000,
            ordering: "first_name",
          },
        }),
      ),
  });

  const departmentsQ = useQuery({
    queryKey: ["document-expiry-departments"],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/departments/", {
          params: { page_size: 1000 },
        }),
      ),
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return asRows(documentsQ.data)
      .map((row) => {
        const days_left = daysUntil(row.expiry_date);

        return {
          ...row,
          days_left,
          computed_status: expiryStatus(days_left),
        };
      })
      .filter((row) => {
        if (needle) {
          const haystack = [
            row.employee_name,
            row.employee_code,
            row.document_type_display,
            row.title,
            row.document_number,
            row.branch_name,
            row.department_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(needle)) return false;
        }

        if (status && row.computed_status !== status) {
          return false;
        }

        if (expiryWindow) {
          const days = Number(expiryWindow);
          if (
            row.days_left === null ||
            row.days_left < 0 ||
            row.days_left > days
          ) {
            return false;
          }
        }

        return true;
      });
  }, [documentsQ.data, search, status, expiryWindow]);

  const allFetchedRows = useMemo(
    () =>
      asRows(documentsQ.data).map((row) => {
        const days_left = daysUntil(row.expiry_date);

        return {
          ...row,
          days_left,
          computed_status: expiryStatus(days_left),
        };
      }),
    [documentsQ.data],
  );

  const stats = useMemo(
    () => ({
      total: allFetchedRows.length,
      expired: allFetchedRows.filter((row) => row.computed_status === "EXPIRED")
        .length,
      seven: allFetchedRows.filter(
        (row) => row.days_left >= 0 && row.days_left <= 7,
      ).length,
      thirty: allFetchedRows.filter(
        (row) => row.days_left >= 0 && row.days_left <= 30,
      ).length,
      valid: allFetchedRows.filter((row) => row.computed_status === "VALID")
        .length,
    }),
    [allFetchedRows],
  );

  const employees = asRows(employeesQ.data);
  const departments = asRows(departmentsQ.data);

  const upcoming = useMemo(
    () =>
      allFetchedRows
        .filter((row) => row.days_left !== null && row.days_left >= 0)
        .sort((a, b) => a.days_left - b.days_left)
        .slice(0, 5),
    [allFetchedRows],
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.employee) throw new Error("Select an employee.");
      if (!form.document_type) throw new Error("Select a document type.");

      const payload = new FormData();

      payload.append("employee", form.employee);
      payload.append("document_type", form.document_type);

      if (form.title.trim()) payload.append("title", form.title.trim());
      if (form.document_number.trim()) {
        payload.append("document_number", form.document_number.trim());
      }
      if (form.issue_date) payload.append("issue_date", form.issue_date);
      if (form.expiry_date) payload.append("expiry_date", form.expiry_date);
      if (form.file) payload.append("file", form.file);
      if (form.notes.trim()) payload.append("notes", form.notes.trim());

      return api.post("/hrms/documents/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["document-expiry"],
      });

      toast.success("Document added successfully.");
      setForm(emptyDocument());
      setAddOpen(false);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || error?.message || "Unable to add document.");
    },
  });

  const exportExcel = async () => {
    try {
      const response = await api.get("/hrms/document-expiry/export-excel/", {
        params: {
          ...branchParams,
          days: 36500,
          document_type: documentType || undefined,
          department: department || undefined,
          search: search || undefined,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `document-expiry-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success("Excel export downloaded.");
    } catch (error) {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to export Excel.");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setDocumentType("");
    setDepartment("");
    setStatus("");
    setExpiryWindow("");
  };

  return (
    <div className="w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        title="Document Expiry"
        subtitle="Track employee documents with expiry dates, renewal alerts and attachments."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>

            <Button
              type="button"
              onClick={() => {
                setForm(emptyDocument());
                setAddOpen(true);
              }}
              className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Documents"
          value={stats.total}
          hint="Across selected branch"
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          hint="Needs immediate action"
          tone="red"
        />
        <StatCard
          label="Expiring in 7 Days"
          value={stats.seven}
          hint="Urgent renewals"
          tone="amber"
        />
        <StatCard
          label="Expiring in 30 Days"
          value={stats.thirty}
          hint="Renewal planning"
          tone="blue"
        />
        <StatCard
          label="Valid"
          value={stats.valid}
          hint="More than 30 days remaining"
          tone="green"
        />
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.7fr_repeat(4,minmax(150px,1fr))_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee / document / number"
            />
          </div>

          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">All Departments</option>
            {departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">All Status</option>
            <option value="EXPIRED">Expired</option>
            <option value="URGENT">Expiring in 7 Days</option>
            <option value="EXPIRING">Expiring in 30 Days</option>
            <option value="VALID">Valid</option>
          </select>

          <select
            value={expiryWindow}
            onChange={(event) => setExpiryWindow(event.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Expiry: Any Date</option>
            <option value="7">Next 7 days</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
          </select>

          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-muted/35">
              <tr>
                {[
                  "Employee",
                  "Document",
                  "Document No.",
                  "Issue Date",
                  "Expiry Date",
                  "Days Left",
                  "Status",
                  "Attachment",
                  "Uploaded By",
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
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t transition hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
                        {initials(row.employee_name)}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {row.employee_name || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[row.department_name, row.branch_name]
                            .filter(Boolean)
                            .join(" • ") ||
                            row.employee_code ||
                            "Employee"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {row.document_type_display || row.title || "Document"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.title || "Employee Document"}
                    </p>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {row.document_number || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {row.issue_date ? <DateText value={row.issue_date} /> : "—"}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    <DateText value={row.expiry_date} />
                  </td>

                  <td className="px-4 py-3">
                    <DaysLeft value={row.days_left} />
                  </td>

                  <td className="px-4 py-3">
                    <ExpiryBadge
                      status={row.computed_status}
                      daysLeft={row.days_left}
                    />
                  </td>

                  <td className="px-4 py-3">
                    {row.file_url ? (
                      <a
                        href={row.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Paperclip className="h-4 w-4" />
                        View
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">{row.uploaded_by_name || "—"}</td>
                </tr>
              ))}

              {!documentsQ.isLoading && !rows.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-14 text-center text-muted-foreground"
                  >
                    No expiring documents found for the selected filters.
                  </td>
                </tr>
              )}

              {documentsQ.isLoading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-14 text-center text-muted-foreground"
                  >
                    Loading documents...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {rows.length} document{rows.length === 1 ? "" : "s"}
          </span>
          <span>Branch follows the active header branch filter.</span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Upcoming Expiry Timeline</h2>
              <p className="text-xs text-muted-foreground">
                Nearest employee document renewals.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {upcoming.map((row) => (
              <div key={row.id} className="flex gap-3">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-semibold">
                    {row.document_type_display || "Document"} —{" "}
                    {row.employee_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <DateText value={row.expiry_date} /> •{" "}
                    {row.days_left === 0
                      ? "Expires today"
                      : `${row.days_left} day${
                          row.days_left === 1 ? "" : "s"
                        } remaining`}
                  </p>
                </div>
              </div>
            ))}

            {!upcoming.length && (
              <p className="text-sm text-muted-foreground">
                No upcoming document expiries.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Recommended Alert Rules</h2>
              <p className="text-xs text-muted-foreground">
                Suggested renewal reminder schedule.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[90, 60, 30, 15, 7, 1].map((days) => (
              <span
                key={days}
                className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs font-semibold"
              >
                {days} day{days === 1 ? "" : "s"}
              </span>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Notify HR and the document owner before expiry. Expired documents
            remain visible for renewal follow-up and audit history.
          </p>
        </section>
      </div>

      {addOpen && (
        <AddDocumentModal
          form={form}
          setForm={setForm}
          employees={employees}
          onClose={() => setAddOpen(false)}
          onSave={() => addMutation.mutate()}
          pending={addMutation.isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, hint, tone = "default" }) {
  const toneClass = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    default: "",
  }[tone];

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function DaysLeft({ value }) {
  if (value === null) return <span>—</span>;

  if (value < 0) {
    return (
      <span className="font-semibold text-red-600 dark:text-red-400">
        {value} days
      </span>
    );
  }

  return (
    <span
      className={value <= 7 ? "font-semibold text-amber-600" : "font-medium"}
    >
      {value} day{value === 1 ? "" : "s"}
    </span>
  );
}

function ExpiryBadge({ status, daysLeft }) {
  const config = {
    EXPIRED: {
      label: "Expired",
      className: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    URGENT: {
      label: "Expiring Soon",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    EXPIRING: {
      label: "Due in 30 Days",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    VALID: {
      label: "Valid",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    UNKNOWN: {
      label: "Unknown",
      className: "bg-muted text-muted-foreground",
    },
  }[status];

  return (
    <span
      title={
        daysLeft === null
          ? ""
          : daysLeft < 0
            ? `${Math.abs(daysLeft)} days overdue`
            : `${daysLeft} days remaining`
      }
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function AddDocumentModal({
  form,
  setForm,
  employees,
  onClose,
  onSave,
  pending,
}) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === String(form.employee),
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter((employee) =>
      [
        employee.employee_code,
        employee.full_name,
        employee.designation_name,
        employee.department_name,
        employee.branch_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [employees, employeeSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Add New Document</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Add an employee document and optionally track its expiry date.
            </p>
          </div>

          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Employee">
            <Select
              value={form.employee}
              onValueChange={(value) => {
                setForm((current) => ({
                  ...current,
                  employee: value,
                }));
                setEmployeeSearch("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent className="max-h-80 p-0">
                <div
                  className="sticky top-0 z-10 border-b bg-popover p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="Search employee name, code, designation..."
                  />
                </div>

                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredEmployees.length ? (
                    filteredEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        <div className="flex flex-col py-0.5">
                          <span>
                            {employee.employee_code} — {employee.full_name}
                          </span>
                          {(employee.designation_name ||
                            employee.department_name ||
                            employee.branch_name) && (
                            <span className="text-xs text-muted-foreground">
                              {[
                                employee.designation_name,
                                employee.department_name,
                                employee.branch_name,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No employees match your search.
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Document Type">
            <select
              value={form.document_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  document_type: event.target.value,
                }))
              }
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Select document type</option>
              {DOCUMENT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Document Title">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="e.g. Residence Visa"
            />
          </Field>

          <Field label="Document Number">
            <Input
              value={form.document_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  document_number: event.target.value,
                }))
              }
              placeholder="Document number"
            />
          </Field>

          <Field label="Issue Date">
            <Input
              type="date"
              value={form.issue_date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  issue_date: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Expiry Date">
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expiry_date: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Branch">
            <Input
              value={
                selectedEmployee?.branch_name || "Selected employee branch"
              }
              readOnly
              className="bg-muted/40"
            />
          </Field>

          <Field label="Attachment">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] || null,
                }))
              }
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Notes / Renewal Details">
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional notes..."
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="bg-amber-400 !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
          >
            {pending ? "Saving..." : "Save Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

