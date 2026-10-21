import {useAuth} from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { purchaseApi } from '../../api/purchaseApi';
import { TextInput, SelectInput, NumberInput } from '../../components/forms/FormControls';
import { X, Receipt, DollarSign, CheckCircle2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export const BillDetailModal = ({ isOpen, bill, onClose, onUpdate }) => {
  const {hasPermission}=useAuth();
  const [currentBill, setCurrentBill] = useState(bill);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Bank Wire');
  const [payRef, setPayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setCurrentBill(bill); }, [bill]);
  if (!isOpen || !currentBill) return null;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (amountNum > currentBill.balance) {
      toast.error(`Payment cannot exceed remaining balance of ${formatCurrency(currentBill.balance)}`);
      return;
    }

    setSubmitting(true);
    try {
      const newPaid = Number(currentBill.paid || 0) + amountNum;
      const newBalance = Math.max(0, Number(currentBill.amount) - newPaid);
      const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

      const updatedBill = {
        ...currentBill,
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
      };

      // Record payment log
      await purchaseApi.recordSupplierPayment({billId: currentBill.id, amount: amountNum, method: payMode, reference: payRef});
      setCurrentBill(updatedBill);
      setIsPaymentOpen(false);
      setPayAmount('');
      toast.success(`Payment of ${formatCurrency(amountNum)} recorded successfully!`);

      if (onUpdate) {
        onUpdate(updatedBill);
      }
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-2xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[var(--primary)]">{currentBill.billNumber}</span>
                <StatusBadge status={currentBill.status} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{currentBill.supplierName}</h2>
            </div>
          </div>

          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Purchase Bill Details Grid (Bill Number, Supplier, Linked PO/GRN, Date, Due Date, Amount, Paid, Balance, Status) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
          <div>
            <span className="text-gray-500 font-medium">Bill Number:</span>
            <p className="font-mono font-bold text-[var(--primary)] text-sm">{currentBill.billNumber}</p>
          </div>

          <div>
            <span className="text-gray-500 font-medium">Linked PO / GRN:</span>
            <p className="font-mono font-bold text-gray-800 bg-gray-200/60 px-2 py-0.5 rounded w-max mt-0.5">
              {currentBill.linkedRef || '—'}
            </p>
          </div>

          <div>
            <span className="text-gray-500 font-medium">Supplier Name:</span>
            <p className="font-bold text-gray-900">{currentBill.supplierName}</p>
          </div>

          <div>
            <span className="text-gray-500 font-medium">Bill Date:</span>
            <p className="font-semibold text-gray-800">{formatDate(currentBill.date)}</p>
          </div>

          <div>
            <span className="text-gray-500 font-medium">Due Date:</span>
            <p className="font-semibold text-rose-700">{formatDate(currentBill.dueDate)}</p>
          </div>

          <div>
            <span className="text-gray-500 font-medium">Account Status:</span>
            <div className="mt-0.5">
              <StatusBadge status={currentBill.status} />
            </div>
          </div>
        </div>

        {/* Financial Balance Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-medium block">Total Bill Amount</span>
            <span className="text-base font-bold text-gray-900">{formatCurrency(currentBill.amount)}</span>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-700 font-semibold block">Total Paid Amount</span>
            <span className="text-base font-bold text-emerald-700">{formatCurrency(currentBill.paid)}</span>
          </div>

          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
            <span className="text-xs text-rose-700 font-semibold block">Balance Due</span>
            <span className="text-base font-bold text-rose-600">{formatCurrency(currentBill.balance)}</span>
          </div>
        </div>

        {/* Record Vendor Payment Form Toggle */}
        {currentBill.balance > 0 && hasPermission(['purchases.bill.pay','finance.payables']) && (
          <div>
            {!isPaymentOpen ? (
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                <span>Record Vendor Payment for this Bill</span>
              </button>
            ) : (
              <form onSubmit={handleRecordPayment} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <h4 className="font-bold text-emerald-900 flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Record Vendor Payment</span>
                  </h4>
                  <span className="text-xs font-semibold text-emerald-700">
                    Max Payable: {formatCurrency(currentBill.balance)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <NumberInput
                    label="Payment Amount (INR)"
                    placeholder={`e.g. ${currentBill.balance}`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    min={1}
                    max={currentBill.balance}
                  />

                  <SelectInput
                    label="Payment Mode"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    options={[
                      { label: 'Bank Wire', value: 'Bank Wire' },
                      { label: 'Cheque', value: 'Cheque' },
                      { label: 'Cash', value: 'Cash' },
                      { label: 'Credit Card', value: 'Credit Card' },
                    ]}
                  />

                  <TextInput
                    label="Bank / Trx Reference"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentOpen(false)}
                    className="px-3 py-1.5 font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs text-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Recording...' : 'Confirm Payment'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
