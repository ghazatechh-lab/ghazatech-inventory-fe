import React from "react";

import FinancialReportsPage from "@/features/finance/FinancialReportsPage";

/*
 * Financial statements live only inside the Reports module.
 * The underlying Finance reporting API/page is reused here so there is a
 * single implementation for Trial Balance, P&L, Balance Sheet, Cash Flow,
 * and Changes in Equity.
 */
export default function FinanceReportPage() {
  return (
    <div className="reports-module-page reports-workspace">
      <FinancialReportsPage />
    </div>
  );
}
