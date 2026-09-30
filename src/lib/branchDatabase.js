export const BRANCH_DATABASE_MODES = {
  MASTER: "MASTER",
  VAT: "VAT",
  NON_VAT: "NON_VAT",
};

export function getStoredBranchId() {
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
