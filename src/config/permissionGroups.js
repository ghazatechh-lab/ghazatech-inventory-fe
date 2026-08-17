// ORIGINAL PATH: frontend/src/config/permissionGroups.js

export const PERMISSION_GROUPS = [
  {
    key: "branch_controls",
    label: "Branch Controls",
    description: "Branch access is assigned directly to this user.",
    permissions: [
      {
        code: "branches.switch",
        label: "Change Active Branch",
        description:
          "Allow this user to change the active working branch from the page header.",
      },
      {
        code: "branches.view_all",
        label: "View All Branches",
        description:
          "Allow this user to select All Branches and view combined branch data.",
      },
    ],
  },
  {
    key: "sales_controls",
    label: "Sales Controls",
    description: "Optional sensitive sales operations for this user.",
    permissions: [
      {
        code: "sales.selling.discount",
        label: "Apply Sales Discount",
        description: "Allow this user to apply discounts during sales.",
      },
      {
        code: "sales.selling.price_override",
        label: "Override Selling Price",
        description: "Allow this user to override the default selling price.",
      },
    ],
  },
];

export const IMPORTANT_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);
