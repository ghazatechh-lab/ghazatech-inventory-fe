export const PERMISSION_GROUPS = [
  {
    key: "branch_controls",
    label: "Branch Controls",
    description:
      "Controls whether a user can change the active branch from the top bar or view combined data from every branch.",
    permissions: [
      {
        code: "branches.switch",
        label: "Change Active Branch",
        description:
          "Show the branch selector in the header and allow working in another specific branch.",
      },
      {
        code: "branches.view_all",
        label: "View All Branches",
        description:
          "Allow the user to select All Branches and view combined branch-scoped data.",
      },
    ],
  },
  {
    key: "sales_stock_access",
    label: "Sales Stock Access",
    description:
      "Normal stock follows the standard sales flow. Restricted stock requires separate permission.",
    permissions: [
      {
        code: "sales.selling.regular",
        label: "Sell Regular Stock",
        description: "Allow normal sales of regular stock.",
      },
      {
        code: "sales.selling.restricted",
        label: "Sell Restricted Stock",
        description: "Allow sales of stock classified as restricted.",
      },
    ],
  },
  {
    key: "sales_pricing_access",
    label: "Sales Pricing Controls",
    description:
      "Sensitive pricing permissions that should be assigned only when required.",
    permissions: [
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
    key: "inventory_restricted_access",
    label: "Restricted Stock Access",
    description:
      "Regular stock follows normal inventory permissions. Only restricted stock needs special access.",
    permissions: [
      {
        code: "inventory.stock_classification.view",
        label: "View Stock Classification",
        description: "View whether stock is regular or restricted.",
      },
      {
        code: "inventory.stock_classification.assign",
        label: "Assign Stock Classification",
        description: "Classify newly added stock as regular or restricted.",
      },
      {
        code: "inventory.stock_classification.change",
        label: "Change Stock Classification",
        description: "Change stock between regular and restricted.",
      },
      {
        code: "inventory.restricted_stock.view",
        label: "View Restricted Stock",
        description: "View restricted stock quantities and movements.",
      },
      {
        code: "inventory.restricted_stock.manage",
        label: "Manage Restricted Stock",
        description: "Manage restricted stock records.",
      },
      {
        code: "inventory.restricted_stock.sell",
        label: "Sell Restricted Stock",
        description: "Use restricted stock in sales.",
      },
      {
        code: "inventory.restricted_stock.purchase",
        label: "Purchase Restricted Stock",
        description: "Receive or purchase restricted stock.",
      },
      {
        code: "inventory.restricted_stock.transfer",
        label: "Transfer Restricted Stock",
        description: "Transfer restricted stock between branches.",
      },
      {
        code: "inventory.restricted_stock.adjust",
        label: "Adjust Restricted Stock",
        description: "Perform restricted stock adjustments.",
      },
    ],
  },
  {
    key: "purchase_stock_access",
    label: "Purchase Stock Access",
    description:
      "Regular and restricted are the stock classifications used by the current system.",
    permissions: [
      {
        code: "purchases.stock_purchase.regular",
        label: "Purchase Regular Stock",
        description: "Create purchases for regular stock.",
      },
      {
        code: "purchases.stock_purchase.restricted",
        label: "Purchase Restricted Stock",
        description: "Create purchases for restricted stock.",
      },
    ],
  },
];

export const IMPORTANT_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);
