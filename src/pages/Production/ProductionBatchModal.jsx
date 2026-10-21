import React, { useState, useEffect } from 'react';
import { TextInput, NumberInput, SelectInput, TextArea } from '../../components/forms/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { productionApi } from '../../api/productionApi';
import { warehouseApi } from '../../api/warehouseApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, CheckCircle2, Layers, Building, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const ProductionBatchModal = ({ isOpen, batch, initialEdit = false, onClose, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [plannedQty, setPlannedQty] = useState(100);
  const [warehouseName, setWarehouseName] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('Draft');
  const [notes, setNotes] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && batch) {
      setIsEditing(initialEdit);
      setPlannedQty(batch.plannedQty ?? 0);
      setWarehouseName(batch.warehouseName || '—');
      setDate(batch.date ? batch.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setStatus(batch.status || 'Draft');
      setNotes(batch.notes || '');
      loadWarehouses();
    }
  }, [isOpen, batch, initialEdit]);

  const loadWarehouses = async () => {
    try {
      const res = await warehouseApi.getWarehouses();
      setWarehouses(res.data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  };

  if (!isOpen || !batch) return null;

  const unitCost = batch.unitCost || 0;
  const currentPlannedQty = Number(plannedQty || 0);
  const estimatedTotalCost = currentPlannedQty * unitCost;

  const recipePreview = (batch.standardConsumption || []).map(line => ({name:line.name,type:line.unit==='ml'?'Liquid':'Packaging',qty:`${Number(line.standard) * currentPlannedQty / batch.plannedQty} ${line.unit}`,unitRate:`${line.rate}/${line.unit}`}));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentPlannedQty || currentPlannedQty <= 0) {
      toast.error('Planned quantity must be greater than 0');
      return;
    }
    if (!warehouseName || !warehouseName.trim()) {
      toast.error('Target warehouse location is required');
      return;
    }
    if (!date) {
      toast.error('Production date is required');
      return;
    }

    setSubmitting(true);
    try {
      const updatedData = {
        plannedQty: currentPlannedQty,
        warehouseName,
        date,
        status,
        notes: notes.trim(),
        unitCost,
        totalCost: estimatedTotalCost,
      };

      await productionApi.updateBatch(batch.id, updatedData);
      toast.success('Production Batch updated successfully!');
      setIsEditing(false);
      onSuccess();
    } catch {
      toast.error('Failed to update production batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-2xl w-full p-6  space-y-5  max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-gray-900 text-lg font-mono">
                  {batch.batchNo}
                </h3>
                <StatusBadge status={isEditing ? status : batch.status} />
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                {batch.productName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {!isEditing ? (
          /* READONLY VIEW MODE */
          <div className="space-y-5 text-xs">
            {/* Metrics Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Planned Qty</span>
                <span className="font-bold text-gray-900 text-base">{batch.plannedQty} pcs</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Produced Qty</span>
                <span className="font-bold text-emerald-700 text-base">{batch.producedQty || 0} pcs</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Unit Cost</span>
                <span className="font-bold text-gray-900 text-base">{formatCurrency(batch.unitCost)}</span>
              </div>
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-900 font-semibold block uppercase">Total Batch Cost</span>
                <span className="font-bold text-[var(--primary)] text-base font-mono">{formatCurrency(batch.totalCost)}</span>
              </div>
            </div>

            {/* Information Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-gray-500 text-xs block">Source Warehouse</span>
                  <strong className="text-gray-900 font-bold">{batch.warehouseName}</strong>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-gray-500 text-xs block">Production Date</span>
                  <strong className="text-gray-900 font-bold">{formatDate(batch.date)}</strong>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <div>
                  <span className="text-gray-500 text-xs block">Manufacturing Status</span>
                  <StatusBadge status={batch.status} />
                </div>
              </div>
            </div>

            {/* Recipe Material Allocation Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-xs">Standard Materials Required for {batch.plannedQty} pcs</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="erp-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-bold uppercase border-b border-gray-200 text-xs">
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Required Qty</th>
                      <th className="p-2.5 text-right">Unit Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipePreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                        <td className="p-2.5 text-gray-500">{item.type}</td>
                        <td className="p-2.5 font-bold text-amber-800 font-mono">{item.qty}</td>
                        <td className="p-2.5 text-right text-gray-700 font-mono">{item.unitRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {batch.notes && (
              <div className="space-y-1">
                <span className="font-bold text-gray-900 text-xs">Notes & Special Instructions</span>
                <p className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-700">{batch.notes}</p>
              </div>
            )}

            {/* Modal Actions Footer: CLOSE BUTTON */}
            <div className="flex justify-end items-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* INLINE EDIT MODE FORM */
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-950 font-medium">
              Editing manufacturing configuration for batch <strong className="font-bold">{batch.batchNo}</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Planned Quantity (pcs)"
                value={plannedQty}
                onChange={(e) => setPlannedQty(e.target.value)}
                required
                min={1}
              />

              <SelectInput
                label="Source Warehouse"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                options={
                  warehouses.length > 0
                    ? warehouses.map((w) => ({ label: w.name, value: w.name }))
                    : [{ label: warehouseName || '—', value: warehouseName || '—' }]
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label="Production Scheduled Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <SelectInput
                label="Batch Status (Complete through batch detail)" disabled
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'Draft', value: 'Draft' },
                  { label: 'In Progress', value: 'In Progress' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Cancelled', value: 'Cancelled' },
                ]}
              />
            </div>

            {/* Dynamic Recalculated Cost Summary */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500 block">Unit Cost: <strong>{formatCurrency(unitCost)}</strong></span>
                <span className="text-gray-900 font-bold text-sm">Recalculated Batch Cost:</span>
              </div>
              <div className="text-xl font-bold text-[var(--primary)] font-mono">
                {formatCurrency(estimatedTotalCost)}
              </div>
            </div>

            <TextArea
              label="Production Notes / Instructions"
              placeholder="e.g. Blending ratio updates, extra diluent inspection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
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
                className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[#252525] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
