/** GHAZA COMPUTER ERP — Root Application */

import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import RoutePermissionGuard from "@/components/auth/RoutePermissionGuard";

/* -------------------------------------------------------------------------- */
/* Public pages                                                               */
/* -------------------------------------------------------------------------- */

import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

import DashboardPage from "@/features/dashboard/DashboardPage";

/* -------------------------------------------------------------------------- */
/* Branches                                                                   */
/* -------------------------------------------------------------------------- */

import BranchListPage from "@/features/branches/BranchListPage";
import BranchFormPage from "@/features/branches/BranchFormPage";
import BranchDetailPage from "@/features/branches/BranchDetailPage";

/* -------------------------------------------------------------------------- */
/* Inventory                                                                  */
/* -------------------------------------------------------------------------- */

import CategoryListPage from "@/features/inventory/CategoryListPage";
import BrandListPage from "@/features/inventory/BrandListPage";
import ProductListPage from "@/features/inventory/ProductListPage";
import ProductFormPage from "@/features/inventory/ProductFormPage";
import ProductDetailPage from "@/features/inventory/ProductDetailPage";
import RackListPage from "@/features/inventory/RackListPage";
import RackFormPage from "@/features/inventory/RackFormPage";
import StockPage from "@/features/inventory/StockPage";
import LowStockPage from "@/features/inventory/LowStockPage";
import StockMovementsPage from "@/features/inventory/StockMovementsPage";
import StockAdjustmentPage from "@/features/inventory/StockAdjustmentPage";

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

import CustomerListPage from "@/features/customers/CustomerListPage";
import CustomerFormPage from "@/features/customers/CustomerFormPage";
import CustomerDetailPage from "@/features/customers/CustomerDetailPage";

/* -------------------------------------------------------------------------- */
/* Sales                                                                      */
/* -------------------------------------------------------------------------- */

import QuotationListPage from "@/features/sales/QuotationListPage";
import QuotationFormPage from "@/features/sales/QuotationFormPage";
import QuotationDetailPage from "@/features/sales/QuotationDetailPage";

import InvoiceListPage from "@/features/sales/InvoiceListPage";
import InvoiceFormPage from "@/features/sales/InvoiceFormPage";
import InvoiceDetailPage from "@/features/sales/InvoiceDetailPage";

import POSPage from "@/features/sales/POSPage";
import CreditNotesPage from "@/features/sales/CreditNotesPage";
import SalesPaymentsPage from "@/features/sales/SalesPaymentsPage";
import SalesOrderListPage from "@/features/sales/SalesOrderListPage";
import SalesOrderFormPage from "@/features/sales/SalesOrderFormPage";
import SalesOrderDetailPage from "@/features/sales/SalesOrderDetailPage";
import SalesReturnsPage from "@/features/sales/SalesReturnsPage";
import PriceListsPage from "@/features/sales/PriceListsPage";
import DeliveryNotesPage from "@/features/sales/DeliveryNotesPage";

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                  */
/* -------------------------------------------------------------------------- */

import SupplierListPage from "@/features/suppliers/SupplierListPage";
import SupplierFormPage from "@/features/suppliers/SupplierFormPage";
import SupplierDetailPage from "@/features/suppliers/SupplierDetailPage";

/* -------------------------------------------------------------------------- */
/* Purchases                                                                  */
/* -------------------------------------------------------------------------- */

import POListPage from "@/features/purchases/POListPage";
import POFormPage from "@/features/purchases/POFormPage";
import PODetailPage from "@/features/purchases/PODetailPage";

import GRNListPage from "@/features/purchases/GRNListPage";
import GRNFormPage from "@/features/purchases/GRNFormPage";
import GRNDetailPage from "@/features/purchases/GRNDetailPage";

import SupplierBillsPage from "@/features/purchases/SupplierBillsPage";
import SupplierBillDetailPage from "@/features/purchases/SupplierBillDetailPage";
import SupplierBillFormPage from "@/features/purchases/SupplierBillFormPage";

import SupplierPaymentListPage from "@/features/purchases/SupplierPaymentListPage";
import SupplierPaymentDetailPage from "@/features/purchases/SupplierPaymentDetailPage";
import SupplierPaymentFormPage from "@/features/purchases/SupplierPaymentFormPage";

