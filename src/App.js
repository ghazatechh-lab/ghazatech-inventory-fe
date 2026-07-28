/** GHAZA COMPUTER ERP — Root Application */
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";

import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

import DashboardPage from "@/features/dashboard/DashboardPage";
import ModuleLandingPage from "@/features/modules/ModuleLandingPage";

import BranchListPage from "@/features/branches/BranchListPage";
import BranchFormPage from "@/features/branches/BranchFormPage";
import BranchDetailPage from "@/features/branches/BranchDetailPage";

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

import CustomerListPage from "@/features/customers/CustomerListPage";
import CustomerFormPage from "@/features/customers/CustomerFormPage";
import CustomerDetailPage from "@/features/customers/CustomerDetailPage";

import QuotationListPage from "@/features/sales/QuotationListPage";
import QuotationFormPage from "@/features/sales/QuotationFormPage";
import QuotationDetailPage from "@/features/sales/QuotationDetailPage";
import InvoiceListPage from "@/features/sales/InvoiceListPage";
import InvoiceFormPage from "@/features/sales/InvoiceFormPage";
import InvoiceDetailPage from "@/features/sales/InvoiceDetailPage";
import POSPage from "@/features/sales/POSPage";
import CreditNotesPage from "@/features/sales/CreditNotesPage";
import SalesPaymentsPage from "@/features/sales/SalesPaymentsPage";

import SupplierListPage from "@/features/suppliers/SupplierListPage";
import SupplierFormPage from "@/features/suppliers/SupplierFormPage";
import SupplierDetailPage from "@/features/suppliers/SupplierDetailPage";

import POListPage from "@/features/purchases/POListPage";
import POFormPage from "@/features/purchases/POFormPage";
import PODetailPage from "@/features/purchases/PODetailPage";
import GRNListPage from "@/features/purchases/GRNListPage";
import GRNFormPage from "@/features/purchases/GRNFormPage";
import GRNDetailPage from "@/features/purchases/GRNDetailPage";
import SupplierBillsPage from "@/features/purchases/SupplierBillsPage";
import SupplierPaymentsPage from "@/features/purchases/SupplierPaymentsPage";
import SupplierReturnsPage from "@/features/purchases/SupplierReturnsPage";
import VendorCreditsPage from "@/features/purchases/VendorCreditsPage";
import PurchaseExpensesPage from "@/features/purchases/PurchaseExpensesPage";

import TransferListPage from "@/features/transfers/TransferListPage";
import TransferFormPage from "@/features/transfers/TransferFormPage";
import TransferDetailPage from "@/features/transfers/TransferDetailPage";

import ShipmentListPage from "@/features/shipments/ShipmentListPage";
import ShipmentFormPage from "@/features/shipments/ShipmentFormPage";
import ShipmentDetailPage from "@/features/shipments/ShipmentDetailPage";

import EmployeeListPage from "@/features/hrms/EmployeeListPage";
import EmployeeFormPage from "@/features/hrms/EmployeeFormPage";
import EmployeeDetailPage from "@/features/hrms/EmployeeDetailPage";
import AttendancePage from "@/features/hrms/AttendancePage";
import LeavesPage from "@/features/hrms/LeavesPage";
import PayrollPage from "@/features/hrms/PayrollPage";
import PayslipPage from "@/features/hrms/PayslipPage";
import SalaryHistoryPage from "@/features/hrms/SalaryHistoryPage";
import DocumentExpiryPage from "@/features/hrms/DocumentExpiryPage";

import ExpensesPage from "@/features/finance/ExpensesPage";
import ReceivablesPage from "@/features/finance/ReceivablesPage";
import PayablesPage from "@/features/finance/PayablesPage";
import CashRegisterPage from "@/features/finance/CashRegisterPage";
import BankAccountsPage from "@/features/finance/BankAccountsPage";
import LedgerPage from "@/features/finance/LedgerPage";

import ReportsDashboardPage from "@/features/reports/ReportsDashboardPage";
import SalesReportPage from "@/features/reports/SalesReportPage";
import PurchaseReportPage from "@/features/reports/PurchaseReportPage";
import InventoryReportPage from "@/features/reports/InventoryReportPage";
import FinanceReportPage from "@/features/reports/FinanceReportPage";
import HRMSReportPage from "@/features/reports/HRMSReportPage";

