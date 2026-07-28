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
  UserCog,
  Wallet,
  WalletCards,
} from "lucide-react";

import { canAccessModule, hasPermission, isAdmin } from "@/lib/permissions";

export const modules = [
  {
    id: "dashboard",
    key: "dashboard",
    order: 1,
    title: "Dashboard",
    shortTitle: "Dashboard",
    description:
      "View business performance, alerts, activities, and operational summaries.",
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
    permissionModule: "inventory",
    items: [
      {
        id: "inventory-categories",
        label: "Categories",
        to: "/inventory/categories",
        icon: Layers,
        permission: "inventory.categories.view",
      },
      {
        id: "inventory-brands",
        label: "Brands",
        to: "/inventory/brands",
        icon: Tag,
        permission: "inventory.brands.view",
      },
      {
        id: "inventory-racks",
        label: "Racks",
        to: "/inventory/racks",
        icon: Rows3,
        permission: "inventory.racks.view",
      },
      {
        id: "inventory-products",
        label: "Products",
        to: "/inventory/products",
        icon: Boxes,
        permission: "inventory.products.view",
      },
      {
        id: "inventory-stock",
        label: "Stock Overview",
        to: "/inventory/stock",
        icon: PackageCheck,
        permission: "inventory.stock.view",
      },
      {
        id: "inventory-movements",
        label: "Stock Movements",
        to: "/inventory/movements",
        icon: GitBranch,
        permission: "inventory.movements.view",
      },
      {
        id: "inventory-adjustments",
        label: "Stock Adjustments",
        to: "/inventory/adjustments",
        icon: ClipboardList,
        permission: "inventory.adjustments.view",
      },
      {
        id: "inventory-low-stock",
        label: "Low Stock Items",
        to: "/inventory/low-stock",
        icon: TrendingDown,
        permission: "inventory.low_stock.view",
        badge: "!",
      },
      {
        id: "inventory-transfers",
        label: "Stock Transfers",
        to: "/transfers",
        icon: GitBranch,
        permission: "inventory.transfers.view",
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
    permissionModule: "purchases",
    items: [
      {
        id: "purchase-suppliers",
        label: "Suppliers",
        to: "/suppliers",
        icon: Users,
        permission: "purchases.suppliers.view",
      },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        to: "/purchases/orders",
        icon: FileText,
        permission: "purchases.orders.view",
      },
      {
        id: "purchase-shipments",
        label: "Shipments",
        to: "/shipments",
        icon: Truck,
        permission: "purchases.shipments.view",
      },
      {
        id: "purchase-grn",
        label: "Goods Received Notes",
        to: "/purchases/grn",
        icon: PackageCheck,
        permission: "purchases.grn.view",
      },
      {
        id: "purchase-supplier-bills",
        label: "Supplier Bills",
        to: "/purchases/supplier-bills",
        icon: ReceiptText,
        permission: "purchases.bills.view",
      },
      {
        id: "purchase-supplier-payments",
        label: "Supplier Payments",
        to: "/purchases/supplier-payments",
        icon: HandCoins,
        permission: "purchases.payments.view",
      },
      {
        id: "purchase-supplier-returns",
        label: "Supplier Returns",
        to: "/purchases/supplier-returns",
        icon: RotateCcw,
        permission: "purchases.returns.view",
      },
      {
        id: "purchase-vendor-credits",
        label: "Vendor Credits",
        to: "/purchases/vendor-credits",
        icon: BadgeDollarSign,
        permission: "purchases.vendor_credits.view",
      },
      {
        id: "purchase-expenses",
        label: "Purchase Expenses",
        to: "/purchases/expenses",
        icon: WalletCards,
        permission: "purchases.expenses.view",
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
    permissionModule: "sales",
    items: [
      {
        id: "sales-quotations",
        label: "Quotations",
        to: "/sales/quotations",
        icon: FileText,
        permission: "sales.quotations.view",
      },
      {
        id: "sales-invoices",
        label: "Invoices",
        to: "/sales/invoices",
        icon: ReceiptText,
        permission: "sales.invoices.view",
      },
      {
        id: "sales-pos",
        label: "Direct Sale / POS",
        to: "/sales/pos",
        icon: ShoppingCart,
        permission: "sales.pos.view",
      },
      {
        id: "sales-payments",
        label: "Sales Payments",
        to: "/sales/payments",
        icon: Wallet,
        permission: "sales.payments.view",
      },
      {
        id: "sales-credit-notes",
        label: "Credit Notes",
        to: "/sales/credit-notes",
        icon: RotateCcw,
        permission: "sales.credit_notes.view",
      },
      {
        id: "sales-reports",
        label: "Sales Reports",
        to: "/reports/sales",
        icon: BarChart3,
        permission: "reports.sales.view",
      },
      {
        id: "sales-customers",
        label: "Customers",
        to: "/customers",
        icon: Users,
        permission: "sales.customers.view",
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
    permissionModule: "finance",
    items: [
      {
        id: "accounting-expenses",
        label: "Expenses",
        to: "/finance/expenses",
        icon: BadgeDollarSign,
        permission: "finance.expenses.view",
      },
      {
        id: "accounting-receivables",
        label: "Customer Receivables",
        to: "/finance/receivables",
        icon: HandCoins,
        permission: "finance.receivables.view",
      },
      {
        id: "accounting-payables",
        label: "Supplier Payables",
        to: "/finance/payables",
        icon: Wallet,
        permission: "finance.payables.view",
      },
      {
        id: "accounting-cash-register",
        label: "Cash Register",
        to: "/finance/cash-register",
        icon: Banknote,
        permission: "finance.cash_register.view",
      },
      {
        id: "accounting-bank-accounts",
        label: "Bank Accounts",
        to: "/finance/bank-accounts",
        icon: Landmark,
        permission: "finance.bank_accounts.view",
      },
      {
        id: "accounting-ledger",
        label: "Ledger",
        to: "/finance/ledger",
        icon: BookOpenText,
        permission: "finance.ledger.view",
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
    permissionModule: "hrms",
    items: [
      {
        id: "hrms-employees",
        label: "Employees",
        to: "/hrms/employees",
        icon: UserSquare2,
        permission: "hrms.employees.view",
      },
      {
        id: "hrms-attendance",
        label: "Attendance",
        to: "/hrms/attendance",
        icon: CalendarCheck,
        permission: "hrms.attendance.view",
      },
      {
        id: "hrms-leaves",
        label: "Leave Requests",
        to: "/hrms/leaves",
        icon: CalendarDays,
        permission: "hrms.leaves.view",
      },
      {
        id: "hrms-payroll",
        label: "Payroll",
        to: "/hrms/payroll",
        icon: Banknote,
        permission: "hrms.payroll.view",
      },
      {
        id: "hrms-salary-history",
        label: "Salary History",
        to: "/hrms/salary-history",
        icon: History,
        permission: "hrms.salary_history.view",
      },
      {
        id: "hrms-document-expiry",
        label: "Document Expiry",
        to: "/hrms/document-expiry",
        icon: ShieldAlert,
        permission: "hrms.documents.view",
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
    permissionModule: "reports",
    items: [
      {
        id: "reports-dashboard",
        label: "Dashboard Reports",
        to: "/reports/dashboard",
        icon: BarChart3,
        permission: "reports.dashboard.view",
      },
      {
        id: "reports-sales",
        label: "Sales Reports",
        to: "/reports/sales",
        icon: FileText,
        permission: "reports.sales.view",
      },
      {
        id: "reports-purchases",
        label: "Purchase Reports",
        to: "/reports/purchases",
        icon: PackagePlus,
        permission: "reports.purchases.view",
      },
      {
        id: "reports-inventory",
        label: "Inventory Reports",
        to: "/reports/inventory",
        icon: Boxes,
        permission: "reports.inventory.view",
      },
      {
        id: "reports-hrms",
        label: "HRMS Reports",
        to: "/reports/hrms",
        icon: UserSquare2,
        permission: "reports.hrms.view",
      },
      {
        id: "reports-finance",
        label: "Finance Reports",
        to: "/reports/finance",
        icon: BadgeDollarSign,
        permission: "reports.finance.view",
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
      "Configure branches, users, roles, permissions, audit logs, and system preferences.",
    icon: Settings,
    path: "/settings",
    landingPath: "/settings/users-roles",
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
        id: "settings-users-roles",
        label: "Users, Roles & Permissions",
        to: "/settings/users-roles",
        icon: UserCog,
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

export const isAdministrator = (user) => isAdmin(user);

export const isStaffUser = (user) => getUserRoleCode(user) === "STAFF";

export const canAccessNavigationItem = (item, user) => {
  if (!item || !user) {
    return false;
  }

  if (isAdministrator(user)) {
    return true;
  }

  if (item.adminOnly) {
    return false;
  }

  if (item.allowedRoles && !item.allowedRoles.includes(getUserRoleCode(user))) {
    return false;
  }

  if (item.permission && !hasPermission(user, item.permission)) {
    return false;
  }

  return true;
};

export const getVisibleModules = (user) =>
  modules
    .filter((module) => {
      if (isAdministrator(user)) {
        return true;
      }

      if (module.adminOnly) {
        return false;
      }

      if (
        module.permissionModule &&
        !canAccessModule(user, module.permissionModule)
      ) {
        return false;
      }

      return true;
    })
    .map((module) => ({
      ...module,
      items: Array.isArray(module.items)
        ? module.items.filter((item) => canAccessNavigationItem(item, user))
        : [],
    }))
    .filter((module) =>
      Boolean(
        module.externalUrl || module.items.length || module.id === "dashboard",
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

  return visibleItems[0]?.to || module.landingPath || module.path || "/modules";
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
    safePath.startsWith("/settings")
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
