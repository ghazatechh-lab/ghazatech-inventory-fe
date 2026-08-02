const rules = [
  // Dashboard
  [/^\/dashboard(\/|$)/, "dashboard.dashboard.view"],

  // Settings and security
  [/^\/settings\/users-roles(\/|$)/, "settings.roles.view"],
  [/^\/settings(\/|$)/, "settings.settings.view"],
  [/^\/audit-logs(\/|$)/, "settings.audit_logs.view"],
  [/^\/branches\/new(\/|$)/, "settings.branches.create"],
  [/^\/branches\/[^/]+\/edit(\/|$)/, "settings.branches.edit"],
  [/^\/branches(\/|$)/, "settings.branches.view"],

  // Inventory
  [/^\/inventory\/categories\/new(\/|$)/, "inventory.categories.create"],
  [/^\/inventory\/categories\/[^/]+\/edit(\/|$)/, "inventory.categories.edit"],
  [/^\/inventory\/categories(\/|$)/, "inventory.categories.view"],
  [/^\/inventory\/brands\/new(\/|$)/, "inventory.brands.create"],
  [/^\/inventory\/brands\/[^/]+\/edit(\/|$)/, "inventory.brands.edit"],
  [/^\/inventory\/brands(\/|$)/, "inventory.brands.view"],
  [/^\/inventory\/racks\/new(\/|$)/, "inventory.racks.create"],
  [/^\/inventory\/racks\/[^/]+\/edit(\/|$)/, "inventory.racks.edit"],
  [/^\/inventory\/racks(\/|$)/, "inventory.racks.view"],
  [/^\/inventory\/products\/new(\/|$)/, "inventory.products.create"],
  [/^\/inventory\/products\/[^/]+\/edit(\/|$)/, "inventory.products.edit"],
  [/^\/inventory\/products(\/|$)/, "inventory.products.view"],
  [/^\/inventory\/stock(\/|$)/, "inventory.stock.view"],
  [/^\/inventory\/movements(\/|$)/, "inventory.movements.view"],
  [/^\/inventory\/adjustments(\/|$)/, "inventory.adjustments.view"],
  [/^\/inventory\/low-stock(\/|$)/, "inventory.stock.view"],
  [/^\/transfers\/new(\/|$)/, "inventory.transfers.create"],
  [/^\/transfers\/[^/]+\/edit(\/|$)/, "inventory.transfers.edit"],
  [/^\/transfers(\/|$)/, "inventory.transfers.view"],

  // Customers and sales
  [/^\/customers\/new(\/|$)/, "sales.customers.create"],
  [/^\/customers\/[^/]+\/edit(\/|$)/, "sales.customers.edit"],
  [/^\/customers(\/|$)/, "sales.customers.view"],
  [/^\/sales\/quotations\/new(\/|$)/, "sales.quotations.create"],
  [/^\/sales\/quotations\/[^/]+\/edit(\/|$)/, "sales.quotations.edit"],
  [/^\/sales\/quotations(\/|$)/, "sales.quotations.view"],
  [/^\/sales\/orders\/new(\/|$)/, "sales.orders.create"],
  [/^\/sales\/orders\/[^/]+\/edit(\/|$)/, "sales.orders.edit"],
  [/^\/sales\/orders(\/|$)/, "sales.orders.view"],
  [/^\/sales\/delivery-notes(\/|$)/, "sales.delivery_notes.view"],
  [/^\/sales\/returns(\/|$)/, "sales.returns.view"],
  [/^\/sales\/price-lists(\/|$)/, "sales.price_lists.view"],
  [/^\/sales\/invoices\/new(\/|$)/, "sales.invoices.create"],
  [/^\/sales\/invoices\/[^/]+\/edit(\/|$)/, "sales.invoices.edit"],
  [/^\/sales\/invoices(\/|$)/, "sales.invoices.view"],
  [/^\/sales\/pos(\/|$)/, "sales.pos.view"],
  [/^\/sales\/payments(\/|$)/, "sales.sales_payments.view"],
  [/^\/sales\/credit-notes(\/|$)/, "sales.credit_notes.view"],

  // Purchase
  [/^\/suppliers\/new(\/|$)/, "purchase.suppliers.create"],
  [/^\/suppliers\/[^/]+\/edit(\/|$)/, "purchase.suppliers.edit"],
  [/^\/suppliers(\/|$)/, "purchase.suppliers.view"],
  [/^\/purchases\/orders\/new(\/|$)/, "purchase.purchase_orders.create"],
  [/^\/purchases\/orders\/[^/]+\/edit(\/|$)/, "purchase.purchase_orders.edit"],
  [/^\/purchases\/orders(\/|$)/, "purchase.purchase_orders.view"],
  [/^\/purchases\/grn\/new(\/|$)/, "purchase.grn.create"],
  [/^\/purchases\/grn\/[^/]+\/edit(\/|$)/, "purchase.grn.edit"],
  [/^\/purchases\/grn(\/|$)/, "purchase.grn.view"],
  [/^\/purchases\/supplier-bills(\/|$)/, "purchase.supplier_bills.view"],
  [
    /^\/purchases\/supplier-payments\/new(\/|$)/,
    "purchase.supplier_payments.create",
  ],
  [
    /^\/purchases\/supplier-payments\/[^/]+\/edit(\/|$)/,
    "purchase.supplier_payments.edit",
  ],
  [/^\/purchases\/supplier-payments(\/|$)/, "purchase.supplier_payments.view"],
  [
    /^\/purchases\/supplier-returns\/new(\/|$)/,
    "purchase.supplier_returns.create",
  ],
  [/^\/purchases\/supplier-returns(\/|$)/, "purchase.supplier_returns.view"],
  [/^\/purchases\/vendor-credits(\/|$)/, "purchase.vendor_credits.view"],
  [/^\/purchases\/expenses(\/|$)/, "purchase.expenses.view"],
  [/^\/shipments\/new(\/|$)/, "purchase.shipments.create"],
  [/^\/shipments\/[^/]+\/edit(\/|$)/, "purchase.shipments.edit"],
  [/^\/shipments(\/|$)/, "purchase.shipments.view"],

  // HRMS
  [/^\/hrms\/employees\/new(\/|$)/, "hrms.employees.create"],
  [/^\/hrms\/employees\/[^/]+\/edit(\/|$)/, "hrms.employees.edit"],
  [/^\/hrms\/employees(\/|$)/, "hrms.employees.view"],
  [/^\/hrms\/attendance(\/|$)/, "hrms.attendance.view"],
  [/^\/hrms\/leaves(\/|$)/, "hrms.leaves.view"],
  [/^\/hrms\/payroll(\/|$)/, "hrms.payroll.view"],
  [/^\/hrms\/salary-history(\/|$)/, "hrms.salary_history.view"],
  [/^\/hrms\/document-expiry(\/|$)/, "hrms.document_expiry.view"],

  // Accounting
  [/^\/finance\/dashboard(\/|$)/, "accounting.dashboard.view"],
  [/^\/finance\/chart-of-accounts(\/|$)/, "accounting.chart_of_accounts.view"],
  [/^\/finance\/journal-entries(\/|$)/, "accounting.journal_entries.view"],
  [/^\/finance\/general-ledger(\/|$)/, "accounting.general_ledger.view"],
  [/^\/finance\/receivables(\/|$)/, "accounting.receivables.view"],
  [/^\/finance\/payables(\/|$)/, "accounting.payables.view"],
  [/^\/finance\/bank-accounts(\/|$)/, "accounting.bank_cash.view"],
  [/^\/finance\/fixed-assets(\/|$)/, "accounting.fixed_assets.view"],
  [/^\/finance\/tax(\/|$)/, "accounting.tax.view"],
  [/^\/finance\/budgeting(\/|$)/, "accounting.budgeting.view"],
  [/^\/finance\/reports(\/|$)/, "accounting.financial_reports.view"],
  [/^\/finance\/period-close(\/|$)/, "accounting.period_close.view"],
  [
    /^\/finance\/branch-consolidation(\/|$)/,
    "accounting.branch_consolidation.view",
  ],

  // Reports
  [/^\/reports(\/|$)/, "reports.reports.view"],
];

export const getRoutePermission = (pathname) => {
  const rule = rules.find(([pattern]) => pattern.test(pathname));

  return rule?.[1] || null;
};