import NotificationsPage from "@/features/notifications/NotificationsPage";
import AuditLogsPage from "@/features/auditLogs/AuditLogsPage";
import SettingsPage from "@/features/settings/SettingsPage";
import UserRoleManagementPage from "@/features/settings/UserRoleManagementPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children, allow, permission }) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleCode = user.role?.code || user.role_detail?.code || user.role_code;

  const isSuperUser =
    user.is_superuser === true ||
    roleCode === "ADMIN" ||
    user.role_name === "Super Admin";

  if (allow && !isSuperUser && !allow.includes(roleCode)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permission && !isSuperUser && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

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

            {/* Authenticated routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/modules" replace />} />

              <Route path="/modules" element={<ModuleLandingPage />} />

              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Branches */}
              <Route
                path="/branches"
                element={
                  <ProtectedRoute
                    allow={["ADMIN"]}
                    permission="settings.branches.view"
                  >
                    <BranchListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/new"
                element={
                  <ProtectedRoute
                    allow={["ADMIN"]}
                    permission="settings.branches.create"
                  >
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/:id"
                element={
                  <ProtectedRoute
                    allow={["ADMIN"]}
                    permission="settings.branches.view"
                  >
                    <BranchDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches/:id/edit"
                element={
                  <ProtectedRoute
                    allow={["ADMIN"]}
                    permission="settings.branches.edit"
                  >
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Inventory */}
              <Route
                path="/inventory/categories"
                element={
                  <ProtectedRoute permission="inventory.categories.view">
                    <CategoryListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/brands"
                element={
                  <ProtectedRoute permission="inventory.brands.view">
                    <BrandListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/products"
                element={
                  <ProtectedRoute permission="inventory.products.view">
                    <ProductListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/products/new"
                element={
                  <ProtectedRoute permission="inventory.products.create">
                    <ProductFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/products/:id"
                element={
                  <ProtectedRoute permission="inventory.products.view">
                    <ProductDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/products/:id/edit"
                element={
                  <ProtectedRoute permission="inventory.products.edit">
                    <ProductFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/racks"
                element={
                  <ProtectedRoute permission="inventory.racks.view">
                    <RackListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/racks/new"
                element={
                  <ProtectedRoute permission="inventory.racks.create">
                    <RackFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/racks/:id/edit"
                element={
                  <ProtectedRoute permission="inventory.racks.edit">
                    <RackFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/stock"
                element={
                  <ProtectedRoute permission="inventory.stock.view">
                    <StockPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/low-stock"
                element={
                  <ProtectedRoute permission="inventory.low_stock.view">
                    <LowStockPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/movements"
                element={
                  <ProtectedRoute permission="inventory.movements.view">
                    <StockMovementsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory/adjustments"
                element={
                  <ProtectedRoute permission="inventory.adjustments.view">
                    <StockAdjustmentPage />
                  </ProtectedRoute>
                }
              />

              {/* Customers */}
              <Route
                path="/customers"
                element={
                  <ProtectedRoute permission="sales.customers.view">
                    <CustomerListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers/new"
                element={
                  <ProtectedRoute permission="sales.customers.create">
                    <CustomerFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute permission="sales.customers.view">
                    <CustomerDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers/:id/edit"
                element={
                  <ProtectedRoute permission="sales.customers.edit">
                    <CustomerFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Sales */}
              <Route
                path="/sales/quotations"
                element={
                  <ProtectedRoute permission="sales.quotations.view">
                    <QuotationListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/quotations/new"
                element={
                  <ProtectedRoute permission="sales.quotations.create">
                    <QuotationFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/quotations/:id"
                element={
                  <ProtectedRoute permission="sales.quotations.view">
                    <QuotationDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/quotations/:id/edit"
                element={
                  <ProtectedRoute permission="sales.quotations.edit">
                    <QuotationFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/invoices"
                element={
                  <ProtectedRoute permission="sales.invoices.view">
                    <InvoiceListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/invoices/new"
                element={
                  <ProtectedRoute permission="sales.invoices.create">
                    <InvoiceFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/invoices/:id"
                element={
                  <ProtectedRoute permission="sales.invoices.view">
                    <InvoiceDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/pos"
                element={
                  <ProtectedRoute permission="sales.pos.view">
                    <POSPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/credit-notes"
                element={
                  <ProtectedRoute permission="sales.credit_notes.view">
                    <CreditNotesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales/payments"
                element={
                  <ProtectedRoute permission="sales.payments.view">
                    <SalesPaymentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Suppliers */}
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute permission="purchases.suppliers.view">
                    <SupplierListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/suppliers/new"
                element={
                  <ProtectedRoute permission="purchases.suppliers.create">
                    <SupplierFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/suppliers/:id"
                element={
                  <ProtectedRoute permission="purchases.suppliers.view">
                    <SupplierDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/suppliers/:id/edit"
                element={
                  <ProtectedRoute permission="purchases.suppliers.edit">
                    <SupplierFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Purchases */}
              <Route
                path="/purchases/orders"
                element={
                  <ProtectedRoute permission="purchases.orders.view">
                    <POListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/orders/new"
                element={
                  <ProtectedRoute permission="purchases.orders.create">
                    <POFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/orders/:id"
                element={
                  <ProtectedRoute permission="purchases.orders.view">
                    <PODetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/orders/:id/edit"
                element={
                  <ProtectedRoute permission="purchases.orders.edit">
                    <POFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/grn"
                element={
                  <ProtectedRoute permission="purchases.grn.view">
                    <GRNListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/grn/new"
                element={
                  <ProtectedRoute permission="purchases.grn.create">
                    <GRNFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/grn/:id"
                element={
                  <ProtectedRoute permission="purchases.grn.view">
                    <GRNDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/grn/:id/edit"
                element={
                  <ProtectedRoute permission="purchases.grn.edit">
                    <GRNFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/supplier-bills"
                element={
                  <ProtectedRoute permission="purchases.bills.view">
                    <SupplierBillsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/supplier-payments"
                element={
                  <ProtectedRoute permission="purchases.payments.view">
                    <SupplierPaymentsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/supplier-returns"
                element={
                  <ProtectedRoute permission="purchases.returns.view">
                    <SupplierReturnsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/vendor-credits"
                element={
                  <ProtectedRoute permission="purchases.vendor_credits.view">
                    <VendorCreditsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/purchases/expenses"
                element={
                  <ProtectedRoute permission="purchases.expenses.view">
                    <PurchaseExpensesPage />
                  </ProtectedRoute>
                }
              />

              {/* Transfers */}
              <Route
                path="/transfers"
                element={
                  <ProtectedRoute permission="inventory.transfers.view">
                    <TransferListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/transfers/new"
                element={
                  <ProtectedRoute permission="inventory.transfers.create">
                    <TransferFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/transfers/:id"
                element={
                  <ProtectedRoute permission="inventory.transfers.view">
                    <TransferDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/transfers/:id/edit"
                element={
                  <ProtectedRoute permission="inventory.transfers.edit">
                    <TransferFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Shipments */}
              <Route
                path="/shipments"
                element={
                  <ProtectedRoute permission="purchases.shipments.view">
                    <ShipmentListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shipments/new"
                element={
                  <ProtectedRoute permission="purchases.shipments.create">
                    <ShipmentFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shipments/:id"
                element={
                  <ProtectedRoute permission="purchases.shipments.view">
                    <ShipmentDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shipments/:id/edit"
                element={
                  <ProtectedRoute permission="purchases.shipments.edit">
                    <ShipmentFormPage />
                  </ProtectedRoute>
                }
              />

              {/* HRMS */}
              <Route
                path="/hrms/employees"
                element={
                  <ProtectedRoute permission="hrms.employees.view">
                    <EmployeeListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/employees/new"
                element={
                  <ProtectedRoute permission="hrms.employees.create">
                    <EmployeeFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/employees/:id"
                element={
                  <ProtectedRoute permission="hrms.employees.view">
                    <EmployeeDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/employees/:id/edit"
                element={
                  <ProtectedRoute permission="hrms.employees.edit">
                    <EmployeeFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/attendance"
                element={
                  <ProtectedRoute permission="hrms.attendance.view">
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/leaves"
                element={
                  <ProtectedRoute permission="hrms.leaves.view">
                    <LeavesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/payroll"
                element={
                  <ProtectedRoute permission="hrms.payroll.view">
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/payroll/:id/payslip"
                element={
                  <ProtectedRoute permission="hrms.payroll.view">
                    <PayslipPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/salary-history"
                element={
                  <ProtectedRoute permission="hrms.salary_history.view">
                    <SalaryHistoryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hrms/document-expiry"
                element={
                  <ProtectedRoute permission="hrms.documents.view">
                    <DocumentExpiryPage />
                  </ProtectedRoute>
                }
              />

              {/* Finance */}
              <Route
                path="/finance/expenses"
                element={
                  <ProtectedRoute permission="finance.expenses.view">
                    <ExpensesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/receivables"
                element={
                  <ProtectedRoute permission="finance.receivables.view">
                    <ReceivablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/payables"
                element={
                  <ProtectedRoute permission="finance.payables.view">
                    <PayablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/cash-register"
                element={
                  <ProtectedRoute permission="finance.cash_register.view">
                    <CashRegisterPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/bank-accounts"
                element={
                  <ProtectedRoute permission="finance.bank_accounts.view">
                    <BankAccountsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance/ledger"
                element={
                  <ProtectedRoute permission="finance.ledger.view">
                    <LedgerPage />
                  </ProtectedRoute>
                }
              />

              {/* Reports */}
              <Route
                path="/reports/dashboard"
                element={
                  <ProtectedRoute permission="reports.dashboard.view">
                    <ReportsDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/sales"
                element={
                  <ProtectedRoute permission="reports.sales.view">
                    <SalesReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/purchases"
                element={
                  <ProtectedRoute permission="reports.purchases.view">
                    <PurchaseReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/inventory"
                element={
                  <ProtectedRoute permission="reports.inventory.view">
                    <InventoryReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/finance"
                element={
                  <ProtectedRoute permission="reports.finance.view">
                    <FinanceReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports/hrms"
                element={
                  <ProtectedRoute permission="reports.hrms.view">
                    <HRMSReportPage />
                  </ProtectedRoute>
                }
              />

              {/* Other */}
              <Route path="/notifications" element={<NotificationsPage />} />

              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute
                    allow={["ADMIN"]}
                    permission="settings.audit_logs.view"
                  >
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
