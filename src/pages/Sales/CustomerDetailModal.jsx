import React, { useEffect, useState } from 'react';
import { customerApi } from '../../api/customerApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { User, Phone, Mail, ShoppingBag, CreditCard, RotateCcw, X } from 'lucide-react';

export const CustomerDetailModal = ({ isOpen, customerId, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerDetails();
    }
  }, [isOpen, customerId]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getCustomerDetail(customerId);
      setCustomer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full p-6   my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-[var(--primary)] flex items-center justify-center font-bold text-lg border border-amber-200">
              {customer?.name ? customer.name.charAt(0) : 'C'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <span>{loading ? 'Loading Customer Details...' : customer?.name}</span>
                {customer?.outstanding === 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                    Clear Credit Account
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Customer ID: {customerId} • Phone: {customer?.mobile || 'N/A'}
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Fetching customer account ledger...</div>
        ) : (
          <div>
            {/* Tabs (Section 12A: Overview, Purchase History, Payments, Returns) */}
            <div className="flex space-x-2 border-b border-gray-200 mb-6">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'purchases', label: 'Purchase History', icon: ShoppingBag, count: customer?.invoices?.length || 0 },
                { id: 'payments', label: 'Payments', icon: CreditCard, count: customer?.payments?.length || 0 },
                { id: 'returns', label: 'Returns', icon: RotateCcw, count: customer?.returns?.length || 0 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 py-2.5 px-4 font-bold text-xs border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-[var(--primary)] text-[var(--primary)]'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 text-xs">
                {/* Metric Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60">
                    <p className="text-gray-500 font-medium">Total Purchases</p>
                    <p className="text-xl font-bold text-[var(--primary)] mt-1">{formatCurrency(customer?.totalPurchases || 0)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500 font-medium">Outstanding Balance</p>
                    <p className={`text-xl font-bold mt-1 ${customer?.outstanding > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {formatCurrency(customer?.outstanding || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500 font-medium">Last Purchase Date</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(customer?.lastPurchase)}</p>
                  </div>
                </div>

                {/* Contact & Store Account Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="erp-panel p-4    space-y-3">
                    <h4 className="font-bold text-gray-900 text-xs border-b border-gray-200 pb-2">Contact Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-700">
                        <User className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="font-semibold">{customer?.name}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Phone className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="font-mono">{customer?.mobile}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Mail className="w-4 h-4 text-gray-500 mr-2" />
                        <span>{customer?.email || 'No email registered'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="erp-panel p-4    space-y-3">
                    <h4 className="font-bold text-gray-900 text-xs border-b border-gray-200 pb-2">Store Account Terms</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Type:</span>
                        <span className="font-bold text-gray-900">Retail VIP Customer</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Store Credit Limit:</span>
                        <span className="font-bold text-gray-900">₹10,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Allowed Payment Modes:</span>
                        <span className="font-semibold text-emerald-700">Cash, Card, UPI, Credit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PURCHASE HISTORY */}
            {activeTab === 'purchases' && (
              <div className="overflow-x-auto text-xs">
                {(!customer?.invoices || customer.invoices.length === 0) ? (
                  <p className="text-center py-8 text-gray-500">No invoice records for this customer yet.</p>
                ) : (
                  <table className="erp-table w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                        <th className="py-2.5 px-3">Invoice No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customer.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[var(--primary)]">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(inv.date, true)}</td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium">{inv.branchName}</td>
                          <td className="py-2.5 px-3 font-bold">{inv.qty} pcs</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-700">{inv.paymentMethod}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={inv.paymentStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 3: PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="overflow-x-auto text-xs">
                {(!customer?.payments || customer.payments.length === 0) ? (
                  <p className="text-center py-8 text-gray-500">No payment records found.</p>
                ) : (
                  <table className="erp-table w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                        <th className="py-2.5 px-3">Payment ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice Ref</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customer.payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono text-gray-700">{pay.id}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(pay.date, true)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[var(--primary)]">{pay.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800">{pay.method}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(pay.amount)}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={pay.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 4: RETURNS */}
            {activeTab === 'returns' && (
              <div className="overflow-x-auto text-xs">
                {(!customer?.returns || customer.returns.length === 0) ? (
                  <p className="text-center py-8 text-gray-500">No sales return history for this customer.</p>
                ) : (
                  <table className="erp-table w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                        <th className="py-2.5 px-3">Return Ref</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3 text-right">Refund Amount</th>
                        <th className="py-2.5 px-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customer.returns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-600">{ret.returnRef}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(ret.date, true)}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{ret.productName}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{ret.qty}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              ret.condition === 'Sellable' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              ret.condition === 'Damaged' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {ret.condition}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatCurrency(ret.refundAmount)}</td>
                          <td className="py-2.5 px-3 text-gray-500 italic max-w-xs truncate">{ret.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
