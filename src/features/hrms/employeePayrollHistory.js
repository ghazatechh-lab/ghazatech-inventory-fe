import { unwrap } from "@/lib/api";

// Fetch history separately from the profile snapshot. Do not apply the current
// payroll-list period/status filters to an employee's complete monthly history.
export async function fetchEmployeePayrollHistory(api, employeeId, branchId, signal) {
  const entries = [];
  let page = 1;
  while (true) {
    const payload = unwrap(await api.get("/hrms/payroll/", {
      params: {
        employee: employeeId,
        branch: branchId || undefined,
        page,
        page_size: 100,
      },
      signal,
      skipGlobalErrorToast: true,
    }));
    const rows = Array.isArray(payload) ? payload : payload?.results;
    if (!Array.isArray(rows)) {
      throw new Error("Unexpected payroll history response.");
    }
    entries.push(...rows);
    const hasMore = !Array.isArray(payload) && (
      Boolean(payload.next) || Number(payload.count || 0) > entries.length
    );
    if (!hasMore) break;
    if (!rows.length) throw new Error("Payroll history pagination returned an empty page.");
    page += 1;
  }
  return entries.sort((left, right) =>
    String(right.period || "").localeCompare(String(left.period || "")) ||
    Number(right.id || 0) - Number(left.id || 0)
  );
}
