/* Permissions helpers */

export const isAdmin = (user) =>
  Boolean(
    user?.is_superuser ||
    user?.role_code === "ADMIN" ||
    user?.role?.code === "ADMIN" ||
    user?.role_detail?.code === "ADMIN",
  );

export const isBranchManager = (user) =>
  user?.role_code === "BM" ||
  user?.role?.code === "BM" ||
  user?.role_detail?.code === "BM";

export const isStaff = (user) =>
  user?.role_code === "STAFF" ||
  user?.role?.code === "STAFF" ||
  user?.role_detail?.code === "STAFF";

/*
 * Module-level access map.
 *
 * The frontend uses this to hide restricted pages and actions.
 * The backend must still enforce the final permission.
 */
export const MODULE_ACCESS = {
  branches: ["ADMIN"],
  users: ["ADMIN"],
  auditLogs: ["ADMIN"],
  settings: ["ADMIN"],
  payroll: ["ADMIN"],
  reports: ["ADMIN", "BM"],
};

const getRoleCode = (user) =>
  user?.role_code || user?.role?.code || user?.role_detail?.code || "";

export function canAccessModule(user, moduleName) {
  const allowedRoles = MODULE_ACCESS[moduleName];

  if (!allowedRoles) {
    return true;
  }

  if (user?.is_superuser) {
    return true;
  }

  return allowedRoles.includes(getRoleCode(user));
}

export function canCreate(user, moduleName) {
  /*
   * Categories, brands and racks:
   * every authenticated user can add records.
   */
  if (["categories", "brands", "racks"].includes(moduleName)) {
    return Boolean(user);
  }

  if (isStaff(user)) {
    return [
      "quotations",
      "customers",
      "invoices",
      "pos",
      "leaves",
      "attendance",
    ].includes(moduleName);
  }

  return true;
}

export function canEdit(user, moduleName) {
  /*
   * Only Admin or Django superuser can edit
   * categories, brands and racks.
   */
  if (["categories", "brands", "racks"].includes(moduleName)) {
    return isAdmin(user);
  }

  if (isStaff(user)) {
    return ["quotations", "customers", "pos"].includes(moduleName);
  }

  return true;
}

export function canDelete(user, moduleName) {
  /*
   * Categories, brands and racks can only
   * be deleted by Admin or superuser.
   */
  if (["categories", "brands", "racks"].includes(moduleName)) {
    return isAdmin(user);
  }

  return isAdmin(user);
}

export function canApprove(user, moduleName) {
  if (moduleName === "leaves") {
    return isAdmin(user) || isBranchManager(user);
  }

  if (moduleName === "payroll") {
    return isAdmin(user);
  }

  return isAdmin(user) || isBranchManager(user);
}
