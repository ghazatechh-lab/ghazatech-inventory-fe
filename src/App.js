/** GHAZA COMPUTER ERP — Root Application */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import BranchListPage from "@/features/branches/BranchListPage";
import BranchFormPage from "@/features/branches/BranchFormPage";
import BranchDetailPage from "@/features/branches/BranchDetailPage";

import ProductListPage from "@/features/inventory/ProductListPage";
import ProductFormPage from "@/features/inventory/ProductFormPage";
import ProductDetailPage from "@/features/inventory/ProductDetailPage";
import BrandListPage from "@/features/inventory/BrandListPage";
import CategoryListPage from "@/features/inventory/CategoryListPage";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children, allow }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleCode = user.role?.code || user.role_detail?.code || user.role_code;

  const isSuperUser =
    user.is_superuser === true ||
    roleCode === "ADMIN" ||
    user.role_name === "Super Admin";

  console.log("User:", user);
  console.log("Role code:", roleCode);
  console.log("Allowed roles:", allow);

  if (allow && !isSuperUser && !allow.includes(roleCode)) {
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route
                path="/branches"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BranchListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/branches/new"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/branches/:id"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BranchDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/branches/:id/edit"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BranchFormPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/inventory/products" element={<ProductListPage />} />
              <Route
                path="/inventory/brands"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BrandListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/categories"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <CategoryListPage />
                  </ProtectedRoute>
                }
              />
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

              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/new" element={<CustomerFormPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route
                path="/customers/:id/edit"
                element={<CustomerFormPage />}
              />

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
              <Route path="/sales/invoices" element={<InvoiceListPage />} />
              <Route path="/sales/invoices/new" element={<InvoiceFormPage />} />
              <Route
                path="/sales/invoices/:id"
                element={<InvoiceDetailPage />}
              />
              <Route path="/sales/pos" element={<POSPage />} />
              <Route path="/sales/credit-notes" element={<CreditNotesPage />} />
              <Route path="/sales/payments" element={<SalesPaymentsPage />} />

              <Route path="/suppliers" element={<SupplierListPage />} />
              <Route path="/suppliers/new" element={<SupplierFormPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/purchases/orders" element={<POListPage />} />
              <Route path="/purchases/orders/new" element={<POFormPage />} />
              <Route path="/purchases/orders/:id" element={<PODetailPage />} />
              <Route path="/purchases/grn" element={<GRNListPage />} />
              <Route path="/purchases/grn/new" element={<GRNFormPage />} />
              <Route path="/purchases/grn/:id" element={<GRNDetailPage />} />
              <Route
                path="/purchases/supplier-bills"
                element={<SupplierBillsPage />}
              />
              <Route
                path="/purchases/supplier-payments"
                element={<SupplierPaymentsPage />}
              />
              <Route
                path="/purchases/supplier-returns"
                element={<SupplierReturnsPage />}
              />

              <Route path="/transfers" element={<TransferListPage />} />
              <Route path="/transfers/new" element={<TransferFormPage />} />
              <Route path="/transfers/:id" element={<TransferDetailPage />} />

              <Route path="/shipments" element={<ShipmentListPage />} />
              <Route path="/shipments/new" element={<ShipmentFormPage />} />
              <Route path="/shipments/:id" element={<ShipmentDetailPage />} />

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
                path="/hrms/document-expiry"
                element={<DocumentExpiryPage />}
              />

              <Route
                path="/finance/expenses"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <ExpensesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/receivables"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <ReceivablesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/payables"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <PayablesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/cash-register"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <CashRegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/bank-accounts"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <BankAccountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/ledger"
                element={
                  <ProtectedRoute allow={["ADMIN", "BM"]}>
                    <LedgerPage />
                  </ProtectedRoute>
                }
              />

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

              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allow={["ADMIN"]}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
