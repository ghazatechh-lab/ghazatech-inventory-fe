export const SALE_MODES = {
  VAT: "VAT",
  NON_VAT: "NON_VAT",
};

export const BRANCH_SALES_MODES = {
  BR01: "VAT",
  BR02: "NON_VAT",
  BR03: "BOTH",
};

export function getBranchSalesMode(branch) {
  if (!branch) return "BOTH";
  if (branch.sales_mode) return String(branch.sales_mode).toUpperCase();
  const code = String(branch.branch_code || "").toUpperCase();
  return BRANCH_SALES_MODES[code] || "BOTH";
}

export function getAllowedSaleModes(branch) {
  const mode = getBranchSalesMode(branch);
  if (mode === "VAT") return ["VAT"];
  if (mode === "NON_VAT") return ["NON_VAT"];
  return ["VAT", "NON_VAT"];
}

export function getDefaultSaleMode(branch) {
  const allowed = getAllowedSaleModes(branch);
  return allowed.length === 1 ? allowed[0] : "";
}

export function normalizeSalePayload(payload, branch, saleMode) {
  const allowed = getAllowedSaleModes(branch);
  const selected = String(saleMode || getDefaultSaleMode(branch) || "").toUpperCase();

  if (!selected) {
    throw new Error("Select VAT Sale or Non-VAT Sale.");
  }

  if (!allowed.includes(selected)) {
    throw new Error("This sale type is not allowed for the selected branch.");
  }

  return {
    ...payload,
    branch: branch?.id ?? payload.branch,
    sale_mode: selected,
  };
}

export function saleModeLabel(mode) {
  return mode === "NON_VAT" ? "Non-VAT Sale" : "VAT Sale";
}
