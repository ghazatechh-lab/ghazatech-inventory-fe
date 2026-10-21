import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput, NumberInput, TextArea } from '../../components/forms/FormControls';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { inventoryApi } from '../../api/inventoryApi';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { formatNumber } from '../../utils/formatters';
import { SlidersHorizontal, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

export const StockAdjustmentModal = ({ isOpen, materials = [], onClose, onSuccess }) => {
  const [locations, setLocations] = useState([]);
  const [rawMaterials, setRawMaterials] = useState(materials);
  const [finishedProducts, setFinishedProducts] = useState([]);

  // Form State
  const [location, setLocation] = useState('Central Warehouse');
  const [itemType, setItemType] = useState('Raw Material');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMasters();
    }
  }, [isOpen]);

  const loadMasters = async () => {
    try {
      const [wRes, bRes, rmRes, pRes] = await Promise.all([
        warehouseApi.getWarehouses().catch(() => ({ data: [] })),
        branchApi.getBranches().catch(() => ({ data: [] })),
        materials.length ? Promise.resolve({ data: materials }) : inventoryApi.getRawMaterials().catch(() => ({ data: [] })),
        productApi.getVariants().catch(() => ({ data: [] })),
      ]);

      const locList = [
        ...(wRes.data || []).map((w) => ({ label: `${w.name} (Warehouse)`, value: w.name })),
        ...(bRes.data || []).map((b) => ({ label: `${b.name} (Branch)`, value: b.name })),
      ];
      setLocations(locList); setLocation(v => locList.some(x=>x.value===v) ? v : locList[0]?.value || '');
      setRawMaterials(rmRes.data || materials || []);
      setFinishedProducts(pRes.data || []);

      const initialItems = itemType === 'Raw Material' ? (rmRes.data || materials) : (pRes.data || []);
      if (initialItems?.length && !selectedItemId) {
        setSelectedItemId(initialItems[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const availableItems = itemType === 'Raw Material' ? rawMaterials : finishedProducts;
  const currentItem = availableItems.find((i) => i.id === selectedItemId) || availableItems[0];
  const currentQuantity = currentItem
    ? itemType === 'Raw Material'
      ? (currentItem.availableStock !== undefined ? currentItem.availableStock : currentItem.stock)
      : currentItem.stock
    : 0;
  const unitSuffix = currentItem ? (itemType === 'Raw Material' ? currentItem.unit || 'units' : 'pcs') : 'units';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItemId) {
      toast.error('Please select an item to adjust');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.error('Please enter a valid quantity greater than 0');
      return;
    }
    if (!reason.trim()) {
      toast.error('Mandatory reason for adjustment is required');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmedSubmit = async () => {
    setLoading(true);
    try {
      await inventoryApi.adjustStock({
        itemId: currentItem?.id || selectedItemId,
        location,
        itemType,
        adjustmentType,
        quantity: Number(quantity),
        reason: reason.trim(),
        notes: notes.trim(),
      });
      toast.success(`Stock adjustment for ${currentItem?.name || currentItem?.sku || 'item'} recorded successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.error('Failed to submit stock adjustment');
    } finally {
      setLoading(false);
      setIsConfirming(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="erp-panel   max-w-xl w-full p-6   my-8 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Record Stock Adjustment</h3>
            </div>
            <button aria-label="Close dialog" onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SelectInput
                label="Location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                options={locations}
              />

              <SelectInput
                label="Item Type"
                required
                value={itemType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setItemType(nextType);
                  const nextItems = nextType === 'Raw Material' ? rawMaterials : finishedProducts;
                  if (nextItems.length) setSelectedItemId(nextItems[0].id);
                }}
                options={[
                  { value: 'Raw Material', label: 'Raw Material' },
                  { value: 'Finished Product', label: 'Finished Product' },
                ]}
              />

              <SelectInput
                label="Item"
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                options={availableItems.map((i) => ({
                  value: i.id,
                  label: i.name ? `${i.name} (${i.code || i.id})` : `${i.sku} - ${i.productName}`,
                }))}
              />
            </div>

            {/* Current Quantity Auto-populated Display */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
              <span className="font-semibold">Current Quantity at {location}:</span>
              <span className="text-sm font-bold text-[var(--primary)] font-mono">
                {formatNumber(currentQuantity)} {unitSuffix}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SelectInput
                label="Adjustment Type"
                required
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                options={[
                  { value: 'add', label: 'Increase Stock (+ IN)' },
                  { value: 'subtract', label: 'Decrease Stock (- OUT)' },
                ]}
              />

              <NumberInput
                label={`Quantity (${unitSuffix})`}
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>

            <TextInput
              label="Mandatory Reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Audit reconciliation, damage, supplier correction"
            />

            <TextArea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional audit or supervisor notes..."
            />

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Review & Submit</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirming}
        title="Confirm Stock Adjustment?"
        message={`Are you sure you want to ${
          adjustmentType === 'add' ? 'increase' : 'decrease'
        } stock for "${currentItem?.name || currentItem?.sku || 'Item'}" at "${location}" by ${quantity} ${unitSuffix}? Stock will change from ${currentQuantity} to ${
          adjustmentType === 'add'
            ? currentQuantity + Number(quantity)
            : currentQuantity - Number(quantity)
        } ${unitSuffix}. Mandatory Reason: "${reason}".`}
        confirmLabel="Confirm & Adjust Stock"
        loading={loading}
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
};
