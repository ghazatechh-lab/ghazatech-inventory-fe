import React, { useState, useEffect } from 'react';
import { purchaseApi } from '../../api/purchaseApi';
import { supplierApi } from '../../api/supplierApi';
import { TextInput, SelectInput, DateInput, NumberInput } from '../../components/forms/FormControls';

import { X, Receipt, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const CreateBillModal = ({ isOpen, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);

  const [supplierInvoiceNo,setSupplierInvoiceNo]=useState('');
  const [billNumber, setBillNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [linkedRef, setLinkedRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        supplierApi.getSuppliers(),
        purchaseApi.getPurchaseOrders(),
      ]);
      setSuppliers(sRes.data || []);
      if (sRes.data?.length) setSupplierName(sRes.data[0].name);
      if (pRes.data?.length) setLinkedRef(pRes.data[0].poNumber);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName || !supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!linkedRef || !linkedRef.trim()) {
      toast.error('Linked PO/GRN reference is required');
      return;
    }
    if (!date) {
      toast.error('Bill date is required');
      return;
    }
    if (!dueDate) {
      toast.error('Payment due date is required');
      return;
    }
    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount <= 0) {
      toast.error('Please enter a valid bill total amount');
      return;
    }

    setSubmitting(true);
    try {
      const paidAmt = Number(paid || 0);
      const balanceAmt = Math.max(0, totalAmount - paidAmt);
      const statusStr = balanceAmt === 0 ? 'Paid' : paidAmt > 0 ? 'Partially Paid' : 'Unpaid';

      const billData = {
        supplierInvoiceNo,
        supplierName,
        linkedRef,
        date,
        dueDate,
        amount: totalAmount,
        paid: paidAmt,
        balance: balanceAmt,
        status: statusStr,
      };

      await purchaseApi.createPurchaseBill(billData);
      toast.success('Purchase Bill created successfully!');
      onSuccess();
    } catch {
      toast.error('Failed to create purchase bill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-lg w-full p-6  space-y-4 ">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-bold text-gray-900 text-lg">Record Purchase Bill / Vendor Invoice</h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Bill Number" value={billNumber} readOnly placeholder="Auto-generated on Save"/><TextInput label="Supplier Invoice Number (Optional)" value={supplierInvoiceNo} onChange={e=>setSupplierInvoiceNo(e.target.value)}/>
            <SelectInput
              label="Supplier"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              options={[{label:'Select a supplier',value:''},...suppliers.map(s => ({label:s.name,value:s.name}))]}
              required
            />
          </div>

          <TextInput
            label="Linked PO / GRN Reference"
            placeholder="e.g. PO-2026-045 / GRN-2026-033"
            value={linkedRef}
            onChange={(e) => setLinkedRef(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <DateInput label="Bill Date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <DateInput label="Due Date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Total Bill Amount (INR)"
              placeholder="e.g. 250000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={1}
            />
            <NumberInput
              label="Initial Amount Paid (INR)"
              placeholder="e.g. 0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              min={0}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Save Purchase Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
