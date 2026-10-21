import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { TextInput, SelectInput, NumberInput, TextArea } from '../../components/forms/FormControls';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { inventoryApi } from '../../api/inventoryApi';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { formatDate, formatNumber } from '../../utils/formatters';
import { SlidersHorizontal, Plus, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

export const StockAdjustments = () => {
  const [locations, setLocations] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [location, setLocation] = useState('Central Warehouse');
  const [itemType, setItemType] = useState('Raw Material');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Confirmation modal state
  const [isConfirming, setIsConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [wRes, bRes, rmRes, pRes, mRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        branchApi.getBranches(),
        inventoryApi.getRawMaterials(),
        productApi.getVariants(),
        inventoryApi.getMovements(),
      ]);

      const locList = [
        ...(wRes.data || []).map((w) => ({ label: `${w.name} (Warehouse)`, value: w.name })),
        ...(bRes.data || []).map((b) => ({ label: `${b.name} (Branch Outlet)`, value: b.name })),
      ];

      setLocations(locList);
      setRawMaterials(rmRes.data || []);
      setFinishedProducts(pRes.data || []);

      if (rmRes.data?.length) setSelectedItemId(rmRes.data[0].id);

      // Filter history movements of type STOCK_ADJUSTMENT
      const history = (mRes.data || []).filter((m) => m.transaction === 'STOCK_ADJUSTMENT');
      setAdjustmentHistory(history);
    } catch {
      toast.error('Failed to load stock adjustment form data');
    } finally {
      setLoading(false);
    }
  };

  // Determine current item & auto-populated live quantity
  const availableItems = itemType === 'Raw Material' ? rawMaterials : finishedProducts;
  const currentItem = availableItems.find((i) => i.id === selectedItemId) || availableItems[0];

  const currentQuantity = currentItem
    ? itemType === 'Raw Material'
      ? (currentItem.availableStock !== undefined ? currentItem.availableStock : currentItem.stock)
      : currentItem.stock
    : 0;

  const unitSuffix = currentItem ? (itemType === 'Raw Material' ? currentItem.unit || 'units' : 'pcs') : 'units';

  // Handle Form Pre-Submit (validation before confirmation modal)
  const handlePreSubmit = (e) => {
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
      toast.error('Mandatory reason is required before submitting stock adjustment');
      return;
    }

    setIsConfirming(true);
  };

  // Confirmed Submission
  const handleConfirmedAdjustment = async () => {
    setSubmitting(true);
    try {
      await inventoryApi.adjustStock({
        itemId: currentItem.id,
        location,
        itemType,
        adjustmentType,
        quantity: Number(quantity),
        reason: reason.trim(),
        notes: notes.trim(),
      });

      await loadFormData();
      toast.success(`Stock adjustment for ${currentItem.name || currentItem.sku} recorded successfully!`);
      setIsConfirming(false);
      setIsModalOpen(false);
      setQuantity('');
      setReason('');
      setNotes('');
    } catch {
      toast.error('Failed to submit stock adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Reference', accessor: 'reference', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.reference}</span> },
    { header: 'Date & Time', accessor: 'date', render: (row) => formatDate(row.date, true) },
    { header: 'Adjusted Item', accessor: 'item', render: (row) => <span className="font-bold text-gray-900">{row.item}</span> },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Direction',
      accessor: 'direction',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.direction === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {row.direction === 'IN' ? '+ INCREASE' : '- DECREASE'}
        </span>
      ),
    },
    { header: 'Adjusted Qty', accessor: 'quantity', render: (row) => <span className="font-bold text-gray-900">{row.quantity}</span> },
    {
      header: 'Stock Change',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">
          {row.previousStock} ➔ <strong className="text-gray-900">{row.newStock}</strong>
        </span>
      ),
    },
    { header: 'Mandatory Reason', accessor: 'reason', render: (row) => <span className="text-xs text-gray-700 italic">{row.reason || 'Audit correction'}</span> },
    { header: 'Recorded By', accessor: 'user', render: (row) => <span className="text-xs text-gray-500">{row.user}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Record inventory count adjustments, stock audit reconciliation & manual stock updates"
        primaryAction={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Stock Adjustment</span>
          </button>
        }
      />

      {/* Adjustment Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="erp-panel   max-w-xl w-full p-6   my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Record Stock Adjustment</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePreSubmit} className="space-y-4 text-xs">
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
                placeholder="e.g. Physical count audit reconciliation, damage, supplier correction"
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
                  onClick={() => setIsModalOpen(false)}
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
      )}

      {/* Adjustment History Ledger */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Stock Adjustment Audit History</h3>
        <DataTable
          columns={columns}
          data={adjustmentHistory}
          loading={loading}
          searchPlaceholder="Search reference, item or reason..."
        />
      </div>

      {/* Confirmation Step Modal */}
      <ConfirmModal
        isOpen={isConfirming}
        title="Confirm Authoritative Stock Adjustment?"
        message={`Are you sure you want to ${
          adjustmentType === 'add' ? 'increase' : 'decrease'
        } stock for "${currentItem?.name || currentItem?.sku || 'Item'}" at "${location}" by ${quantity} ${unitSuffix}? Current stock will change from ${currentQuantity} to ${
          adjustmentType === 'add'
            ? currentQuantity + Number(quantity)
            : currentQuantity - Number(quantity)
        } ${unitSuffix}. Mandatory Reason: "${reason}".`}
        confirmLabel="Confirm & Apply Adjustment"
        loading={submitting}
        onConfirm={handleConfirmedAdjustment}
        onCancel={() => setIsConfirming(false)}
      />
    </div>
  );
};
