export const PERMISSION_GROUPS = [
  {
    key: "branch_access",
    label: "Branch Access",
    description:
      "Controls whether a role is limited to its assigned branch or can view every branch.",
    permissions: [
      {
        code: "branches.view_all",
        label: "View All Branches",
        description:
          "Allow the user to view all branch details and all branch-scoped records.",
      },
    ],
  },
  {
    key: "sales_stock_access",
    label: "Sales Stock Access",
    description:
      "Regular stock is the normal sales flow. Restricted stock requires separate approval.",
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
    key: "sales_vat_access",
    label: "Sales VAT Access",
    description: "Controls standard VAT and special VAT treatments.",
    permissions: [
      {
        code: "sales.selling.vat",
        label: "Create VAT Sales",
        description: "Allow sales using standard VAT.",
      },
      {
        code: "sales.vat.view",
        label: "View VAT Details",
        description: "View VAT values and VAT treatment details.",
      },
      {
        code: "sales.vat.manage",
        label: "Manage VAT",
        description: "Manage VAT treatment on sales transactions.",
      },
      {
        code: "sales.vat.override_rate",
        label: "Override VAT Rate",
        description: "Change the default VAT percentage.",
      },
      {
        code: "sales.vat.use_zero_rated",
        label: "Use Zero-Rated VAT",
        description: "Create zero-rated VAT sales.",
      },
      {
        code: "sales.vat.use_exempt",
        label: "Use VAT Exempt",
        description: "Create VAT-exempt sales.",
      },
      {
        code: "sales.vat.use_out_of_scope",
        label: "Use Out-of-Scope VAT",
        description: "Create out-of-scope sales.",
      },
      {
        code: "sales.vat.use_reverse_charge",
        label: "Use Reverse Charge",
        description: "Create reverse-charge sales.",
      },
    ],
  },
  {
    key: "sales_non_vat_access",
    label: "Sales Non-VAT Access",
    description:
      "Assign this group only to roles allowed to create Non-VAT sales.",
    permissions: [
      {
        code: "sales.selling.non_vat",
        label: "Create Non-VAT Sales",
        description: "Enable the Non-VAT option in sales forms.",
      },
      {
        code: "sales.non_vat.view",
        label: "View Non-VAT Sales",
        description: "View Non-VAT sale details.",
      },
      {
        code: "sales.non_vat.use",
        label: "Use Non-VAT Sales",
        description: "Create Non-VAT transactions.",
      },
      {
        code: "sales.non_vat.manage",
        label: "Manage Non-VAT Sales",
        description: "Edit and manage Non-VAT transactions.",
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
        description: "Apply discounts during sales.",
      },
      {
        code: "sales.selling.price_override",
        label: "Override Selling Price",
        description: "Change the default selling price.",
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
    description: "Regular and restricted are the only stock classifications.",
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
  {
    key: "purchase_vat_access",
    label: "Purchase VAT Access",
    description: "Controls VAT purchases and VAT treatment management.",
    permissions: [
      {
        code: "purchases.stock_purchase.vat",
        label: "Create VAT Purchases",
        description: "Create purchases using VAT.",
      },
      {
        code: "purchases.vat.view",
        label: "View Purchase VAT",
        description: "View purchase VAT details.",
      },
      {
        code: "purchases.vat.manage",
        label: "Manage Purchase VAT",
        description: "Manage VAT treatment on purchases.",
      },
    ],
  },
  {
    key: "purchase_non_vat_access",
    label: "Purchase Non-VAT Access",
    description: "Assign only to roles allowed to create Non-VAT purchases.",
    permissions: [
      {
        code: "purchases.stock_purchase.non_vat",
        label: "Create Non-VAT Purchases",
        description: "Enable Non-VAT purchase transactions.",
      },
      {
        code: "purchases.non_vat.view",
        label: "View Non-VAT Purchases",
        description: "View Non-VAT purchase details.",
      },
      {
        code: "purchases.non_vat.use",
        label: "Use Non-VAT Purchases",
        description: "Create Non-VAT purchases.",
      },
      {
        code: "purchases.non_vat.manage",
        label: "Manage Non-VAT Purchases",
        description: "Edit and manage Non-VAT purchases.",
      },
    ],
  },
];

export const IMPORTANT_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);
