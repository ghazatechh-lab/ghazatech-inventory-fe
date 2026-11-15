import { hasPermission, isAdmin } from "@/lib/permissions";

// Only routes explicitly authorized for this user may be chosen.
const landingOptions = [
  ["dashboard.dashboard.view", "/dashboard"],
  ["inventory.products.view", "/inventory/products"],
  ["inventory.stock.view", "/inventory/stock"],
  ["inventory.categories.view", "/inventory/categories"],
  ["inventory.brands.view", "/inventory/brands"],
  ["inventory.racks.view", "/inventory/racks"],
  ["inventory.movements.view", "/inventory/movements"],
  ["inventory.adjustments.view", "/inventory/adjustments"],
  ["inventory.transfers.view", "/transfers"],
  ["sales.pos.view", "/sales/pos"],
  ["sales.invoices.view", "/sales/invoices"],
  ["purchase.purchase_orders.view", "/purchases/orders"],
  ["hrms.employees.view", "/hrms/employees"],
  ["hrms.payroll.view", "/hrms/payroll"],
  ["reports.reports.view", "/reports"],
];

export function getAuthorizedLandingPath(user) {
  if (!user) return "/login";
  if (isAdmin(user)) return "/dashboard";
  const match = landingOptions.find(([permission]) => hasPermission(user, permission));
  return match ? match[1] : "/unauthorized";
}
