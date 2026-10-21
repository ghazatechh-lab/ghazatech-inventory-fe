import React, { useState, useEffect } from 'react';
import { purchaseApi } from '../../api/purchaseApi';
import { TextInput, SelectInput, DateInput } from '../../components/forms/FormControls';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { X, PackageCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const CreateGRNModal = ({ isOpen, onClose, onSuccess }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPo, setSelectedPo] = useState(null);

  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPurchaseOrders();
    }
  }, [isOpen]);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await purchaseApi.getPurchaseOrders();
      const pos = res.data || [];
      setPurchaseOrders(pos);
      if (pos.length > 0) {
        handlePoSelect(pos[0].id, pos);
      }
    } catch {
      toast.error('Failed to load purchase orders for GRN');
    }
  };

  const handlePoSelect = (poId, poList = purchaseOrders) => {
    setSelectedPoId(poId);
    const po = poList.find((p) => p.id === poId);
    setSelectedPo(po);

    if (po && po.items) {
      const formattedItems = po.items.map((item) => ({
        material: item.material,
        orderedQty: Number(item.orderedQty || item.qty || 0),
        prevReceived: Number(item.prevReceived || 0),
        currentReceived: Number(item.orderedQty || item.qty || 0) - Number(item.prevReceived || 0),
        acceptedQty: Number(item.orderedQty || item.qty || 0) - Number(item.prevReceived || 0),
        rejectedQty: 0,
        unitCost: Number(item.rate || 0),
      }));
      setGrnItems(formattedItems);
    } else {
      setGrnItems([]);
    }
  };

  const updateGrnItem = (idx, field, val) => {
    const next = [...grnItems];
    const numVal = Math.max(0, Number(val));
    next[idx][field] = numVal;

    if (field === 'currentReceived') {
      // Auto default accepted to current received
      next[idx].acceptedQty = Math.max(0, numVal - next[idx].rejectedQty);
    } else if (field === 'rejectedQty') {
      next[idx].acceptedQty = Math.max(0, next[idx].currentReceived - numVal);
    }

    setGrnItems(next);
  };

  if (!isOpen) return null;

  // Determine if this is a partial receipt or full receipt
  const isPartial = grnItems.some(
    (item) => item.prevReceived + item.currentReceived < item.orderedQty
  );
  const grnStatus = isPartial ? 'Partial Receipt' : 'Completed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPo) {
      toast.error('Please select a purchase order');
      return;
    }
    if (!receiveDate) {
      toast.error('Stock receive date is required');
      return;
    }
    if (!deliveryNoteNo || !deliveryNoteNo.trim()) {
      toast.error('Vendor delivery note / invoice reference is required');
      return;
    }

    setSubmitting(true);
    try {
      const grnData = {
        poNumber: selectedPo.poNumber,
        supplierName: selectedPo.supplierName,
        warehouseName: selectedPo.warehouseName || '—',
        receiveDate,
        deliveryNoteNo,
        status: grnStatus,
        items: grnItems,
      };

      await purchaseApi.createGoodsReceipt(grnData);
      toast.success(`Goods Receipt ${grnStatus === 'Partial Receipt' ? '(Partial)' : '(Full)'} created successfully!`);
      onSuccess();
    } catch {
      toast.error('Failed to create goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-50 rounded-xl text-[var(--primary)]">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Create Goods Receipt (GRN)</h3>
              <p className="text-xs text-gray-500">Record incoming stock inspection & partial deliveries against PO</p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 3 PO Selector & Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
            <SelectInput
              label="Start from Purchase Order (PO)"
              value={selectedPoId}
              onChange={(e) => handlePoSelect(e.target.value)}
              options={purchaseOrders.map((p) => ({
                label: `${p.poNumber} - ${p.supplierName} (${formatCurrency(p.grandTotal)})`,
                value: p.id,
              }))}
              required
            />

            <DateInput
              label="Receive Date"
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              required
            />

            <TextInput
              label="Delivery Note / Invoice Ref"
              placeholder="e.g. DN-88492"
              value={deliveryNoteNo}
              onChange={(e) => setDeliveryNoteNo(e.target.value)}
            />
          </div>

          {selectedPo && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
              <div>
                <span className="font-semibold text-gray-700">Supplier: </span>
                <span className="font-bold text-gray-900">{selectedPo.supplierName}</span>
              </div>
              <div>
                <span className="semibold text-gray-700">Receiving Warehouse: </span>
                <span className="font-bold text-gray-900">{selectedPo.warehouseName || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Receipt Status: </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    isPartial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {grnStatus}
                </span>
              </div>
            </div>
          )}

          {/* Section 3 Inspection Table: ordered quantity, previously received, current receive quantity, accepted quantity, rejected quantity and unit cost */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              GRN Received Stock Inspection Table
            </h4>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="erp-table w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                    <th className="p-3">Material Item</th>
                    <th className="p-3 text-center">Ordered Qty</th>
                    <th className="p-3 text-center">Previously Recv</th>
                    <th className="p-3 text-center w-28 bg-amber-50/40">Current Recv Qty</th>
                    <th className="p-3 text-center w-28 bg-emerald-50/40">Accepted Qty</th>
                    <th className="p-3 text-center w-24 bg-rose-50/40">Rejected Qty</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Accepted Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grnItems.map((item, idx) => {
                    const acceptedValue = item.acceptedQty * item.unitCost;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold text-gray-900">{item.material}</td>
                        <td className="p-3 text-center font-semibold text-gray-600">
                          {formatNumber(item.orderedQty)}
                        </td>
                        <td className="p-3 text-center font-semibold text-gray-500">
                          {formatNumber(item.prevReceived)}
                        </td>
                        <td className="p-2 bg-amber-50/20">
                          <input
                            type="number"
                            min="0"
                            value={item.currentReceived}
                            onChange={(e) => updateGrnItem(idx, 'currentReceived', e.target.value)}
                            className="w-full px-2 py-1 text-center font-bold text-gray-900 border border-amber-300 rounded focus:outline-none"
                          />
                        </td>
                        <td className="p-2 bg-emerald-50/20">
                          <input
                            type="number"
                            min="0"
                            value={item.acceptedQty}
                            onChange={(e) => updateGrnItem(idx, 'acceptedQty', e.target.value)}
                            className="w-full px-2 py-1 text-center font-bold text-emerald-700 border border-emerald-300 rounded focus:outline-none"
                          />
                        </td>
                        <td className="p-2 bg-rose-50/20">
                          <input
                            type="number"
                            min="0"
                            value={item.rejectedQty}
                            onChange={(e) => updateGrnItem(idx, 'rejectedQty', e.target.value)}
                            className="w-full px-2 py-1 text-center font-bold text-rose-600 border border-rose-300 rounded focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-right font-mono text-gray-700">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          {formatCurrency(acceptedValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500 italic">
              * Accepted stock will be automatically added to inventory stock levels.
            </span>

            <div className="flex space-x-2">
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
                <span>{submitting ? 'Processing...' : 'Confirm Goods Receipt'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
