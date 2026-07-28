export const getRoleCode = (user) =>
  String(user?.role_code || user?.role?.code || user?.role_detail?.code || "")
    .trim()
    .toUpperCase();

export const isAdmin = (user) =>
  Boolean(user?.is_superuser || getRoleCode(user) === "ADMIN");

export const isBranchManager = (user) => getRoleCode(user) === "BM";

export const isStaff = (user) => getRoleCode(user) === "STAFF";

export const getPermissionCodes = (user) => {
  if (isAdmin(user)) {
    return ["*"];
  }

  if (Array.isArray(user?.permissions)) {
    return user.permissions;
  }

  if (Array.isArray(user?.role_detail?.permissions)) {
    return user.role_detail.permissions;
  }

  if (Array.isArray(user?.role?.permissions)) {
    return user.role.permissions;
  }

  return [];
};

export const hasPermission = (user, permissionCode) => {
  if (!user || !permissionCode) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  const permissions = getPermissionCodes(user);

  return permissions.includes("*") || permissions.includes(permissionCode);
};

export const hasAnyPermission = (user, permissionCodes = []) =>
  Array.isArray(permissionCodes) &&
  permissionCodes.some((code) => hasPermission(user, code));

export const hasAllPermissions = (user, permissionCodes = []) =>
  Array.isArray(permissionCodes) &&
  permissionCodes.every((code) => hasPermission(user, code));

export const canView = (user, resource) =>
  hasPermission(user, `${resource}.view`);

export const canCreate = (user, resource) =>
  hasPermission(user, `${resource}.create`);

export const canEdit = (user, resource) =>
  hasPermission(user, `${resource}.edit`);

export const canDelete = (user, resource) =>
  hasPermission(user, `${resource}.delete`);

export const canApprove = (user, resource) =>
  hasPermission(user, `${resource}.approve`);

export const canReject = (user, resource) =>
  hasPermission(user, `${resource}.reject`);

export const canCancel = (user, resource) =>
  hasPermission(user, `${resource}.cancel`);

export const canExport = (user, resource) =>
  hasPermission(user, `${resource}.export`);

export const canPrint = (user, resource) =>
  hasPermission(user, `${resource}.print`);

export const canAccessModule = (user, moduleName) => {
  if (!user || !moduleName) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  const prefix = `${moduleName}.`;

  return getPermissionCodes(user).some((permission) =>
    permission.startsWith(prefix),
  );
};
