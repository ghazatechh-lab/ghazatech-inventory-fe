const normalizeCode = (value) => String(value || "").trim();

export const getRoleCode = (user) =>
  String(
    user?.role?.code ||
      user?.role_detail?.code ||
      user?.role_code ||
      user?.role_name ||
      "",
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

export const isAdmin = (user) =>
  Boolean(
    user?.is_superuser === true ||
    ["ADMIN", "SUPER_ADMIN"].includes(getRoleCode(user)),
  );

const addPermission = (target, value) => {
  if (!value) return;

  if (typeof value === "string") {
    const code = normalizeCode(value);

    if (code) {
      target.add(code);
    }

    return;
  }

  if (typeof value === "object") {
    const code =
      value.code ||
      value.permission_code ||
      value.permission ||
      value.codename ||
      value.name;

    if (code) {
      target.add(normalizeCode(code));
    }
  }
};

export const getUserPermissions = (user) => {
  if (!user) {
    return new Set();
  }

  if (isAdmin(user)) {
    return new Set(["*"]);
  }

  const permissions = new Set();

  [
    user.permissions,
    user.permission_codes,
    user.all_permissions,
    user.effective_permissions,
    user.role?.permissions,
    user.role_detail?.permissions,
  ].forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.forEach((value) => addPermission(permissions, value));
    } else if (collection && typeof collection === "object") {
      Object.entries(collection).forEach(([code, allowed]) => {
        if (allowed === true) {
          addPermission(permissions, code);
        }
      });
    } else if (typeof collection === "string") {
      const raw = collection.trim();

      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          parsed.forEach((value) => addPermission(permissions, value));
          return;
        }

        if (parsed && typeof parsed === "object") {
          Object.entries(parsed).forEach(([code, allowed]) => {
            if (allowed === true) {
              addPermission(permissions, code);
            }
          });
          return;
        }
      } catch {
        raw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .forEach((value) => addPermission(permissions, value));
      }
    }
  });

  // Compatibility with older branch permission codes.
  if (permissions.has("branches.branches.view_all")) {
    permissions.add("branches.view_all");
  }

  if (permissions.has("branches.branch_access.view_all")) {
    permissions.add("branches.view_all");
  }

  return permissions;
};

const moduleAliases = {
  finance: "accounting",
  accounting: "finance",
  purchase: "purchases",
  purchases: "purchase",
};

const candidateCodes = (code) => {
  const normalized = normalizeCode(code);

  const candidates = new Set([normalized]);

  const parts = normalized.split(".");

  if (parts.length && moduleAliases[parts[0]]) {
    candidates.add([moduleAliases[parts[0]], ...parts.slice(1)].join("."));
  }

  return candidates;
};

export const hasPermission = (user, code) => {
  if (!code) {
    return true;
  }

  if (isAdmin(user)) {
    return true;
  }

  const permissions = getUserPermissions(user);

  if (permissions.has("*")) {
    return true;
  }

  for (const candidate of candidateCodes(code)) {
    if (permissions.has(candidate)) {
      return true;
    }

    const parts = candidate.split(".");

    if (parts.length && permissions.has(`${parts[0]}.*`)) {
      return true;
    }

    if (parts.length > 1 && permissions.has(`${parts[0]}.${parts[1]}.*`)) {
      return true;
    }
  }

  return false;
};

export const hasAnyPermission = (user, codes) =>
  (codes || []).some((code) => hasPermission(user, code));

export const hasAllPermissions = (user, codes) =>
  (codes || []).every((code) => hasPermission(user, code));

export const canAccessModule = (user, moduleName) => {
  if (isAdmin(user)) {
    return true;
  }

  const permissions = getUserPermissions(user);

  const modules = new Set([moduleName, moduleAliases[moduleName]]);

  return Array.from(permissions).some((code) => {
    if (code === "*") {
      return true;
    }

    return Array.from(modules)
      .filter(Boolean)
      .some(
        (moduleCode) =>
          code === `${moduleCode}.*` || code.startsWith(`${moduleCode}.`),
      );
  });
};

export const filterByPermission = (values, user) =>
  (values || []).filter(
    (value) => !value.permission || hasPermission(user, value.permission),
  );

export const canChangeActiveBranch = (user) =>
  isAdmin(user) ||
  hasPermission(user, "branches.switch") ||
  hasPermission(user, "branches.view_all");

export const canViewAllBranches = (user) =>
  isAdmin(user) || hasPermission(user, "branches.view_all");

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

export const canExport = (user, resource) =>
  hasPermission(user, `${resource}.export`);
