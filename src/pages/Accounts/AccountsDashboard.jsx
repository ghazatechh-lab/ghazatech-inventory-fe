import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { financeApi } from '../../api/financeApi';
import { formatCurrency } from '../../utils/formatters';
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await financeApi.getSummary();
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && !summary) return <div className="p-6 text-center text-gray-500">Unable to load this record. Check your permissions and backend connection.</div>;
  if (loading) {
    return <div className="py-12 text-center text-xs text-gray-500">Loading accounts dashboard overview...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Accounts Dashboard"
        subtitle="Practical business accounting visibility: Cash & Bank balances, Income, Expenses, Receivables & Payables"
      />

      <div className="grid sm:grid-cols-2 gap-4 mb-6"><section className="erp-panel p-5"><h2>Payroll liability</h2><p className="text-2xl font-semibold mt-3">{formatCurrency(summary.payrollLiability||0)}</p><p className="text-xs text-gray-500 mt-2">Approved salary awaiting payment</p></section><section className="erp-panel p-5"><h2>Employee advance receivable</h2><p className="text-2xl font-semibold mt-3">{formatCurrency(summary.advanceReceivable||0)}</p><p className="text-xs text-gray-500 mt-2">Disbursed advances less payroll recoveries</p></section></div>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => navigate('/accounts/cash-bank')}
          className="erp-panel  p-5    hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cash Balance</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-[var(--primary)]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.cashBalance)}</div>
          <span className="text-xs text-gray-500">Petty Cash & Branch POS Registers</span>
        </div>

        <div
          onClick={() => navigate('/accounts/cash-bank')}
          className="erp-panel  p-5    hover:border-blue-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Balance</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(summary.bankBalance)}</div>
          <span className="text-xs text-gray-500">Primary Commercial Bank Account</span>
        </div>

        <div
          onClick={() => navigate('/accounts/income')}
          className="erp-panel  p-5    hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Income</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(summary.todayIncome)}</div>
          <span className="text-xs text-emerald-600 font-medium">Sales Receipts & Customer Inflows</span>
        </div>

        <div
          onClick={() => navigate('/accounts/expenses')}
          className="erp-panel  p-5    hover:border-rose-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Expenses</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(summary.todayExpenses)}</div>
          <span className="text-xs text-rose-500 font-medium">Operating Overheads & Utilities</span>
        </div>

        <div
          onClick={() => navigate('/accounts/receivables')}
          className="erp-panel  p-5    hover:border-purple-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Receivables</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-2">{formatCurrency(summary.receivables)}</div>
          <span className="text-xs text-purple-600 font-medium">Outstanding Customer Invoices</span>
        </div>

        <div
          onClick={() => navigate('/accounts/payables')}
          className="erp-panel  p-5    hover:border-rose-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payables</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{formatCurrency(summary.payables)}</div>
          <span className="text-xs text-rose-600 font-medium">Vendor & Supplier Unpaid Bills</span>
        </div>
      </div>

      {/* Business Accounting Position Summary */}
      <div className="erp-panel p-6    space-y-4 mb-6">
        <h3 className="text-base font-bold text-gray-900">PerfumASol Financial Position Overview</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Basic Accounts provides live visibility across store liquidity, pending supplier dues, open retail receivables, and daily operating expenditures. All balances are verified directly against backend ledger records.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-bold text-gray-900">Total Liquid Funds Available</p>
            <p className="text-lg font-bold text-[var(--primary)] mt-1">{formatCurrency((summary.cashBalance || 0) + (summary.bankBalance || 0))}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-bold text-gray-900">Net Working Capital Balance</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency((summary.cashBalance || 0) + (summary.bankBalance || 0) + (summary.receivables || 0) - (summary.payables || 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Authoritative Financial Balance Callout Banner */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="font-semibold leading-relaxed">
          <span className="font-bold">Posted balances:</span> Balances reflect posted receipts, payments, refunds and expenses. Correct an originating document or record a settlement to change its balance.
        </p>
      </div>
    </div>
  );
};
