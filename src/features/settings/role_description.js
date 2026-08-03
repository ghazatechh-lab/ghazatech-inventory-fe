const normalizePermissionCodes = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          return String(
            item.code ||
              item.permission_code ||
              item.permission ||
              item.name ||
              "",
          ).trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      return normalizePermissionCodes(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (typeof value === "object") {
    if (value.permissions) {
      return normalizePermissionCodes(value.permissions);
    }

    return Object.entries(value)
      .filter(([, enabled]) => enabled === true)
      .map(([code]) => code);
  }

  return [];
};

export const describeRoleAccess = (role) => {
  const permissions = normalizePermissionCodes(role?.permissions);

  if (
    String(role?.code || "").toUpperCase() === "ADMIN" ||
    permissions.includes("*")
  ) {
    return "Full system access across all modules, settings, branches, and sensitive operations.";
  }

  const capabilities = [];

  const hasPrefix = (prefix) =>
    permissions.some(
      (permission) =>
        permission === `${prefix}.*` || permission.startsWith(`${prefix}.`),
    );

  if (hasPrefix("inventory")) {
    capabilities.push("inventory");
  }

  if (hasPrefix("sales")) {
    capabilities.push("sales");
  }

  if (hasPrefix("purchase") || hasPrefix("purchases")) {
    capabilities.push("purchases");
  }

  if (hasPrefix("hrms")) {
    capabilities.push("HRMS");
  }

  if (hasPrefix("accounting") || hasPrefix("finance")) {
    capabilities.push("accounting");
  }

  if (hasPrefix("reports")) {
    capabilities.push("reports");
  }

  if (hasPrefix("settings") || hasPrefix("branches")) {
    capabilities.push("settings");
  }

  const special = [];

  if (permissions.includes("sales.selling.regular")) {
    special.push("regular stock sales");
  }

  if (
    permissions.includes("sales.non_vat.use") ||
    permissions.includes("sales.selling.non_vat")
  ) {
    special.push("Non-VAT sales");
  }

  if (
    permissions.includes("sales.vat.manage") ||
    permissions.includes("sales.selling.vat")
  ) {
    special.push("VAT sales");
  }

  if (
    permissions.includes("inventory.restricted_stock.sell") ||
    permissions.includes("sales.selling.restricted")
  ) {
    special.push("restricted stock sales");
  }

  if (
    permissions.includes("sales.selling.discount") ||
    permissions.includes("sales.selling.price_override")
  ) {
    special.push("discount or price override");
  }

  if (permissions.includes("branches.view_all")) {
    special.push("view all branches");
  }

  if (permissions.includes("branches.switch")) {
    special.push("switch active branch");
  }

  if (!capabilities.length && !special.length) {
    return "No operational access has been assigned to this role.";
  }

  const moduleText = capabilities.length
    ? `Can access ${capabilities.join(", ")}.`
    : "";

  const specialText = special.length
    ? ` Special access: ${special.join(", ")}.`
    : "";

  return `${moduleText}${specialText}`.trim();
};

export default describeRoleAccess;
