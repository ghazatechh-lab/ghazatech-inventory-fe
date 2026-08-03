import { hasPermission, isAdmin } from "@/lib/permissions";
import { PERMISSIONS } from "@/config/permissions";

export { isAdmin };

const permissionCode = (configuredCode, fallbackCode) =>
  configuredCode || fallbackCode;

export const canViewSalesVat = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.VAT?.SALES_VIEW, "sales.vat.view"),
  );

export const canManageSalesVat = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.VAT?.SALES_MANAGE, "sales.vat.manage"),
  );

export const canUseNonVatSale = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.NON_VAT?.SALES_USE, "sales.non_vat.use"),
  );

export const canViewNonVatSale = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.NON_VAT?.SALES_VIEW, "sales.non_vat.view"),
  );

export const canManageNonVatSale = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.NON_VAT?.SALES_MANAGE, "sales.non_vat.manage"),
  );

export const canCreateNonStandardTaxSale = canUseNonVatSale;

export const canViewNonStandardTaxSale = canViewNonVatSale;

export const canSellRegularStock = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.SALES?.SELL_REGULAR, "sales.selling.regular"),
  );

export const canApplySalesDiscount = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.SALES?.APPLY_DISCOUNT,
      "sales.selling.discount",
    ),
  );

export const canOverrideSellingPrice = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.SALES?.PRICE_OVERRIDE,
      "sales.selling.price_override",
    ),
  );

export const canViewPurchaseVat = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.VAT?.PURCHASES_VIEW, "purchases.vat.view"),
  );

export const canManagePurchaseVat = (user) =>
  hasPermission(
    user,
    permissionCode(PERMISSIONS?.VAT?.PURCHASES_MANAGE, "purchases.vat.manage"),
  );

export const canUseNonVatPurchase = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.NON_VAT?.PURCHASES_USE,
      "purchases.non_vat.use",
    ),
  );

export const canViewNonVatPurchase = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.NON_VAT?.PURCHASES_VIEW,
      "purchases.non_vat.view",
    ),
  );

export const canManageNonVatPurchase = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.NON_VAT?.PURCHASES_MANAGE,
      "purchases.non_vat.manage",
    ),
  );

export const canViewRestrictedStock = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.RESTRICTED_STOCK?.VIEW,
      "inventory.restricted_stock.view",
    ),
  );

export const canManageRestrictedStock = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.RESTRICTED_STOCK?.MANAGE,
      "inventory.restricted_stock.manage",
    ),
  );

export const canSellRestrictedStock = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.RESTRICTED_STOCK?.SELL,
      "inventory.restricted_stock.sell",
    ),
  );

export const canCreateRestrictedPurchase = (user) =>
  hasPermission(
    user,
    permissionCode(
      PERMISSIONS?.RESTRICTED_STOCK?.PURCHASE,
      "inventory.restricted_stock.purchase",
    ),
  );

export const taxRateFor = (treatment, configuredRate = 5) =>
  treatment === "STANDARD_VAT" ? Number(configuredRate || 0) : 0;

export const calculateTaxLine = ({
  quantity = 0,
  unitPrice = 0,
  discount = 0,
  treatment = "STANDARD_VAT",
  taxRate = 5,
  inclusive = false,
}) => {
  const gross = Number(quantity || 0) * Number(unitPrice || 0);

  const discounted = Math.max(0, gross - Number(discount || 0));

  const rate = taxRateFor(treatment, taxRate) / 100;

  if (!rate) {
    return {
      gross,
      taxable: discounted,
      tax: 0,
      total: discounted,
    };
  }

  if (inclusive) {
    const taxable = discounted / (1 + rate);

    return {
      gross,
      taxable,
      tax: discounted - taxable,
      total: discounted,
    };
  }

  const tax = discounted * rate;

  return {
    gross,
    taxable: discounted,
    tax,
    total: discounted + tax,
  };
};
