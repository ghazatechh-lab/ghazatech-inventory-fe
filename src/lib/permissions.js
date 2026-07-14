/* Permissions helpers */

export const isAdmin = (u) => u?.role?.code === "ADMIN";
export const isBranchManager = (u) => u?.role?.code === "BM";
export const isStaff = (u) => u?.role?.code === "STAFF";

// Module-level permission map. Kept simple for the frontend guard.
// Backend still enforces final permission.
export const MODULE_ACCESS = {
  branches: ["ADMIN"],
  users: ["ADMIN"],
  auditLogs: ["ADMIN"],
  settings: ["ADMIN"],
  payroll: ["ADMIN"],
  reports: ["ADMIN", "BM"],
  // everyone else has read access to most modules by default
};

export function canAccessModule(user, moduleName) {
  const allow = MODULE_ACCESS[moduleName];
  if (!allow) return true;
  return allow.includes(user?.role?.code);
}
export function canCreate(user, moduleName) {
  if (isStaff(user)) return ["quotations", "customers", "invoices", "pos", "leaves", "attendance"].includes(moduleName);
  return true;
}
export function canEdit(user, moduleName) {
  if (isStaff(user)) return ["quotations", "customers", "pos"].includes(moduleName);
  return true;
}
export function canDelete(user, moduleName) {
  return isAdmin(user);
}
export function canApprove(user, moduleName) {
  if (moduleName === "leaves") return isAdmin(user) || isBranchManager(user);
  if (moduleName === "payroll") return isAdmin(user);
  return isAdmin(user) || isBranchManager(user);
}