import SupplierReturnsPage from "@/features/purchases/SupplierReturnsPage";
import SupplierReturnListPage from "@/features/purchases/SupplierReturnListPage";
import SupplierReturnDetailPage from "@/features/purchases/SupplierReturnDetailPage";

import VendorCreditsPage from "@/features/purchases/VendorCreditsPage";
import VendorCreditDetailPage from "@/features/purchases/VendorCreditDetailPage";

import PurchaseExpensesPage from "@/features/purchases/PurchaseExpensesPage";
import PurchaseExpenseFormPage from "@/features/purchases/PurchaseExpenseFormPage";
import PurchaseExpenseDetailPage from "@/features/purchases/PurchaseExpenseDetailPage";

/* -------------------------------------------------------------------------- */
/* Transfers                                                                  */
/* -------------------------------------------------------------------------- */

import TransferListPage from "@/features/transfers/TransferListPage";
import TransferFormPage from "@/features/transfers/TransferFormPage";
import TransferDetailPage from "@/features/transfers/TransferDetailPage";

/* -------------------------------------------------------------------------- */
/* Shipments                                                                  */
/* -------------------------------------------------------------------------- */

import ShipmentListPage from "@/features/shipments/ShipmentListPage";
import ShipmentFormPage from "@/features/shipments/ShipmentFormPage";
import ShipmentDetailPage from "@/features/shipments/ShipmentDetailPage";

/* -------------------------------------------------------------------------- */
/* HRMS                                                                       */
/* -------------------------------------------------------------------------- */

import EmployeeListPage from "@/features/hrms/EmployeeListPage";
import EmployeeFormPage from "@/features/hrms/EmployeeFormPage";
import EmployeeDetailPage from "@/features/hrms/EmployeeDetailPage";
import AttendancePage from "@/features/hrms/AttendancePage";
import LeavesPage from "@/features/hrms/LeavesPage";
import PayrollPage from "@/features/hrms/PayrollPage";
import PayslipPage from "@/features/hrms/PayslipPage";
import SalaryHistoryPage from "@/features/hrms/SalaryHistoryPage";
import DocumentExpiryPage from "@/features/hrms/DocumentExpiryPage";

/* -------------------------------------------------------------------------- */
/* Finance                                                                    */
/* -------------------------------------------------------------------------- */

import AccountingDashboardPage from "@/features/finance/AccountingDashboardPage";
import ChartOfAccountsPage from "@/features/finance/ChartOfAccountsPage";
import JournalEntriesPage from "@/features/finance/JournalEntriesPage";
import GeneralLedgerPage from "@/features/finance/GeneralLedgerPage";
import ReceivablesPage from "@/features/finance/ReceivablesPage";
import PayablesPage from "@/features/finance/PayablesPage";
import BankAccountsPage from "@/features/finance/BankAccountsPage";
import FixedAssetsPage from "@/features/finance/FixedAssetsPage";
import TaxPage from "@/features/finance/TaxPage";
import BudgetingPage from "@/features/finance/BudgetingPage";
import FinancialReportsPage from "@/features/finance/FinancialReportsPage";
import PeriodClosePage from "@/features/finance/PeriodClosePage";
import BranchConsolidationPage from "@/features/finance/BranchConsolidationPage";

/* -------------------------------------------------------------------------- */
/* Reports                                                                    */
/* -------------------------------------------------------------------------- */

import ReportsDashboardPage from "@/features/reports/ReportsDashboardPage";
import SalesReportPage from "@/features/reports/SalesReportPage";
import PurchaseReportPage from "@/features/reports/PurchaseReportPage";
import InventoryReportPage from "@/features/reports/InventoryReportPage";
import FinanceReportPage from "@/features/reports/FinanceReportPage";
import HRMSReportPage from "@/features/reports/HRMSReportPage";

/* -------------------------------------------------------------------------- */
/* Administration                                                             */
/* -------------------------------------------------------------------------- */

