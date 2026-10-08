export const BRANCH_DATABASE_MODES = {
  MASTER: "MASTER",
  VAT: "VAT",
  NON_VAT: "NON_VAT",
};

export function getStoredBranchId() {
  // AuthProvider stores the currently selected branch in branch_override.
  // Prefer it over legacy keys so API headers always match the branch shown in
  // the global selector.
  const override = window.localStorage.getItem("branch_override");
  if (override) {
    try {
      const parsed = JSON.parse(override);
      const value =
        parsed && typeof parsed === "object"
          ? parsed.id ?? parsed.branch_id ?? parsed.value ?? null
          : parsed;

      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== "all"
      ) {
        return String(value);
      }
    } catch (_) {
      // Fall through to legacy keys for older stored sessions.
    }
  }

  const keys = ["activeBranchId", "selectedBranchId", "branchId", "branch_id"];
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value && value !== "all") return value;
  }
  return "";
}

export function attachBranchHeader(config = {}) {
  const branchId = getStoredBranchId();
  if (!branchId) return config;
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      "X-Branch-ID": String(branchId),
    },
  };
}
