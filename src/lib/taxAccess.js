export const canViewRestrictedStock = (user) =>
  isAdmin(user) ||
  hasAnyPermission(user, [
    "inventory.view_restricted_stock",
    "reports.view_full_stock",
    "audit.view_complete_records",
  ]);

export const canManageRestrictedStock = (user) =>
  isAdmin(user) || hasPermission(user, "inventory.manage_restricted_stock");

export const canCreateRestrictedPurchase = (user) =>
  isAdmin(user) || hasPermission(user, "purchases.create_restricted_purchase");

export const canCreateNonStandardTaxSale = (user) =>
  isAdmin(user) || hasPermission(user, "sales.create_non_standard_tax_sale");

export const canViewNonStandardTaxSale = (user) =>
  isAdmin(user) || hasPermission(user, "sales.view_non_standard_tax_sale");

export const taxRateFor = (treatment, configuredRate = 5) =>
  treatment === "STANDARD_VAT" ? Number(configuredRate || 0) : 0;

export const calculateTaxLine = ({
  quantity,
  unitPrice,
  discount = 0,
  treatment = "STANDARD_VAT",
  taxRate = 5,
  inclusive = false,
}) => {
  const gross = Number(quantity || 0) * Number(unitPrice || 0);
  const net = Math.max(0, gross - Number(discount || 0));
  const rate = taxRateFor(treatment, taxRate);
  const tax =
    inclusive && rate > 0 ? net - net / (1 + rate / 100) : (net * rate) / 100;
  const taxable = inclusive ? net - tax : net;
  return { gross, taxable, tax, total: inclusive ? net : net + tax };
};

export const isAdmin = (user) => {
  const roleCode = String(
    user?.role_code || user?.role?.code || user?.role || "",
  )
    .trim()
    .toUpperCase();

  return roleCode === "ADMIN";
};
