import React, { useState, useEffect } from 'react';

import { formatCurrency, formatDate } from '../../utils/formatters';
import { purchaseApi } from '../../api/purchaseApi';
import { TextInput, SelectInput, NumberInput, TextArea } from '../../components/forms/FormControls';
import { toast } from 'sonner';
import {
  X,
  RotateCcw,
  Building2,
  Warehouse,
  Edit3,
  Save,
  PackageMinus,
  TrendingDown,
  Receipt
} from 'lucide-react';

export const ReturnDetailModal = ({ isOpen, returnItem, onClose, onUpdate, initialEdit = false }) => {
  const [currentReturn, setCurrentReturn] = useState(returnItem);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form Fields
  const [supplierName, setSupplierName] = useState('');
  const [linkedRef, setLinkedRef] = useState('');
  const [material, setMaterial] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState(15);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Debit Note Issued');

  useEffect(() => {
    if (returnItem) {
      setCurrentReturn(returnItem);
      resetEditForm(returnItem);
      setIsEditing(initialEdit);
    }
  }, [returnItem, initialEdit]);

  const resetEditForm = (item) => {
    setSupplierName(item.supplierName || '');
    setLinkedRef(item.linkedRef || '—');
    setMaterial(item.material || item.item || '');
    setQty(item.qty ?? 0);
    setUnit(item.unit || 'pcs');
    setUnitCost(item.unitCost ?? 0);
    setReason(item.reason || '');
    setStatus(item.status || 'Debit Note Issued');
  };

  if (!isOpen || !currentReturn) return null;

  const totalReturnCost = Number(qty || 0) * Number(unitCost || 0);
  const liveInventoryImpact = currentReturn.inventoryImpact;

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!supplierName || !supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!linkedRef || !linkedRef.trim()) {
      toast.error('Linked GRN reference is required');
      return;
    }
    if (!material || !material.trim()) {
      toast.error('Material item is required');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast.error('Please enter a valid return quantity');
      return;
    }
    if (unitCost === '' || unitCost === null || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
      toast.error('Valid unit cost is required');
      return;
    }
    if (!reason || !reason.trim()) {
      toast.error('Mandatory return reason is required');
      return;
    }

    setIsSaving(true);
    try {
      const _updatedData = {
        ...currentReturn,
        supplierName: supplierName.trim(),
        linkedRef: linkedRef.trim(),
        material: material.trim(),
        qty: Number(qty),
        unit,
        unitCost: Number(unitCost),
        totalAmount: totalReturnCost,
        reason: reason.trim(),
        inventoryImpact: liveInventoryImpact,
        status,
      };

      const saved = await purchaseApi.updatePurchaseReturn(currentReturn.id, { reason: reason.trim() });
      setCurrentReturn(saved.data);
      setIsEditing(false);
      toast.success('Purchase Return updated successfully!');

      if (onUpdate) {
        onUpdate(saved.data);
      }
    } catch {
      toast.error('Failed to update purchase return');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-2xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-rose-600">{currentReturn.returnRef}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {currentReturn.status || 'Debit Note Issued'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{currentReturn.supplierName}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Single Close View Control */}
            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Mode (Edit vs View) */}
        {isEditing ? (
          /* Inline Edit Form */
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100 space-y-3 text-xs">
              <h4 className="font-bold text-gray-900 flex items-center space-x-1.5 pb-2 border-b border-rose-100">
                <Edit3 className="w-4 h-4 text-rose-600" />
                <span>Edit Purchase Return Parameters</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <TextInput disabled
                  label="Supplier Name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />

                <TextInput disabled
                  label="Linked GRN Ref (Received Stock)"
                  value={linkedRef}
                  onChange={(e) => setLinkedRef(e.target.value)}
                  required
                />
              </div>

              <TextInput disabled
                label="Material Item"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <NumberInput disabled
                  label="Return Quantity"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  min={1}
                />

                <SelectInput disabled
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={[
                    { label: 'pcs', value: 'pcs' },
                    { label: 'ml', value: 'ml' },
                    { label: 'bottles', value: 'bottles' },
                  ]}
                />

                <NumberInput disabled
                  label="Unit Cost (INR)"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  required
                />
              </div>

              <SelectInput disabled
                label="Return Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'Debit Note Issued', value: 'Debit Note Issued' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Pending Audit', value: 'Pending Audit' },
                ]}
              />

              <TextArea
                label="Mandatory Return Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
              />
            </div>

            {/* Live Impact Preview */}
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-rose-900 block">Recalculated Impact Summary:</span>
              <p className="text-rose-700">{liveInventoryImpact}</p>
              <p className="font-bold text-rose-800">Debit Note Amount: {formatCurrency(totalReturnCost)}</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Return Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="space-y-5">
            {/* Reference Received Stock Section */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Return Reference:</span>
                <p className="font-mono font-bold text-rose-600 text-sm">{currentReturn.returnRef}</p>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Received Stock Ref (GRN):</span>
                <p className="font-mono font-bold text-[var(--primary)] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-max mt-0.5">
                  {currentReturn.linkedRef || '—'}
                </p>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Return Date:</span>
                <p className="font-semibold text-gray-800">{formatDate(currentReturn.date)}</p>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Returned Item:</span>
                <p className="font-bold text-gray-900">{currentReturn.material || currentReturn.item}</p>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Returned Quantity:</span>
                <p className="font-bold text-rose-600">
                  {currentReturn.qty} {currentReturn.unit || 'pcs'}
                </p>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Total Debit Note Amount:</span>
                <p className="font-bold text-purple-700 text-sm">
                  {formatCurrency(currentReturn.totalAmount || totalReturnCost)}
                </p>
              </div>
            </div>

            {/* Refactored Inventory & Payable Impact Section */}
            <div className="bg-gradient-to-r from-rose-50/80 to-amber-50/50 border border-rose-200/80 p-4.5 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-200/60 pb-2.5">
                <div className="flex items-center space-x-2 font-bold text-rose-900 text-xs tracking-wide uppercase">
                  <PackageMinus className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Inventory & Vendor Payable Impact Audit</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                  Ledger Updated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Physical Stock Ledger Impact */}
                <div className="erp-panel  p-3.5  border border-rose-100 space-y-1 shadow-2xs">
                  <div className="flex items-center space-x-1.5 text-rose-700 font-bold">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Physical Stock Level Reduced</span>
                  </div>
                  <p className="text-gray-900 font-bold text-sm">
                    -{currentReturn.qty} {currentReturn.unit || 'pcs'} {currentReturn.material || currentReturn.item}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium">
                    <Warehouse className="w-3 h-3 text-[var(--primary)]" />
                    <span>Deducted from warehouse inventory ledger</span>
                  </div>
                </div>

                {/* Financial Payable Debit Note Impact */}
                <div className="erp-panel  p-3.5  border border-purple-100 space-y-1 shadow-2xs">
                  <div className="flex items-center space-x-1.5 text-purple-700 font-bold">
                    <Receipt className="w-4 h-4 text-purple-600" />
                    <span>Vendor Debit Note Issued</span>
                  </div>
                  <p className="text-purple-900 font-bold text-sm">
                    {formatCurrency(currentReturn.totalAmount || totalReturnCost)}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium">
                    <Building2 className="w-3 h-3 text-purple-500" />
                    <span>Credited against {currentReturn.supplierName} payables</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
              <span className="font-bold text-gray-700 block mb-1">Return Reason & Quality Note:</span>
              <p className="text-gray-600 italic">{currentReturn.reason || 'No reason provided.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
