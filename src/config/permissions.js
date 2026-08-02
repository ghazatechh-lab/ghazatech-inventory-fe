export const PERMISSIONS = {
  VAT: {
    SALES_VIEW: "sales.vat.view",
    SALES_MANAGE: "sales.vat.manage",
    SALES_OVERRIDE_RATE: "sales.vat.override_rate",
    SALES_ZERO_RATED: "sales.vat.use_zero_rated",
    SALES_EXEMPT: "sales.vat.use_exempt",
    SALES_OUT_OF_SCOPE: "sales.vat.use_out_of_scope",
    SALES_REVERSE_CHARGE: "sales.vat.use_reverse_charge",
    PURCHASES_VIEW: "purchases.vat.view",
    PURCHASES_MANAGE: "purchases.vat.manage",
    PURCHASES_OVERRIDE_RATE: "purchases.vat.override_rate",
    PURCHASES_ZERO_RATED: "purchases.vat.use_zero_rated",
    PURCHASES_EXEMPT: "purchases.vat.use_exempt",
    PURCHASES_OUT_OF_SCOPE: "purchases.vat.use_out_of_scope",
    PURCHASES_REVERSE_CHARGE: "purchases.vat.use_reverse_charge",
    FINANCE_VIEW: "finance.tax.view",
    FINANCE_MANAGE: "finance.tax.manage",
    FINANCE_APPROVE: "finance.tax.approve",
  },

  NON_VAT: {
    SALES_VIEW: "sales.non_vat.view",
    SALES_USE: "sales.non_vat.use",
    SALES_MANAGE: "sales.non_vat.manage",
    PURCHASES_VIEW: "purchases.non_vat.view",
    PURCHASES_USE: "purchases.non_vat.use",
    PURCHASES_MANAGE: "purchases.non_vat.manage",
  },

  SELLING: {
    REGULAR: "sales.selling.regular",
    RESTRICTED: "sales.selling.restricted",
    NON_RESTRICTED: "sales.selling.non_restricted",
    VAT: "sales.selling.vat",
    NON_VAT: "sales.selling.non_vat",
    DISCOUNT: "sales.selling.discount",
    PRICE_OVERRIDE: "sales.selling.price_override",
  },

  RESTRICTED_STOCK: {
    VIEW: "inventory.restricted_stock.view",
    MANAGE: "inventory.restricted_stock.manage",
    SELL: "inventory.restricted_stock.sell",
    PURCHASE: "inventory.restricted_stock.purchase",
    TRANSFER: "inventory.restricted_stock.transfer",
    ADJUST: "inventory.restricted_stock.adjust",
  },

  NON_RESTRICTED_STOCK: {
    VIEW: "inventory.non_restricted_stock.view",
    MANAGE: "inventory.non_restricted_stock.manage",
    SELL: "inventory.non_restricted_stock.sell",
    PURCHASE: "inventory.non_restricted_stock.purchase",
    TRANSFER: "inventory.non_restricted_stock.transfer",
    ADJUST: "inventory.non_restricted_stock.adjust",
  },

  STOCK_CLASSIFICATION: {
    VIEW: "inventory.stock_classification.view",
    ASSIGN: "inventory.stock_classification.assign",
    CHANGE: "inventory.stock_classification.change",
  },

  PAYROLL: {
    VIEW: "hrms.payroll.view",
    GENERATE: "hrms.payroll.generate",
    MARK_PAID: "hrms.payroll.mark_paid",
    EXPORT: "hrms.payroll.export",
  },
};
