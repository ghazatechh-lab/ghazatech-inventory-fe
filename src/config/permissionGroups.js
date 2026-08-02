export const PERMISSION_GROUPS = [
  {
    key: "sales_controls",
    label: "Sales Controls",
    permissions: [
      {
        code: "sales.selling.regular",
        label: "Sell Regular Stock",
        description: "Allow regular sales transactions.",
      },
      {
        code: "sales.selling.restricted",
        label: "Sell Restricted Stock",
        description: "Allow selling stock classified as restricted.",
      },
      {
        code: "sales.selling.non_restricted",
        label: "Sell Non-Restricted Stock",
        description: "Allow selling stock classified as non-restricted.",
      },
      {
        code: "sales.selling.vat",
        label: "Create VAT Sales",
        description: "Allow sales using standard VAT.",
      },
      {
        code: "sales.selling.non_vat",
        label: "Create Non-VAT Sales",
        description: "Allow non-VAT and non-standard VAT sales.",
      },
      {
        code: "sales.selling.discount",
        label: "Apply Sales Discount",
        description: "Allow applying discounts during sales.",
      },
      {
        code: "sales.selling.price_override",
        label: "Override Selling Price",
        description: "Allow changing the default selling price.",
      },
    ],
  },
  {
    key: "sales_vat",
    label: "Sales VAT",
    permissions: [
      {
        code: "sales.vat.view",
        label: "View VAT Details",
      },
      {
        code: "sales.vat.manage",
        label: "Manage VAT",
      },
      {
        code: "sales.vat.override_rate",
        label: "Override VAT Rate",
      },
      {
        code: "sales.vat.use_zero_rated",
        label: "Use Zero-Rated VAT",
      },
      {
        code: "sales.vat.use_exempt",
        label: "Use VAT Exempt",
      },
      {
        code: "sales.vat.use_out_of_scope",
        label: "Use Out-of-Scope VAT",
      },
      {
        code: "sales.vat.use_reverse_charge",
        label: "Use Reverse Charge",
      },
      {
        code: "sales.non_vat.view",
        label: "View Non-VAT Sales",
      },
      {
        code: "sales.non_vat.use",
        label: "Use Non-VAT Sales",
      },
      {
        code: "sales.non_vat.manage",
        label: "Manage Non-VAT Sales",
      },
    ],
  },
  {
    key: "inventory_classification",
    label: "Inventory Classification",
    permissions: [
      {
        code: "inventory.stock_classification.view",
        label: "View Stock Classification",
      },
      {
        code: "inventory.stock_classification.assign",
        label: "Assign Stock Classification",
      },
      {
        code: "inventory.stock_classification.change",
        label: "Change Stock Classification",
      },
      {
        code: "inventory.restricted_stock.view",
        label: "View Restricted Stock",
      },
      {
        code: "inventory.restricted_stock.manage",
        label: "Manage Restricted Stock",
      },
      {
        code: "inventory.restricted_stock.sell",
        label: "Sell Restricted Stock",
      },
      {
        code: "inventory.restricted_stock.purchase",
        label: "Purchase Restricted Stock",
      },
      {
        code: "inventory.restricted_stock.transfer",
        label: "Transfer Restricted Stock",
      },
      {
        code: "inventory.restricted_stock.adjust",
        label: "Adjust Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.view",
        label: "View Non-Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.manage",
        label: "Manage Non-Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.sell",
        label: "Sell Non-Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.purchase",
        label: "Purchase Non-Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.transfer",
        label: "Transfer Non-Restricted Stock",
      },
      {
        code: "inventory.non_restricted_stock.adjust",
        label: "Adjust Non-Restricted Stock",
      },
    ],
  },
  {
    key: "purchase_controls",
    label: "Purchase Controls",
    permissions: [
      {
        code: "purchases.stock_purchase.regular",
        label: "Purchase Regular Stock",
      },
      {
        code: "purchases.stock_purchase.restricted",
        label: "Purchase Restricted Stock",
      },
      {
        code: "purchases.stock_purchase.non_restricted",
        label: "Purchase Non-Restricted Stock",
      },
      {
        code: "purchases.stock_purchase.vat",
        label: "Create VAT Purchases",
      },
      {
        code: "purchases.stock_purchase.non_vat",
        label: "Create Non-VAT Purchases",
      },
      {
        code: "purchases.vat.view",
        label: "View Purchase VAT",
      },
      {
        code: "purchases.vat.manage",
        label: "Manage Purchase VAT",
      },
      {
        code: "purchases.non_vat.view",
        label: "View Non-VAT Purchases",
      },
      {
        code: "purchases.non_vat.use",
        label: "Use Non-VAT Purchases",
      },
      {
        code: "purchases.non_vat.manage",
        label: "Manage Non-VAT Purchases",
      },
    ],
  },
];

export const IMPORTANT_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);
