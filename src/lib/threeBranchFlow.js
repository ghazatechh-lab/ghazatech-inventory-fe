export const DATA_SOURCES = {
  VAT: "VAT",
  NON_VAT: "NON_VAT",
  ALL: "ALL",
};

export const BRANCH_OPERATING_MODES = {
  BR01: "VAT",
  BR02: "NON_VAT",
  BR03: "COMBINED",
};

export function getBranchOperatingMode(branch) {
  if (!branch) return null;
  const code = String(branch.branch_code || "").toUpperCase();
  return BRANCH_OPERATING_MODES[code] || null;
}

export function isCombinedBranch(branch) {
  return getBranchOperatingMode(branch) === "COMBINED";
}

export function getAllowedTargets(branch) {
  const mode = getBranchOperatingMode(branch);
  if (mode === "VAT") return [DATA_SOURCES.VAT];
  if (mode === "NON_VAT") return [DATA_SOURCES.NON_VAT];
  if (mode === "COMBINED") {
    return [DATA_SOURCES.VAT, DATA_SOURCES.NON_VAT];
  }
  return [];
}

export function getDefaultTarget(branch) {
  const allowed = getAllowedTargets(branch);
  return allowed.length === 1 ? allowed[0] : "";
}

export function targetBranchLabel(value) {
  return value === DATA_SOURCES.NON_VAT
    ? "Branch 2 (Non-VAT)"
    : value === DATA_SOURCES.VAT
      ? "Branch 1 (VAT)"
      : "All";
}

export function sourceBadgeLabel(value) {
  return value === DATA_SOURCES.NON_VAT ? "Non-VAT" : "VAT";
}

export function makeResourceKey(sourceBranch, id) {
  return `${sourceBranch}:${id}`;
}

export function parseResourceKey(value) {
  const [sourceBranch, id] = String(value || "").split(":");
  if (!["VAT", "NON_VAT"].includes(sourceBranch) || !id) {
    return null;
  }
  return { sourceBranch, id };
}

/**
 * Compatibility helper used by current sales pages.
 *
 * BR01/BR02 are direct data owners.
 * BR03 is virtual; the selected sale mode becomes target_branch.
 * The backend MUST ignore BR03 as transaction owner and route the write
 * to the selected database.
 */
export function normalizeSalePayload(payload, branch, selectedMode) {
  const allowed = getAllowedTargets(branch);
  const selected = String(
    selectedMode || getDefaultTarget(branch) || "",
  ).toUpperCase();

  if (!selected) {
    throw new Error("Select VAT Branch or Non-VAT Branch.");
  }

  if (!allowed.includes(selected)) {
    throw new Error("The selected target is not allowed for this branch.");
  }

  return {
    ...payload,
    sale_mode: selected,
    target_branch: selected,
  };
}

// Compatibility exports for already-patched forms.
export const SALE_MODES = {
  VAT: "VAT",
  NON_VAT: "NON_VAT",
};

export function getBranchSalesMode(branch) {
  const mode = getBranchOperatingMode(branch);
  if (mode === "COMBINED") return "BOTH";
  return mode;
}

export function getAllowedSaleModes(branch) {
  return getAllowedTargets(branch);
}

export function getDefaultSaleMode(branch) {
  return getDefaultTarget(branch);
}

export function saleModeLabel(mode) {
  return targetBranchLabel(mode);
}
