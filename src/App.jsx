const PerfumeCatalogue=lazy(()=>import("./pages/Sales/ProductRecipe").then(m=>({default:m.PerfumeCatalogue})));
const PerfumeForm=lazy(()=>import("./pages/Sales/ProductRecipe").then(m=>({default:m.PerfumeForm})));
const PerfumeDetails=lazy(()=>import("./pages/Sales/ProductRecipe").then(m=>({default:m.PerfumeDetails})));
const Offers=lazy(()=>import("./pages/Sales/Offers"));
const DirectPOS=lazy(()=>import("./pages/Sales/DirectPOS"));
const HRMSWorkspace=lazy(()=>import('./pages/HRMS/HRMSWorkspace').then(m=>({default:m.HRMSWorkspace})));
const AccessAdmin=lazy(()=>import('./pages/HRMS/AccessAdmin').then(m=>({default:m.AccessAdmin})));
const CategoryList=lazy(()=>import("./pages/Inventory/CategoryList").then(module=>({default:module.CategoryList})));
const BottleSetup=lazy(()=>import("./pages/Workflow/InventoryWorkflow").then(module=>({default:module.BottleSetup})));
import React,{Suspense,lazy} from "react";
import {LoadingSkeleton} from "./components/common/StatCard";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";

// Pages
const ResetPassword=lazy(()=>import("./pages/Auth/ResetPassword").then(module=>({default:module.ResetPassword})));
const Login=lazy(()=>import("./pages/Auth/Login").then(module=>({default:module.Login})));
const DashboardView=lazy(()=>import("./pages/Dashboard/DashboardView").then(module=>({default:module.DashboardView})));
const WarehouseList=lazy(()=>import("./pages/Warehouses/WarehouseList").then(module=>({default:module.WarehouseList})));
const BranchList=lazy(()=>import("./pages/Branches/BranchList").then(module=>({default:module.BranchList})));
const RawMaterialsList=lazy(()=>import("./pages/Inventory/RawMaterialsList").then(module=>({default:module.RawMaterialsList})));
const StockOverview=lazy(()=>import("./pages/Inventory/StockOverview").then(module=>({default:module.StockOverview})));
const StockMovements=lazy(()=>import("./pages/Inventory/StockMovements").then(module=>({default:module.StockMovements})));
const StockAdjustments=lazy(()=>import("./pages/Inventory/StockAdjustments").then(module=>({default:module.StockAdjustments})));
const WastageList=lazy(()=>import("./pages/Inventory/WastageList").then(module=>({default:module.WastageList})));
const LowStockList=lazy(()=>import("./pages/Inventory/LowStockList").then(module=>({default:module.LowStockList})));
const SupplierList=lazy(()=>import("./pages/Purchases/SupplierList").then(module=>({default:module.SupplierList})));
const PurchaseOrderList=lazy(()=>import("./pages/Purchases/PurchaseOrderList").then(module=>({default:module.PurchaseOrderList})));
const CreatePurchaseOrder=lazy(()=>import("./pages/Purchases/CreatePurchaseOrder").then(module=>({default:module.CreatePurchaseOrder})));
const GoodsReceiptList=lazy(()=>import("./pages/Purchases/GoodsReceiptList").then(module=>({default:module.GoodsReceiptList})));
const PurchaseBillsList=lazy(()=>import("./pages/Purchases/PurchaseBillsList").then(module=>({default:module.PurchaseBillsList})));
const PurchaseReturnsList=lazy(()=>import("./pages/Purchases/PurchaseReturnsList").then(module=>({default:module.PurchaseReturnsList})));
const FragranceMaster=lazy(()=>import("./pages/Production/FragranceMaster").then(module=>({default:module.FragranceMaster})));
const StockTransferList=lazy(()=>import("./pages/Transfers/StockTransferList").then(module=>({default:module.StockTransferList})));
const CreateStockTransfer=lazy(()=>import("./pages/Transfers/CreateStockTransfer").then(module=>({default:module.CreateStockTransfer})));
const StockTransferDetail=lazy(()=>import("./pages/Transfers/StockTransferDetail").then(module=>({default:module.StockTransferDetail})));
const InvoiceList=lazy(()=>import("./pages/Sales/InvoiceList").then(module=>({default:module.InvoiceList})));
const CustomerList=lazy(()=>import("./pages/Sales/CustomerList").then(module=>({default:module.CustomerList})));
const AccountsDashboard=lazy(()=>import("./pages/Accounts/AccountsDashboard").then(module=>({default:module.AccountsDashboard})));
const CashBankView=lazy(()=>import("./pages/Accounts/CashBankView").then(module=>({default:module.CashBankView})));
const IncomeList=lazy(()=>import("./pages/Accounts/IncomeList").then(module=>({default:module.IncomeList})));
const ExpensesList=lazy(()=>import("./pages/Accounts/ExpensesList").then(module=>({default:module.ExpensesList})));
const ReceivablesList=lazy(()=>import("./pages/Accounts/ReceivablesList").then(module=>({default:module.ReceivablesList})));
const PayablesList=lazy(()=>import("./pages/Accounts/PayablesList").then(module=>({default:module.PayablesList})));
const ReportCenter=lazy(()=>import("./pages/Reports/ReportCenter").then(module=>({default:module.ReportCenter})));
const ProfileView=lazy(()=>import("./pages/Settings/ProfileView").then(module=>({default:module.ProfileView})));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { user, initializing } = useAuth();
  if (initializing)
    return <div className="p-6 text-center">Checking session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Suspense fallback={<div className="p-6"><LoadingSkeleton label="Loading workspace"/></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardView />} />

            <Route path="hrms/dashboard" element={<Navigate to="/dashboard" replace/>}/>
            <Route path="hrms/:section" element={<HRMSWorkspace/>}/>
            <Route path="administration/:accessSection" element={<AccessAdmin/>}/>
            {/* Warehouses & Branches */}
            <Route path="warehouses" element={<WarehouseList />} />
            <Route path="branches" element={<BranchList />} />

            {/* Inventory */}
            <Route
              path="inventory/categories" element={<CategoryList />} />
            <Route path="inventory/raw-materials"
              element={<RawMaterialsList />}
            />
            <Route path="inventory/overview" element={<StockOverview />} />
            <Route path="inventory/movements" element={<StockMovements />} />
            <Route
              path="inventory/adjustments"
              element={<StockAdjustments />}
            />
            <Route path="inventory/wastage" element={<WastageList />} />
            <Route path="inventory/low-stock" element={<LowStockList />} />

            {/* Purchases */}
            <Route path="suppliers" element={<SupplierList />} />
            <Route path="purchases/orders" element={<PurchaseOrderList />} />
            <Route
              path="purchases/orders/create"
              element={<CreatePurchaseOrder />}
            />
            <Route path="purchases/grn" element={<GoodsReceiptList />} />
            <Route path="purchases/bills" element={<PurchaseBillsList />} />
            <Route path="purchases/returns" element={<PurchaseReturnsList />} />

            <Route path="inventory/fragrances" element={<FragranceMaster />} />
            <Route
              path="inventory/formulations"
              element={<Navigate to="/inventory/products" replace />}
            />
            <Route path="inventory/products" element={<PerfumeCatalogue />} />
            <Route
              path="inventory/products/create"
              element={<PerfumeForm />}
            />
            <Route
              path="inventory/products/:id/edit"
              element={<PerfumeForm />}
            />
            <Route
              path="inventory/products/:id"
              element={<PerfumeDetails />}
            />
            <Route path="inventory/bottle-setup" element={<BottleSetup />} />
            <Route
              path="production/fragrances"
              element={<Navigate to="/inventory/fragrances" replace />}
            />
            <Route
              path="production/formulations/*"
              element={<Navigate to="/inventory/formulations" replace />}
            />
            <Route
              path="production/concentrations"
              element={<Navigate to="/inventory/bottle-setup" replace />}
            />
            <Route
              path="production/bottle-sizes"
              element={<Navigate to="/inventory/bottle-setup" replace />}
            />
            <Route
              path="production/batches/*"
              element={<Navigate to="/inventory/products" replace />}
            />
            <Route
              path="products/*"
              element={<Navigate to="/inventory/products" replace />}
            />

            {/* Transfers */}
            <Route path="transfers" element={<StockTransferList />} />
            <Route path="transfers/create" element={<CreateStockTransfer />} />
            <Route path="transfers/:id" element={<StockTransferDetail />} />

            {/* Sales */}
            <Route path="sales/pos" element={<DirectPOS />} />
            <Route path="sales/offers" element={<Offers />} />
            <Route path="sales/invoices" element={<InvoiceList />} />
            <Route path="sales/customers" element={<CustomerList />} />

            {/* Accounts */}
            <Route path="accounts/dashboard" element={<AccountsDashboard />} />
            <Route path="accounts/cash-bank" element={<CashBankView />} />
            <Route path="accounts/income" element={<IncomeList />} />
            <Route path="accounts/expenses" element={<ExpensesList />} />
            <Route path="accounts/receivables" element={<ReceivablesList />} />
            <Route path="accounts/payables" element={<PayablesList />} />

            {/* Reports */}
            <Route path="reports" element={<ReportCenter />} />

            {/* Settings */}
            <Route path="settings/profile" element={<ProfileView />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
