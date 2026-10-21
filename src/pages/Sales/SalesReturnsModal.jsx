import React, { useState } from 'react';
import { SelectInput, NumberInput, TextInput } from '../../components/forms/FormControls';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { salesApi } from '../../api/salesApi';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export const SalesReturnsModal = ({ isOpen, invoice, onClose, onSuccess }) => {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState('Sellable');
  const [reason, setReason] = useState('Customer exchange request');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !invoice) return null;

  const currentItem = invoice.items?.[selectedItemIndex] || invoice.items?.[0] || { productName: 'Perfume Product', total: 549, qty: 1 };
  const refundAmount = (currentItem.total / currentItem.qty) * Number(qty);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Return reason is mandatory');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmedReturn = async () => {
    setLoading(true);
    try {
      const res = await salesApi.createReturn({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        productName: currentItem.productName,
        sku: currentItem.sku,
        qty: Number(qty),
        condition,
        reason,
        refundMethod,
        refundAmount,
      });

      toast.success(`Sales Return confirmed! Return Ref: ${res.data.returnRef}`);
      onSuccess();
    } catch {
      toast.error('Failed to process sales return');
    } finally {
      setLoading(false);
      setIsConfirming(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="erp-panel   max-w-lg w-full p-6  ">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Process Sales Return</h3>
                <p className="text-xs font-mono text-[var(--primary)]">{invoice.invoiceNumber} • {invoice.customerName}</p>
              </div>
            </div>
            <button aria-label="Close dialog" onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 12A Critical Rule Callout Box */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs text-amber-900 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">Critical Rule (Section 12A):</p>
              <p className="text-xs leading-relaxed mt-0.5 text-amber-900/90">
                Returns record a refund and restore sellable stock. Damaged items remain excluded from available stock.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <SelectInput
              label="1. Select Invoice Line Item to Return"
              value={selectedItemIndex}
              onChange={(e) => setSelectedItemIndex(Number(e.target.value))}
              options={(invoice.items || []).map((item, idx) => ({
                value: idx,
                label: `${item.productName} (${item.qty} purchased @ ₹${item.rate})`,
              }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="2. Quantity to Return"
                required
                min="1"
                max={currentItem.qty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <SelectInput
                label="3. Product Condition"
                required
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                options={[
                  { value: 'Sellable', label: 'Sellable (Restock to Branch)' },
                  { value: 'Damaged', label: 'Damaged (Write Off)' },
                  { value: 'Quarantine', label: 'Quarantine (Lab Inspection)' },
                ]}
              />
            </div>

            <TextInput
              label="4. Mandatory Return Reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scent preference mismatch, nozzle defect, size exchange"
            />

            <SelectInput
              label="5. Refund Method"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              options={['Cash', 'UPI', 'Store Credit', 'Card']}
            />

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center font-bold text-rose-900">
              <span>Calculated Refund Amount:</span>
              <span className="text-base text-rose-700 font-mono">{formatCurrency(refundAmount)}</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors">
                Review & Confirm Return
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirming}
        title="Confirm Stock & Financial Adjustment?"
        message={`Are you sure you want to return ${qty} bottle(s) of "${currentItem.productName}" under condition "${condition}" for ${formatCurrency(refundAmount)}? This will initiate backend stock/financial updates.`}
        confirmLabel="Confirm Return & Issue Refund"
        isDanger
        loading={loading}
        onConfirm={handleConfirmedReturn}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
};
