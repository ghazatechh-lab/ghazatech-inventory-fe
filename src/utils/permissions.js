/**
 * Permissions mapping for PerfumASol system
 */

export const ROLES = {
  OWNER: 'owner',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  BRANCH_MANAGER: 'branch_manager',
  PRODUCTION_MANAGER: 'production_manager',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  STAFF: 'staff',
};

export const ROLE_LABELS = {
  owner: 'Owner / Business Admin',
  warehouse_manager: 'Warehouse Manager',
  branch_manager: 'Branch Manager',
  production_manager: 'Production Manager',
  cashier: 'Cashier',
  accountant: 'Accountant',
  staff: 'Staff',
};

// Default permission lists by role
export const ROLE_PERMISSIONS = {
  owner: [
    '*', // All permissions
  ],
  warehouse_manager: [
    'warehouse.view', 'warehouse.manage',
    'inventory.view', 'inventory.adjust', 'inventory.wastage',
    'purchases.view', 'purchases.grn', 'purchases.returns',
    'production.view', 'production.add_batch',
    'transfers.view', 'transfers.create', 'transfers.dispatch', 'transfers.receive',
  ],
  branch_manager: [
    'branch.view', 'branch.manage_stock',
    'inventory.view',
    'sales.view', 'sales.pos', 'sales.returns', 'customers.manage',
    'transfers.view', 'transfers.create', 'transfers.receive',
    'reports.branch',
  ],
  production_manager: [
    'inventory.view', 'inventory.wastage',
    'production.view', 'production.formulation', 'production.add_batch', 'production.complete', 'production.wastage',
    'transfers.view',
  ],
  cashier: [
    'sales.pos', 'sales.view', 'customers.quick_add', 'sales.returns',
  ],
  accountant: [
    'finance.view', 'finance.expenses', 'finance.receivables', 'finance.payables', 'finance.cash_bank',
    'reports.finance', 'purchases.bills',
  ],
  staff: [
    'inventory.view', 'sales.view',
  ],
};

/**
 * Check if user has explicit permission or admin wildcard
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (Array.isArray(permission)) return permission.some(p=>hasPermission(user,p));
  const permissions = user.permissions || [];
  if (permissions.includes('*') || permissions.includes(permission)) return true;
  return false;
};

/**
 * Check if user has specific role
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  return user.role === role;
};