import NotificationsPage from "@/features/notifications/NotificationsPage";
import AuditLogsPage from "@/features/auditLogs/AuditLogsPage";
import SettingsPage from "@/features/settings/SettingsPage";
import UserRoleManagementPage from "@/features/settings/UserRoleManagementPage";

/* -------------------------------------------------------------------------- */
/* React Query                                                                */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Component export resolver                                                  */
/* -------------------------------------------------------------------------- */

function ComponentExportError({ componentName }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
      <h1 className="text-lg font-semibold">Component export error</h1>

      <p className="mt-2 text-sm">
        {componentName} was not exported as a valid React component.
      </p>

      <p className="mt-3 font-mono text-xs">
        Open the related JSX file and ensure it has a default function export.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Protected route                                                            */
/* -------------------------------------------------------------------------- */

function ProtectedRoute({ children, allow, permission }) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleCode = user.role?.code || user.role_detail?.code || user.role_code;

  const isAdmin =
    user.is_superuser === true ||
    roleCode === "ADMIN" ||
    user.role_name === "Super Admin";

  if (allow && !isAdmin && !allow.includes(roleCode)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    permission &&
    !isAdmin &&
    typeof hasPermission === "function" &&
    !hasPermission(permission)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

/* -------------------------------------------------------------------------- */
/* Application                                                                */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster theme="dark" position="top-right" richColors closeButton />

          <Routes>
            {/* Public routes */}

            <Route path="/login" element={<LoginPage />} />

            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Authenticated application */}

            <Route
              element={
                <ProtectedRoute>
                  <RoutePermissionGuard>
                    <AppLayout />
                  </RoutePermissionGuard>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                path="/modules"
                element={<Navigate to="/dashboard" replace />}
              />

              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Branches */}

              <Route
                path="/branches"
                element={
                  <ProtectedRoute permission="settings.branches.view">
                    <BranchListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/new"
                element={
                  <ProtectedRoute permission="settings.branches.create">
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/:id"
                element={
                  <ProtectedRoute permission="settings.branches.view">
                    <BranchDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/:id/edit"
                element={
                  <ProtectedRoute permission="settings.branches.edit">
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Inventory */}

              <Route
                path="/inventory/categories"
                element={<CategoryListPage />}
              />

              <Route path="/inventory/brands" element={<BrandListPage />} />

              <Route path="/inventory/products" element={<ProductListPage />} />

              <Route
                path="/inventory/products/new"
                element={<ProductFormPage />}
              />

              <Route
                path="/inventory/products/:id"
                element={<ProductDetailPage />}
              />

              <Route
                path="/inventory/products/:id/edit"
                element={<ProductFormPage />}
              />

              <Route path="/inventory/racks" element={<RackListPage />} />

              <Route path="/inventory/racks/new" element={<RackFormPage />} />

              <Route
                path="/inventory/racks/:id/edit"
                element={<RackFormPage />}
              />

              <Route path="/inventory/stock" element={<StockPage />} />

              <Route path="/inventory/low-stock" element={<LowStockPage />} />

              <Route
                path="/inventory/movements"
                element={<StockMovementsPage />}
              />

              <Route
                path="/inventory/adjustments"
                element={<StockAdjustmentPage />}
              />

              {/* Customers */}

              <Route path="/customers" element={<CustomerListPage />} />

              <Route path="/customers/new" element={<CustomerFormPage />} />

              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              <Route
                path="/customers/:id/edit"
                element={<CustomerFormPage />}
              />

              {/* Sales */}

              <Route path="/sales/quotations" element={<QuotationListPage />} />

              <Route
                path="/sales/quotations/new"
                element={<QuotationFormPage />}
              />

              <Route
                path="/sales/quotations/:id"
                element={<QuotationDetailPage />}
              />

              <Route
                path="/sales/quotations/:id/edit"
                element={<QuotationFormPage />}
              />

              <Route path="/sales/orders" element={<SalesOrderListPage />} />
              <Route
                path="/sales/orders/new"
                element={<SalesOrderFormPage />}
              />
              <Route
                path="/sales/orders/:id"
                element={<SalesOrderDetailPage />}
              />
              <Route
                path="/sales/orders/:id/edit"
                element={<SalesOrderFormPage />}
              />
              <Route
                path="/sales/delivery-notes"
                element={<DeliveryNotesPage />}
              />
              <Route path="/sales/returns" element={<SalesReturnsPage />} />
              <Route path="/sales/price-lists" element={<PriceListsPage />} />

              <Route path="/sales/invoices" element={<InvoiceListPage />} />

              <Route path="/sales/invoices/new" element={<InvoiceFormPage />} />

              <Route
                path="/sales/invoices/:id"
                element={<InvoiceDetailPage />}
              />

              <Route
                path="/sales/invoices/:id/edit"
                element={<InvoiceFormPage />}
              />

              <Route path="/sales/pos" element={<POSPage />} />

              <Route path="/sales/credit-notes" element={<CreditNotesPage />} />

              <Route path="/sales/payments" element={<SalesPaymentsPage />} />

              {/* Suppliers */}

              <Route path="/suppliers" element={<SupplierListPage />} />

              <Route path="/suppliers/new" element={<SupplierFormPage />} />

              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />

              <Route
                path="/suppliers/:id/edit"
                element={<SupplierFormPage />}
              />

              {/* Purchase Orders */}

              <Route path="/purchases/orders" element={<POListPage />} />

              <Route path="/purchases/orders/new" element={<POFormPage />} />

              <Route path="/purchases/orders/:id" element={<PODetailPage />} />

              <Route
                path="/purchases/orders/:id/edit"
                element={<POFormPage />}
              />

              {/* GRN */}

              <Route path="/purchases/grn" element={<GRNListPage />} />

              <Route path="/purchases/grn/new" element={<GRNFormPage />} />

              <Route path="/purchases/grn/:id" element={<GRNDetailPage />} />

              <Route path="/purchases/grn/:id/edit" element={<GRNFormPage />} />

              {/* Supplier Bills */}

              <Route
                path="/purchases/supplier-bills"
                element={<SupplierBillsPage />}
              />

              <Route
                path="/purchases/supplier-bills"
                element={<SupplierBillsPage />}
              />

              <Route
                path="/purchases/supplier-bills/:id"
                element={<SupplierBillDetailPage />}
              />

              <Route
                path="/purchases/supplier-bills/new"
                element={<SupplierBillFormPage />}
              />

              {/* Supplier Payments */}

              <Route
                path="/purchases/supplier-payments"
                element={<SupplierPaymentListPage />}
              />

              <Route
                path="/purchases/supplier-payments/new"
                element={<SupplierPaymentFormPage />}
              />

              <Route
                path="/purchases/supplier-payments/:id"
                element={<SupplierPaymentDetailPage />}
              />

              <Route
                path="/purchases/supplier-payments/:id/edit"
                element={<SupplierPaymentFormPage />}
              />

              {/* Supplier Returns */}

              <Route
                path="/purchases/supplier-returns"
                element={<SupplierReturnListPage />}
              />

              <Route
                path="/purchases/supplier-returns/new"
                element={<SupplierReturnsPage />}
              />

              <Route
                path="/purchases/supplier-returns/:id"
                element={<SupplierReturnDetailPage />}
              />

              <Route
                path="/purchases/supplier-returns/:id/edit"
                element={<SupplierReturnsPage />}
              />

              {/* Vendor Credits */}

              <Route
                path="/purchases/vendor-credits"
                element={<VendorCreditsPage />}
              />

              <Route
                path="/purchases/vendor-credits/new"
                element={<VendorCreditsPage />}
              />

              <Route
                path="/purchases/vendor-credits/:id/edit"
                element={<VendorCreditsPage />}
              />

              <Route
                path="/purchases/vendor-credits/:id"
                element={<VendorCreditDetailPage />}
              />

              {/* Purchase Expenses */}

              <Route
                path="/purchases/purchase-expenses"
                element={<PurchaseExpensesPage />}
              />

              <Route
                path="/purchases/purchase-expenses/new"
                element={<PurchaseExpenseFormPage />}
              />

              <Route
                path="/purchases/purchase-expenses/:id"
                element={<PurchaseExpenseDetailPage />}
              />

              <Route
                path="/purchases/purchase-expenses/:id/edit"
                element={<PurchaseExpenseFormPage />}
              />

              {/* Compatibility routes for old expense links */}

              <Route
                path="/purchases/expenses"
                element={<Navigate to="/purchases/purchase-expenses" replace />}
              />

              <Route
                path="/purchases/expenses/new"
                element={
                  <Navigate to="/purchases/purchase-expenses/new" replace />
                }
              />

              <Route
                path="/purchases/expenses/:id"
                element={<PurchaseExpenseDetailPage />}
              />

              <Route
                path="/purchases/expenses/:id/edit"
                element={<PurchaseExpensesPage />}
              />

              {/* Transfers */}

              <Route path="/transfers" element={<TransferListPage />} />

              <Route path="/transfers/new" element={<TransferFormPage />} />

              <Route path="/transfers/:id" element={<TransferDetailPage />} />

              <Route
                path="/transfers/:id/edit"
                element={<TransferFormPage />}
              />

              {/* Shipments */}

              <Route path="/shipments" element={<ShipmentListPage />} />

              <Route path="/shipments/new" element={<ShipmentFormPage />} />

              <Route path="/shipments/:id" element={<ShipmentDetailPage />} />

              <Route
                path="/shipments/:id/edit"
                element={<ShipmentFormPage />}
              />

              {/* HRMS */}

              <Route path="/hrms/employees" element={<EmployeeListPage />} />

              <Route
                path="/hrms/employees/new"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <EmployeeFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/employees/:id"
                element={<EmployeeDetailPage />}
              />

              <Route
                path="/hrms/employees/:id/edit"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <EmployeeFormPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/hrms/attendance" element={<AttendancePage />} />

              <Route path="/hrms/leaves" element={<LeavesPage />} />

              <Route
                path="/hrms/payroll"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/payroll/:id/payslip"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <PayslipPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/salary-history"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <SalaryHistoryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/document-expiry"
                element={<DocumentExpiryPage />}
              />

              {/* Finance */}

              <Route
                path="/finance/dashboard"
                element={
                  <ProtectedRoute permission="accounting.dashboard.view">
                    <AccountingDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/chart-of-accounts"
                element={
                  <ProtectedRoute permission="accounting.chart_of_accounts.view">
                    <ChartOfAccountsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/journal-entries"
                element={
                  <ProtectedRoute permission="accounting.journal_entries.view">
                    <JournalEntriesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/general-ledger"
                element={
                  <ProtectedRoute permission="accounting.general_ledger.view">
                    <GeneralLedgerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/receivables"
                element={
                  <ProtectedRoute permission="accounting.receivables.view">
                    <ReceivablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/payables"
                element={
                  <ProtectedRoute permission="accounting.payables.view">
                    <PayablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/bank-accounts"
                element={
                  <ProtectedRoute permission="accounting.bank_cash.view">
                    <BankAccountsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/fixed-assets"
                element={
                  <ProtectedRoute permission="accounting.fixed_assets.view">
                    <FixedAssetsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/tax"
                element={
                  <ProtectedRoute permission="accounting.tax.view">
                    <TaxPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/budgeting"
                element={
                  <ProtectedRoute permission="accounting.budgeting.view">
                    <BudgetingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/reports"
                element={
                  <ProtectedRoute permission="accounting.financial_reports.view">
                    <FinancialReportsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/period-close"
                element={
                  <ProtectedRoute permission="accounting.period_close.view">
                    <PeriodClosePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/branch-consolidation"
                element={
                  <ProtectedRoute permission="accounting.branch_consolidation.view">
                    <BranchConsolidationPage />
                  </ProtectedRoute>
                }
              />

              {/* Reports */}

              <Route
                path="/reports/dashboard"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <ReportsDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/sales"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <SalesReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/purchases"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <PurchaseReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/inventory"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <InventoryReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/finance"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <FinanceReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/hrms"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <HRMSReportPage />
                  </ProtectedRoute>
                }
              />

              {/* Other */}

              <Route path="/notifications" element={<NotificationsPage />} />

              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings/users-roles"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <UserRoleManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
