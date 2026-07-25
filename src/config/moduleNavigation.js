import {
  BadgeDollarSign,
  Banknote,
  BarChart3,
  BookOpenText,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  GitBranch,
  Globe2,
  HandCoins,
  History,
  Landmark,
  Layers,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  ReceiptText,
  RotateCcw,
  Rows3,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tag,
  TrendingDown,
  Truck,
  UserSquare2,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";

/**
 * Main application modules.
 *
 * Internal navigation:
 * - Module landing route uses `landingPath`.
 * - Sidebar submodule links use `to`.
 *
 * External navigation:
 * - Website uses `externalUrl`.
 *
 * Access control:
 * - adminOnly: only Admin users.
 * - allowedRoles: allowed role codes.
 * - hideForStaff: hides module for Staff.
 */
export const modules = [
  {
    id: "dashboard",
    key: "dashboard",
    order: 1,
    title: "Dashboard",
    shortTitle: "Dashboard",
    description:
      "View business performance, alerts, activities, and important operational summaries.",
    icon: LayoutDashboard,
    path: "/dashboard",
    landingPath: "/dashboard",
    color: "blue",
    items: [
      {
        id: "dashboard-overview",
        label: "Dashboard Overview",
        to: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    id: "inventory",
    key: "inventory",
    order: 2,
    title: "Inventory",
    shortTitle: "Inventory",
    description:
      "Manage products, categories, brands, racks, stock, movements, adjustments, and transfers.",
    icon: Boxes,
    path: "/inventory",
    landingPath: "/inventory/products",
    color: "emerald",
    items: [
      {
        id: "inventory-categories",
        label: "Categories",
        to: "/inventory/categories",
        icon: Layers,
      },
      {
        id: "inventory-brands",
        label: "Brands",
        to: "/inventory/brands",
        icon: Tag,
      },
      {
        id: "inventory-racks",
        label: "Racks",
        to: "/inventory/racks",
        icon: Rows3,
      },
      {
        id: "inventory-products",
        label: "Products",
        to: "/inventory/products",
        icon: Boxes,
      },
      {
        id: "inventory-stock",
        label: "Stock Overview",
        to: "/inventory/stock",
        icon: PackageCheck,
      },
      {
        id: "inventory-movements",
        label: "Stock Movements",
        to: "/inventory/movements",
        icon: GitBranch,
      },
      {
        id: "inventory-adjustments",
        label: "Stock Adjustments",
        to: "/inventory/adjustments",
        icon: ClipboardList,
      },
      {
        id: "inventory-low-stock",
        label: "Low Stock Items",
        to: "/inventory/low-stock",
        icon: TrendingDown,
        badge: "!",
      },
      {
        id: "inventory-transfers",
        label: "Stock Transfers",
        to: "/transfers",
        icon: GitBranch,
      },
    ],
  },

  {
    id: "purchase",
    key: "purchase",
    order: 3,
    title: "Purchase",
    shortTitle: "Purchase",
    description:
      "Manage suppliers, purchase orders, goods receipt, bills, payments, returns, credits, and expenses.",
    icon: ShoppingCart,
    path: "/purchases",
    landingPath: "/purchases/orders",
    color: "rose",
    items: [
      {
        id: "purchase-suppliers",
        label: "Suppliers",
        to: "/suppliers",
        icon: Users,
      },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        to: "/purchases/orders",
        icon: FileText,
      },
      {
        id: "purchase-shipments",
        label: "Shipments",
        to: "/shipments",
        icon: Truck,
      },
      {
        id: "purchase-grn",
        label: "Goods Received Notes",
        to: "/purchases/grn",
        icon: PackageCheck,
      },
      {
        id: "purchase-supplier-bills",
        label: "Supplier Bills",
        to: "/purchases/supplier-bills",
        icon: ReceiptText,
      },
      {
        id: "purchase-supplier-payments",
        label: "Supplier Payments",
        to: "/purchases/supplier-payments",
        icon: HandCoins,
      },
      {
        id: "purchase-supplier-returns",
        label: "Supplier Returns",
        to: "/purchases/supplier-returns",
        icon: RotateCcw,
      },
      {
        id: "purchase-vendor-credits",
        label: "Vendor Credits",
        to: "/purchases/vendor-credits",
        icon: BadgeDollarSign,
      },
      {
        id: "purchase-expenses",
        label: "Purchase Expenses",
        to: "/purchases/expenses",
        icon: WalletCards,
      },
    ],
  },

  {
    id: "sales",
    key: "sales",
    order: 4,
    title: "Sales",
    shortTitle: "Sales",
    description:
      "Manage quotations, invoices, direct sales, payments, credit notes, reports, and customers.",
    icon: BarChart3,
    path: "/sales",
    landingPath: "/sales/quotations",
    color: "amber",
    items: [
      {
        id: "sales-quotations",
        label: "Quotations",
        to: "/sales/quotations",
        icon: FileText,
      },
      {
        id: "sales-invoices",
        label: "Invoices",
        to: "/sales/invoices",
        icon: ReceiptText,
      },
      {
        id: "sales-pos",
        label: "Direct Sale / POS",
        to: "/sales/pos",
        icon: ShoppingCart,
      },
      {
        id: "sales-payments",
        label: "Sales Payments",
        to: "/sales/payments",
        icon: Wallet,
      },
      {
        id: "sales-credit-notes",
        label: "Credit Notes",
        to: "/sales/credit-notes",
        icon: RotateCcw,
      },
      {
        id: "sales-reports",
        label: "Sales Reports",
        to: "/reports/sales",
        icon: BarChart3,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "sales-customers",
        label: "Customers",
        to: "/customers",
        icon: Users,
      },
    ],
  },

  {
    id: "accounting",
    key: "accounting",
    order: 5,
    title: "Accounting",
    shortTitle: "Accounting",
    description:
      "Manage expenses, receivables, payables, cash registers, bank accounts, and ledger entries.",
    icon: Landmark,
    path: "/finance",
    landingPath: "/finance/expenses",
    color: "cyan",
    hideForStaff: true,
    items: [
      {
        id: "accounting-expenses",
        label: "Expenses",
        to: "/finance/expenses",
        icon: BadgeDollarSign,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "accounting-receivables",
        label: "Customer Receivables",
        to: "/finance/receivables",
        icon: HandCoins,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "accounting-payables",
        label: "Supplier Payables",
        to: "/finance/payables",
        icon: Wallet,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "accounting-cash-register",
        label: "Cash Register",
        to: "/finance/cash-register",
        icon: Banknote,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "accounting-bank-accounts",
        label: "Bank Accounts",
        to: "/finance/bank-accounts",
        icon: Landmark,
        adminOnly: true,
      },
      {
        id: "accounting-ledger",
        label: "Ledger",
        to: "/finance/ledger",
        icon: BookOpenText,
        allowedRoles: ["ADMIN", "BM"],
      },
    ],
  },

  {
    id: "hrms",
    key: "hrms",
    order: 6,
    title: "Human Resources",
    shortTitle: "HRMS",
    description:
      "Manage employees, attendance, leave requests, payroll, salary history, and document expiry.",
    icon: UserSquare2,
    path: "/hrms",
    landingPath: "/hrms/employees",
    color: "violet",
    items: [
      {
        id: "hrms-employees",
        label: "Employees",
        to: "/hrms/employees",
        icon: UserSquare2,
      },
      {
        id: "hrms-attendance",
        label: "Attendance",
        to: "/hrms/attendance",
        icon: CalendarCheck,
      },
      {
        id: "hrms-leaves",
        label: "Leave Requests",
        to: "/hrms/leaves",
        icon: CalendarDays,
      },
      {
        id: "hrms-payroll",
        label: "Payroll",
        to: "/hrms/payroll",
        icon: Banknote,
        adminOnly: true,
      },
      {
        id: "hrms-salary-history",
        label: "Salary History",
        to: "/hrms/salary-history",
        icon: History,
        adminOnly: true,
      },
      {
        id: "hrms-document-expiry",
        label: "Document Expiry",
        to: "/hrms/document-expiry",
        icon: ShieldAlert,
      },
    ],
  },

  {
    id: "reports",
    key: "reports",
    order: 7,
    title: "Reports",
    shortTitle: "Reports",
    description:
      "View and export sales, purchase, inventory, HRMS, accounting, and business reports.",
    icon: BarChart3,
    path: "/reports",
    landingPath: "/reports/dashboard",
    color: "orange",
    hideForStaff: true,
    items: [
      {
        id: "reports-dashboard",
        label: "Dashboard Reports",
        to: "/reports/dashboard",
        icon: BarChart3,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "reports-sales",
        label: "Sales Reports",
        to: "/reports/sales",
        icon: FileText,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "reports-purchases",
        label: "Purchase Reports",
        to: "/reports/purchases",
        icon: PackagePlus,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "reports-inventory",
        label: "Inventory Reports",
        to: "/reports/inventory",
        icon: Boxes,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "reports-hrms",
        label: "HRMS Reports",
        to: "/reports/hrms",
        icon: UserSquare2,
        allowedRoles: ["ADMIN", "BM"],
      },
      {
        id: "reports-finance",
        label: "Finance Reports",
        to: "/reports/finance",
        icon: BadgeDollarSign,
        allowedRoles: ["ADMIN", "BM"],
      },
    ],
  },

  {
    id: "website",
    key: "website",
    order: 8,
    title: "Website",
    shortTitle: "Website",
    description: "Open the official Ghazatech website in a new browser tab.",
    icon: Globe2,
    externalUrl: "https://www.ghazatech.com/",
    color: "teal",
    items: [],
  },

  {
    id: "settings",
    key: "settings",
    order: 9,
    title: "Settings",
    shortTitle: "Settings",
    description:
      "Configure branches, audit logs, system preferences, and security.",
    icon: Settings,
    path: "/settings",
    landingPath: "/settings",
    color: "slate",
    adminOnly: true,
    items: [
      {
        id: "settings-branches",
        label: "Branches",
        to: "/branches",
        icon: Building2,
        adminOnly: true,
      },
      {
        id: "settings-audit-logs",
        label: "Audit Logs",
        to: "/audit-logs",
        icon: ShieldAlert,
        adminOnly: true,
      },
      {
        id: "settings-system",
        label: "System Settings",
        to: "/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];

export const getUserRoleCode = (user) => {
  const rawRole =
    user?.role?.code ||
    user?.role_detail?.code ||
    user?.role_code ||
    user?.role?.name ||
    user?.role_name ||
    "";

  const normalized = String(rawRole).trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "SUPER_ADMIN" || normalized === "ADMINISTRATOR") {
    return "ADMIN";
  }

  if (normalized === "BRANCH_MANAGER" || normalized === "BRANCHMANAGER") {
    return "BM";
  }

  return normalized;
};

export const isAdministrator = (user) => {
  const roleCode = getUserRoleCode(user);

  return (
    user?.is_superuser === true ||
    roleCode === "ADMIN" ||
    user?.role_name === "Super Admin" ||
    user?.role_name === "Admin"
  );
};

export const isStaffUser = (user) => getUserRoleCode(user) === "STAFF";

export const canAccessNavigationItem = (item, user) => {
  if (!item) {
    return false;
  }

  if (item.adminOnly && !isAdministrator(user)) {
    return false;
  }

  if (item.hideForStaff && isStaffUser(user)) {
    return false;
  }

  if (
    Array.isArray(item.allowedRoles) &&
    item.allowedRoles.length > 0 &&
    !isAdministrator(user)
  ) {
    const roleCode = getUserRoleCode(user);

    if (!item.allowedRoles.includes(roleCode)) {
      return false;
    }
  }

  return true;
};

export const getVisibleModules = (user) =>
  modules
    .filter((module) => canAccessNavigationItem(module, user))
    .map((module) => ({
      ...module,

      items: Array.isArray(module.items)
        ? module.items.filter((item) => canAccessNavigationItem(item, user))
        : [],
    }))
    .filter((module) =>
      Boolean(
        module.externalUrl ||
        module.landingPath ||
        module.path ||
        module.items.length,
      ),
    )
    .sort(
      (first, second) => Number(first.order || 0) - Number(second.order || 0),
    );

export const getModuleTarget = (module, user) => {
  if (!module) {
    return "/modules";
  }

  if (module.externalUrl) {
    return module.externalUrl;
  }

  const visibleItems = Array.isArray(module.items)
    ? module.items.filter((item) => canAccessNavigationItem(item, user))
    : [];

  return module.landingPath || visibleItems[0]?.to || module.path || "/modules";
};

export const getModuleById = (moduleId) =>
  modules.find((module) => module.id === moduleId || module.key === moduleId) ||
  null;

export const getModuleByPath = (pathname = "") => {
  const safePath = typeof pathname === "string" ? pathname : "";

  if (!safePath) {
    return null;
  }

  if (safePath === "/dashboard") {
    return getModuleById("dashboard");
  }

  if (
    safePath === "/suppliers" ||
    safePath.startsWith("/suppliers/") ||
    safePath === "/shipments" ||
    safePath.startsWith("/shipments/") ||
    safePath.startsWith("/purchases/")
  ) {
    return getModuleById("purchase");
  }

  /*
   * Sales Reports is mapped to the Sales module before
   * the general /reports/ condition so the Sales sidebar remains active.
   */
  if (
    safePath === "/customers" ||
    safePath.startsWith("/customers/") ||
    safePath.startsWith("/sales/") ||
    safePath === "/reports/sales"
  ) {
    return getModuleById("sales");
  }

  if (safePath.startsWith("/finance/")) {
    return getModuleById("accounting");
  }

  if (safePath.startsWith("/hrms/")) {
    return getModuleById("hrms");
  }

  if (safePath.startsWith("/reports/")) {
    return getModuleById("reports");
  }

  if (
    safePath === "/branches" ||
    safePath.startsWith("/branches/") ||
    safePath === "/audit-logs" ||
    safePath === "/settings"
  ) {
    return getModuleById("settings");
  }

  return (
    modules.find((module) => {
      if (
        module.path &&
        (safePath === module.path || safePath.startsWith(`${module.path}/`))
      ) {
        return true;
      }

      return (module.items || []).some((item) => {
        const target = typeof item?.to === "string" ? item.to : "";

        return (
          target && (safePath === target || safePath.startsWith(`${target}/`))
        );
      });
    }) || null
  );
};

export const getSidebarItemsForPath = (pathname, user) => {
  const module = getModuleByPath(pathname);

  if (!module) {
    return [];
  }

  return (module.items || []).filter((item) =>
    canAccessNavigationItem(item, user),
  );
};

export const openModule = (module, navigate, user) => {
  if (!module) {
    return;
  }

  if (module.externalUrl) {
    window.open(module.externalUrl, "_blank", "noopener,noreferrer");

    return;
  }

  navigate(getModuleTarget(module, user));
};

export default modules;
